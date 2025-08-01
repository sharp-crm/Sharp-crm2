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
  DeleteTableCommand
} from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, GetCommand } from "@aws-sdk/lib-dynamodb";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";

// Configure DynamoDB client for AWS (global deployment)
const awsConfig = {
  region: process.env.AWS_REGION || "us-east-1"
  // No endpoint specified = uses real AWS DynamoDB
  // No credentials specified = uses AWS credential chain
};

console.log('☁️  Using AWS DynamoDB for global deployment');
console.log('DynamoDB Config:', awsConfig);

const client = new DynamoDBClient(awsConfig);
const docClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: {
    convertEmptyValues: false,
    removeUndefinedValues: true,
    convertClassInstanceToMap: false,
  },
  unmarshallOptions: {
    wrapNumbers: false,
  },
});

// Use environment-specific table names for AWS deployment
const getTableName = (baseName: string): string => {
  const environment = process.env.NODE_ENV || 'production';
  const tablePrefix = process.env.TABLE_PREFIX || 'SharpCRM';
  return `${tablePrefix}-${baseName}-${environment}`;
};

const tables = [
  {
    TableName: getTableName("Users"),
    KeySchema: [
      { AttributeName: "email", KeyType: "HASH" }
    ],
    AttributeDefinitions: [
      { AttributeName: "email", AttributeType: "S" },
      { AttributeName: "userId", AttributeType: "S" }
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: "UserIdIndex",
        KeySchema: [
          { AttributeName: "userId", KeyType: "HASH" }
        ],
        Projection: {
          ProjectionType: "ALL"
        }
      }
    ],
    BillingMode: "PAY_PER_REQUEST"
  },
  {
    TableName: getTableName("RefreshTokens"),
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
  },
  {
    TableName: getTableName("Contacts"),
    KeySchema: [
      { AttributeName: "id", KeyType: "HASH" }
    ],
    AttributeDefinitions: [
      { AttributeName: "id", AttributeType: "S" },
      { AttributeName: "tenantId", AttributeType: "S" },
      { AttributeName: "email", AttributeType: "S" }
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: "TenantIndex",
        KeySchema: [
          { AttributeName: "tenantId", KeyType: "HASH" }
        ],
        Projection: {
          ProjectionType: "ALL"
        }
      },
      {
        IndexName: "EmailIndex",
        KeySchema: [
          { AttributeName: "email", KeyType: "HASH" }
        ],
        Projection: {
          ProjectionType: "ALL"
        }
      }
    ],
    BillingMode: "PAY_PER_REQUEST"
  },
  {
    TableName: getTableName("Leads"),
    KeySchema: [
      { AttributeName: "id", KeyType: "HASH" }
    ],
    AttributeDefinitions: [
      { AttributeName: "id", AttributeType: "S" },
      { AttributeName: "tenantId", AttributeType: "S" },
      { AttributeName: "email", AttributeType: "S" }
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: "TenantIndex",
        KeySchema: [
          { AttributeName: "tenantId", KeyType: "HASH" }
        ],
        Projection: {
          ProjectionType: "ALL"
        }
      },
      {
        IndexName: "EmailIndex",
        KeySchema: [
          { AttributeName: "email", KeyType: "HASH" }
        ],
        Projection: {
          ProjectionType: "ALL"
        }
      }
    ],
    BillingMode: "PAY_PER_REQUEST"
  },
  {
    TableName: getTableName("Deals"),
    KeySchema: [
      { AttributeName: "id", KeyType: "HASH" }
    ],
    AttributeDefinitions: [
      { AttributeName: "id", AttributeType: "S" },
      { AttributeName: "tenantId", AttributeType: "S" }
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: "TenantIndex",
        KeySchema: [
          { AttributeName: "tenantId", KeyType: "HASH" }
        ],
        Projection: {
          ProjectionType: "ALL"
        }
      }
    ],
    BillingMode: "PAY_PER_REQUEST"
  },
  {
    TableName: getTableName("Tasks"),
    KeySchema: [
      { AttributeName: "id", KeyType: "HASH" }
    ],
    AttributeDefinitions: [
      { AttributeName: "id", AttributeType: "S" },
      { AttributeName: "tenantId", AttributeType: "S" },
      { AttributeName: "assignedTo", AttributeType: "S" }
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: "TenantIndex",
        KeySchema: [
          { AttributeName: "tenantId", KeyType: "HASH" }
        ],
        Projection: {
          ProjectionType: "ALL"
        }
      },
      {
        IndexName: "AssignedToIndex",
        KeySchema: [
          { AttributeName: "assignedTo", KeyType: "HASH" }
        ],
        Projection: {
          ProjectionType: "ALL"
        }
      }
    ],
    BillingMode: "PAY_PER_REQUEST"
  },
  {
    TableName: getTableName("Subsidiaries"),
    KeySchema: [
      { AttributeName: "id", KeyType: "HASH" }
    ],
    AttributeDefinitions: [
      { AttributeName: "id", AttributeType: "S" },
      { AttributeName: "tenantId", AttributeType: "S" }
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: "TenantIndex",
        KeySchema: [
          { AttributeName: "tenantId", KeyType: "HASH" }
        ],
        Projection: {
          ProjectionType: "ALL"
        }
      }
    ],
    BillingMode: "PAY_PER_REQUEST"
  },
  {
    TableName: getTableName("Dealers"),
    KeySchema: [
      { AttributeName: "id", KeyType: "HASH" }
    ],
    AttributeDefinitions: [
      { AttributeName: "id", AttributeType: "S" },
      { AttributeName: "tenantId", AttributeType: "S" }
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: "TenantIndex",
        KeySchema: [
          { AttributeName: "tenantId", KeyType: "HASH" }
        ],
        Projection: {
          ProjectionType: "ALL"
        }
      }
    ],
    BillingMode: "PAY_PER_REQUEST"
  },
  {
    TableName: getTableName("Notifications"),
    KeySchema: [
      { AttributeName: "id", KeyType: "HASH" }
    ],
    AttributeDefinitions: [
      { AttributeName: "id", AttributeType: "S" },
      { AttributeName: "userId", AttributeType: "S" },
      { AttributeName: "createdAt", AttributeType: "S" }
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: "UserNotificationsIndex",
        KeySchema: [
          { AttributeName: "userId", KeyType: "HASH" },
          { AttributeName: "createdAt", KeyType: "RANGE" }
        ],
        Projection: {
          ProjectionType: "ALL"
        }
      }
    ],
    BillingMode: "PAY_PER_REQUEST"
  },
  {
    TableName: getTableName("Products"),
    KeySchema: [
      { AttributeName: "id", KeyType: "HASH" }
    ],
    AttributeDefinitions: [
      { AttributeName: "id", AttributeType: "S" },
      { AttributeName: "tenantId", AttributeType: "S" },
      { AttributeName: "productCode", AttributeType: "S" }
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: "TenantIndex",
        KeySchema: [
          { AttributeName: "tenantId", KeyType: "HASH" }
        ],
        Projection: {
          ProjectionType: "ALL"
        }
      },
      {
        IndexName: "ProductCodeIndex",
        KeySchema: [
          { AttributeName: "productCode", KeyType: "HASH" }
        ],
        Projection: {
          ProjectionType: "ALL"
        }
      }
    ],
    BillingMode: "PAY_PER_REQUEST"
  },
  {
    TableName: getTableName("Reports"),
    KeySchema: [
      { AttributeName: "id", KeyType: "HASH" }
    ],
    AttributeDefinitions: [
      { AttributeName: "id", AttributeType: "S" },
      { AttributeName: "tenantId", AttributeType: "S" },
      { AttributeName: "createdBy", AttributeType: "S" }
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: "TenantIndex",
        KeySchema: [
          { AttributeName: "tenantId", KeyType: "HASH" }
        ],
        Projection: {
          ProjectionType: "ALL"
        }
      },
      {
        IndexName: "CreatedByIndex",
        KeySchema: [
          { AttributeName: "createdBy", KeyType: "HASH" }
        ],
        Projection: {
          ProjectionType: "ALL"
        }
      }
    ],
    BillingMode: "PAY_PER_REQUEST"
  },
  {
    TableName: getTableName("Quotes"),
    KeySchema: [
      { AttributeName: "id", KeyType: "HASH" }
    ],
    AttributeDefinitions: [
      { AttributeName: "id", AttributeType: "S" },
      { AttributeName: "tenantId", AttributeType: "S" },
      { AttributeName: "quoteOwner", AttributeType: "S" },
      { AttributeName: "status", AttributeType: "S" },
      { AttributeName: "customerName", AttributeType: "S" },
      { AttributeName: "createdBy", AttributeType: "S" }
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: "TenantIndex",
        KeySchema: [
          { AttributeName: "tenantId", KeyType: "HASH" }
        ],
        Projection: {
          ProjectionType: "ALL"
        }
      },
      {
        IndexName: "QuoteOwnerIndex",
        KeySchema: [
          { AttributeName: "quoteOwner", KeyType: "HASH" }
        ],
        Projection: {
          ProjectionType: "ALL"
        }
      },
      {
        IndexName: "StatusIndex",
        KeySchema: [
          { AttributeName: "status", KeyType: "HASH" }
        ],
        Projection: {
          ProjectionType: "ALL"
        }
      },
      {
        IndexName: "CustomerIndex",
        KeySchema: [
          { AttributeName: "customerName", KeyType: "HASH" }
        ],
        Projection: {
          ProjectionType: "ALL"
        }
      },
      {
        IndexName: "CreatedByIndex",
        KeySchema: [
          { AttributeName: "createdBy", KeyType: "HASH" }
        ],
        Projection: {
          ProjectionType: "ALL"
        }
      }
    ],
    BillingMode: "PAY_PER_REQUEST"
  }
];

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

async function createTable(tableConfig: any): Promise<void> {
  try {
    await client.send(new CreateTableCommand(tableConfig));
  } catch (error: any) {
    if (error.name !== 'ResourceInUseException') {
      throw error;
    }
  }
}

async function createSuperAdmin(usersTable: string) {
  try {
    const hashedPassword = await bcrypt.hash("User@123", 10);
    const userId = uuidv4();
    const email = "rootuser@sharpcrm.com";
    const user = {
      userId,
      email,
      password: hashedPassword,
      firstName: "RootUser",
      lastName: "Sharp",
      role: "SUPER_ADMIN",
      tenantId: "SUPER_ID_TENANT"
    };
    await docClient.send(new PutCommand({
      TableName: usersTable,
      Item: user
    }));
    console.log("Super Admin created successfully: ", email);
  } catch (error) {
    console.error("Failed to create Super Admin: ", error);
  }
}

async function initializeGlobalDatabase() {
  console.log("Initializing Global Database...");
  for (const tableConfig of tables) {
    const tableName = tableConfig.TableName;
    const exists = await tableExists(tableName);
    if (!exists) {
      await createTable(tableConfig);
      console.log(`Table ${tableName} created successfully.`);
    } else {
      console.log(`Table ${tableName} already exists.`);
    }
  }

  const usersTableName = getTableName("Users");
  await createSuperAdmin(usersTableName);
  console.log("Global Database Initialization complete.");
}

if (require.main === module) {
  initializeGlobalDatabase()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("Failed to initialize global database: ", error);
      process.exit(1);
    });
}
