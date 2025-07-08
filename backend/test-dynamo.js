const { DynamoDBClient, ListTablesCommand } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand } = require('@aws-sdk/lib-dynamodb');

async function testConnection() {
  try {
    // Local DynamoDB configuration
    const clientConfig = {
      region: "us-east-1",
      endpoint: "http://localhost:8000",
      credentials: {
        accessKeyId: "fakeMyKeyId",
        secretAccessKey: "fakeSecretAccessKey"
      }
    };

    console.log('Connecting to DynamoDB with config:', clientConfig);
    
    const client = new DynamoDBClient(clientConfig);
    const docClient = DynamoDBDocumentClient.from(client);
    
    // List tables
    console.log('Listing tables...');
    const listResult = await client.send(new ListTablesCommand({}));
    console.log('Tables:', listResult.TableNames);
    
    // Try to get a user
    console.log('Trying to get user...');
    const userResult = await docClient.send(new GetCommand({
      TableName: "Users",
      Key: { email: "rootuser@sharp.com" }
    }));
    
    console.log('User:', userResult.Item);
    
    console.log('Test completed successfully');
  } catch (error) {
    console.error('Error:', error);
  }
}

testConnection(); 