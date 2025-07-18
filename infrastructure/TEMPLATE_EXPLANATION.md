# SAM Template Explanation

## How template.yaml Works

The `template.yaml` file is a CloudFormation template with SAM (Serverless Application Model) extensions. It defines your AWS infrastructure as code.

### Template Structure

#### 1. **Header Section**
```yaml
AWSTemplateFormatVersion: '2010-09-09'
Transform: AWS::Serverless-2016-10-31
Description: > 
  SharpCRM Infrastructure
```

- `AWSTemplateFormatVersion`: Specifies the CloudFormation template format version
- `Transform`: Tells CloudFormation to use SAM transforms to process serverless resources
- `Description`: Human-readable description of what this template does

#### 2. **Parameters Section**
```yaml
Parameters:
  Environment:
    Type: String
    Default: development
    AllowedValues:
      - development
      - staging  
      - production
```

**What Parameters Do:**
- Allow you to customize the deployment without changing the template
- Can be set at deploy time: `sam deploy --parameter-overrides Environment=production`
- Provide validation (AllowedValues) and defaults
- Make templates reusable across environments

#### 3. **Resources Section**
This is where you define your AWS resources. Each resource has:

```yaml
UsersTable:                    # Logical ID (used to reference this resource)
  Type: AWS::DynamoDB::Table   # AWS resource type
  Properties:                  # Configuration for this resource
    TableName: !Sub "${TablePrefix}-Users-${Environment}"
    BillingMode: PAY_PER_REQUEST
    AttributeDefinitions:
      - AttributeName: email
        AttributeType: S
```

**Key DynamoDB Properties Explained:**

- **TableName**: `!Sub "${TablePrefix}-Users-${Environment}"` creates names like "SharpCRM-Users-development"
- **BillingMode**: `PAY_PER_REQUEST` means you pay per operation (good for variable workloads)
- **AttributeDefinitions**: Only define attributes used in keys or indexes
- **KeySchema**: Defines primary key structure
  - `HASH`: Partition key (required)
  - `RANGE`: Sort key (optional)

**Global Secondary Indexes (GSI):**
```yaml
GlobalSecondaryIndexes:
  - IndexName: UserIdIndex
    KeySchema:
      - AttributeName: userId
        KeyType: HASH
    Projection:
      ProjectionType: ALL
```

- Allow querying on different attributes than the primary key
- `ProjectionType: ALL` means all attributes are available in queries

**Additional Features:**
- **StreamSpecification**: Captures changes to items (useful for triggering actions)
- **PointInTimeRecoverySpecification**: Enables backup and restore
- **TimeToLiveSpecification**: Automatically deletes expired items
- **Tags**: Metadata for organization and cost tracking

#### 4. **Outputs Section**
```yaml
Outputs:
  UsersTableName:
    Description: "Name of the Users DynamoDB table"
    Value: !Ref UsersTable
    Export:
      Name: !Sub "${AWS::StackName}-UsersTableName"
```

**What Outputs Do:**
- Provide information about created resources
- Can be used by other stacks (via Export/Import)
- Useful for getting resource names/ARNs to use in your application

### CloudFormation Functions Used

#### `!Sub` (Substitute)
```yaml
TableName: !Sub "${TablePrefix}-Users-${Environment}"
```
- Replaces variables with actual values
- `${TablePrefix}` gets replaced with parameter value

#### `!Ref` (Reference)
```yaml
Value: !Ref UsersTable
```
- References another resource in the template
- Returns the resource's primary identifier (table name for DynamoDB)

#### `!GetAtt` (Get Attribute)
```yaml
Value: !GetAtt UsersTable.Arn
```
- Gets specific attributes from resources
- `Arn` returns the Amazon Resource Name

## Table Design Decisions

### Why These Tables?
Based on your backend code, I created tables for:
- **Users**: Authentication and user management
- **RefreshTokens**: JWT refresh token storage
- **Contacts**: CRM contact management
- **Leads**: Sales lead tracking
- **Deals**: Sales deal management
- **Tasks**: Task management
- **Subsidiaries**: Company structure
- **Dealers**: Dealer management
- **Notifications**: User notifications
- **Reports**: Report storage

### Key Design Patterns

1. **Consistent Naming**: All tables use `${TablePrefix}-${TableName}-${Environment}`
2. **Tenant Isolation**: Most tables have `tenantId` for multi-tenant support
3. **Global Secondary Indexes**: Allow efficient querying on different attributes
4. **Streams**: Enable real-time processing of changes
5. **TTL**: Automatic cleanup of expired tokens

### Cost Optimization
- **PAY_PER_REQUEST**: No fixed costs, pay only for what you use
- **Proper Indexing**: Only create indexes you actually need
- **TTL**: Automatic cleanup reduces storage costs

## Environment-Specific Deployments

You can deploy to different environments using parameters:

```bash
# Development
sam deploy --parameter-overrides Environment=development

# Production  
sam deploy --parameter-overrides Environment=production TablePrefix=SharpCRM-Prod
```

This creates separate table sets like:
- Development: `SharpCRM-Users-development`
- Production: `SharpCRM-Prod-Users-production`

## Best Practices Implemented

1. **Tagging**: All resources are tagged with Environment, Application, and Component
2. **Backup**: Point-in-time recovery enabled for critical tables
3. **Monitoring**: DynamoDB Streams for audit trails
4. **Security**: TTL for token cleanup
5. **Scalability**: On-demand billing scales automatically
6. **Naming**: Consistent, environment-aware naming convention
