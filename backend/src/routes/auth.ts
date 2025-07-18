import { Router, Request, Response, RequestHandler } from 'express';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { 
  generateAccessToken, 
  generateRefreshToken, 
  generateTokenPair,
  verifyRefreshToken, 
  invalidateRefreshToken,
  invalidateAllUserRefreshTokens,
  autoRefreshTokens,
  isTokenNearExpiry,
  validateTokenStructure,
  setRefreshTokenCookie,
  clearRefreshTokenCookie,
  getRefreshTokenFromCookie
} from '../utils/tokenUtils';
import { docClient } from '../services/dynamoClient';

const router = Router();

// Get table names from environment variables
const USERS_TABLE = process.env.USERS_TABLE_NAME || process.env.USERS_TABLE || 'Users';
const REFRESH_TOKENS_TABLE = process.env.REFRESH_TOKENS_TABLE_NAME || process.env.REFRESH_TOKENS_TABLE || 'RefreshTokens';

// Debug table names
console.log("=== TABLE NAMES DEBUG ===");
console.log("USERS_TABLE_NAME env:", process.env.USERS_TABLE_NAME);
console.log("USERS_TABLE env:", process.env.USERS_TABLE);
console.log("Resolved USERS_TABLE:", USERS_TABLE);
console.log("=========================");

// Register new user
const register: RequestHandler = async (req, res, next) => {
  try {
    const { email, password, firstName, lastName, role, phoneNumber } = req.body;

    // Check if user already exists
    let existingUser;
    try {
      existingUser = await docClient.send(new GetCommand({
        TableName: USERS_TABLE,
        Key: { email }
      }));
    } catch (dbError) {
      console.error('Database connection error during user check:', dbError);
      res.status(503).json({ 
        message: "Database connection error. Please try again later.",
        error: process.env.NODE_ENV === 'development' ? (dbError instanceof Error ? dbError.message : 'Unknown error') : undefined
      });
      return;
    }

    if (existingUser.Item) {
      res.status(400).json({ message: "User already exists" });
      return;
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Debug log for registration
    console.log("=== REGISTRATION DEBUG ===");
    console.log("Plain password:", password);
    console.log("Hashed password during registration:", hashedPassword);
    console.log("=========================");

    // Create new user
    const userId = uuidv4();
    const timestamp = new Date().toISOString();

    // Create user object, filtering out undefined values
    const newUser: any = {
      userId,
      email,
      password: hashedPassword,
      firstName,
      lastName,
      role,
      tenantId: "UNASSIGNED", // New registrations start with unassigned tenant
      createdBy: "SELF_REGISTRATION", // Self-registration
      isDeleted: false,
      createdAt: timestamp,
      updatedAt: timestamp
    };

    // Only add phoneNumber if it has a value
    if (phoneNumber) {
      newUser.phoneNumber = phoneNumber;
    }

    await docClient.send(new PutCommand({
      TableName: USERS_TABLE,
      Item: newUser
    }));

    // Generate token pair
    const tokens = await generateTokenPair({ 
      userId, 
      email, 
      role, 
      tenantId: "UNASSIGNED" 
    }, REFRESH_TOKENS_TABLE);

    // Set secure HTTP-only cookie for refresh token
    setRefreshTokenCookie(res, tokens.refreshToken);

    res.status(201).json({
      message: "User registered successfully",
      accessToken: tokens.accessToken,
      accessTokenExpiry: tokens.accessTokenExpiry,
      user: {
        userId,
        email,
        firstName,
        lastName,
        role,
        tenantId: "UNASSIGNED",
        phoneNumber
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    next(error);
  }
};

// Login user
const login: RequestHandler = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Find user
    let result;
    try {
      result = await docClient.send(new GetCommand({
        TableName: USERS_TABLE,
        Key: { email }
      }));
    } catch (dbError) {
      console.error('Database connection error during login:', dbError);
      res.status(503).json({ 
        message: "Database connection error. Please try again later.",
        error: process.env.NODE_ENV === 'development' ? (dbError instanceof Error ? dbError.message : 'Unknown error') : undefined
      });
      return;
    }

    const user = result.Item;

    if (!user) {
      res.status(401).json({ message: "Invalid credentials" });
      return;
    }

    // Check if user is soft deleted
    if (user.isDeleted) {
      res.status(401).json({ message: "No user found" });
      return;
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    
    // Debug logs for password comparison
    console.log("=== PASSWORD COMPARISON DEBUG ===");
    console.log("Entered password:", password);
    console.log("Stored hashed password:", user.password);
    console.log("Password valid:", isValidPassword);
    console.log("User found:", {
      email: user.email,
      userId: user.userId,
      role: user.role,
      isDeleted: user.isDeleted
    });
    console.log("===================================");

    if (!isValidPassword) {
      res.status(401).json({ message: "Invalid credentials" });
      return;
    }

    // Invalidate any existing refresh tokens for security (optional)
    try {
      await invalidateAllUserRefreshTokens(user.userId, REFRESH_TOKENS_TABLE);
    } catch (error) {
      console.warn('Failed to invalidate existing refresh tokens (non-critical):', error instanceof Error ? error.message : 'Unknown error');
    }

    // Generate new token pair
    let tokens;
    try {
      tokens = await generateTokenPair({ 
        userId: user.userId, 
        email: user.email, 
        role: user.role,
        tenantId: user.tenantId
      }, REFRESH_TOKENS_TABLE);
    } catch (tokenError) {
      console.error('Token generation error:', tokenError);
      res.status(500).json({ message: "Failed to generate authentication tokens" });
      return;
    }

    // Set secure HTTP-only cookie for refresh token
    try {
      setRefreshTokenCookie(res, tokens.refreshToken);
    } catch (cookieError) {
      console.warn('Failed to set refresh token cookie (non-critical):', cookieError instanceof Error ? cookieError.message : 'Unknown error');
    }

    res.json({
      accessToken: tokens.accessToken,
      accessTokenExpiry: tokens.accessTokenExpiry,
      user: {
        userId: user.userId,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        tenantId: user.tenantId,
        createdBy: user.createdBy,
        phoneNumber: user.phoneNumber
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    next(error);
  }
};

// Refresh token
const refresh: RequestHandler = async (req, res, next) => {
  try {
    // Get refresh token from cookie (primary) or body (fallback)
    const refreshToken = getRefreshTokenFromCookie(req) || req.body.refreshToken;

    if (!refreshToken) {
      res.status(401).json({ message: "Refresh token required" });
      return;
    }

    try {
      const decoded = await verifyRefreshToken(refreshToken, REFRESH_TOKENS_TABLE);

      // Verify user still exists and is not soft deleted
      let userResult;
      try {
        userResult = await docClient.send(new GetCommand({
          TableName: USERS_TABLE,
          Key: { email: decoded.email }
        }));
      } catch (dbError) {
        console.error('Database connection error during token refresh:', dbError);
        res.status(503).json({ 
          message: "Database connection error. Please try again later.",
          error: process.env.NODE_ENV === 'development' ? (dbError instanceof Error ? dbError.message : 'Unknown error') : undefined
        });
        return;
      }

      const user = userResult.Item;

      if (!user) {
        res.status(401).json({ message: "User not found" });
        return;
      }

      if (user.isDeleted) {
        res.status(401).json({ message: "No user found" });
        return;
      }

      // Generate new token pair with current user data
      const tokens = await generateTokenPair({
        userId: user.userId,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId
      }, REFRESH_TOKENS_TABLE);

      // Invalidate old refresh token
      if (decoded.jti) {
        await invalidateRefreshToken(decoded.jti, REFRESH_TOKENS_TABLE);
      }

      // Set new refresh token in secure cookie
      setRefreshTokenCookie(res, tokens.refreshToken);

      res.json({
        accessToken: tokens.accessToken,
        accessTokenExpiry: tokens.accessTokenExpiry,
        user: {
          userId: user.userId,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          tenantId: user.tenantId
        }
      });
    } catch (error) {
      if (error instanceof Error && (error.name === 'JsonWebTokenError' || error.message.includes('expired'))) {
        res.status(401).json({ message: "Invalid or expired refresh token" });
        return;
      }
      throw error;
    }
  } catch (error) {
    console.error('Refresh token error:', error);
    next(error);
  }
};

// Update profile
const updateProfile: RequestHandler = async (req, res, next) => {
  try {
    const { userId } = req.body;
    const updateData = req.body;

    // Remove sensitive/unchangeable fields
    delete updateData.password;
    delete updateData.email;
    delete updateData.userId;

    const timestamp = new Date().toISOString();

    const result = await docClient.send(new UpdateCommand({
      TableName: USERS_TABLE,
      Key: { userId },
      UpdateExpression: "set #firstName = :firstName, #lastName = :lastName, #phoneNumber = :phoneNumber, #updatedAt = :updatedAt",
      ExpressionAttributeNames: {
        "#firstName": "firstName",
        "#lastName": "lastName",
        "#phoneNumber": "phoneNumber",
        "#updatedAt": "updatedAt"
      },
      ExpressionAttributeValues: {
        ":firstName": updateData.firstName,
        ":lastName": updateData.lastName,
        ":phoneNumber": updateData.phoneNumber,
        ":updatedAt": timestamp
      },
      ReturnValues: "ALL_NEW"
    }));

    if (!result.Attributes) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    res.json({
      message: "Profile updated successfully",
      user: {
        userId: result.Attributes.userId,
        email: result.Attributes.email,
        firstName: result.Attributes.firstName,
        lastName: result.Attributes.lastName,
        role: result.Attributes.role,
        phoneNumber: result.Attributes.phoneNumber,
        updatedAt: result.Attributes.updatedAt
      }
    });
  } catch (error) {
    if ((error as Error).name === 'JsonWebTokenError') {
      res.status(401).json({ message: "Invalid token" });
      return;
    }
    res.status(500).json({ message: "Internal server error" });
  }
};

// Change password
const changePassword: RequestHandler = async (req, res, next) => {
  try {
    const { userId, currentPassword, newPassword } = req.body;

    // Get current user
    const result = await docClient.send(new GetCommand({
      TableName: USERS_TABLE,
      Key: { userId }
    }));

    const user = result.Item;

    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.password);

    if (!isValidPassword) {
      res.status(401).json({ message: "Current password is incorrect" });
      return;
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update password
    await docClient.send(new UpdateCommand({
      TableName: USERS_TABLE,
      Key: { userId },
      UpdateExpression: "set #password = :password, #updatedAt = :updatedAt",
      ExpressionAttributeNames: {
        "#password": "password",
        "#updatedAt": "updatedAt"
      },
      ExpressionAttributeValues: {
        ":password": hashedPassword,
        ":updatedAt": new Date().toISOString()
      }
    }));

    res.json({ message: "Password updated successfully" });
  } catch (error) {
    if ((error as Error).name === 'JsonWebTokenError') {
      res.status(401).json({ message: "Invalid token" });
      return;
    }
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get profile
const getProfile: RequestHandler = async (req, res, next) => {
  try {
    const { userId } = req.body;

    const result = await docClient.send(new GetCommand({
      TableName: USERS_TABLE,
      Key: { userId }
    }));

    const user = result.Item;

    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    res.json({
      user: {
        userId: user.userId,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        phoneNumber: user.phoneNumber,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    });
  } catch (error) {
    if ((error as Error).name === 'JsonWebTokenError') {
      res.status(401).json({ message: "Invalid token" });
      return;
    }
    res.status(500).json({ message: "Internal server error" });
  }
};

// Auto-refresh endpoint
const autoRefresh: RequestHandler = async (req, res, next) => {
  try {
    const { accessToken, refreshToken } = req.body;

    if (!accessToken || !refreshToken) {
      res.status(400).json({ message: "Both access and refresh tokens required" });
      return;
    }

    const result = await autoRefreshTokens(accessToken, refreshToken, REFRESH_TOKENS_TABLE, USERS_TABLE);

    if (!result.shouldRefresh) {
      res.json({ 
        shouldRefresh: false,
        message: "Token refresh not needed"
      });
      return;
    }

    if (!result.tokens) {
      res.status(401).json({ message: "Unable to refresh tokens" });
      return;
    }

    res.json({
      shouldRefresh: true,
      accessToken: result.tokens.accessToken,
      refreshToken: result.tokens.refreshToken,
      accessTokenExpiry: result.tokens.accessTokenExpiry,
      refreshTokenExpiry: result.tokens.refreshTokenExpiry
    });
  } catch (error) {
    console.error('Auto-refresh error:', error);
    next(error);
  }
};

// Logout endpoint
const logout: RequestHandler = async (req, res, next) => {
  try {
    // Get refresh token from cookie (primary) or body (fallback)
    const refreshToken = getRefreshTokenFromCookie(req) || req.body.refreshToken;
    const { userId } = req.body;

    if (refreshToken) {
      try {
        // Validate and get token info
        const decoded = await verifyRefreshToken(refreshToken, REFRESH_TOKENS_TABLE);
        
        // Invalidate this specific refresh token
        if (decoded.jti) {
          await invalidateRefreshToken(decoded.jti, REFRESH_TOKENS_TABLE);
        }
      } catch (error) {
        console.log('Refresh token already invalid or expired');
      }
    }

    // Optional: Invalidate all refresh tokens for this user
    if (userId) {
      await invalidateAllUserRefreshTokens(userId, REFRESH_TOKENS_TABLE);
    }

    // Clear refresh token cookie
    clearRefreshTokenCookie(res);

    res.json({ message: "Logged out successfully" });
  } catch (error) {
    console.error('Logout error:', error);
    next(error);
  }
};

// Token validation endpoint
const validateToken: RequestHandler = async (req, res, next) => {
  try {
    const { accessToken } = req.body;

    if (!accessToken) {
      res.status(400).json({ message: "Access token required" });
      return;
    }

    const validation = validateTokenStructure(accessToken);
    const nearExpiry = isTokenNearExpiry(accessToken);

    res.json({
      valid: validation.valid,
      expired: validation.expired,
      nearExpiry,
      payload: validation.payload
    });
  } catch (error) {
    console.error('Token validation error:', error);
    next(error);
  }
};

// Route handlers
router.post("/register", register);
router.post("/login", login);
router.post("/refresh", refresh);
router.post("/auto-refresh", autoRefresh);
router.post("/logout", logout);
router.post("/validate-token", validateToken);
router.put("/profile", updateProfile);
router.post("/change-password", changePassword);
router.get("/profile", getProfile);

export default router;
