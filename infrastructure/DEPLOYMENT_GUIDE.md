# SharpCRM Deployment Guide

This guide covers the deployment process for the SharpCRM application using AWS SAM (Serverless Application Model).

## Prerequisites

Before deploying, ensure you have:

1. **AWS CLI** installed and configured
   ```bash
   aws configure
   ```

2. **AWS SAM CLI** installed
   ```bash
   # Install via pip
   pip install aws-sam-cli
   
   # Or via installer (Windows/Mac/Linux)
   # See: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-sam-cli-install.html
   ```

3. **Node.js 18+** installed
4. **Valid AWS credentials** with appropriate permissions

## Required AWS Permissions

Your AWS user/role needs the following permissions:
- CloudFormation (full access)
- Lambda (full access)
- API Gateway (full access)
- DynamoDB (full access)
- IAM (role creation)
- S3 (for SAM artifacts)
- SES (Simple Email Service)

## Pre-Deployment Steps

### 1. Build the Backend
```bash
cd backend
npm install
npm run build:all
```

### 2. Install Frontend Dependencies (Optional)
```bash
cd frontend
npm install
```

### 3. Set Up Environment Variables
Ensure your AWS credentials are configured:
```bash
aws configure list
```

## Deployment Process

### 1. Navigate to Infrastructure Directory
```bash
cd infrastructure
```

### 2. Deploy the Stack
```bash
# First deployment (guided)
sam deploy --guided --stack-name sharp-crm-infrastructure

# Subsequent deployments
sam deploy --stack-name sharp-crm-infrastructure
```

### 3. Deployment Parameters
During the guided deployment, you'll be prompted for:

- **Stack Name**: `sharp-crm-infrastructure`
- **AWS Region**: `us-east-1` (recommended)
- **Environment**: `development` or `production`
- **TablePrefix**: `SharpCRM` (default)
- **JWTSecret**: Your JWT secret key
- **JWTRefreshSecret**: Your JWT refresh secret key
- **DomainName**: Your domain (if applicable)

## Post-Deployment Steps

### 1. Initialize Database Tables
```bash
cd ../backend
npm run init-db:global
```

### 2. Verify Deployment
Check the CloudFormation stack in AWS Console:
- Go to CloudFormation service
- Find your stack: `sharp-crm-infrastructure`
- Verify all resources are created successfully

### 3. Get API Gateway URL
From the CloudFormation outputs, note the `BackendApiUrl` value.

### 4. Configure Frontend
Update your frontend environment variables:
```bash
# In frontend/.env or as environment variable
VITE_API_URL=https://your-api-gateway-url.amazonaws.com/development/api
```

### 5. Set Up AWS SES (Email Service)
1. Go to AWS SES Console
2. Verify your sender email address
3. Request production access (to send to unverified emails)

## Environment-Specific Deployments

### Development
```bash
sam deploy --stack-name sharp-crm-dev --parameter-overrides Environment=development
```

### Production
```bash
sam deploy --stack-name sharp-crm-prod --parameter-overrides Environment=production
```

## Troubleshooting

### Common Issues

1. **Reserved Environment Variable Error**
   - Error: `AWS_REGION is a reserved environment variable`
   - Solution: This is already fixed in the template

2. **Permission Denied**
   - Ensure your AWS user has sufficient permissions
   - Check IAM policies

3. **Build Failures**
   - Run `npm run build:all` in backend directory
   - Ensure all TypeScript files compile successfully

4. **Email Service Issues**
   - Verify sender email in SES
   - Check SES sandbox mode restrictions
   - Request production access for SES

### Debugging

1. **Check CloudFormation Events**
   ```bash
   aws cloudformation describe-stack-events --stack-name sharp-crm-infrastructure
   ```

2. **View Lambda Logs**
   ```bash
   aws logs describe-log-groups --log-group-name-prefix /aws/lambda/SharpCRM
   ```

3. **Test API Endpoints**
   ```bash
   curl https://your-api-gateway-url.amazonaws.com/development/health
   ```

## Rollback

If deployment fails or you need to rollback:

```bash
# Delete the stack
aws cloudformation delete-stack --stack-name sharp-crm-infrastructure

# Or rollback to previous version
aws cloudformation cancel-update-stack --stack-name sharp-crm-infrastructure
```

## Clean Up

To remove all resources:

```bash
# Delete CloudFormation stack
aws cloudformation delete-stack --stack-name sharp-crm-infrastructure

# Clean up SAM artifacts (optional)
aws s3 rm s3://aws-sam-cli-managed-default-samclisourcebucket-* --recursive
```

## Architecture Overview

The deployment creates:
- **API Gateway** - REST API endpoints
- **Lambda Functions** - Backend logic and email service
- **DynamoDB Tables** - Data storage (created via init script)
- **IAM Roles** - Permissions for Lambda functions
- **CloudWatch Logs** - Application logging

## Security Notes

1. **JWT Secrets** - Use strong, unique secrets for production
2. **IAM Roles** - Follow principle of least privilege
3. **SES Configuration** - Verify sender identities
4. **API Access** - Consider adding API keys for production
5. **Environment Variables** - Never commit secrets to version control

## Support

For deployment issues:
1. Check AWS CloudFormation console for detailed error messages
2. Review CloudWatch logs for runtime errors
3. Verify all prerequisites are met
4. Ensure AWS CLI and SAM CLI are up to date

## Version Information

- **SAM CLI Version**: 1.58.0+
- **Node.js Version**: 18.x
- **AWS CLI Version**: 2.x
- **CloudFormation Template Version**: 2010-09-09
