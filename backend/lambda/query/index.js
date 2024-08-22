const {
  BedrockAgentRuntimeClient,
  RetrieveAndGenerateCommand,
} = require("@aws-sdk/client-bedrock-agent-runtime");

const client = new BedrockAgentRuntimeClient({
  region: process.env.AWS_REGION,
});

import middy from '@middy/core';
import httpJsonBodyParser from '@middy/http-json-body-parser';
import httpHeaderNormalizer from '@middy/http-header-normalizer';

exports.handler = 
  middy()
  .use(httpJsonBodyParser())
  .use(httpHeaderNormalizer())
  .handler(async (event, context) => {
    const { question, requestSessionId, modelId } = event.body;
    try{
      console.log('model', modelId);
      const input = {
        sessionId: requestSessionId,
        input: {
          text: question, 
        },
        retrieveAndGenerateConfiguration: {
          type: "KNOWLEDGE_BASE", 
          knowledgeBaseConfiguration: {
            knowledgeBaseId: process.env.KNOWLEDGE_BASE_ID,
            //Claude Instant v1.2 is a fast, affordable yet still very capable model, which can handle a range of tasks including casual dialogue, text analysis, summarization, and document question-answering.
            modelArn: modelId ? `arn:aws:bedrock:${process.env.AWS_REGION}::foundation-model/${modelId}` : `arn:aws:bedrock:${process.env.AWS_REGION}::foundation-model/anthropic.claude-instant-v1`,
          },
        },
      };
      const command = new RetrieveAndGenerateCommand(input);
      const response = await client.send(command);
      console.log('query response citation', response.citations);
      response.citations.forEach((c) => console.log("generatedResponsePart: ", c.generatedResponsePart, " retrievedReferences: ", c.retrievedReferences ))
      const location = response.citations[0]?.retrievedReferences[0]?.location
      const sourceType = location?.type

      switch(sourceType){
        case "S3":
          return makeResults(200, response.output.text, location?.s3Location.uri, response.sessionId);
        case "WEB":
          return makeResults(200, response.output.text, location?.webLocation.url, response.sessionId);
        default:
          return makeResults(200, response.output.text,null,response.sessionId);
      }
      
    } catch (err) {
      console.log(err);    
      return makeResults(500, "Server side error: please check function logs",null,null);
    }
});

function makeResults(statusCode,responseText,citationText,responseSessionId){
  return {
		statusCode: statusCode,
		body: JSON.stringify({
      response: responseText,
      citation: citationText,
      sessionId: responseSessionId
		}),
		headers: {
			'Access-Control-Allow-Origin': '*'
		}
	}; 
}