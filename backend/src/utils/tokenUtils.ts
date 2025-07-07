import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { PutCommand, DeleteCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { docClient } from '../services/dynamoClient';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key';

interface TokenPayload {
  userId: string;
  email: string;
  role?: string;
  tenantId?: string;
  jti?: string;
}

export const generateAccessToken = (payload: TokenPayload): string => {
  return jwt.sign(
    payload,
    JWT_SECRET,
    { expiresIn: '24h' }
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
    { expiresIn: '7d' }
  );

  // Store refresh token in DynamoDB
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

  return refreshToken;
};

export const verifyAccessToken = (token: string): TokenPayload => {
  return jwt.verify(token, JWT_SECRET) as TokenPayload;
};

export const verifyRefreshToken = async (token: string): Promise<TokenPayload> => {
  const decoded = jwt.verify(token, JWT_REFRESH_SECRET) as TokenPayload & { jti: string };
  
  // Check if token exists in database
  const result = await docClient.send(new GetCommand({
    TableName: "RefreshTokens",
    Key: { jti: decoded.jti }
  }));

  if (!result.Item) {
    throw new Error('Refresh token not found');
  }

  // Check if token is expired
  if (new Date(result.Item.expiresAt) < new Date()) {
    await invalidateRefreshToken(decoded.jti);
    throw new Error('Refresh token expired');
  }

  return decoded;
};

export const invalidateRefreshToken = async (jti: string): Promise<void> => {
  await docClient.send(new DeleteCommand({
    TableName: "RefreshTokens",
    Key: { jti }
  }));
};

export const invalidateAllUserRefreshTokens = async (userId: string): Promise<void> => {
  // In a real implementation, you would use a GSI to query by userId
  // For now, we'll just note that this would be the place to invalidate all tokens
  console.log(`Invalidating all refresh tokens for user ${userId}`);
}; 