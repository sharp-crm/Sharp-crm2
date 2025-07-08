const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand } = require('@aws-sdk/lib-dynamodb');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

async function testLogin() {
  try {
    const email = 'rootuser@sharp.com';
    const password = 'admin123';
    const JWT_SECRET = 'your-secret-key';
    
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

    // Check if user is soft deleted
    if (user.isDeleted) {
      console.log('User is soft deleted');
      return;
    }

    // Verify password
    console.log('Verifying password...');
    const isValidPassword = await bcrypt.compare(password, user.password);
    console.log('Password valid:', isValidPassword);

    if (!isValidPassword) {
      console.log('Invalid password');
      return;
    }

    // Generate token
    console.log('Generating token...');
    const accessToken = jwt.sign(
      { 
        userId: user.userId, 
        email: user.email, 
        role: user.role,
        tenantId: user.tenantId
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    console.log('Login successful!');
    console.log('Access token:', accessToken);
    console.log('User:', {
      userId: user.userId,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      tenantId: user.tenantId
    });
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testLogin(); 