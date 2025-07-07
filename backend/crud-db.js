const { DynamoDBClient, ListTablesCommand } = require("@aws-sdk/client-dynamodb");
const { 
  DynamoDBDocumentClient, 
  PutCommand, 
  GetCommand, 
  UpdateCommand, 
  DeleteCommand,
  ScanCommand
} = require("@aws-sdk/lib-dynamodb");
const { v4: uuidv4 } = require('uuid');
const readline = require('readline');

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
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Create a new item
async function createItem(tableName, item) {
  try {
    const timestamp = new Date().toISOString();
    const newItem = {
      ...item,
      id: item.id || uuidv4(),
      createdAt: timestamp,
      updatedAt: timestamp,
      isDeleted: false
    };

    await docClient.send(new PutCommand({
      TableName: tableName,
      Item: newItem
    }));

    console.log(`✅ Successfully created item in ${tableName}`);
    return newItem;
  } catch (error) {
    console.error(`❌ Error creating item in ${tableName}:`, error);
    throw error;
  }
}

// Read an item by ID
async function getItem(tableName, id) {
  try {
    const response = await docClient.send(new GetCommand({
      TableName: tableName,
      Key: { id }
    }));

    if (!response.Item) {
      console.log(`⚠️ No item found in ${tableName} with id: ${id}`);
      return null;
    }

    console.log(`✅ Successfully retrieved item from ${tableName}`);
    return response.Item;
  } catch (error) {
    console.error(`❌ Error getting item from ${tableName}:`, error);
    throw error;
  }
}

// Update an item
async function updateItem(tableName, id, updates) {
  try {
    const existingItem = await getItem(tableName, id);
    if (!existingItem) {
      throw new Error(`Item with id ${id} not found in ${tableName}`);
    }

    const updateExpression = [];
    const expressionAttributeNames = {};
    const expressionAttributeValues = {};

    Object.entries(updates).forEach(([key, value]) => {
      if (key !== 'id') {
        updateExpression.push(`#${key} = :${key}`);
        expressionAttributeNames[`#${key}`] = key;
        expressionAttributeValues[`:${key}`] = value;
      }
    });

    updateExpression.push('#updatedAt = :updatedAt');
    expressionAttributeNames['#updatedAt'] = 'updatedAt';
    expressionAttributeValues[':updatedAt'] = new Date().toISOString();

    const response = await docClient.send(new UpdateCommand({
      TableName: tableName,
      Key: { id },
      UpdateExpression: `SET ${updateExpression.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW'
    }));

    console.log(`✅ Successfully updated item in ${tableName}`);
    return response.Attributes;
  } catch (error) {
    console.error(`❌ Error updating item in ${tableName}:`, error);
    throw error;
  }
}

// Soft delete an item
async function softDeleteItem(tableName, id) {
  try {
    const response = await docClient.send(new UpdateCommand({
      TableName: tableName,
      Key: { id },
      UpdateExpression: 'SET #isDeleted = :isDeleted, #deletedAt = :deletedAt',
      ExpressionAttributeNames: {
        '#isDeleted': 'isDeleted',
        '#deletedAt': 'deletedAt'
      },
      ExpressionAttributeValues: {
        ':isDeleted': true,
        ':deletedAt': new Date().toISOString()
      },
      ReturnValues: 'ALL_NEW'
    }));

    console.log(`✅ Successfully soft deleted item from ${tableName}`);
    return response.Attributes;
  } catch (error) {
    console.error(`❌ Error soft deleting item from ${tableName}:`, error);
    throw error;
  }
}

// Hard delete an item
async function hardDeleteItem(tableName, id) {
  try {
    await docClient.send(new DeleteCommand({
      TableName: tableName,
      Key: { id }
    }));

    console.log(`✅ Successfully deleted item from ${tableName}`);
    return true;
  } catch (error) {
    console.error(`❌ Error deleting item from ${tableName}:`, error);
    throw error;
  }
}

// List all items in a table
async function listItems(tableName, filterExpression = null) {
  try {
    const params = {
      TableName: tableName
    };

    if (filterExpression) {
      params.FilterExpression = filterExpression;
      params.ExpressionAttributeValues = {
        ':false': false
      };
    }

    const response = await docClient.send(new ScanCommand(params));
    console.log(`✅ Successfully retrieved items from ${tableName}`);
    return response.Items || [];
  } catch (error) {
    console.error(`❌ Error listing items from ${tableName}:`, error);
    throw error;
  }
}

// Get list of tables
async function listTables() {
  try {
    const { TableNames } = await client.send(new ListTablesCommand({}));
    return TableNames || [];
  } catch (error) {
    console.error("Error listing tables:", error);
    return [];
  }
}

// Helper function to ask questions
function ask(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

// Menu-driven interface
async function showMenu() {
  while (true) {
    console.clear();
    console.log("\n🗄️  DynamoDB Manager");
    console.log("==================\n");
    console.log("1. List All Tables");
    console.log("2. View Table Contents");
    console.log("3. Create New Item");
    console.log("4. Get Item by ID");
    console.log("5. Update Item");
    console.log("6. Soft Delete Item");
    console.log("7. Hard Delete Item");
    console.log("8. View Active Items");
    console.log("9. Exit\n");

    const choice = await ask("Enter your choice (1-9): ");

    try {
      switch (choice) {
        case "1": {
          const tables = await listTables();
          console.log("\nAvailable Tables:");
          console.log("----------------");
          tables.forEach((table, index) => {
            console.log(`${index + 1}. ${table}`);
          });
          await ask("\nPress Enter to continue...");
          break;
        }

        case "2": {
          const tables = await listTables();
          console.log("\nAvailable Tables:");
          tables.forEach((table, index) => {
            console.log(`${index + 1}. ${table}`);
          });
          const tableIndex = parseInt(await ask("\nSelect table number: ")) - 1;
          if (tableIndex >= 0 && tableIndex < tables.length) {
            const items = await listItems(tables[tableIndex]);
            console.log("\nTable Contents:");
            console.log("--------------");
            items.forEach((item, index) => {
              console.log(`\n${index + 1}. ${JSON.stringify(item, null, 2)}`);
            });
          }
          await ask("\nPress Enter to continue...");
          break;
        }

        case "3": {
          const tables = await listTables();
          console.log("\nAvailable Tables:");
          tables.forEach((table, index) => {
            console.log(`${index + 1}. ${table}`);
          });
          const tableIndex = parseInt(await ask("\nSelect table number: ")) - 1;
          if (tableIndex >= 0 && tableIndex < tables.length) {
            const tableName = tables[tableIndex];
            console.log("\nEnter item details (in JSON format):");
            const itemStr = await ask("");
            const item = JSON.parse(itemStr);
            const newItem = await createItem(tableName, item);
            console.log("\nCreated Item:", JSON.stringify(newItem, null, 2));
          }
          await ask("\nPress Enter to continue...");
          break;
        }

        case "4": {
          const tables = await listTables();
          console.log("\nAvailable Tables:");
          tables.forEach((table, index) => {
            console.log(`${index + 1}. ${table}`);
          });
          const tableIndex = parseInt(await ask("\nSelect table number: ")) - 1;
          if (tableIndex >= 0 && tableIndex < tables.length) {
            const tableName = tables[tableIndex];
            const id = await ask("Enter item ID: ");
            const item = await getItem(tableName, id);
            if (item) {
              console.log("\nItem found:", JSON.stringify(item, null, 2));
            }
          }
          await ask("\nPress Enter to continue...");
          break;
        }

        case "5": {
          const tables = await listTables();
          console.log("\nAvailable Tables:");
          tables.forEach((table, index) => {
            console.log(`${index + 1}. ${table}`);
          });
          const tableIndex = parseInt(await ask("\nSelect table number: ")) - 1;
          if (tableIndex >= 0 && tableIndex < tables.length) {
            const tableName = tables[tableIndex];
            const id = await ask("Enter item ID: ");
            console.log("\nEnter updates (in JSON format):");
            const updatesStr = await ask("");
            const updates = JSON.parse(updatesStr);
            const updatedItem = await updateItem(tableName, id, updates);
            console.log("\nUpdated Item:", JSON.stringify(updatedItem, null, 2));
          }
          await ask("\nPress Enter to continue...");
          break;
        }

        case "6": {
          const tables = await listTables();
          console.log("\nAvailable Tables:");
          tables.forEach((table, index) => {
            console.log(`${index + 1}. ${table}`);
          });
          const tableIndex = parseInt(await ask("\nSelect table number: ")) - 1;
          if (tableIndex >= 0 && tableIndex < tables.length) {
            const tableName = tables[tableIndex];
            const id = await ask("Enter item ID: ");
            await softDeleteItem(tableName, id);
          }
          await ask("\nPress Enter to continue...");
          break;
        }

        case "7": {
          const tables = await listTables();
          console.log("\nAvailable Tables:");
          tables.forEach((table, index) => {
            console.log(`${index + 1}. ${table}`);
          });
          const tableIndex = parseInt(await ask("\nSelect table number: ")) - 1;
          if (tableIndex >= 0 && tableIndex < tables.length) {
            const tableName = tables[tableIndex];
            const id = await ask("Enter item ID: ");
            await hardDeleteItem(tableName, id);
          }
          await ask("\nPress Enter to continue...");
          break;
        }

        case "8": {
          const tables = await listTables();
          console.log("\nAvailable Tables:");
          tables.forEach((table, index) => {
            console.log(`${index + 1}. ${table}`);
          });
          const tableIndex = parseInt(await ask("\nSelect table number: ")) - 1;
          if (tableIndex >= 0 && tableIndex < tables.length) {
            const items = await listItems(tables[tableIndex], "isDeleted = :false");
            console.log("\nActive Items:");
            console.log("-------------");
            items.forEach((item, index) => {
              console.log(`\n${index + 1}. ${JSON.stringify(item, null, 2)}`);
            });
          }
          await ask("\nPress Enter to continue...");
          break;
        }

        case "9": {
          console.log("\nGoodbye! 👋\n");
          rl.close();
          process.exit(0);
        }

        default: {
          console.log("\n❌ Invalid choice. Please try again.");
          await ask("\nPress Enter to continue...");
        }
      }
    } catch (error) {
      console.error("\n❌ Error:", error.message);
      await ask("\nPress Enter to continue...");
    }
  }
}

// Start the menu
showMenu(); 