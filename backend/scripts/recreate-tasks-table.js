const { DynamoDBClient, CreateTableCommand, DeleteTableCommand, DescribeTableCommand } = require("@aws-sdk/client-dynamodb");

// Configure DynamoDB client for local development
const clientConfig = {
  region: "us-east-1",
  endpoint: "http://localhost:8000",
  credentials: {
    accessKeyId: "fakeMyKeyId",
    secretAccessKey: "fakeSecretAccessKey"
  }
};

const client = new DynamoDBClient(clientConfig);

async function tableExists(tableName) {
  try {
    await client.send(new DescribeTableCommand({ TableName: tableName }));
    return true;
  } catch (error) {
    if (error.name === 'ResourceNotFoundException') {
      return false;
    }
    throw error;
  }
}

async function recreateTasksTable() {
  const tableName = "Tasks";

  try {
    // Check if table exists
    const exists = await tableExists(tableName);
    
    // Delete table if it exists
    if (exists) {
      console.log(`Deleting existing ${tableName} table...`);
      await client.send(new DeleteTableCommand({ TableName: tableName }));
      console.log(`✓ ${tableName} table deleted`);
      
      // Wait for table to be deleted
      let tableDeleted = false;
      while (!tableDeleted) {
        try {
          await client.send(new DescribeTableCommand({ TableName: tableName }));
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          if (error.name === 'ResourceNotFoundException') {
            tableDeleted = true;
          }
        }
      }
    }

    // Create new table with updated schema
    console.log(`Creating new ${tableName} table...`);
    await client.send(new CreateTableCommand({
      TableName: tableName,
      KeySchema: [
        { AttributeName: "id", KeyType: "HASH" }
      ],
      AttributeDefinitions: [
        { AttributeName: "id", AttributeType: "S" },
        { AttributeName: "tenantId", AttributeType: "S" },
        { AttributeName: "assignedTo", AttributeType: "S" },
        { AttributeName: "createdBy", AttributeType: "S" },
        { AttributeName: "dueDate", AttributeType: "S" }
      ],
      GlobalSecondaryIndexes: [
        {
          IndexName: "TenantIdIndex",
          KeySchema: [
            { AttributeName: "tenantId", KeyType: "HASH" }
          ],
          Projection: {
            ProjectionType: "ALL"
          },
          ProvisionedThroughput: {
            ReadCapacityUnits: 5,
            WriteCapacityUnits: 5
          }
        },
        {
          IndexName: "AssignedToIndex",
          KeySchema: [
            { AttributeName: "assignedTo", KeyType: "HASH" }
          ],
          Projection: {
            ProjectionType: "ALL"
          },
          ProvisionedThroughput: {
            ReadCapacityUnits: 5,
            WriteCapacityUnits: 5
          }
        },
        {
          IndexName: "CreatedByIndex",
          KeySchema: [
            { AttributeName: "createdBy", KeyType: "HASH" }
          ],
          Projection: {
            ProjectionType: "ALL"
          },
          ProvisionedThroughput: {
            ReadCapacityUnits: 5,
            WriteCapacityUnits: 5
          }
        },
        {
          IndexName: "DueDateIndex",
          KeySchema: [
            { AttributeName: "dueDate", KeyType: "HASH" }
          ],
          Projection: {
            ProjectionType: "ALL"
          },
          ProvisionedThroughput: {
            ReadCapacityUnits: 5,
            WriteCapacityUnits: 5
          }
        }
      ],
      ProvisionedThroughput: {
        ReadCapacityUnits: 5,
        WriteCapacityUnits: 5
      }
    }));

    // Wait for table to be created
    let tableActive = false;
    while (!tableActive) {
      const result = await client.send(new DescribeTableCommand({ TableName: tableName }));
      if (result.Table?.TableStatus === 'ACTIVE') {
        tableActive = true;
      } else {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log(`✓ ${tableName} table created successfully with new schema`);
  } catch (error) {
    console.error('Error recreating table:', error);
    process.exit(1);
  }
}

// Run the script
recreateTasksTable(); 