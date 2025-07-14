import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { PutCommand, DeleteCommand, GetCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { docClient } from '../services/dynamoClient';
import { Response } from 'express';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key';

// Token expiry settings
const ACCESS_TOKEN_EXPIRY = '60m'; // 60 minutes
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

export const generateRefreshToken = async (payload: TokenPayload): Promise<string> => {
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
    await docClient.send(new PutCommand({
      TableName: "RefreshTokens",
      Item: {
        jti,
        userId: payload.userId,
        token: refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
        createdAt: new Date().toISOString()
      }
    }));
  } catch (dbError) {
    console.error('Database error during refresh token storage:', dbError);
    throw new Error('Failed to store refresh token');
  }

  return refreshToken;
};

/**
 * Generate both access and refresh tokens as a pair
 */
export const generateTokenPair = async (payload: TokenPayload): Promise<TokenPair> => {
  const accessToken = generateAccessToken(payload);
  const refreshToken = await generateRefreshToken(payload);
  
  // Calculate expiry times
  const accessTokenDecoded = jwt.decode(accessToken) as any;
  const refreshTokenDecoded = jwt.decode(refreshToken) as any;
  
  return {
    accessToken,
    refreshToken,
    accessTokenExpiry: accessTokenDecoded.exp * 1000, // Convert to milliseconds
    refreshTokenExpiry: refreshTokenDecoded.exp * 1000
  };
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

export const verifyRefreshToken = async (token: string): Promise<TokenPayload> => {
  const decoded = jwt.verify(token, JWT_REFRESH_SECRET) as TokenPayload & { jti: string };
  
  // Check if token exists in database
  let result;
  try {
    result = await docClient.send(new GetCommand({
      TableName: "RefreshTokens",
      Key: { jti: decoded.jti }
    }));
  } catch (dbError) {
    console.error('Database error during refresh token verification:', dbError);
    throw new Error('Database connection error');
  }

  if (!result.Item) {
    throw new Error('Refresh token not found');
  }

  // Check if token is expired
  if (new Date(result.Item.expiresAt) < new Date()) {
    try {
      await invalidateRefreshToken(decoded.jti);
    } catch (error) {
      console.warn('Failed to invalidate expired token:', error);
    }
    throw new Error('Refresh token expired');
  }

  // Update last used timestamp
  try {
    await docClient.send(new PutCommand({
      TableName: "RefreshTokens",
      Item: {
        ...result.Item,
        lastUsed: new Date().toISOString()
      }
    }));
  } catch (error) {
    console.warn('Failed to update last used timestamp:', error);
    // Don't throw here - token verification succeeded
  }

  return decoded;
};

export const invalidateRefreshToken = async (jti: string): Promise<void> => {
  await docClient.send(new DeleteCommand({
    TableName: "RefreshTokens",
    Key: { jti }
  }));
};

/**
 * Invalidate all refresh tokens for a user using GSI
 */
export const invalidateAllUserRefreshTokens = async (userId: string): Promise<void> => {
  try {
    // Query all tokens for the user using GSI
    const result = await docClient.send(new ScanCommand({
      TableName: "RefreshTokens",
      FilterExpression: "userId = :userId",
      ExpressionAttributeValues: {
        ":userId": userId
      }
    }));

    // Delete all tokens
    if (result.Items && result.Items.length > 0) {
      const deletePromises = result.Items.map(item => 
        docClient.send(new DeleteCommand({
          TableName: "RefreshTokens",
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
 * Clean up expired refresh tokens
 */
export const cleanupExpiredTokens = async (): Promise<void> => {
  try {
    const now = new Date().toISOString();
    
    // Scan for expired tokens
    const result = await docClient.send(new ScanCommand({
      TableName: "RefreshTokens",
      FilterExpression: "expiresAt < :now",
      ExpressionAttributeValues: {
        ":now": now
      }
    }));

    // Delete expired tokens
    if (result.Items && result.Items.length > 0) {
      const deletePromises = result.Items.map(item => 
        docClient.send(new DeleteCommand({
          TableName: "RefreshTokens",
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
  refreshToken: string
): Promise<{ shouldRefresh: boolean; tokens?: TokenPair }> => {
  try {
    // Check if access token is near expiry
    if (!isTokenNearExpiry(accessToken)) {
      return { shouldRefresh: false };
    }

    // Verify refresh token and get user data
    const decoded = await verifyRefreshToken(refreshToken);
    
    // Get fresh user data from database
    const userResult = await docClient.send(new GetCommand({
      TableName: "Users",
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
    });

    // Invalidate old refresh token
    if (decoded.jti) {
      await invalidateRefreshToken(decoded.jti);
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
  
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true, // Prevents XSS attacks
    secure: isProduction, // HTTPS only in production
    sameSite: 'strict', // CSRF protection
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/api/auth' // Restrict to auth routes only
  });
};

/**
 * Clear refresh token cookie
 * Why: Ensures proper logout and prevents token reuse
 */
export const clearRefreshTokenCookie = (res: Response): void => {
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/api/auth'
  });
};

/**
 * Extract refresh token from cookie
 * Why: Centralized cookie handling with proper error handling
 */
export const getRefreshTokenFromCookie = (req: any): string | null => {
  return req.cookies?.refreshToken || null;
};

