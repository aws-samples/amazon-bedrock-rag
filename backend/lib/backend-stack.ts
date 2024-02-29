import { Stack, StackProps, Duration, CfnOutput, RemovalPolicy } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import * as uuid from "uuid";
import { bedrock } from "@cdklabs/generative-ai-cdk-constructs";
import { S3EventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import * as iam  from 'aws-cdk-lib/aws-iam';
import * as apigw  from 'aws-cdk-lib/aws-apigateway';
import * as wafv2  from 'aws-cdk-lib/aws-wafv2';
import { join } from 'path';

export class BackendStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);
    // The code that defines your stack goes here
    const docsBucket = new s3.Bucket(this, "docsbucket-" + uuid.v4(), {
      lifecycleRules: [{
        expiration: Duration.days(10),
      }],
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

    const docsKnowledgeBase = new bedrock.KnowledgeBase(
      this,
      "docsKnowledgeBase",
      {
        embeddingsModel: bedrock.BedrockFoundationModel.TITAN_EMBED_TEXT_V1,
      }
    );

    const docsDataSource = new bedrock.S3DataSource(
      this,
      "docsDataSource",
      {
        bucket: docsBucket,
        knowledgeBase: docsKnowledgeBase,
        dataSourceName: "docs",
        chunkingStrategy: bedrock.ChunkingStrategy.FIXED_SIZE,
        maxTokens: 500,
        overlapPercentage: 20,
      }
    );

    const s3PutEventSource = new S3EventSource(docsBucket, {
      events: [s3.EventType.OBJECT_CREATED_PUT],
    });

    const lambdaIngestionJob = new NodejsFunction(this, 'IngestionJob', {
      runtime: Runtime.NODEJS_20_X,
      entry: join(__dirname, '../lambda/ingest/index.js'),
      functionName: `start-ingestion-trigger`,
      timeout: Duration.minutes(15),
      environment: {
        KNOWLEDGE_BASE_ID: docsKnowledgeBase.knowledgeBaseId,
        DATA_SOURCE_ID: docsDataSource.dataSourceId,
      },
    });

    lambdaIngestionJob.addEventSource(s3PutEventSource);

    lambdaIngestionJob.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["bedrock:StartIngestionJob"],
        resources: [docsKnowledgeBase.knowledgeBaseArn],
      })
    );

    const whitelistedIps = [Stack.of(this).node.tryGetContext('allowedip')];

    const apiGateway = new apigw.RestApi(this, 'rag', {
      description: 'API for RAG',
      restApiName: 'rag-api',
      defaultCorsPreflightOptions: {
        allowOrigins: apigw.Cors.ALL_ORIGINS,                
      },
    });

    const lambdaQuery = new NodejsFunction(this, 'Query', {
      runtime: Runtime.NODEJS_20_X,
      entry: join(__dirname, '../lambda/query/index.js'),
      functionName: `query-bedrock-llm`,
      //query lambda duration set to match API Gateway max timeout
      timeout: Duration.seconds(29),
      environment: {
        KNOWLEDGE_BASE_ID: docsKnowledgeBase.knowledgeBaseId
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

    apiGateway.root.addResource('docs').addMethod('POST', new apigw.LambdaIntegration(lambdaQuery));
    
    apiGateway.addUsagePlan('usage-plan', {
      name: 'dev-docs-plan',
      description: 'usage plan for dev',
      apiStages: [{
        api: apiGateway,
        stage: apiGateway.deploymentStage,
      }],
      throttle: {
        rateLimit: 100,
        burstLimit: 200
      },
    }); 

    /**
     * Create and Associate ACL with Gateway
     */
    // Create an IPSet
    const allowedIpSet = new wafv2.CfnIPSet(this, 'DevIpSet', {
      addresses: whitelistedIps, // whitelisted IPs in CIDR format
      ipAddressVersion: 'IPV4',
      scope: 'REGIONAL',
      description: 'List of allowed IP addresses',
    });    
    // Create our Web ACL
    const webACL = new wafv2.CfnWebACL(this, 'WebACL', {
      defaultAction: {
        block: {}
      },
      scope: 'REGIONAL',
      visibilityConfig: {
        cloudWatchMetricsEnabled: true,
        metricName: 'webACL',
        sampledRequestsEnabled: true
      },
      rules: [
        {
          name: 'IPAllowList',
          priority: 1,
          statement: {
            ipSetReferenceStatement: {
              arn: allowedIpSet.attrArn,
            }
          },
          action: {
              allow: {},
          },          
          visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: true,
            metricName: 'IPAllowList'
          }
        }
      ]
    });

    // Associate with our gateway
    const webACLAssociation = new wafv2.CfnWebACLAssociation(this, 'WebACLAssociation', {
      webAclArn: webACL.attrArn,
      resourceArn: `arn:aws:apigateway:${Stack.of(this).region}::/restapis/${apiGateway.restApiId}/stages/${apiGateway.deploymentStage.stageName}`
    });

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
