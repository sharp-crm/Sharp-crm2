const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, ScanCommand, UpdateCommand } = require("@aws-sdk/lib-dynamodb");

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
const docClient = DynamoDBDocumentClient.from(client);

async function addVisibleToFieldToContacts() {
  const tableName = "Contacts";
  
  try {
    console.log(`Adding visibleTo field to existing contacts in ${tableName} table...`);
    
    // Scan all contacts
    const scanResult = await docClient.send(new ScanCommand({
      TableName: tableName
    }));
    
    const contacts = scanResult.Items || [];
    console.log(`Found ${contacts.length} contacts to update`);
    
    let updatedCount = 0;
    
    for (const contact of contacts) {
      // Only update if visibleTo field doesn't exist or is null
      if (!contact.visibleTo) {
        try {
          await docClient.send(new UpdateCommand({
            TableName: tableName,
            Key: { id: contact.id },
            UpdateExpression: 'SET visibleTo = :visibleTo',
            ExpressionAttributeValues: {
              ':visibleTo': [] // Empty array means visible to all users
            }
          }));
          updatedCount++;
          console.log(`✓ Updated contact: ${contact.firstName} (${contact.id})`);
        } catch (error) {
          console.error(`✗ Failed to update contact ${contact.id}:`, error.message);
        }
      }
    }
    
    console.log(`\n✅ Migration completed successfully!`);
    console.log(`   - Total contacts found: ${contacts.length}`);
    console.log(`   - Contacts updated: ${updatedCount}`);
    console.log(`   - Contacts skipped: ${contacts.length - updatedCount}`);
    
  } catch (error) {
    console.error('❌ Error during migration:', error);
    process.exit(1);
  }
}

// Run the migration
if (require.main === module) {
  addVisibleToFieldToContacts();
}

module.exports = { addVisibleToFieldToContacts }; 