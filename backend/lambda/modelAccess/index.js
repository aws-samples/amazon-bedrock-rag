const {
  BedrockClient,
  ListFoundationModelsCommand,
} = require("@aws-sdk/client-bedrock");

const client = new BedrockClient({
  region: process.env.AWS_REGION,
});

import middy from "@middy/core";
import httpJsonBodyParser from "@middy/http-json-body-parser";
import httpHeaderNormalizer from "@middy/http-header-normalizer";

exports.handler = middy()
  .use(httpJsonBodyParser())
  .use(httpHeaderNormalizer())
  .handler(async (event, context) => {
    console.log("model start")
    try {
        const command = new ListFoundationModelsCommand({
            byInferenceType: "ON_DEMAND",
          });
          const response = await client.send(command);
      
          return {
            statusCode: 200,
            body: JSON.stringify({
              modelList: response.modelSummaries,
            }),
            headers: {
              "Access-Control-Allow-Origin": "*",
            },
          };
    } catch (error) {
        console.log(error)
        return "Server side error: please check function logs"
    }
    
  });
