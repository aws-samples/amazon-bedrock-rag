import {
  Stack,
  StackProps,
  Duration,
  CfnOutput,
  RemovalPolicy,
  ArnFormat,
  CustomResource,
} from "aws-cdk-lib";
import { Construct } from "constructs";
import * as s3 from "aws-cdk-lib/aws-s3";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import * as uuid from "uuid";
import { bedrock } from "@cdklabs/generative-ai-cdk-constructs";
import * as bedrockCfn from "aws-cdk-lib/aws-bedrock";
import { S3EventSource } from "aws-cdk-lib/aws-lambda-event-sources";
import * as iam from "aws-cdk-lib/aws-iam";
import * as apigw from "aws-cdk-lib/aws-apigateway";
import * as wafv2 from "aws-cdk-lib/aws-wafv2";
import * as logs from "aws-cdk-lib/aws-logs";
import * as cr from "aws-cdk-lib/custom-resources";
import * as events from "aws-cdk-lib/aws-events";
import * as targets from "aws-cdk-lib/aws-events-targets";
import { join } from "path";

export class BackendStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    /**
     * Knowledge Base Type Selection
     *
     * Supports two modes via CDK context parameter "knowledgeBaseType":
     *
     * - "VECTOR" (legacy): Creates a VectorKnowledgeBase with Titan Embed Text V2
     *   embedding model and an OpenSearch Serverless vector store. Suitable when you
     *   need fine-grained control over embeddings and storage configuration.
     *
     * - "MANAGED": Creates a fully managed knowledge base using CfnKnowledgeBase
     *   with type "MANAGED". No vector store or embedding model ARN is needed;
     *   Bedrock handles embedding and storage internally. This is a simpler setup
     *   with less infrastructure to manage.
     */
    const knowledgeBaseType: string =
      this.node.tryGetContext("knowledgeBaseType") || "VECTOR";

    // Common references used by downstream resources regardless of KB type
    let knowledgeBaseId: string;
    let knowledgeBaseArn: string;

    // The VectorKnowledgeBase L2 construct (only set for VECTOR type, used for S3DataSource)
    let vectorKnowledgeBase: bedrock.VectorKnowledgeBase | undefined;

    if (knowledgeBaseType === "MANAGED") {
      /** Managed Knowledge Base - Bedrock handles embedding and storage */

      const kbRole = new iam.Role(this, "ManagedKBRole", {
        assumedBy: new iam.ServicePrincipal("bedrock.amazonaws.com"),
        inlinePolicies: {
          bedrockManaged: new iam.PolicyDocument({
            statements: [
              new iam.PolicyStatement({
                actions: [
                  "bedrock:Retrieve",
                  "bedrock:AgenticRetrieveStream",
                  "bedrock:GetDocumentContent",
                  "bedrock:InvokeModel",
                  "bedrock:InvokeModelWithResponseStream",
                ],
                resources: ["*"],
              }),
              new iam.PolicyStatement({
                actions: ["s3:GetObject", "s3:ListBucket"],
                resources: ["*"],
              }),
            ],
          }),
        },
      });

      const managedKnowledgeBase = new bedrockCfn.CfnKnowledgeBase(
        this,
        "managedKnowledgeBase",
        {
          name: "managed-knowledge-base",
          roleArn: kbRole.roleArn,
          knowledgeBaseConfiguration: {
            type: "MANAGED",
          },
        } as any
      );

      knowledgeBaseId = managedKnowledgeBase.attrKnowledgeBaseId;
      knowledgeBaseArn = managedKnowledgeBase.attrKnowledgeBaseArn;
    } else {
      /** Vector Knowledge Base - uses Titan embeddings + OpenSearch Serverless */

      vectorKnowledgeBase = new bedrock.VectorKnowledgeBase(
        this,
        "knowledgeBase",
        {
          embeddingsModel:
            bedrock.BedrockFoundationModel.TITAN_EMBED_TEXT_V2_1024,
          vectorType: bedrock.VectorType.BINARY,
        }
      );

      knowledgeBaseId = vectorKnowledgeBase.knowledgeBaseId;
      knowledgeBaseArn = vectorKnowledgeBase.knowledgeBaseArn;
    }

    /** S3 bucket for Bedrock data source */
    const docsBucket = new s3.Bucket(this, "docsbucket-" + uuid.v4(), {
      lifecycleRules: [
        {
          expiration: Duration.days(10),
        },
      ],
      blockPublicAccess: {
        blockPublicAcls: true,
        blockPublicPolicy: true,
        ignorePublicAcls: true,
        restrictPublicBuckets: true,
      },
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    /**
     * S3 Data Source setup:
     * - For VECTOR type: uses the L2 S3DataSource construct tied to the VectorKnowledgeBase
     * - For MANAGED type: uses CfnDataSource (L1) since managed KBs don't use the L2 construct
     */
    let s3DataSourceId: string;

    if (knowledgeBaseType === "MANAGED") {
      const managedS3DataSource = new bedrockCfn.CfnDataSource(
        this,
        "s3DataSource",
        {
          knowledgeBaseId: knowledgeBaseId,
          name: "docs",
          dataSourceConfiguration: {
            type: "MANAGED_KNOWLEDGE_BASE_CONNECTOR",
          } as any,
        }
      );
      managedS3DataSource.addPropertyOverride('DataSourceConfiguration.ManagedKnowledgeBaseConnectorConfiguration', {
        ConnectorParameters: {
          type: 'S3',
          version: '1',
          connectionConfiguration: {
            bucketName: docsBucket.bucketName,
            bucketOwnerAccountId: this.account,
          },
        },
      });
      s3DataSourceId = managedS3DataSource.attrDataSourceId;
    } else {
      const s3DataSource = new bedrock.S3DataSource(this, "s3DataSource", {
        bucket: docsBucket,
        knowledgeBase: vectorKnowledgeBase!,
        dataSourceName: "docs",
        chunkingStrategy: bedrock.ChunkingStrategy.fixedSize({
          maxTokens: 500,
          overlapPercentage: 20,
        }),
      });
      s3DataSourceId = s3DataSource.dataSourceId;
    }

    const s3PutEventSource = new S3EventSource(docsBucket, {
      events: [s3.EventType.OBJECT_CREATED_PUT],
    });

    /** Web Crawler for bedrock data Source */

    const createWebDataSourceLambda = new NodejsFunction(
      this,
      "CreateWebDataSourceHandler",
      {
        runtime: Runtime.NODEJS_22_X,
        entry: join(__dirname, "../lambda/dataSource/index.js"),
        functionName: `create-web-data-source`,
        timeout: Duration.minutes(1),
        environment: {
          KNOWLEDGE_BASE_ID: knowledgeBaseId,
          KNOWLEDGE_BASE_TYPE: knowledgeBaseType,
        },
        bundling: {
          externalModules: [],  // Bundle ALL modules including AWS SDK
        },
      }
    );

    const webDataSourceProvider = new cr.Provider(
      this,
      "WebDataSourceProvider",
      {
        onEventHandler: createWebDataSourceLambda,
        logRetention: logs.RetentionDays.ONE_DAY,
      }
    );

    const createWebDataSourceResource = new CustomResource(
      this,
      "WebDataSourceResource",
      {
        serviceToken: webDataSourceProvider.serviceToken,
        resourceType: "Custom::BedrockWebDataSource",
      }
    );

    /** S3 Ingest Lambda for S3 data source */

    const lambdaIngestionJob = new NodejsFunction(this, "IngestionJob", {
      runtime: Runtime.NODEJS_22_X,
      entry: join(__dirname, "../lambda/ingest/index.js"),
      functionName: `start-ingestion-trigger`,
      timeout: Duration.minutes(15),
      environment: {
        KNOWLEDGE_BASE_ID: knowledgeBaseId,
        DATA_SOURCE_ID: s3DataSourceId,
        BUCKET_ARN: docsBucket.bucketArn,
      },
    });

    lambdaIngestionJob.addEventSource(s3PutEventSource);

    lambdaIngestionJob.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["bedrock:StartIngestionJob"],
        resources: [knowledgeBaseArn, docsBucket.bucketArn],
      })
    );

    /** Web crawler ingest Lambda */

    const lambdaCrawlJob = new NodejsFunction(this, "CrawlJob", {
      runtime: Runtime.NODEJS_22_X,
      entry: join(__dirname, "../lambda/crawl/index.js"),
      functionName: `start-web-crawl-trigger`,
      timeout: Duration.minutes(15),
      environment: {
        KNOWLEDGE_BASE_ID: knowledgeBaseId,
        DATA_SOURCE_ID:
          createWebDataSourceResource.getAttString("DataSourceId"),
      },
    });

    lambdaCrawlJob.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["bedrock:StartIngestionJob"],
        resources: [knowledgeBaseArn],
      })
    );

    const rule = new events.Rule(this, "ScheduleWebCrawlRule", {
      schedule: events.Schedule.rate(Duration.days(1)), // Adjust the cron expression as needed
    });

    rule.addTarget(new targets.LambdaFunction(lambdaCrawlJob));

    /** Lambda to update the list of seed urls in Web crawler data source*/

    const lambdaUpdateWebUrls = new NodejsFunction(this, "UpdateWebUrls", {
      runtime: Runtime.NODEJS_22_X,
      entry: join(__dirname, "../lambda/webUrlSources/index.js"),
      functionName: `update-web-crawl-urls`,
      timeout: Duration.minutes(15),
      environment: {
        KNOWLEDGE_BASE_ID: knowledgeBaseId,
        DATA_SOURCE_ID:
          createWebDataSourceResource.getAttString("DataSourceId"),
        DATA_SOURCE_NAME: "WebCrawlerDataSource",
      },
    });

    lambdaUpdateWebUrls.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["bedrock:GetDataSource", "bedrock:UpdateDataSource"],
        resources: [knowledgeBaseArn],
      })
    );

    /** Lambda to get the list of seed urls in Web crawler data source*/

    const lambdaGetWebUrls = new NodejsFunction(this, "GetWebUrls", {
      runtime: Runtime.NODEJS_22_X,
      entry: join(__dirname, "../lambda/getUrls/index.js"),
      functionName: `get-web-crawl-urls`,
      timeout: Duration.minutes(15),
      environment: {
        KNOWLEDGE_BASE_ID: knowledgeBaseId,
        DATA_SOURCE_ID:
          createWebDataSourceResource.getAttString("DataSourceId"),
      },
    });

    lambdaGetWebUrls.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["bedrock:GetDataSource"],
        resources: [knowledgeBaseArn],
      })
    );

    createWebDataSourceLambda.addToRolePolicy(
      new iam.PolicyStatement({
        actions: [
          "bedrock:CreateDataSource",
          "bedrock:UpdateDataSource",
          "bedrock:DeleteDataSource",
        ],
        resources: [knowledgeBaseArn],
      })
    );

    const whitelistedIps = [Stack.of(this).node.tryGetContext("allowedip")];

    const apiGateway = new apigw.RestApi(this, "rag", {
      description: "API for RAG",
      restApiName: "rag-api",
      defaultCorsPreflightOptions: {
        allowOrigins: apigw.Cors.ALL_ORIGINS,
      },
    });

    /** Lambda for handling retrieval and answer generation  */

    const lambdaQuery = new NodejsFunction(this, "Query", {
      runtime: Runtime.NODEJS_22_X,
      entry: join(__dirname, "../lambda/query/index.js"),
      functionName: `query-bedrock-llm`,
      //query lambda duration set to match API Gateway max timeout
      timeout: Duration.seconds(29),
      environment: {
        KNOWLEDGE_BASE_ID: knowledgeBaseId,
      },
    });

    lambdaQuery.addToRolePolicy(
      new iam.PolicyStatement({
        actions: [
          "bedrock:RetrieveAndGenerate",
          "bedrock:Retrieve",
          "bedrock:InvokeModel",
        ],
        resources: ["*"],
      })
    );

    apiGateway.root
      .addResource("docs")
      .addMethod("POST", new apigw.LambdaIntegration(lambdaQuery));

    apiGateway.root
      .addResource("web-urls")
      .addMethod("POST", new apigw.LambdaIntegration(lambdaUpdateWebUrls));

    apiGateway.root
      .addResource("urls")
      .addMethod("GET", new apigw.LambdaIntegration(lambdaGetWebUrls));

    apiGateway.addUsagePlan("usage-plan", {
      name: "dev-docs-plan",
      description: "usage plan for dev",
      apiStages: [
        {
          api: apiGateway,
          stage: apiGateway.deploymentStage,
        },
      ],
      throttle: {
        rateLimit: 100,
        burstLimit: 200,
      },
    });

    /**
     * Create and Associate ACL with Gateway
     */
    // Create an IPSet
    const allowedIpSet = new wafv2.CfnIPSet(this, "DevIpSet", {
      addresses: whitelistedIps, // whitelisted IPs in CIDR format
      ipAddressVersion: "IPV4",
      scope: "REGIONAL",
      description: "List of allowed IP addresses",
    });
    // Create our Web ACL
    const webACL = new wafv2.CfnWebACL(this, "WebACL", {
      defaultAction: {
        block: {},
      },
      scope: "REGIONAL",
      visibilityConfig: {
        cloudWatchMetricsEnabled: true,
        metricName: "webACL",
        sampledRequestsEnabled: true,
      },
      rules: [
        {
          name: "IPAllowList",
          priority: 1,
          statement: {
            ipSetReferenceStatement: {
              arn: allowedIpSet.attrArn,
            },
          },
          action: {
            allow: {},
          },
          visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: true,
            metricName: "IPAllowList",
          },
        },
      ],
    });

    const webAclLogGroup = new logs.LogGroup(this, "awsWafLogs", {
      logGroupName: `aws-waf-logs-backend`,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    // Create logging configuration with log group as destination
    new wafv2.CfnLoggingConfiguration(this, "WAFLoggingConfiguration", {
      resourceArn: webACL.attrArn,
      logDestinationConfigs: [
        Stack.of(this).formatArn({
          arnFormat: ArnFormat.COLON_RESOURCE_NAME,
          service: "logs",
          resource: "log-group",
          resourceName: webAclLogGroup.logGroupName,
        }),
      ],
    });

    // Associate with our gateway
    const webACLAssociation = new wafv2.CfnWebACLAssociation(
      this,
      "WebACLAssociation",
      {
        webAclArn: webACL.attrArn,
        resourceArn: `arn:aws:apigateway:${Stack.of(this).region}::/restapis/${
          apiGateway.restApiId
        }/stages/${apiGateway.deploymentStage.stageName}`,
      }
    );

    // make sure api gateway is deployed before web ACL association
    webACLAssociation.node.addDependency(apiGateway);

    //CfnOutput is used to log API Gateway URL and S3 bucket name to console
    new CfnOutput(this, "APIGatewayUrl", {
      value: apiGateway.url,
    });

    new CfnOutput(this, "DocsBucketName", {
      value: docsBucket.bucketName,
    });
  }
}
