const {
  BedrockAgentRuntimeClient,
  RetrieveAndGenerateCommand,
} = require("@aws-sdk/client-bedrock-agent-runtime");

const client = new BedrockAgentRuntimeClient({
  region: process.env.AWS_REGION,
});

exports.handler = async (event, context) => {
  const question = event.body;
  try{
    const input = {
      // RetrieveAndGenerateRequest
      input: {
        // RetrieveAndGenerateInput
        text: question, // required
      },
      retrieveAndGenerateConfiguration: {
        // RetrieveAndGenerateConfiguration
        type: "KNOWLEDGE_BASE", // required
        knowledgeBaseConfiguration: {
          // KnowledgeBaseRetrieveAndGenerateConfiguration
          knowledgeBaseId: process.env.KNOWLEDGE_BASE_ID, // required
          modelArn: `arn:aws:bedrock:${process.env.AWS_REGION}::foundation-model/anthropic.claude-v2`, // required
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
};
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