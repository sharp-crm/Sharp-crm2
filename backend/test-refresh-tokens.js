const { DynamoDBClient, CreateTableCommand, DescribeTableCommand } = require('@aws-sdk/client-dynamodb');

const refreshTokensTable = 'SharpCRM-RefreshTokens-development';

async function testRefreshTokensTable() {
  try {
    console.log('🔍 Testing RefreshTokens table creation...');
    
    const client = new DynamoDBClient({ 
      region: process.env.AWS_REGION || 'us-east-1' 
    });
    
    console.log('🔍 DynamoDB client configured with region:', process.env.AWS_REGION || 'us-east-1');
    
    // First, try to describe the table to see if it exists
    try {
      await client.send(new DescribeTableCommand({
        TableName: refreshTokensTable
      }));
      console.log('✅ RefreshTokens table already exists:', refreshTokensTable);
      return true;
    } catch (error) {
      if (error.name === 'ResourceNotFoundException') {
        console.log('🔄 RefreshTokens table does not exist, creating...');
      } else {
        console.error('❌ Error checking table:', error);
        return false;
      }
    }
    
    // Create the table
    await client.send(new CreateTableCommand({
      TableName: refreshTokensTable,
      KeySchema: [
        { AttributeName: "jti", KeyType: "HASH" }
      ],
      AttributeDefinitions: [
        { AttributeName: "jti", AttributeType: "S" },
        { AttributeName: "userId", AttributeType: "S" }
      ],
      GlobalSecondaryIndexes: [
        {
          IndexName: "UserTokensIndex",
          KeySchema: [
            { AttributeName: "userId", KeyType: "HASH" }
          ],
          Projection: {
            ProjectionType: "ALL"
          }
        }
      ],
      BillingMode: "PAY_PER_REQUEST"
    }));
    
    console.log('✅ RefreshTokens table created successfully:', refreshTokensTable);
    return true;
  } catch (error) {
    console.error('❌ Failed to create RefreshTokens table:', error);
    return false;
  }
}

testRefreshTokensTable()
  .then(success => {
    if (success) {
      console.log('🎉 RefreshTokens table test completed successfully!');
    } else {
      console.log('❌ RefreshTokens table test failed!');
    }
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('❌ Test failed with error:', error);
    process.exit(1);
  }); 