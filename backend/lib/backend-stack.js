const { Stack, Duration, CfnOutput, RemovalPolicy } = require("aws-cdk-lib");
const s3 = require("aws-cdk-lib/aws-s3");
const lambda = require("aws-cdk-lib/aws-lambda");
const uuid = require("uuid");
const { bedrock } = require("@cdklabs/generative-ai-cdk-constructs");
const { S3EventSource } = require("aws-cdk-lib/aws-lambda-event-sources");
const iam = require("aws-cdk-lib/aws-iam");
const apigw = require("aws-cdk-lib/aws-apigateway");
const wafv2 = require("aws-cdk-lib/aws-wafv2");

class BackendStack extends Stack {
  /**
   *
   * @param {Construct} scope
   * @param {string} id
   * @param {StackProps=} props
   */
  constructor(scope, id, props) {
    super(scope, id, props);
    
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

    const lambdaIngestionJob = new lambda.Function(this, "IngestionJob", {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "index.handler",
      code: lambda.Code.fromAsset("./lambda/ingest"),
      timeout: Duration.minutes(5),
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

    const lambdaQuery = new lambda.Function(this, "Query", {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "index.handler",
      code: lambda.Code.fromAsset("./lambda/query"),
      timeout: Duration.minutes(5),
      environment: {
        KNOWLEDGE_BASE_ID: docsKnowledgeBase.knowledgeBaseId,
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

module.exports = { BackendStack };
