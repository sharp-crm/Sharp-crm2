const { DynamoDBClient, DeleteTableCommand } = require("@aws-sdk/client-dynamodb");

// Configure client for local DynamoDB
const client = new DynamoDBClient({
  region: "us-east-1",
  endpoint: "http://localhost:8000",
  credentials: {
    accessKeyId: "fakeMyKeyId",
    secretAccessKey: "fakeSecretAccessKey"
  }
});

async function deleteAccountsTable() {
  try {
    await client.send(new DeleteTableCommand({ TableName: "Accounts" }));
    console.log("✅ Accounts table deleted successfully");
  } catch (error) {
    if (error.name === 'ResourceNotFoundException') {
      console.log("⚠️ Accounts table does not exist");
    } else {
      console.error("❌ Error deleting Accounts table:", error);
      throw error;
    }
  }
}

deleteAccountsTable(); 