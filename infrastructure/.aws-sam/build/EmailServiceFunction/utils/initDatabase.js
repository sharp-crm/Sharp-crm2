"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initDatabase = exports.deleteTables = exports.createTables = void 0;
exports.initializeDatabase = initializeDatabase;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const uuid_1 = require("uuid");
const dynamoClient_1 = require("../services/dynamoClient");
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
    },
    {
        TableName: "Quotes",
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
                IndexName: "TenantIdIndex",
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
async function tableExists(tableName) {
    try {
        await dynamoClient_1.client.send(new client_dynamodb_1.DescribeTableCommand({ TableName: tableName }));
        return true;
    }
    catch (error) {
        if (error.name === 'ResourceNotFoundException') {
            return false;
        }
        throw error;
    }
}
async function createTable(tableConfig) {
    try {
        await dynamoClient_1.client.send(new client_dynamodb_1.CreateTableCommand(tableConfig));
    }
    catch (error) {
        if (error.name !== 'ResourceInUseException') {
            throw error;
        }
    }
}
async function waitForTableActive(tableName) {
    let tableActive = false;
    while (!tableActive) {
        try {
            const result = await dynamoClient_1.client.send(new client_dynamodb_1.DescribeTableCommand({ TableName: tableName }));
            if (result.Table?.TableStatus === 'ACTIVE') {
                tableActive = true;
            }
            else {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        catch (error) {
            throw error;
        }
    }
}
async function createSuperAdmin() {
    try {
        const email = "rootuser@sharp.com";
        // Wait for Users table to become active
        await waitForTableActive("Users");
        // Check if super admin already exists
        const existingUser = await dynamoClient_1.docClient.send(new lib_dynamodb_1.GetCommand({
            TableName: "Users",
            Key: { email }
        }));
        if (existingUser.Item) {
            return;
        }
        // Create super admin user
        const hashedPassword = await bcryptjs_1.default.hash("User@123", 10);
        const userId = (0, uuid_1.v4)();
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
        await dynamoClient_1.docClient.send(new lib_dynamodb_1.PutCommand({
            TableName: "Users",
            Item: superAdmin
        }));
    }
    catch (error) {
        throw error;
    }
}
async function initializeDatabase() {
    try {
        // List existing tables
        const existingTables = await dynamoClient_1.client.send(new client_dynamodb_1.ListTablesCommand({}));
        // Create tables
        for (const tableConfig of tables) {
            const exists = await tableExists(tableConfig.TableName);
            if (!exists) {
                await createTable(tableConfig);
            }
        }
        // Create super admin user
        await createSuperAdmin();
    }
    catch (error) {
        process.exit(1);
    }
}
const createTables = async () => {
    try {
        // Create Users table
        await dynamoClient_1.docClient.send(new client_dynamodb_1.CreateTableCommand({
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
        }));
        // Create RefreshTokens table
        await dynamoClient_1.docClient.send(new client_dynamodb_1.CreateTableCommand({
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
        }));
        console.log("Tables created successfully");
    }
    catch (error) {
        console.error("Error creating tables:", error);
        throw error;
    }
};
exports.createTables = createTables;
const deleteTables = async () => {
    try {
        await dynamoClient_1.docClient.send(new client_dynamodb_1.DeleteTableCommand({ TableName: "Users" }));
        await dynamoClient_1.docClient.send(new client_dynamodb_1.DeleteTableCommand({ TableName: "RefreshTokens" }));
        console.log("Tables deleted successfully");
    }
    catch (error) {
        console.error("Error deleting tables:", error);
        throw error;
    }
};
exports.deleteTables = deleteTables;
const initDatabase = async () => {
    try {
        await (0, exports.deleteTables)();
    }
    catch (error) {
        console.log("Tables don't exist yet");
    }
    await (0, exports.createTables)();
};
exports.initDatabase = initDatabase;
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
