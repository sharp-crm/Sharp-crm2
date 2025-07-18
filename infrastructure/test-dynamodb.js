#!/usr/bin/env node

import AWS from 'aws-sdk';
import dotenv from 'dotenv';

dotenv.config();

// Configure AWS
AWS.config.update({
  region: process.env.AWS_REGION || 'us-east-1'
});

const dynamodb = new AWS.DynamoDB.DocumentClient();

// Test tables (update these with your actual table names after deployment)
const tables = [
  'SharpCRM-Users-development',
  'SharpCRM-RefreshTokens-development',
  'SharpCRM-Contacts-development',
  'SharpCRM-Leads-development',
  'SharpCRM-Deals-development',
  'SharpCRM-Tasks-development',
  'SharpCRM-Subsidiaries-development',
  'SharpCRM-Dealers-development',
  'SharpCRM-Notifications-development',
  'SharpCRM-Reports-development'
];

async function testTableConnection(tableName) {
  try {
    const params = {
      TableName: tableName,
      Limit: 1
    };
    
    const result = await dynamodb.scan(params).promise();
    console.log(`✅ ${tableName}: Connection successful (${result.Count} items)`);
    return true;
  } catch (error) {
    console.error(`❌ ${tableName}: Connection failed - ${error.message}`);
    return false;
  }
}

async function testAllTables() {
  console.log('🔄 Testing DynamoDB table connections...\n');
  
  const results = [];
  
  for (const tableName of tables) {
    const success = await testTableConnection(tableName);
    results.push({ tableName, success });
  }
  
  console.log('\n📊 Summary:');
  console.log('====================');
  
  const successful = results.filter(r => r.success).length;
  const total = results.length;
  
  console.log(`Successful connections: ${successful}/${total}`);
  
  if (successful === total) {
    console.log('🎉 All tables are accessible!');
  } else {
    console.log('⚠️  Some tables are not accessible. Check your AWS configuration.');
  }
  
  return successful === total;
}

async function testCreateUser() {
  console.log('\n🔄 Testing user creation...');
  
  const testUser = {
    userId: 'test-user-123',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    role: 'TEST_USER',
    tenantId: 'test-tenant',
    password: 'hashed-password',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isDeleted: false
  };
  
  try {
    // Create user
    await dynamodb.put({
      TableName: 'SharpCRM-Users-development',
      Item: testUser
    }).promise();
    
    console.log('✅ User created successfully');
    
    // Read user back
    const result = await dynamodb.get({
      TableName: 'SharpCRM-Users-development',
      Key: { email: testUser.email }
    }).promise();
    
    if (result.Item) {
      console.log('✅ User retrieved successfully');
      console.log('   User details:', {
        email: result.Item.email,
        firstName: result.Item.firstName,
        lastName: result.Item.lastName,
        role: result.Item.role
      });
    } else {
      console.log('❌ User not found after creation');
    }
    
    // Clean up - delete test user
    await dynamodb.delete({
      TableName: 'SharpCRM-Users-development',
      Key: { email: testUser.email }
    }).promise();
    
    console.log('✅ Test user cleaned up');
    
  } catch (error) {
    console.error('❌ User creation test failed:', error.message);
  }
}

async function main() {
  console.log('🚀 DynamoDB Connection Test');
  console.log('============================\n');
  
  // Test AWS credentials
  try {
    const sts = new AWS.STS();
    const identity = await sts.getCallerIdentity().promise();
    console.log('✅ AWS credentials are valid');
    console.log(`   Account: ${identity.Account}`);
    console.log(`   User: ${identity.Arn}\n`);
  } catch (error) {
    console.error('❌ AWS credentials are invalid:', error.message);
    console.log('\nPlease run: aws configure');
    process.exit(1);
  }
  
  // Test table connections
  const allTablesWorking = await testAllTables();
  
  if (allTablesWorking) {
    // Test actual operations
    await testCreateUser();
  }
  
  console.log('\n🏁 Test completed!');
}

// Run the test
main().catch(console.error);
