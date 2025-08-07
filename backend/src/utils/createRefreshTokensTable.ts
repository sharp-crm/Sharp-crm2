import dotenv from 'dotenv';
// Load environment variables first
if (!process.env.AWS_LAMBDA_FUNCTION_NAME) {
  dotenv.config();
}

import { 
  DynamoDBClient, 
  CreateTableCommand, 
  DescribeTableCommand,
  ListTablesCommand,
  AttributeDefinition,
  KeySchemaElement,
  GlobalSecondaryIndex,
  Projection
} from "@aws-sdk/client-dynamodb";

// Configure DynamoDB client for AWS (global deployment)
const awsConfig = {
  region: process.env.AWS_REGION || "us-east-1"
};

console.log('☁️  Using AWS DynamoDB for RefreshTokens table creation');
console.log('DynamoDB Config:', awsConfig);

const client = new DynamoDBClient(awsConfig);

// Use environment-specific table names for AWS deployment
const getTableName = (baseName: string): string => {
  const environment = process.env.NODE_ENV || 'production';
  const tablePrefix = process.env.TABLE_PREFIX || 'SharpCRM';
  return `${tablePrefix}-${baseName}-${environment}`;
};

async function tableExists(tableName: string): Promise<boolean> {
  try {
    await client.send(new DescribeTableCommand({ TableName: tableName }));
    return true;
  } catch (error: any) {
    if (error.name === 'ResourceNotFoundException') {
      return false;
    }
    throw error;
  }
}

async function createRefreshTokensTable() {
  const refreshTokensTableName = getTableName("RefreshTokens");
  console.log(`\n🔐 Creating RefreshTokens table: ${refreshTokensTableName}`);
  
  try {
    // Check if table already exists
    const exists = await tableExists(refreshTokensTableName);
    if (exists) {
      console.log(`✅ RefreshTokens table already exists: ${refreshTokensTableName}`);
      return true;
    }

    console.log(`🔄 Creating RefreshTokens table: ${refreshTokensTableName}`);
    
    const refreshTokensTableConfig = {
      TableName: refreshTokensTableName,
      KeySchema: [
        { AttributeName: "jti", KeyType: "HASH" } as KeySchemaElement
      ],
      AttributeDefinitions: [
        { AttributeName: "jti", AttributeType: "S" } as AttributeDefinition,
        { AttributeName: "userId", AttributeType: "S" } as AttributeDefinition
      ],
      GlobalSecondaryIndexes: [
        {
          IndexName: "UserTokensIndex",
          KeySchema: [
            { AttributeName: "userId", KeyType: "HASH" } as KeySchemaElement
          ],
          Projection: {
            ProjectionType: "ALL"
          } as Projection
        } as GlobalSecondaryIndex
      ],
      BillingMode: "PAY_PER_REQUEST" as const
    };
    
    await client.send(new CreateTableCommand(refreshTokensTableConfig));
    console.log(`✅ RefreshTokens table created successfully: ${refreshTokensTableName}`);
    
    // Verify the table was created
    const verifyExists = await tableExists(refreshTokensTableName);
    if (verifyExists) {
      console.log(`✅ RefreshTokens table verified and ready!`);
      return true;
    } else {
      console.error(`❌ RefreshTokens table verification failed!`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error creating RefreshTokens table:`, error);
    throw error;
  }
}

// Run the script
if (require.main === module) {
  createRefreshTokensTable()
    .then(() => {
      console.log("🎉 RefreshTokens table creation complete.");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Failed to create RefreshTokens table: ", error);
      process.exit(1);
    });
}

export { createRefreshTokensTable }; 