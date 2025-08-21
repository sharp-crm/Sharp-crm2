import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { PutCommand, DeleteCommand, GetCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { docClient } from '../services/dynamoClient';
import { Response } from 'express';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key';

// Token expiry settings
const ACCESS_TOKEN_EXPIRY = '180m'; // 60 minutes (3 Hours)
const REFRESH_TOKEN_EXPIRY = '7d'; // 7 days
const REFRESH_THRESHOLD = 5 * 60 * 1000; // 5 minutes in milliseconds

interface TokenPayload {
  userId: string;
  email: string;
  role?: string;
  tenantId?: string;
  jti?: string;
  iat?: number;
  exp?: number;
}

interface TokenPair {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiry: number;
  refreshTokenExpiry: number;
}

interface RefreshTokenRecord {
  jti: string;
  userId: string;
  token: string;
  expiresAt: string;
  createdAt: string;
  lastUsed?: string;
}

export const generateAccessToken = (payload: TokenPayload): string => {
  return jwt.sign(
    payload,
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );
};

export const generateRefreshToken = async (payload: TokenPayload, refreshTokensTable: string): Promise<string> => {
  const jti = uuidv4(); // Unique identifier for the token
  const refreshToken = jwt.sign(
    {
      ...payload,
      jti, // Add the unique identifier to the payload
    },
    JWT_REFRESH_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRY }
  );

  // Store refresh token in DynamoDB
  try {
    console.log('🔄 Storing refresh token in database:', {
      tableName: refreshTokensTable,
      jti,
      userId: payload.userId,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    });

    await docClient.send(new PutCommand({
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
  } catch (dbError) {
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

/**
 * Generate both access and refresh tokens as a pair
 */
export const generateTokenPair = async (payload: TokenPayload, refreshTokensTable: string): Promise<TokenPair> => {
  try {
    console.log('🔍 Generating token pair for user:', payload.userId);
    
    const accessToken = generateAccessToken(payload);
    console.log('✅ Access token generated');
    
    const refreshToken = await generateRefreshToken(payload, refreshTokensTable);
    console.log('✅ Refresh token generated');
    
    // Calculate expiry times
    const accessTokenDecoded = jwt.decode(accessToken) as any;
    const refreshTokenDecoded = jwt.decode(refreshToken) as any;
    
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
  } catch (error) {
    console.error('❌ Error generating token pair:', error);
    throw error;
  }
};

/**
 * Check if token is near expiry
 */
export const isTokenNearExpiry = (token: string, thresholdMs: number = REFRESH_THRESHOLD): boolean => {
  try {
    const decoded = jwt.decode(token) as any;
    if (!decoded || !decoded.exp) return true;
    
    const expiryTime = decoded.exp * 1000; // Convert to milliseconds
    const currentTime = Date.now();
    
    return (expiryTime - currentTime) < thresholdMs;
  } catch (error) {
    return true; // If we can't decode, assume it's expired
  }
};

/**
 * Get token expiry time
 */
export const getTokenExpiry = (token: string): number | null => {
  try {
    const decoded = jwt.decode(token) as any;
    return decoded?.exp ? decoded.exp * 1000 : null;
  } catch (error) {
    return null;
  }
};

export const verifyAccessToken = (token: string): TokenPayload => {
  return jwt.verify(token, JWT_SECRET) as TokenPayload;
};

export const verifyRefreshToken = async (token: string, refreshTokensTable: string): Promise<TokenPayload> => {
  const decoded = jwt.verify(token, JWT_REFRESH_SECRET) as TokenPayload & { jti: string };
  
  // Check if token exists in database
  let result;
  try {
    console.log('🔄 Verifying refresh token in database:', {
      tableName: refreshTokensTable,
      jti: decoded.jti,
      userId: decoded.userId
    });

    result = await docClient.send(new GetCommand({
      TableName: refreshTokensTable,
      Key: { jti: decoded.jti }
    }));

    console.log('🔄 Database query result:', {
      found: !!result.Item,
      item: result.Item ? 'exists' : 'not found'
    });
  } catch (dbError) {
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
      await invalidateRefreshToken(decoded.jti, refreshTokensTable);
    } catch (error) {
      console.warn('Failed to invalidate expired token:', error);
    }
    throw new Error('Refresh token expired');
  }

  // Update last used timestamp
  try {
    await docClient.send(new PutCommand({
      TableName: refreshTokensTable,
      Item: {
        ...result.Item,
        lastUsed: new Date().toISOString()
      }
    }));
  } catch (error) {
    console.warn('Failed to update last used timestamp:', error);
    // Don't throw here - token verification succeeded
  }

  console.log('✅ Refresh token verified successfully');
  return decoded;
};

export const invalidateRefreshToken = async (jti: string, refreshTokensTable: string): Promise<void> => {
  await docClient.send(new DeleteCommand({
    TableName: refreshTokensTable,
    Key: { jti }
  }));
};

/**
 * Invalidate all refresh tokens for a user using GSI
 */
export const invalidateAllUserRefreshTokens = async (userId: string, refreshTokensTable: string): Promise<void> => {
  try {
    // Query all tokens for the user using GSI
    const result = await docClient.send(new ScanCommand({
      TableName: refreshTokensTable,
      FilterExpression: "userId = :userId",
      ExpressionAttributeValues: {
        ":userId": userId
      }
    }));

    // Delete all tokens
    if (result.Items && result.Items.length > 0) {
      const deletePromises = result.Items.map(item => 
        docClient.send(new DeleteCommand({
          TableName: refreshTokensTable,
          Key: { jti: item.jti }
        }))
      );
      
      await Promise.all(deletePromises);
      console.log(`Invalidated ${result.Items.length} refresh tokens for user ${userId}`);
    }
  } catch (error) {
    console.error(`Error invalidating refresh tokens for user ${userId}:`, error);
    throw error;
  }
};

/**
 * Check if RefreshTokens table exists
 * @param refreshTokensTable - The table name to check
 * @returns Promise<boolean> indicating if table exists
 */
export const checkRefreshTokensTableExists = async (refreshTokensTable: string): Promise<boolean> => {
  try {
    console.log('🔍 Checking if RefreshTokens table exists:', refreshTokensTable);
    
    // Import DynamoDB client
    const { DynamoDBClient, DescribeTableCommand } = await import('@aws-sdk/client-dynamodb');
    const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
    
    console.log('🔍 DynamoDB client configured with region:', process.env.AWS_REGION || 'us-east-1');
    
    // Try to describe the table
    await client.send(new DescribeTableCommand({
      TableName: refreshTokensTable
    }));
    
    console.log('✅ RefreshTokens table exists:', refreshTokensTable);
    return true;
  } catch (error) {
    console.error('❌ RefreshTokens table does not exist or is not accessible:', {
      tableName: refreshTokensTable,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return false;
  }
};

/**
 * Create RefreshTokens table if it doesn't exist
 * @param refreshTokensTable - The table name to create
 * @returns Promise<boolean> indicating if table was created or already exists
 */
export const createRefreshTokensTableIfNotExists = async (refreshTokensTable: string): Promise<boolean> => {
  try {
    console.log('🔍 Checking if RefreshTokens table exists:', refreshTokensTable);
    
    // Check if table exists
    const tableExists = await checkRefreshTokensTableExists(refreshTokensTable);
    if (tableExists) {
      console.log('✅ RefreshTokens table already exists:', refreshTokensTable);
      return true;
    }

    console.log('🔄 Creating RefreshTokens table:', refreshTokensTable);
    
    // Import DynamoDB client
    const { DynamoDBClient, CreateTableCommand } = await import('@aws-sdk/client-dynamodb');
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
    const verifyExists = await checkRefreshTokensTableExists(refreshTokensTable);
    if (!verifyExists) {
      console.error('❌ Table creation verification failed:', refreshTokensTable);
      return false;
    }
    
    console.log('✅ RefreshTokens table verified and ready:', refreshTokensTable);
    return true;
  } catch (error) {
    console.error('❌ Failed to create RefreshTokens table:', {
      tableName: refreshTokensTable,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return false;
  }
};

/**
 * Clean up expired refresh tokens
 */
export const cleanupExpiredTokens = async (refreshTokensTable: string): Promise<void> => {
  try {
    const now = new Date().toISOString();
    
    // Scan for expired tokens
    const result = await docClient.send(new ScanCommand({
      TableName: refreshTokensTable,
      FilterExpression: "expiresAt < :now",
      ExpressionAttributeValues: {
        ":now": now
      }
    }));

    // Delete expired tokens
    if (result.Items && result.Items.length > 0) {
      const deletePromises = result.Items.map(item => 
        docClient.send(new DeleteCommand({
          TableName: refreshTokensTable,
          Key: { jti: item.jti }
        }))
      );
      
      await Promise.all(deletePromises);
      console.log(`Cleaned up ${result.Items.length} expired refresh tokens`);
    }
  } catch (error) {
    console.error('Error cleaning up expired tokens:', error);
  }
};

/**
 * Auto-refresh tokens if access token is near expiry
 */
export const autoRefreshTokens = async (
  accessToken: string, 
  refreshToken: string,
  refreshTokensTable: string,
  usersTable: string
): Promise<{ shouldRefresh: boolean; tokens?: TokenPair }> => {
  try {
    // Check if access token is near expiry
    if (!isTokenNearExpiry(accessToken)) {
      return { shouldRefresh: false };
    }

    // Verify refresh token and get user data
    const decoded = await verifyRefreshToken(refreshToken, refreshTokensTable);
    
    // Get fresh user data from database
    const userResult = await docClient.send(new GetCommand({
      TableName: usersTable,
      Key: { email: decoded.email }
    }));

    if (!userResult.Item || userResult.Item.isDeleted) {
      throw new Error('User not found or deleted');
    }

    // Generate new token pair
    const newTokens = await generateTokenPair({
      userId: userResult.Item.userId,
      email: userResult.Item.email,
      role: userResult.Item.role,
      tenantId: userResult.Item.tenantId
    }, refreshTokensTable);

    // Invalidate old refresh token
    if (decoded.jti) {
      await invalidateRefreshToken(decoded.jti, refreshTokensTable);
    }

    return {
      shouldRefresh: true,
      tokens: newTokens
    };
  } catch (error) {
    console.error('Auto-refresh error:', error);
    return { shouldRefresh: false };
  }
};

/**
 * Validate token structure and expiry
 */
export const validateTokenStructure = (token: string): { valid: boolean; expired: boolean; payload?: any } => {
  try {
    const decoded = jwt.decode(token) as any;
    
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
  } catch (error) {
    return { valid: false, expired: false };
  }
};

/**
 * Set secure HTTP-only cookie for refresh token
 * Why: HTTP-only cookies prevent XSS attacks and secure flag prevents MITM attacks
 */
export const setRefreshTokenCookie = (res: Response, refreshToken: string): void => {
  const isProduction = process.env.NODE_ENV === 'production';
  const isSecure = process.env.NODE_ENV === 'production' || process.env.FORCE_SECURE_COOKIES === 'true';
  
  const cookieOptions: any = {
    httpOnly: true, // Prevents XSS attacks
    secure: isSecure, // Use HTTPS in production
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/' // Use root path to allow access from all routes
  };
  
  // Handle sameSite for cross-origin requests
  if (isSecure) {
    cookieOptions.sameSite = 'none'; // Allow cross-origin cookies (CloudFront -> API Gateway)
  } else {
    cookieOptions.sameSite = 'lax'; // More permissive for development
  }
  
  res.cookie('refreshToken', refreshToken, cookieOptions);
};

/**
 * Clear refresh token cookie
 * Why: Ensures proper logout and prevents token reuse
 */
export const clearRefreshTokenCookie = (res: Response): void => {
  const isSecure = process.env.NODE_ENV === 'production' || process.env.FORCE_SECURE_COOKIES === 'true';
  
  const cookieOptions: any = {
    httpOnly: true,
    secure: isSecure, // Use HTTPS in production
    path: '/'
  };
  
  // Handle sameSite for cross-origin requests
  if (isSecure) {
    cookieOptions.sameSite = 'none'; // Allow cross-origin cookies (CloudFront -> API Gateway)
  } else {
    cookieOptions.sameSite = 'lax'; // More permissive for development
  }
  
  res.clearCookie('refreshToken', cookieOptions);
};

/**
 * Extract refresh token from cookie
 * Why: Centralized cookie handling with proper error handling
 */
export const getRefreshTokenFromCookie = (req: any): string | null => {
  return req.cookies?.refreshToken || null;
};

