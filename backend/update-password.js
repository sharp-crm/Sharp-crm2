const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const bcrypt = require('bcryptjs');

async function updatePassword() {
  try {
    const email = 'rootuser@sharp.com';
    const newPassword = 'admin123';
    
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
    
    // Find user
    console.log('Looking up user:', email);
    const result = await docClient.send(new GetCommand({
      TableName: "Users",
      Key: { email }
    }));

    const user = result.Item;
    console.log('User found:', user ? 'Yes' : 'No');

    if (!user) {
      console.log('User not found');
      return;
    }

    // Hash new password
    console.log('Hashing new password...');
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    
    // Update password
    console.log('Updating password...');
    const updateResult = await docClient.send(new UpdateCommand({
      TableName: "Users",
      Key: { email },
      UpdateExpression: "set password = :password",
      ExpressionAttributeValues: {
        ":password": hashedPassword
      },
      ReturnValues: "ALL_NEW"
    }));
    
    console.log('Password updated successfully!');
    console.log('User:', {
      userId: updateResult.Attributes.userId,
      email: updateResult.Attributes.email,
      firstName: updateResult.Attributes.firstName,
      lastName: updateResult.Attributes.lastName,
      role: updateResult.Attributes.role
    });
    
  } catch (error) {
    console.error('Error:', error);
  }
}

updatePassword(); 