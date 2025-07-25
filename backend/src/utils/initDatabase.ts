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
import { docClient, client } from "../services/dynamoClient";

// DynamoDB initialized

const tables = [
  {
    TableName: "Users",
    KeySchema: [
      { AttributeName: "email", KeyType: "HASH" }
    ],
    AttributeDefinitions: [
      { AttributeName: "email", AttributeType: "S" },
      { AttributeName: "userId", AttributeType: "S" },
      { AttributeName: "tenantId", AttributeType: "S" },
      { AttributeName: "createdBy", AttributeType: "S" },
      { AttributeName: "phoneNumber", AttributeType: "S" },
      { AttributeName: "reportingTo", AttributeType: "S" }
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
      },
      {
        IndexName: "TenantIdIndex",
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
      },
      {
        IndexName: "PhoneNumberIndex",
        KeySchema: [
          { AttributeName: "phoneNumber", KeyType: "HASH" }
        ],
        Projection: {
          ProjectionType: "ALL"
        }
      },
      {
        IndexName: "ReportingToIndex",
        KeySchema: [
          { AttributeName: "reportingTo", KeyType: "HASH" }
        ],
        Projection: {
          ProjectionType: "ALL"
        }
      }
    ],
    BillingMode: "PAY_PER_REQUEST"
  },
  {
    TableName: "Contacts",
    KeySchema: [
      { AttributeName: "id", KeyType: "HASH" }
    ],
    AttributeDefinitions: [
      { AttributeName: "id", AttributeType: "S" },
      { AttributeName: "tenantId", AttributeType: "S" },
      { AttributeName: "email", AttributeType: "S" },
      { AttributeName: "createdBy", AttributeType: "S" },
      { AttributeName: "contactOwner", AttributeType: "S" }
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: "TenantIdIndex",
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
      },
      {
        IndexName: "CreatedByIndex",
        KeySchema: [
          { AttributeName: "createdBy", KeyType: "HASH" }
        ],
        Projection: {
          ProjectionType: "ALL"
        }
      },
      {
        IndexName: "ContactOwnerIndex",
        KeySchema: [
          { AttributeName: "contactOwner", KeyType: "HASH" }
        ],
        Projection: {
          ProjectionType: "ALL"
        }
      }
    ],
    BillingMode: "PAY_PER_REQUEST"
  },
  {
    TableName: "Leads",
    KeySchema: [
      { AttributeName: "id", KeyType: "HASH" }
    ],
    AttributeDefinitions: [
      { AttributeName: "id", AttributeType: "S" },
      { AttributeName: "tenantId", AttributeType: "S" },
      { AttributeName: "email", AttributeType: "S" },
      { AttributeName: "createdBy", AttributeType: "S" },
      { AttributeName: "leadOwner", AttributeType: "S" }
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: "TenantIdIndex",
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
      },
      {
        IndexName: "CreatedByIndex",
        KeySchema: [
          { AttributeName: "createdBy", KeyType: "HASH" }
        ],
        Projection: {
          ProjectionType: "ALL"
        }
      },
      {
        IndexName: "LeadOwnerIndex",
        KeySchema: [
          { AttributeName: "leadOwner", KeyType: "HASH" }
        ],
        Projection: {
          ProjectionType: "ALL"
        }
      }
    ],
    BillingMode: "PAY_PER_REQUEST"
  },
  {
    TableName: "Deals",
    KeySchema: [
      { AttributeName: "id", KeyType: "HASH" }
    ],
    AttributeDefinitions: [
      { AttributeName: "id", AttributeType: "S" },
      { AttributeName: "tenantId", AttributeType: "S" },
      { AttributeName: "dealOwner", AttributeType: "S" },
      { AttributeName: "stage", AttributeType: "S" },
      { AttributeName: "createdBy", AttributeType: "S" }
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: "TenantIdIndex",
        KeySchema: [
          { AttributeName: "tenantId", KeyType: "HASH" }
        ],
        Projection: {
          ProjectionType: "ALL"
        }
      },
      {
        IndexName: "DealOwnerIndex",
        KeySchema: [
          { AttributeName: "dealOwner", KeyType: "HASH" }
        ],
        Projection: {
          ProjectionType: "ALL"
        }
      },
      {
        IndexName: "StageIndex",
        KeySchema: [
          { AttributeName: "stage", KeyType: "HASH" }
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
    TableName: "Tasks",
    KeySchema: [
      { AttributeName: "id", KeyType: "HASH" }
    ],
    AttributeDefinitions: [
      { AttributeName: "id", AttributeType: "S" },
      { AttributeName: "tenantId", AttributeType: "S" },
      { AttributeName: "assignedTo", AttributeType: "S" },
      { AttributeName: "createdBy", AttributeType: "S" },
      { AttributeName: "dueDate", AttributeType: "S" }
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: "TenantIdIndex",
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
      },
      {
        IndexName: "CreatedByIndex",
        KeySchema: [
          { AttributeName: "createdBy", KeyType: "HASH" }
        ],
        Projection: {
          ProjectionType: "ALL"
        }
      },
      {
        IndexName: "DueDateIndex",
        KeySchema: [
          { AttributeName: "dueDate", KeyType: "HASH" }
        ],
        Projection: {
          ProjectionType: "ALL"
        }
      }
    ],
    BillingMode: "PAY_PER_REQUEST"
  },
  {
    TableName: "Subsidiaries",
    KeySchema: [
      { AttributeName: "id", KeyType: "HASH" }
    ],
    AttributeDefinitions: [
      { AttributeName: "id", AttributeType: "S" },
      { AttributeName: "tenantId", AttributeType: "S" },
      { AttributeName: "createdBy", AttributeType: "S" },
      { AttributeName: "name", AttributeType: "S" }
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: "TenantIdIndex",
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
      },
      {
        IndexName: "NameIndex",
        KeySchema: [
          { AttributeName: "name", KeyType: "HASH" }
        ],
        Projection: {
          ProjectionType: "ALL"
        }
      }
    ],
    BillingMode: "PAY_PER_REQUEST"
  },
  {
    TableName: "Dealers",
    KeySchema: [
      { AttributeName: "id", KeyType: "HASH" }
    ],
    AttributeDefinitions: [
      { AttributeName: "id", AttributeType: "S" },
      { AttributeName: "tenantId", AttributeType: "S" },
      { AttributeName: "createdBy", AttributeType: "S" },
      { AttributeName: "name", AttributeType: "S" },
      { AttributeName: "territory", AttributeType: "S" }
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: "TenantIdIndex",
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
      },
      {
        IndexName: "NameIndex",
        KeySchema: [
          { AttributeName: "name", KeyType: "HASH" }
        ],
        Projection: {
          ProjectionType: "ALL"
        }
      },
      {
        IndexName: "TerritoryIndex",
        KeySchema: [
          { AttributeName: "territory", KeyType: "HASH" }
        ],
        Projection: {
          ProjectionType: "ALL"
        }
      }
    ],
    BillingMode: "PAY_PER_REQUEST"
  },
  {
    TableName: "Notifications",
    KeySchema: [
      { AttributeName: "id", KeyType: "HASH" }
    ],
    AttributeDefinitions: [
      { AttributeName: "id", AttributeType: "S" }
    ],
    BillingMode: "PAY_PER_REQUEST"
  },
  {
    TableName: "Reports",
    KeySchema: [
      { AttributeName: "id", KeyType: "HASH" }
    ],
    AttributeDefinitions: [
      { AttributeName: "id", AttributeType: "S" }
    ],
    BillingMode: "PAY_PER_REQUEST"
  },
  {
    TableName: "RefreshTokens",
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
    TableName: 'ChatChannels',
    KeySchema: [{ AttributeName: 'id', KeyType: 'HASH' }],
    AttributeDefinitions: [
      { AttributeName: 'id', AttributeType: 'S' },
      { AttributeName: 'tenantId', AttributeType: 'S' }
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'TenantIndex',
        KeySchema: [{ AttributeName: 'tenantId', KeyType: 'HASH' }],
        Projection: { ProjectionType: 'ALL' },
        ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 }
      }
    ],
    ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 }
  },
  {
    TableName: 'ChatMessages',
    KeySchema: [
      { AttributeName: 'channelId', KeyType: 'HASH' },
      { AttributeName: 'timestamp', KeyType: 'RANGE' }
    ],
    AttributeDefinitions: [
      { AttributeName: 'channelId', AttributeType: 'S' },
      { AttributeName: 'timestamp', AttributeType: 'S' },
      { AttributeName: 'tenantId', AttributeType: 'S' }
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'TenantIndex',
        KeySchema: [{ AttributeName: 'tenantId', KeyType: 'HASH' }],
        Projection: { ProjectionType: 'ALL' },
        ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 }
      }
    ],
    ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 }
  },
  {
    TableName: 'ChatChannelMembers',
    KeySchema: [
      { AttributeName: 'channelId', KeyType: 'HASH' },
      { AttributeName: 'userId', KeyType: 'RANGE' }
    ],
    AttributeDefinitions: [
      { AttributeName: 'channelId', AttributeType: 'S' },
      { AttributeName: 'userId', AttributeType: 'S' },
      { AttributeName: 'tenantId', AttributeType: 'S' }
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'TenantIndex',
        KeySchema: [{ AttributeName: 'tenantId', KeyType: 'HASH' }],
        Projection: { ProjectionType: 'ALL' },
        ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 }
      }
    ],
    ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 }
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

async function waitForTableActive(tableName: string): Promise<void> {
  let tableActive = false;
  while (!tableActive) {
    try {
      const result = await client.send(new DescribeTableCommand({ TableName: tableName }));
      if (result.Table?.TableStatus === 'ACTIVE') {
        tableActive = true;
      } else {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error) {
      throw error;
    }
  }
}

async function createSuperAdmin(): Promise<void> {
  try {
    const email = "rootuser@sharp.com";
    
    // Wait for Users table to become active
    await waitForTableActive("Users");
    
    // Check if super admin already exists
    const existingUser = await docClient.send(
      new GetCommand({
        TableName: "Users",
        Key: { email }
      })
    );

    if (existingUser.Item) {
      return;
    }

    // Create super admin user
    const hashedPassword = await bcrypt.hash("User@123", 10);
    const userId = uuidv4();
    const timestamp = new Date().toISOString();

    const superAdmin = {
      userId,
      email,
      password: hashedPassword,
      firstName: "Root",
      lastName: "User",
      role: "SUPER_ADMIN", // Changed from ADMIN to SUPER_ADMIN
      tenantId: "SUPER_ADMIN_TENANT", // Super admin has special tenant
      createdBy: "SYSTEM", // Super admin is created by system
      createdAt: timestamp,
      updatedAt: timestamp,
      isDeleted: false
    };

    await docClient.send(
      new PutCommand({
        TableName: "Users",
        Item: superAdmin
      })
    );

  } catch (error) {
    throw error;
  }
}

export async function initializeDatabase(): Promise<void> {
  try {
    // List existing tables
    const existingTables = await client.send(new ListTablesCommand({}));
    
    // Create tables
    for (const tableConfig of tables) {
      const exists = await tableExists(tableConfig.TableName);
      if (!exists) {
        await createTable(tableConfig);
      }
    }

    // Create super admin user
    await createSuperAdmin();
    
  } catch (error) {
    process.exit(1);
  }
}

export const createTables = async () => {
  try {
    // Create Users table
    await docClient.send(
      new CreateTableCommand({
        TableName: "Users",
        AttributeDefinitions: [
          { AttributeName: "userId", AttributeType: "S" },
          { AttributeName: "email", AttributeType: "S" }
        ],
        KeySchema: [
          { AttributeName: "email", KeyType: "HASH" }
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
        ProvisionedThroughput: {
          ReadCapacityUnits: 5,
          WriteCapacityUnits: 5
        }
      })
    );

    // Create RefreshTokens table
    await docClient.send(
      new CreateTableCommand({
        TableName: "RefreshTokens",
        AttributeDefinitions: [
          { AttributeName: "jti", AttributeType: "S" },
          { AttributeName: "userId", AttributeType: "S" }
        ],
        KeySchema: [
          { AttributeName: "jti", KeyType: "HASH" }
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
        ProvisionedThroughput: {
          ReadCapacityUnits: 5,
          WriteCapacityUnits: 5
        }
      })
    );

    console.log("Tables created successfully");
  } catch (error) {
    console.error("Error creating tables:", error);
    throw error;
  }
};

export const deleteTables = async () => {
  try {
    await docClient.send(new DeleteTableCommand({ TableName: "Users" }));
    await docClient.send(new DeleteTableCommand({ TableName: "RefreshTokens" }));
    console.log("Tables deleted successfully");
  } catch (error) {
    console.error("Error deleting tables:", error);
    throw error;
  }
};

export const initDatabase = async () => {
  try {
    await deleteTables();
  } catch (error) {
    console.log("Tables don't exist yet");
  }
  await createTables();
};

// If this script is run directly
if (require.main === module) {
  initializeDatabase()
    .then(() => {
      console.log("Database setup complete!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Database setup failed:", error);
      process.exit(1);
    });
} 