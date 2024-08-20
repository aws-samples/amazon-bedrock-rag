const {
  BedrockAgentClient,
  UpdateDataSourceCommand,
  GetDataSourceCommand,
} = require("@aws-sdk/client-bedrock-agent");

const client = new BedrockAgentClient({ region: process.env.AWS_REGION });

exports.handler = async (event, context) => {
  try {
    const body = JSON.parse(event.body);
    console.log("body", body);
    const newUrlsList = body.urlList;
    const newExclusionFilters = body.exclusionFilters
    const newInclusionFilters = body.inclusionFilters

    const input = {
      knowledgeBaseId: process.env.KNOWLEDGE_BASE_ID, // required
      dataSourceId: process.env.DATA_SOURCE_ID,
      dataSourceName: process.env.DATA_SOURCE_NAME // required
    };

    const newSeedUrlList = newUrlsList.map((url) => {
      return { url: url };
    });
    const updateInput = {
      knowledgeBaseId: input.knowledgeBaseId,
      dataSourceId: input.dataSourceId,
      name: input.dataSourceName,
      dataSourceConfiguration: {
        type: "WEB",
        webConfiguration: {
          sourceConfiguration: {
            urlConfiguration: {
              seedUrls: newSeedUrlList,
            },
          },
          crawlerConfiguration: {
            crawlerLimits: {
              rateLimit: 50,
            },
            scope: "HOST_ONLY",
            exclusionFilters: newExclusionFilters,
            inclusionFilters: newInclusionFilters,
          },
        },
      },
      dataDeletionPolicy: "DELETE",
    };

    console.log("update seed urls", newSeedUrlList);

    const updateCommand = new UpdateDataSourceCommand(updateInput);
    const updateResponse = await client.send(updateCommand);
    console.log("update response", updateResponse);
    return {
      statusCode: 200,
      body: JSON.stringify(updateResponse),
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
    };
  } catch (e) {
    console.log("Error", e);
  }
};
