const { DynamoDBClient, ListTablesCommand } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, ScanCommand } = require("@aws-sdk/lib-dynamodb");

// Configure client for local DynamoDB
const client = new DynamoDBClient({
  region: "us-east-1",
  endpoint: "http://localhost:8000",
  credentials: {
    accessKeyId: "fakeMyKeyId",
    secretAccessKey: "fakeSecretAccessKey"
  }
});

const docClient = DynamoDBDocumentClient.from(client);

async function listExistingTables() {
  try {
    const { TableNames } = await client.send(new ListTablesCommand({}));
    return TableNames || [];
  } catch (error) {
    console.error("Error listing tables:", error);
    return [];
  }
}

async function viewTable(tableName) {
  try {
    console.log(`\n📋 TABLE: ${tableName}`);
    console.log("─".repeat(50));
    
    const response = await docClient.send(new ScanCommand({
      TableName: tableName
    }));
    
    if (response.Items && response.Items.length > 0) {
      console.log(`📊 Found ${response.Items.length} entries:\n`);
      response.Items.forEach((item, index) => {
        console.log(`${index + 1}. ${JSON.stringify(item, null, 2)}`);
        console.log("");
      });
    } else {
      console.log("📭 No entries found\n");
    }
  } catch (error) {
    if (error.name === 'ResourceNotFoundException') {
      console.log(`❌ Table ${tableName} does not exist\n`);
    } else {
      console.log(`❌ Error reading ${tableName}: ${error.message}\n`);
    }
  }
}

async function viewDatabase() {
  console.log("👀 Viewing Sharp CRM Database\n");
  console.log("=====================================\n");
  
  // Get actual tables from DynamoDB
  const existingTables = await listExistingTables();
  console.log("📚 Available tables:", existingTables.join(", "), "\n");
  
  // View each table's contents
  for (const tableName of existingTables) {
    await viewTable(tableName);
  }
}

// Add command line argument support
const args = process.argv.slice(2);
if (args.length > 0) {
  const tableName = args[0];
  viewTable(tableName);
} else {
  viewDatabase();
} 