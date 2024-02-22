const {
  BedrockAgentRuntimeClient,
  RetrieveAndGenerateCommand,
} = require("@aws-sdk/client-bedrock-agent-runtime");

const client = new BedrockAgentRuntimeClient({
  region: process.env.AWS_REGION,
});

const middy = require('@middy/core');
const httpJsonBodyParser = require('@middy/http-json-body-parser');
const httpHeaderNormalizer = require('@middy/http-header-normalizer');

exports.handler = 
  middy()
  .use(httpJsonBodyParser())
  .use(httpHeaderNormalizer())
  .handler(async (event, context) => {
    const { question } = event.body;
    try{
      const input = {
        input: {
          text: question, 
        },
        retrieveAndGenerateConfiguration: {
          type: "KNOWLEDGE_BASE", 
          knowledgeBaseConfiguration: {
            knowledgeBaseId: process.env.KNOWLEDGE_BASE_ID,
            modelArn: `arn:aws:bedrock:${process.env.AWS_REGION}::foundation-model/anthropic.claude-v2`,
          },
        },
      };
      const command = new RetrieveAndGenerateCommand(input);
      const response = await client.send(command);
      const reference = response.citations[0]?.retrievedReferences[0]?.location.s3Location.uri;
      return makeResults(200, response.output.text, reference);
    } catch (err) {
      console.log(err);    
      return makeResults(500, "Server side error: please check function logs",null);
    }
});

function makeResults(statusCode,responseText,citationText){
  return {
		statusCode: statusCode,
		body: JSON.stringify({
      response: responseText,
      citation: citationText,
		}),
		headers: {
			'Access-Control-Allow-Origin': '*'
		}
	}; 
}