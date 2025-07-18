# AWS DynamoDB Deployment Guide

## Step 1: Configure AWS Credentials

Before deploying, you need to configure your AWS credentials:

```bash
aws configure
```

Enter your:
- **AWS Access Key ID**: (from AWS Console -> IAM -> Users -> Your User -> Security Credentials)
- **AWS Secret Access Key**: (from the same location)
- **Default region**: `us-east-1`
- **Default output format**: `json`

Verify your credentials work:
```bash
aws sts get-caller-identity
```

## Step 2: Deploy to AWS

Navigate to the infrastructure directory:
```bash
cd /Users/tejaswin/Downloads/sharp-crm-aws-3/infrastructure
```

### Option A: Guided Deployment (Recommended for first time)
```bash
sam deploy --guided
```

This will prompt you for:
- **Stack Name**: `sharp-crm-infrastructure` (or your choice)
- **AWS Region**: `us-east-1` (default)
- **Parameter Environment**: `development` (default)
- **Parameter TablePrefix**: `SharpCRM` (default)
- **Confirm changes before deploy**: `Y`
- **Allow SAM CLI IAM role creation**: `Y`
- **Disable rollback**: `N`

### Option B: Quick Deployment (After first deployment)
```bash
sam build && sam deploy
```

### Option C: Deploy to Production
```bash
sam deploy --config-env production
```

## Step 3: Verify Deployment

After deployment, you'll see output like:
```
CloudFormation outputs from deployed stack
----------------------------------------------------------------
Outputs                                                                                                                                                                                                  
----------------------------------------------------------------
Key                 ContactsTableName                                                                                                                                                                    
Description         Name of the Contacts DynamoDB table                                                                                                                                                 
Value               SharpCRM-Contacts-development                                                                                                                                                        

Key                 UsersTableName                                                                                                                                                                       
Description         Name of the Users DynamoDB table                                                                                                                                                    
Value               SharpCRM-Users-development                                                                                                                                                           
----------------------------------------------------------------
```

## Step 4: View in AWS Console

1. Go to AWS Console → DynamoDB → Tables
2. You should see all your tables created:
   - `SharpCRM-Users-development`
   - `SharpCRM-RefreshTokens-development`
   - `SharpCRM-Contacts-development`
   - `SharpCRM-Leads-development`
   - `SharpCRM-Deals-development`
   - `SharpCRM-Tasks-development`
   - `SharpCRM-Subsidiaries-development`
   - `SharpCRM-Dealers-development`
   - `SharpCRM-Notifications-development`
   - `SharpCRM-Reports-development`

## Step 5: Update Your Backend Configuration

After deployment, update your backend's `.env` file:

```env
# DynamoDB Configuration
DYNAMODB_LOCAL=false
NODE_ENV=production
AWS_REGION=us-east-1

# Table Names (use actual names from deployment output)
USERS_TABLE_NAME=SharpCRM-Users-development
REFRESH_TOKENS_TABLE_NAME=SharpCRM-RefreshTokens-development
CONTACTS_TABLE_NAME=SharpCRM-Contacts-development
LEADS_TABLE_NAME=SharpCRM-Leads-development
DEALS_TABLE_NAME=SharpCRM-Deals-development
TASKS_TABLE_NAME=SharpCRM-Tasks-development
SUBSIDIARIES_TABLE_NAME=SharpCRM-Subsidiaries-development
DEALERS_TABLE_NAME=SharpCRM-Dealers-development
NOTIFICATIONS_TABLE_NAME=SharpCRM-Notifications-development
REPORTS_TABLE_NAME=SharpCRM-Reports-development
```

## Step 6: Test Connection

Create a simple test script to verify your backend can connect to DynamoDB:

```javascript
// test-dynamodb.js
const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient({
  region: process.env.AWS_REGION || 'us-east-1'
});

async function testConnection() {
  try {
    const params = {
      TableName: 'SharpCRM-Users-development',
      Limit: 1
    };
    
    const result = await dynamodb.scan(params).promise();
    console.log('✅ DynamoDB connection successful!');
    console.log('Table scan result:', result);
  } catch (error) {
    console.error('❌ DynamoDB connection failed:', error);
  }
}

testConnection();
```

Run the test:
```bash
node test-dynamodb.js
```

## Common Issues and Solutions

### Issue 1: "Unable to locate credentials"
**Solution**: Run `aws configure` to set up your credentials.

### Issue 2: "Access Denied"
**Solution**: Make sure your AWS user has the necessary permissions:
- DynamoDB full access
- CloudFormation full access
- IAM role creation permissions

### Issue 3: "Stack already exists"
**Solution**: Use `sam deploy` without `--guided` for updates, or delete the stack first:
```bash
aws cloudformation delete-stack --stack-name sharp-crm-infrastructure
```

### Issue 4: "Table already exists"
**Solution**: Change the `TablePrefix` parameter or `Environment` parameter to use different table names.

## Cost Monitoring

Monitor your costs in AWS Console:
1. Go to AWS Console → Billing → Cost Explorer
2. Filter by Service: DynamoDB
3. Set up billing alerts if needed

With PAY_PER_REQUEST billing, you'll only pay for:
- Read/write operations
- Storage
- Backup (if enabled)

## Cleanup

To delete all resources:
```bash
aws cloudformation delete-stack --stack-name sharp-crm-infrastructure
```

Or using SAM:
```bash
sam delete --stack-name sharp-crm-infrastructure
```

## Next Steps

1. **Update your backend code** to use the deployed table names
2. **Test your application** with the real DynamoDB tables
3. **Set up monitoring** and alerts
4. **Create a production deployment** when ready
5. **Set up CI/CD** for automated deployments

## Environment Variables for Backend

Add these to your backend `.env` file:

```env
# AWS Configuration
AWS_REGION=us-east-1
NODE_ENV=production
DYNAMODB_LOCAL=false

# DynamoDB Table Names (update with actual deployed names)
USERS_TABLE=SharpCRM-Users-development
REFRESH_TOKENS_TABLE=SharpCRM-RefreshTokens-development
CONTACTS_TABLE=SharpCRM-Contacts-development
LEADS_TABLE=SharpCRM-Leads-development
DEALS_TABLE=SharpCRM-Deals-development
TASKS_TABLE=SharpCRM-Tasks-development
SUBSIDIARIES_TABLE=SharpCRM-Subsidiaries-development
DEALERS_TABLE=SharpCRM-Dealers-development
NOTIFICATIONS_TABLE=SharpCRM-Notifications-development
REPORTS_TABLE=SharpCRM-Reports-development
```
