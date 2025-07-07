const { DynamoDBClient, DeleteTableCommand, CreateTableCommand, waitUntilTableNotExists } = require("@aws-sdk/client-dynamodb");

// Use local DynamoDB configuration
const clientConfig = {
  region: "us-east-1",
  endpoint: "http://localhost:8000",
  credentials: {
    accessKeyId: "fakeMyKeyId",
    secretAccessKey: "fakeSecretAccessKey"
  }
};

const client = new DynamoDBClient(clientConfig);

const deleteDealsTable = async () => {
  try {
    await client.send(new DeleteTableCommand({ TableName: "Deals" }));
    console.log("Waiting for Deals table to be deleted...");
    await waitUntilTableNotExists(
      { client, maxWaitTime: 60 },
      { TableName: "Deals" }
    );
    console.log("Deals table deleted successfully");
  } catch (error) {
    if (error.name === 'ResourceNotFoundException') {
      console.log("Deals table doesn't exist");
    } else {
      throw error;
    }
  }
};

const createDealsTable = async () => {
  const params = {
    TableName: "Deals",
    KeySchema: [
      { AttributeName: "id", KeyType: "HASH" }
    ],
    AttributeDefinitions: [
      { AttributeName: "id", AttributeType: "S" },
      { AttributeName: "tenantId", AttributeType: "S" },
      { AttributeName: "dealOwner", AttributeType: "S" },
      { AttributeName: "stage", AttributeType: "S" },
      { AttributeName: "createdBy", AttributeType: "S" }
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: "TenantIdIndex",
        KeySchema: [
          { AttributeName: "tenantId", KeyType: "HASH" }
        ],
        Projection: {
          ProjectionType: "ALL"
        }
      },
      {
        IndexName: "DealOwnerIndex",
        KeySchema: [
          { AttributeName: "dealOwner", KeyType: "HASH" }
        ],
        Projection: {
          ProjectionType: "ALL"
        }
      },
      {
        IndexName: "StageIndex",
        KeySchema: [
          { AttributeName: "stage", KeyType: "HASH" }
        ],
        Projection: {
          ProjectionType: "ALL"
        }
      },
      {
        IndexName: "CreatedByIndex",
        KeySchema: [
          { AttributeName: "createdBy", KeyType: "HASH" }
        ],
        Projection: {
          ProjectionType: "ALL"
        }
      }
    ],
    BillingMode: "PAY_PER_REQUEST"
  };

  try {
    await client.send(new CreateTableCommand(params));
    console.log("Deals table created successfully");
  } catch (error) {
    console.error("Error creating Deals table:", error);
    throw error;
  }
};

const recreateDealsTable = async () => {
  try {
    await deleteDealsTable();
    await createDealsTable();
    console.log("Deals table recreation completed successfully!");
  } catch (error) {
    console.error("Error recreating Deals table:", error);
    process.exit(1);
  }
};

// Run the recreation process if this script is run directly
if (require.main === module) {
  recreateDealsTable();
} 