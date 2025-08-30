"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRefreshTokenFromCookie = exports.clearRefreshTokenCookie = exports.setRefreshTokenCookie = exports.validateTokenStructure = exports.autoRefreshTokens = exports.cleanupExpiredTokens = exports.createRefreshTokensTableIfNotExists = exports.checkRefreshTokensTableExists = exports.invalidateAllUserRefreshTokens = exports.invalidateRefreshToken = exports.verifyRefreshToken = exports.verifyAccessToken = exports.getTokenExpiry = exports.isTokenNearExpiry = exports.generateTokenPair = exports.generateRefreshToken = exports.generateAccessToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const uuid_1 = require("uuid");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const dynamoClient_1 = require("../services/dynamoClient");
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key';
// Token expiry settings
const ACCESS_TOKEN_EXPIRY = '180m'; // 60 minutes (3 Hours)
const REFRESH_TOKEN_EXPIRY = '7d'; // 7 days
const REFRESH_THRESHOLD = 5 * 60 * 1000; // 5 minutes in milliseconds
const generateAccessToken = (payload) => {
    return jsonwebtoken_1.default.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
};
exports.generateAccessToken = generateAccessToken;
const generateRefreshToken = async (payload, refreshTokensTable) => {
    const jti = (0, uuid_1.v4)(); // Unique identifier for the token
    const refreshToken = jsonwebtoken_1.default.sign({
        ...payload,
        jti, // Add the unique identifier to the payload
    }, JWT_REFRESH_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRY });
    // Store refresh token in DynamoDB
    try {
        console.log('🔄 Storing refresh token in database:', {
            tableName: refreshTokensTable,
            jti,
            userId: payload.userId,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        });
        await dynamoClient_1.docClient.send(new lib_dynamodb_1.PutCommand({
            TableName: refreshTokensTable,
            Item: {
                jti,
                userId: payload.userId,
                token: refreshToken,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
                createdAt: new Date().toISOString()
            }
        }));
        console.log('✅ Refresh token stored successfully in database');
    }
    catch (dbError) {
        console.error('❌ Database error during refresh token storage:', {
            error: dbError,
            tableName: refreshTokensTable,
            jti,
            userId: payload.userId
        });
        // Check if it's a table not found error
        if (dbError instanceof Error && dbError.message.includes('Table not found')) {
            console.error('❌ RefreshTokens table not found. Please ensure the table exists:', refreshTokensTable);
            throw new Error(`RefreshTokens table not found: ${refreshTokensTable}`);
        }
        // If it's a different error, we might want to continue without storing the token
        // This is a fallback to ensure the login still works
        console.warn('⚠️ Continuing without storing refresh token in database (non-critical error)');
    }
    return refreshToken;
};
exports.generateRefreshToken = generateRefreshToken;
/**
 * Generate both access and refresh tokens as a pair
 */
const generateTokenPair = async (payload, refreshTokensTable) => {
    try {
        console.log('🔍 Generating token pair for user:', payload.userId);
        const accessToken = (0, exports.generateAccessToken)(payload);
        console.log('✅ Access token generated');
        const refreshToken = await (0, exports.generateRefreshToken)(payload, refreshTokensTable);
        console.log('✅ Refresh token generated');
        // Calculate expiry times
        const accessTokenDecoded = jsonwebtoken_1.default.decode(accessToken);
        const refreshTokenDecoded = jsonwebtoken_1.default.decode(refreshToken);
        if (!accessTokenDecoded || !refreshTokenDecoded) {
            throw new Error('Failed to decode generated tokens');
        }
        const tokenPair = {
            accessToken,
            refreshToken,
            accessTokenExpiry: accessTokenDecoded.exp * 1000, // Convert to milliseconds
            refreshTokenExpiry: refreshTokenDecoded.exp * 1000
        };
        console.log('✅ Token pair generated successfully');
        return tokenPair;
    }
    catch (error) {
        console.error('❌ Error generating token pair:', error);
        throw error;
    }
};
exports.generateTokenPair = generateTokenPair;
/**
 * Check if token is near expiry
 */
const isTokenNearExpiry = (token, thresholdMs = REFRESH_THRESHOLD) => {
    try {
        const decoded = jsonwebtoken_1.default.decode(token);
        if (!decoded || !decoded.exp)
            return true;
        const expiryTime = decoded.exp * 1000; // Convert to milliseconds
        const currentTime = Date.now();
        return (expiryTime - currentTime) < thresholdMs;
    }
    catch (error) {
        return true; // If we can't decode, assume it's expired
    }
};
exports.isTokenNearExpiry = isTokenNearExpiry;
/**
 * Get token expiry time
 */
const getTokenExpiry = (token) => {
    try {
        const decoded = jsonwebtoken_1.default.decode(token);
        return decoded?.exp ? decoded.exp * 1000 : null;
    }
    catch (error) {
        return null;
    }
};
exports.getTokenExpiry = getTokenExpiry;
const verifyAccessToken = (token) => {
    return jsonwebtoken_1.default.verify(token, JWT_SECRET);
};
exports.verifyAccessToken = verifyAccessToken;
const verifyRefreshToken = async (token, refreshTokensTable) => {
    const decoded = jsonwebtoken_1.default.verify(token, JWT_REFRESH_SECRET);
    // Check if token exists in database
    let result;
    try {
        console.log('🔄 Verifying refresh token in database:', {
            tableName: refreshTokensTable,
            jti: decoded.jti,
            userId: decoded.userId
        });
        result = await dynamoClient_1.docClient.send(new lib_dynamodb_1.GetCommand({
            TableName: refreshTokensTable,
            Key: { jti: decoded.jti }
        }));
        console.log('🔄 Database query result:', {
            found: !!result.Item,
            item: result.Item ? 'exists' : 'not found'
        });
    }
    catch (dbError) {
        console.error('❌ Database error during refresh token verification:', {
            error: dbError,
            tableName: refreshTokensTable,
            jti: decoded.jti
        });
        // Check if it's a table not found error
        if (dbError instanceof Error && dbError.message.includes('Table not found')) {
            console.error('❌ RefreshTokens table not found. Please ensure the table exists:', refreshTokensTable);
            throw new Error(`RefreshTokens table not found: ${refreshTokensTable}`);
        }
        throw new Error('Database connection error');
    }
    if (!result.Item) {
        console.error('❌ Refresh token not found in database:', {
            jti: decoded.jti,
            tableName: refreshTokensTable
        });
        throw new Error('Refresh token not found');
    }
    // Check if token is expired
    if (new Date(result.Item.expiresAt) < new Date()) {
        console.log('❌ Refresh token expired:', {
            jti: decoded.jti,
            expiresAt: result.Item.expiresAt,
            currentTime: new Date().toISOString()
        });
        try {
            await (0, exports.invalidateRefreshToken)(decoded.jti, refreshTokensTable);
        }
        catch (error) {
            console.warn('Failed to invalidate expired token:', error);
        }
        throw new Error('Refresh token expired');
    }
    // Update last used timestamp
    try {
        await dynamoClient_1.docClient.send(new lib_dynamodb_1.PutCommand({
            TableName: refreshTokensTable,
            Item: {
                ...result.Item,
                lastUsed: new Date().toISOString()
            }
        }));
    }
    catch (error) {
        console.warn('Failed to update last used timestamp:', error);
        // Don't throw here - token verification succeeded
    }
    console.log('✅ Refresh token verified successfully');
    return decoded;
};
exports.verifyRefreshToken = verifyRefreshToken;
const invalidateRefreshToken = async (jti, refreshTokensTable) => {
    await dynamoClient_1.docClient.send(new lib_dynamodb_1.DeleteCommand({
        TableName: refreshTokensTable,
        Key: { jti }
    }));
};
exports.invalidateRefreshToken = invalidateRefreshToken;
/**
 * Invalidate all refresh tokens for a user using GSI
 */
const invalidateAllUserRefreshTokens = async (userId, refreshTokensTable) => {
    try {
        // Query all tokens for the user using GSI
        const result = await dynamoClient_1.docClient.send(new lib_dynamodb_1.ScanCommand({
            TableName: refreshTokensTable,
            FilterExpression: "userId = :userId",
            ExpressionAttributeValues: {
                ":userId": userId
            }
        }));
        // Delete all tokens
        if (result.Items && result.Items.length > 0) {
            const deletePromises = result.Items.map(item => dynamoClient_1.docClient.send(new lib_dynamodb_1.DeleteCommand({
                TableName: refreshTokensTable,
                Key: { jti: item.jti }
            })));
            await Promise.all(deletePromises);
            console.log(`Invalidated ${result.Items.length} refresh tokens for user ${userId}`);
        }
    }
    catch (error) {
        console.error(`Error invalidating refresh tokens for user ${userId}:`, error);
        throw error;
    }
};
exports.invalidateAllUserRefreshTokens = invalidateAllUserRefreshTokens;
/**
 * Check if RefreshTokens table exists
 * @param refreshTokensTable - The table name to check
 * @returns Promise<boolean> indicating if table exists
 */
const checkRefreshTokensTableExists = async (refreshTokensTable) => {
    try {
        console.log('🔍 Checking if RefreshTokens table exists:', refreshTokensTable);
        // Import DynamoDB client
        const { DynamoDBClient, DescribeTableCommand } = await Promise.resolve().then(() => __importStar(require('@aws-sdk/client-dynamodb')));
        const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
        console.log('🔍 DynamoDB client configured with region:', process.env.AWS_REGION || 'us-east-1');
        // Try to describe the table
        await client.send(new DescribeTableCommand({
            TableName: refreshTokensTable
        }));
        console.log('✅ RefreshTokens table exists:', refreshTokensTable);
        return true;
    }
    catch (error) {
        console.error('❌ RefreshTokens table does not exist or is not accessible:', {
            tableName: refreshTokensTable,
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined
        });
        return false;
    }
};
exports.checkRefreshTokensTableExists = checkRefreshTokensTableExists;
/**
 * Create RefreshTokens table if it doesn't exist
 * @param refreshTokensTable - The table name to create
 * @returns Promise<boolean> indicating if table was created or already exists
 */
const createRefreshTokensTableIfNotExists = async (refreshTokensTable) => {
    try {
        console.log('🔍 Checking if RefreshTokens table exists:', refreshTokensTable);
        // Check if table exists
        const tableExists = await (0, exports.checkRefreshTokensTableExists)(refreshTokensTable);
        if (tableExists) {
            console.log('✅ RefreshTokens table already exists:', refreshTokensTable);
            return true;
        }
        console.log('🔄 Creating RefreshTokens table:', refreshTokensTable);
        // Import DynamoDB client
        const { DynamoDBClient, CreateTableCommand } = await Promise.resolve().then(() => __importStar(require('@aws-sdk/client-dynamodb')));
        const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
        // Create table
        await client.send(new CreateTableCommand({
            TableName: refreshTokensTable,
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
        }));
        console.log('✅ RefreshTokens table created successfully:', refreshTokensTable);
        // Wait a moment for the table to be fully created
        console.log('⏳ Waiting for table to be fully created...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        // Verify the table was created
        const verifyExists = await (0, exports.checkRefreshTokensTableExists)(refreshTokensTable);
        if (!verifyExists) {
            console.error('❌ Table creation verification failed:', refreshTokensTable);
            return false;
        }
        console.log('✅ RefreshTokens table verified and ready:', refreshTokensTable);
        return true;
    }
    catch (error) {
        console.error('❌ Failed to create RefreshTokens table:', {
            tableName: refreshTokensTable,
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined
        });
        return false;
    }
};
exports.createRefreshTokensTableIfNotExists = createRefreshTokensTableIfNotExists;
/**
 * Clean up expired refresh tokens
 */
const cleanupExpiredTokens = async (refreshTokensTable) => {
    try {
        const now = new Date().toISOString();
        // Scan for expired tokens
        const result = await dynamoClient_1.docClient.send(new lib_dynamodb_1.ScanCommand({
            TableName: refreshTokensTable,
            FilterExpression: "expiresAt < :now",
            ExpressionAttributeValues: {
                ":now": now
            }
        }));
        // Delete expired tokens
        if (result.Items && result.Items.length > 0) {
            const deletePromises = result.Items.map(item => dynamoClient_1.docClient.send(new lib_dynamodb_1.DeleteCommand({
                TableName: refreshTokensTable,
                Key: { jti: item.jti }
            })));
            await Promise.all(deletePromises);
            console.log(`Cleaned up ${result.Items.length} expired refresh tokens`);
        }
    }
    catch (error) {
        console.error('Error cleaning up expired tokens:', error);
    }
};
exports.cleanupExpiredTokens = cleanupExpiredTokens;
/**
 * Auto-refresh tokens if access token is near expiry
 */
const autoRefreshTokens = async (accessToken, refreshToken, refreshTokensTable, usersTable) => {
    try {
        // Check if access token is near expiry
        if (!(0, exports.isTokenNearExpiry)(accessToken)) {
            return { shouldRefresh: false };
        }
        // Verify refresh token and get user data
        const decoded = await (0, exports.verifyRefreshToken)(refreshToken, refreshTokensTable);
        // Get fresh user data from database
        const userResult = await dynamoClient_1.docClient.send(new lib_dynamodb_1.GetCommand({
            TableName: usersTable,
            Key: { email: decoded.email }
        }));
        if (!userResult.Item || userResult.Item.isDeleted) {
            throw new Error('User not found or deleted');
        }
        // Generate new token pair
        const newTokens = await (0, exports.generateTokenPair)({
            userId: userResult.Item.userId,
            email: userResult.Item.email,
            role: userResult.Item.role,
            tenantId: userResult.Item.tenantId
        }, refreshTokensTable);
        // Invalidate old refresh token
        if (decoded.jti) {
            await (0, exports.invalidateRefreshToken)(decoded.jti, refreshTokensTable);
        }
        return {
            shouldRefresh: true,
            tokens: newTokens
        };
    }
    catch (error) {
        console.error('Auto-refresh error:', error);
        return { shouldRefresh: false };
    }
};
exports.autoRefreshTokens = autoRefreshTokens;
/**
 * Validate token structure and expiry
 */
const validateTokenStructure = (token) => {
    try {
        const decoded = jsonwebtoken_1.default.decode(token);
        if (!decoded) {
            return { valid: false, expired: false };
        }
        const now = Math.floor(Date.now() / 1000);
        const expired = decoded.exp && decoded.exp < now;
        return {
            valid: true,
            expired: !!expired,
            payload: decoded
        };
    }
    catch (error) {
        return { valid: false, expired: false };
    }
};
exports.validateTokenStructure = validateTokenStructure;
/**
 * Set secure HTTP-only cookie for refresh token
 * Why: HTTP-only cookies prevent XSS attacks and secure flag prevents MITM attacks
 */
const setRefreshTokenCookie = (res, refreshToken) => {
    const isProduction = process.env.NODE_ENV === 'production';
    const isSecure = process.env.NODE_ENV === 'production' || process.env.FORCE_SECURE_COOKIES === 'true';
    const cookieOptions = {
        httpOnly: true, // Prevents XSS attacks
        secure: isSecure, // Use HTTPS in production
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        path: '/' // Use root path to allow access from all routes
    };
    // Handle sameSite for cross-origin requests
    if (isSecure) {
        cookieOptions.sameSite = 'none'; // Allow cross-origin cookies (CloudFront -> API Gateway)
    }
    else {
        cookieOptions.sameSite = 'lax'; // More permissive for development
    }
    res.cookie('refreshToken', refreshToken, cookieOptions);
};
exports.setRefreshTokenCookie = setRefreshTokenCookie;
/**
 * Clear refresh token cookie
 * Why: Ensures proper logout and prevents token reuse
 */
const clearRefreshTokenCookie = (res) => {
    const isSecure = process.env.NODE_ENV === 'production' || process.env.FORCE_SECURE_COOKIES === 'true';
    const cookieOptions = {
        httpOnly: true,
        secure: isSecure, // Use HTTPS in production
        path: '/'
    };
    // Handle sameSite for cross-origin requests
    if (isSecure) {
        cookieOptions.sameSite = 'none'; // Allow cross-origin cookies (CloudFront -> API Gateway)
    }
    else {
        cookieOptions.sameSite = 'lax'; // More permissive for development
    }
    res.clearCookie('refreshToken', cookieOptions);
};
exports.clearRefreshTokenCookie = clearRefreshTokenCookie;
/**
 * Extract refresh token from cookie
 * Why: Centralized cookie handling with proper error handling
 */
const getRefreshTokenFromCookie = (req) => {
    return req.cookies?.refreshToken || null;
};
exports.getRefreshTokenFromCookie = getRefreshTokenFromCookie;
