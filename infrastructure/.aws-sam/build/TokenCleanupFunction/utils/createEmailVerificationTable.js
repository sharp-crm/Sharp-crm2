"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const client_dynamodb_2 = require("@aws-sdk/client-dynamodb");
const dynamoClient = new client_dynamodb_1.DynamoDBClient({
    region: process.env.AWS_REGION || "us-east-1"
});
const tableName = process.env.EMAIL_VERIFICATION_TABLE || 'SharpCRM-EmailVerification-development';
async function createEmailVerificationTable() {
    try {
        // Check if table already exists
        try {
            const describeCommand = new client_dynamodb_2.DescribeTableCommand({
                TableName: tableName
            });
            await dynamoClient.send(describeCommand);
            console.log(`✅ Table ${tableName} already exists`);
            return;
        }
        catch (error) {
            if (error.name !== 'ResourceNotFoundException') {
                throw error;
            }
            // Table doesn't exist, proceed to create it
        }
        const createTableParams = {
            TableName: tableName,
            KeySchema: [
                {
                    AttributeName: "id",
                    KeyType: client_dynamodb_1.KeyType.HASH // Partition key
                }
            ],
            AttributeDefinitions: [
                {
                    AttributeName: "id",
                    AttributeType: client_dynamodb_1.ScalarAttributeType.S
                },
                {
                    AttributeName: "email",
                    AttributeType: client_dynamodb_1.ScalarAttributeType.S
                },
                {
                    AttributeName: "requestedBy",
                    AttributeType: client_dynamodb_1.ScalarAttributeType.S
                }
            ],
            GlobalSecondaryIndexes: [
                {
                    IndexName: "EmailIndex",
                    KeySchema: [
                        {
                            AttributeName: "email",
                            KeyType: client_dynamodb_1.KeyType.HASH
                        }
                    ],
                    Projection: {
                        ProjectionType: client_dynamodb_1.ProjectionType.ALL
                    },
                    ProvisionedThroughput: {
                        ReadCapacityUnits: 5,
                        WriteCapacityUnits: 5
                    }
                },
                {
                    IndexName: "RequestedByIndex",
                    KeySchema: [
                        {
                            AttributeName: "requestedBy",
                            KeyType: client_dynamodb_1.KeyType.HASH
                        }
                    ],
                    Projection: {
                        ProjectionType: client_dynamodb_1.ProjectionType.ALL
                    },
                    ProvisionedThroughput: {
                        ReadCapacityUnits: 5,
                        WriteCapacityUnits: 5
                    }
                }
            ],
            ProvisionedThroughput: {
                ReadCapacityUnits: 5,
                WriteCapacityUnits: 5
            }
        };
        const command = new client_dynamodb_2.CreateTableCommand(createTableParams);
        const result = await dynamoClient.send(command);
        console.log(`✅ Created table: ${tableName}`);
        console.log(`📊 Table ARN: ${result.TableDescription?.TableArn}`);
        // Wait for table to be active
        console.log(`⏳ Waiting for table ${tableName} to be active...`);
        let isActive = false;
        while (!isActive) {
            try {
                const describeCommand = new client_dynamodb_2.DescribeTableCommand({
                    TableName: tableName
                });
                const description = await dynamoClient.send(describeCommand);
                isActive = description.Table?.TableStatus === 'ACTIVE';
                if (!isActive) {
                    console.log(`⏳ Table status: ${description.Table?.TableStatus}, waiting...`);
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
            }
            catch (error) {
                console.error('❌ Error checking table status:', error);
                break;
            }
        }
        console.log(`✅ Table ${tableName} is now active and ready to use!`);
    }
    catch (error) {
        console.error('❌ Error creating EmailVerification table:', error);
        throw error;
    }
}
exports.default = createEmailVerificationTable;
// Run directly if this file is executed
if (require.main === module) {
    createEmailVerificationTable()
        .then(() => {
        console.log('🎉 EmailVerification table creation completed successfully!');
        process.exit(0);
    })
        .catch((error) => {
        console.error('💥 Failed to create EmailVerification table:', error);
        process.exit(1);
    });
}
