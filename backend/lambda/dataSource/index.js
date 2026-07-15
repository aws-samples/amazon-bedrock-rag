const {
  BedrockAgentClient,
  CreateDataSourceCommand,
  DeleteDataSourceCommand,
} = require("@aws-sdk/client-bedrock-agent");
const client = new BedrockAgentClient({ region: process.env.AWS_REGION });

const DATA_SOURCE_NAME = "WebCrawlerDataSource";
const KNOWLEDGE_BASE_TYPE = process.env.KNOWLEDGE_BASE_TYPE || "VECTOR";

const createDataSource = async () => {
  try {
    let dataSourceConfiguration;

    if (KNOWLEDGE_BASE_TYPE === "MANAGED") {
      // Managed KB: use MANAGED_KNOWLEDGE_BASE_CONNECTOR with WEB type
      dataSourceConfiguration = {
        type: "MANAGED_KNOWLEDGE_BASE_CONNECTOR",
        managedKnowledgeBaseConnectorConfiguration: {
          connectorParameters: {
            type: "WEB",
            version: "1",
            connectionConfiguration: {
              seedUrls: [
                "https://www.aboutamazon.com/news/amazon-offices",
                "https://www.aboutamazon.com/news/amazon-offices/amazon-headquarters-tour-seattle",
              ],
              authType: "NO_AUTH",
            },
          },
        },
      };
    } else {
      // Vector KB: use traditional WEB type with webConfiguration
      dataSourceConfiguration = {
        type: "WEB",
        webConfiguration: {
          sourceConfiguration: {
            urlConfiguration: {
              seedUrls: [
                { url: "https://www.aboutamazon.com/news/amazon-offices" },
                { url: "https://www.aboutamazon.com/news/amazon-offices/amazon-headquarters-tour-seattle" },
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
      };
    }

    const dataSourceInput = {
      knowledgeBaseId: process.env.KNOWLEDGE_BASE_ID,
      name: DATA_SOURCE_NAME,
      dataSourceConfiguration,
      dataDeletionPolicy: "DELETE",
    };
    const dataSourceCommand = new CreateDataSourceCommand(dataSourceInput);
    const dataSourceResponse = await client.send(dataSourceCommand);
    console.log("CreateDataSource response:", JSON.stringify(dataSourceResponse, null, 2));
    const dataSourceId = dataSourceResponse.dataSource?.dataSourceId;
    if (!dataSourceId) {
      console.log("ERROR: No dataSourceId in response");
      return {
        Status: "FAILED",
        Reason: "No dataSourceId in response",
      };
    }
    return {
      Status: "SUCCESS",
      PhysicalResourceId: dataSourceId,
      Data: {
        DataSourceId: dataSourceId,
        DataSourceName: DATA_SOURCE_NAME,
      },
    };
  } catch (e) {
    console.log("Error creating data source:", e);
    return {
      Status: "FAILED",
      Reason: e.message || String(e),
    };
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
