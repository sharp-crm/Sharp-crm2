"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = exports.client = exports.checkDynamoDBConnection = exports.handleDynamoError = exports.TABLES = exports.docClient = void 0;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
// Environment configuration
const isProduction = process.env.NODE_ENV === 'production';
const isLocal = process.env.DYNAMODB_LOCAL === 'true';
/**
 * DynamoDB Client Configuration based on environment
 */
const getClientConfig = () => {
    if (isLocal) {
        // Local Development Configuration (Docker)
        console.log(`🐳 Using local DynamoDB at http://localhost:8000`);
        return {
            region: "us-east-1",
            // endpoint: "http://localhost:8000",
            // endpoint: "http://127.0.0.1:8000",
            endpoint: "http://host.docker.internal:8000",
            credentials: {
                accessKeyId: "fakeMyKeyId",
                secretAccessKey: "fakeSecretAccessKey"
            }
        };
    }
    else if (process.env.AWS_LAMBDA_FUNCTION_NAME) {
        // Lambda environment - AWS provides credentials automatically via IAM role
        console.log(`🚀 Running in Lambda - using IAM role credentials`);
        return {
            region: process.env.AWS_REGION || "us-east-1"
            // No explicit credentials needed - Lambda provides them automatically
        };
    }
    else if (isProduction) {
        // Production AWS Configuration (non-Lambda)
        return {
            region: process.env.AWS_REGION || "us-east-1",
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
            }
        };
    }
    else {
        // Development with real AWS
        console.log(`🔧 Using AWS DynamoDB in development`);
        return {
            region: process.env.AWS_REGION || "us-east-1",
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
            }
        };
    }
};
// Initialize DynamoDB client with configuration
const clientConfig = getClientConfig();
// Uncomment below for forced local development (and comment out the line above)
// const clientConfig = {
//   region: "us-east-1",
//   endpoint: "http://localhost:8000",
//   credentials: {
//     accessKeyId: "fakeMyKeyId",
//     secretAccessKey: "fakeSecretAccessKey"
//   }
// };
console.log('DynamoDB Client Config:', clientConfig);
const client = new client_dynamodb_1.DynamoDBClient(clientConfig);
exports.client = client;
// Create DocumentClient with options
exports.docClient = lib_dynamodb_1.DynamoDBDocumentClient.from(client, {
    marshallOptions: {
        convertEmptyValues: false,
        removeUndefinedValues: true,
        convertClassInstanceToMap: false,
    },
    unmarshallOptions: {
        wrapNumbers: false,
    },
});
// Table names for easy reference - using environment variables with fallbacks
exports.TABLES = {
    USERS: process.env.USERS_TABLE_NAME || process.env.USERS_TABLE || 'SharpCRM-Users-development',
    CONTACTS: process.env.CONTACTS_TABLE_NAME || process.env.CONTACTS_TABLE || 'SharpCRM-Contacts-development',
    LEADS: process.env.LEADS_TABLE_NAME || process.env.LEADS_TABLE || 'SharpCRM-Leads-development',
    DEALS: process.env.DEALS_TABLE_NAME || process.env.DEALS_TABLE || 'SharpCRM-Deals-development',
    TASKS: process.env.TASKS_TABLE_NAME || process.env.TASKS_TABLE || 'SharpCRM-Tasks-development',
    PRODUCTS: process.env.PRODUCTS_TABLE_NAME || process.env.PRODUCTS_TABLE || 'SharpCRM-Products-development',
    SUBSIDIARIES: process.env.SUBSIDIARIES_TABLE_NAME || process.env.SUBSIDIARIES_TABLE || 'SharpCRM-Subsidiaries-development',
    DEALERS: process.env.DEALERS_TABLE_NAME || process.env.DEALERS_TABLE || 'SharpCRM-Dealers-development',
    NOTIFICATIONS: process.env.NOTIFICATIONS_TABLE_NAME || process.env.NOTIFICATIONS_TABLE || 'SharpCRM-Notifications-development',
    REPORTS: process.env.REPORTS_TABLE_NAME || process.env.REPORTS_TABLE || 'SharpCRM-Reports-development',
    REFRESH_TOKENS: process.env.REFRESH_TOKENS_TABLE_NAME || process.env.REFRESH_TOKENS_TABLE || 'SharpCRM-RefreshTokens-development',
    QUOTES: process.env.QUOTES_TABLE_NAME || process.env.QUOTES_TABLE || 'SharpCRM-Quotes-development',
    CHANNELS: process.env.CHANNELS_TABLE_NAME || process.env.CHANNELS_TABLE || 'SharpCRM-Channels-development',
    MESSAGES: process.env.MESSAGES_TABLE_NAME || process.env.MESSAGES_TABLE || 'SharpCRM-Messages-development',
    CHANNEL_MEMBERS: process.env.CHANNEL_MEMBERS_TABLE_NAME || process.env.CHANNEL_MEMBERS_TABLE || 'SharpCRM-ChannelMembers-development',
    DIRECT_MESSAGES: process.env.DIRECT_MESSAGES_TABLE_NAME || process.env.DIRECT_MESSAGES_TABLE || 'SharpCRM-DirectMessages-development'
};
// Debug table names (same pattern as auth routes)
console.log("=== DYNAMODB CLIENT TABLE NAMES DEBUG ===");
console.log("Environment variables:");
console.log("- USERS_TABLE_NAME:", process.env.USERS_TABLE_NAME);
console.log("- CONTACTS_TABLE_NAME:", process.env.CONTACTS_TABLE_NAME);
console.log("- LEADS_TABLE_NAME:", process.env.LEADS_TABLE_NAME);
console.log("- DEALS_TABLE_NAME:", process.env.DEALS_TABLE_NAME);
console.log("- TASKS_TABLE_NAME:", process.env.TASKS_TABLE_NAME);
console.log("- QUOTES_TABLE_NAME:", process.env.QUOTES_TABLE_NAME);
console.log("Resolved table names:");
console.log("- USERS:", exports.TABLES.USERS);
console.log("- CONTACTS:", exports.TABLES.CONTACTS);
console.log("- LEADS:", exports.TABLES.LEADS);
console.log("- DEALS:", exports.TABLES.DEALS);
console.log("- TASKS:", exports.TABLES.TASKS);
console.log("- QUOTES:", exports.TABLES.QUOTES);
console.log("============================================");
// Error messages mapping
const ERROR_MESSAGES = {
    ConditionalCheckFailedException: 'Record has been modified by another user',
    ValidationException: 'Invalid data provided',
    ResourceNotFoundException: 'Table or item not found',
    ProvisionedThroughputExceededException: 'Database is temporarily overloaded, please try again',
    Generic: 'Database operation failed'
};
/**
 * Helper function to handle DynamoDB errors
 * @param error The error object from DynamoDB
 * @param operation Optional string describing the operation that failed
 * @throws Error with appropriate message based on error type
 */
const handleDynamoError = (error, operation = "operation") => {
    console.error(`DynamoDB ${operation} error:`, error);
    // Log additional details in development
    if (!isProduction) {
        console.error('Error details:', {
            name: error.name,
            message: error.message,
            code: error.code,
            statusCode: error.statusCode,
            requestId: error.$metadata?.requestId
        });
    }
    // Get error type and throw appropriate error
    const errorType = error.name || 'Generic';
    const errorMessage = ERROR_MESSAGES[errorType];
    throw new Error(`${errorMessage} (${operation})`);
};
exports.handleDynamoError = handleDynamoError;
/**
 * Helper function to check if DynamoDB is accessible
 * @returns Promise<boolean>
 */
const checkDynamoDBConnection = async () => {
    try {
        // Try to describe the Users table
        await client.send({
            TableName: exports.TABLES.USERS
        });
        return true;
    }
    catch (error) {
        console.error('DynamoDB connection check failed:', error);
        return false;
    }
};
exports.checkDynamoDBConnection = checkDynamoDBConnection;
// Export configuration for reference
exports.config = {
    isProduction,
    isLocal,
    region: getClientConfig().region
};
