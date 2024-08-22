const {
  BedrockAgentClient,
  CreateDataSourceCommand,
  DeleteDataSourceCommand,
} = require("@aws-sdk/client-bedrock-agent");
const client = new BedrockAgentClient({ region: process.env.AWS_REGION });

const DATA_SOURCE_NAME = "WebCrawlerDataSource";

const createDataSource = async () => {
  try {
    const dataSourceInput = {
      knowledgeBaseId: process.env.KNOWLEDGE_BASE_ID,
      name: DATA_SOURCE_NAME,
      dataSourceConfiguration: {
        type: "WEB",
        webConfiguration: {
          sourceConfiguration: {
            urlConfiguration: {
              seedUrls: [
                // SeedUrls
                {
                  url: "https://www.aboutamazon.com/news/amazon-offices",
                },
              ],
            },
          },
          crawlerConfiguration: {
            crawlerLimits: {
              rateLimit: 50,
            },
            scope: "HOST_ONLY",
            exclusionFilters: [".*plants.*"],
            inclusionFilters: [
              "^https?://www.aboutamazon.com/news/amazon-offices/.*$",
            ],
          },
        },
      },
      dataDeletionPolicy: "DELETE",
    };
    const dataSourceCommand = new CreateDataSourceCommand(dataSourceInput);
    const dataSourceResponse = await client.send(dataSourceCommand);
    return {
      Status: "SUCCESS",
      PhysicalResourceId: dataSourceResponse.dataSource?.dataSourceId,
      Data: {
        DataSourceId: dataSourceResponse.dataSource?.dataSourceId,
        DataSourceName: DATA_SOURCE_NAME,
      },
    };
  } catch (e) {
    console.log("Error", e);
  }
};

const deleteDataSource = async (dataSourceId) => {
  try {
    const deleteInput = {
      knowledgeBaseId: process.env.KNOWLEDGE_BASE_ID,
      dataSourceId: dataSourceId,
    };

    const deleteCommand = new DeleteDataSourceCommand(deleteInput);
    await client.send(deleteCommand);
    return {
      Status: "SUCCESS",
    };
  } catch (e) {
    console.log("Error", e);
  }
};

exports.handler = async (event, context) => {
  switch (event.RequestType) {
    case "Create":
      return await createDataSource();
    case "Delete":
      return await deleteDataSource(event.PhysicalResourceId);
    default:
      console.log("event", event);
  }
};
