const {
  BedrockAgentClient,
  GetDataSourceCommand,
} = require("@aws-sdk/client-bedrock-agent");
const client = new BedrockAgentClient({ region: process.env.AWS_REGION });

exports.handler = async (event, context) => {
  try {
    const input = {
      knowledgeBaseId: process.env.KNOWLEDGE_BASE_ID,
      dataSourceId: process.env.DATA_SOURCE_ID,
    };
    const getCommand = new GetDataSourceCommand(input);
    const response = await client.send(getCommand);
    console.log("get response", response);
    const webConfiguration =
      response?.dataSource?.dataSourceConfiguration.webConfiguration;

    if (!webConfiguration) {
      return;
    }
    const seedUrlList =
      webConfiguration.sourceConfiguration?.urlConfiguration?.seedUrls;
    const exclusionFilters =
      webConfiguration.crawlerConfiguration?.exclusionFilters;
    const inclusionFilters =
      webConfiguration.crawlerConfiguration?.inclusionFilters;

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        seedUrlList: seedUrlList,
        exclusionFilters: exclusionFilters,
        inclusionFilters: inclusionFilters,
      }),
    };
  } catch (e) {
    console.log("Error", e);
  }
};
