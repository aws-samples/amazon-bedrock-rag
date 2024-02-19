const {
  BedrockAgentClient,
  StartIngestionJobCommand,
} = require("@aws-sdk/client-bedrock-agent"); // CommonJS import
const client = new BedrockAgentClient({ region: process.env.AWS_REGION });

exports.handler = async (event, context) => {
  const input = {
    // StartIngestionJobRequest
    knowledgeBaseId: process.env.KNOWLEDGE_BASE_ID, // required
    dataSourceId: process.env.DATA_SOURCE_ID, // required
    clientToken: context.awsRequestId, // required
  };
  const command = new StartIngestionJobCommand(input);

  const response = await client.send(command);
  console.log(response);

  return JSON.stringify({
    ingestionJob: response.ingestionJob,
  });
};
