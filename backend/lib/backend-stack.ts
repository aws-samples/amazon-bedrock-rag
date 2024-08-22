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

    /** Knowledge Base */

    const knowledgeBase = new bedrock.KnowledgeBase(this, "knowledgeBase", {
      embeddingsModel: bedrock.BedrockFoundationModel.TITAN_EMBED_TEXT_V1,
    });

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

    const s3DataSource = new bedrock.S3DataSource(this, "s3DataSource", {
      bucket: docsBucket,
      knowledgeBase: knowledgeBase,
      dataSourceName: "docs",
      chunkingStrategy: bedrock.ChunkingStrategy.FIXED_SIZE,
      maxTokens: 500,
      overlapPercentage: 20,
    });

    const s3PutEventSource = new S3EventSource(docsBucket, {
      events: [s3.EventType.OBJECT_CREATED_PUT],
    });

    /** Web Crawler for bedrock data Source */

    const createWebDataSourceLambda = new NodejsFunction(
      this,
      "CreateWebDataSourceHandler",
      {
        runtime: Runtime.NODEJS_18_X,
        entry: join(__dirname, "../lambda/dataSource/index.js"),
        functionName: `create-web-data-source`,
        timeout: Duration.minutes(1),
        environment: {
          KNOWLEDGE_BASE_ID: knowledgeBase.knowledgeBaseId,
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
      runtime: Runtime.NODEJS_20_X,
      entry: join(__dirname, "../lambda/ingest/index.js"),
      functionName: `start-ingestion-trigger`,
      timeout: Duration.minutes(15),
      environment: {
        KNOWLEDGE_BASE_ID: knowledgeBase.knowledgeBaseId,
        DATA_SOURCE_ID: s3DataSource.dataSourceId,
        BUCKET_ARN: docsBucket.bucketArn,
      },
    });

    lambdaIngestionJob.addEventSource(s3PutEventSource);

    lambdaIngestionJob.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["bedrock:StartIngestionJob"],
        resources: [knowledgeBase.knowledgeBaseArn, docsBucket.bucketArn],
      })
    );

    /** Web crawler ingest Lambda */

    const lambdaCrawlJob = new NodejsFunction(this, "CrawlJob", {
      runtime: Runtime.NODEJS_20_X,
      entry: join(__dirname, "../lambda/crawl/index.js"),
      functionName: `start-web-crawl-trigger`,
      timeout: Duration.minutes(15),
      environment: {
        KNOWLEDGE_BASE_ID: knowledgeBase.knowledgeBaseId,
        DATA_SOURCE_ID:
          createWebDataSourceResource.getAttString("DataSourceId"),
      },
    });

    lambdaCrawlJob.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["bedrock:StartIngestionJob"],
        resources: [knowledgeBase.knowledgeBaseArn],
      })
    );

    const rule = new events.Rule(this, "ScheduleWebCrawlRule", {
      schedule: events.Schedule.rate(Duration.days(1)), // Adjust the cron expression as needed
    });

    rule.addTarget(new targets.LambdaFunction(lambdaCrawlJob));

    /** Lambda to update the list of seed urls in Web crawler data source*/

    const lambdaUpdateWebUrls = new NodejsFunction(this, "UpdateWebUrls", {
      runtime: Runtime.NODEJS_20_X,
      entry: join(__dirname, "../lambda/webUrlSources/index.js"),
      functionName: `update-web-crawl-urls`,
      timeout: Duration.minutes(15),
      environment: {
        KNOWLEDGE_BASE_ID: knowledgeBase.knowledgeBaseId,
        DATA_SOURCE_ID:
          createWebDataSourceResource.getAttString("DataSourceId"),
        DATA_SOURCE_NAME: "WebCrawlerDataSource",
      },
    });

    lambdaUpdateWebUrls.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["bedrock:GetDataSource", "bedrock:UpdateDataSource"],
        resources: [knowledgeBase.knowledgeBaseArn],
      })
    );

    /** Lambda to get the list of seed urls in Web crawler data source*/

    const lambdaGetWebUrls = new NodejsFunction(this, "GetWebUrls", {
      runtime: Runtime.NODEJS_20_X,
      entry: join(__dirname, "../lambda/getUrls/index.js"),
      functionName: `get-web-crawl-urls`,
      timeout: Duration.minutes(15),
      environment: {
        KNOWLEDGE_BASE_ID: knowledgeBase.knowledgeBaseId,
        DATA_SOURCE_ID:
          createWebDataSourceResource.getAttString("DataSourceId"),
      },
    });

    lambdaGetWebUrls.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["bedrock:GetDataSource"],
        resources: [knowledgeBase.knowledgeBaseArn],
      })
    );

    createWebDataSourceLambda.addToRolePolicy(
      new iam.PolicyStatement({
        actions: [
          "bedrock:CreateDataSource",
          "bedrock:UpdateDataSource",
          "bedrock:DeleteDataSource",
        ],
        resources: [knowledgeBase.knowledgeBaseArn],
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
      runtime: Runtime.NODEJS_20_X,
      entry: join(__dirname, "../lambda/query/index.js"),
      functionName: `query-bedrock-llm`,
      //query lambda duration set to match API Gateway max timeout
      timeout: Duration.seconds(29),
      environment: {
        KNOWLEDGE_BASE_ID: knowledgeBase.knowledgeBaseId,
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
