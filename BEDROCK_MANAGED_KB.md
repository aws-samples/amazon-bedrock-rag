# Bedrock Managed Knowledge Base Support

## Changes
- CDK stack updated to create managed KBs via `addPropertyOverride` with `type: MANAGED`
- Added `MANAGED_KNOWLEDGE_BASE_CONNECTOR` data source type for managed ingestion
- KB creation uses `managedKnowledgeBaseConfiguration.embeddingModelType: MANAGED`
- Retrieval stack updated to use `managedSearchConfiguration` for managed KBs
- Added agentic retrieval example using `AgenticRetrieveStream`
- Existing VECTOR CDK paths preserved as alternate configuration

## Design
- VECTOR is the default for new KB deployments; MANAGED via --context knowledgeBaseType=MANAGED
- CDK `addPropertyOverride` used since L2 constructs don't yet support managed type natively
- AgenticRetrieveStream demonstrated in retrieval Lambda/function
- Backward compatible: existing VECTOR stacks unchanged, managed is opt-in via context

## API Shapes
- KB Creation: `type: MANAGED` + `managedKnowledgeBaseConfiguration.embeddingModelType: MANAGED`
- Data Source: `type: MANAGED_KNOWLEDGE_BASE_CONNECTOR`
- Retrieval: `managedSearchConfiguration` (not `vectorSearchConfiguration`)
- Agentic: `AgenticRetrieveStream` with `foundationModelType: MANAGED`, `rerankingModelType: MANAGED`

## Configuration
| Variable | Description | Default |
|---|---|---|
| KNOWLEDGE_BASE_TYPE | MANAGED or VECTOR (CDK context) | VECTOR |
| USE_AGENTIC_RETRIEVAL | Enable agentic retrieval | true |

## SDK Requirements
- boto3 >= 1.43 for managed search and agentic retrieval
- aws-cdk-lib >= 2.170.0 for KB L1 constructs

## Required IAM Permissions
```json
{
  "Effect": "Allow",
  "Action": [
    "bedrock:Retrieve",
    "bedrock:AgenticRetrieve"
  ],
  "Resource": "arn:aws:bedrock:<region>:<account-id>:knowledge-base/<kb-id>"
}
```
