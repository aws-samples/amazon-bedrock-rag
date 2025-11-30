const {
  BedrockAgentClient,
  StartIngestionJobCommand,
} = require("@aws-sdk/client-bedrock-agent");
const client = new BedrockAgentClient({ region: process.env.AWS_REGION });

exports.handler = async (event, context) => {
  const input = {
    knowledgeBaseId: process.env.KNOWLEDGE_BASE_ID,
    dataSourceId: process.env.DATA_SOURCE_ID,
    clientToken: context.awsRequestId,
  };
  const command = new StartIngestionJobCommand(input);

  const response = await client.send(command);

  return JSON.stringify({
    ingestionJob: response.ingestionJob,
  });
};
