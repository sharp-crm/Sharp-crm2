"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkRequiredTables = exports.waitForDatabaseReady = exports.checkTableStatus = exports.checkDatabaseConnection = void 0;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const dynamoClient_1 = require("../services/dynamoClient");
/**
 * Check if DynamoDB is accessible
 */
const checkDatabaseConnection = async () => {
    try {
        const response = await dynamoClient_1.client.send(new client_dynamodb_1.ListTablesCommand({}));
        return {
            connected: true,
            tables: response.TableNames || []
        };
    }
    catch (error) {
        console.error('Database connection check failed:', error);
        return {
            connected: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
};
exports.checkDatabaseConnection = checkDatabaseConnection;
/**
 * Check if a specific table exists and is active
 */
const checkTableStatus = async (tableName) => {
    try {
        const response = await dynamoClient_1.client.send(new client_dynamodb_1.DescribeTableCommand({ TableName: tableName }));
        return {
            exists: true,
            status: response.Table?.TableStatus || 'UNKNOWN'
        };
    }
    catch (error) {
        if (error instanceof Error && error.name === 'ResourceNotFoundException') {
            return {
                exists: false,
                error: 'Table not found'
            };
        }
        console.error(`Error checking table ${tableName}:`, error);
        return {
            exists: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
};
exports.checkTableStatus = checkTableStatus;
/**
 * Wait for database to be ready
 */
const waitForDatabaseReady = async (maxRetries = 10, delayMs = 2000) => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        console.log(`Database connectivity check attempt ${attempt}/${maxRetries}`);
        const dbCheck = await (0, exports.checkDatabaseConnection)();
        if (dbCheck.connected) {
            console.log('✅ Database connection established');
            return true;
        }
        if (attempt < maxRetries) {
            console.log(`⏳ Waiting ${delayMs}ms before retry...`);
            await new Promise(resolve => setTimeout(resolve, delayMs));
        }
    }
    console.error('❌ Database connection failed after all retries');
    return false;
};
exports.waitForDatabaseReady = waitForDatabaseReady;
/**
 * Check if required tables exist
 */
const checkRequiredTables = async () => {
    const requiredTables = ['Users', 'RefreshTokens'];
    const missing = [];
    const existing = [];
    for (const tableName of requiredTables) {
        const tableCheck = await (0, exports.checkTableStatus)(tableName);
        if (tableCheck.exists && tableCheck.status === 'ACTIVE') {
            existing.push(tableName);
        }
        else {
            missing.push(tableName);
        }
    }
    return {
        allExist: missing.length === 0,
        missing,
        existing
    };
};
exports.checkRequiredTables = checkRequiredTables;
