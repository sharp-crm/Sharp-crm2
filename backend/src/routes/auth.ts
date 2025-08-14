import { Router, Request, Response, RequestHandler } from 'express';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
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
  getRefreshTokenFromCookie,
  checkRefreshTokensTableExists,
  createRefreshTokensTableIfNotExists
} from '../utils/tokenUtils';
import { docClient, TABLES } from '../services/dynamoClient';
import { authenticate } from '../middlewares/authenticate';

const router = Router();

// Helper function to check if RefreshTokens table exists and create if needed
const ensureRefreshTokensTableExists = async () => {
  console.log('🔍 Ensuring RefreshTokens table exists:', TABLES.REFRESH_TOKENS);
  
  try {
    // Try to create the table if it doesn't exist
    const tableReady = await createRefreshTokensTableIfNotExists(TABLES.REFRESH_TOKENS);
    if (!tableReady) {
      console.error('❌ Failed to ensure RefreshTokens table exists:', TABLES.REFRESH_TOKENS);
      throw new Error(`Failed to ensure RefreshTokens table exists: ${TABLES.REFRESH_TOKENS}`);
    }
    
    console.log('✅ RefreshTokens table is ready:', TABLES.REFRESH_TOKENS);
    return true;
  } catch (error) {
    console.error('❌ Error ensuring RefreshTokens table exists:', error);
    throw error;
  }
};

// Register new user
const register: RequestHandler = async (req, res, next) => {
  try {
    const { email, password, firstName, lastName, role, phoneNumber } = req.body;

    // Check if user already exists
    let existingUser;
    try {
      existingUser = await docClient.send(new GetCommand({
        TableName: TABLES.USERS,
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
      TableName: TABLES.USERS,
      Item: newUser
    }));

    // Generate token pair
    const tokens = await generateTokenPair({ 
      userId, 
      email, 
      role, 
      tenantId: "UNASSIGNED" 
    }, TABLES.REFRESH_TOKENS);

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
        TableName: TABLES.USERS,
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
      await invalidateAllUserRefreshTokens(user.userId, TABLES.REFRESH_TOKENS);
    } catch (error) {
      console.warn('Failed to invalidate existing refresh tokens (non-critical):', error instanceof Error ? error.message : 'Unknown error');
    }

    // Generate new token pair
    let tokens;
    try {
      // Ensure RefreshTokens table exists before generating tokens
      console.log('🔍 Ensuring RefreshTokens table exists before login...');
      await ensureRefreshTokensTableExists();
      
      console.log('🔍 Generating token pair...');
      tokens = await generateTokenPair({ 
        userId: user.userId, 
        email: user.email,
        role: user.role,
        tenantId: user.tenantId
      }, TABLES.REFRESH_TOKENS);
      
      console.log('✅ Token pair generated successfully');
    } catch (tokenError) {
      console.error('❌ Token generation error:', tokenError);
      
      // If it's a table issue, try to create the table
      if (tokenError instanceof Error && tokenError.message.includes('RefreshTokens table not found')) {
        console.log('🔄 Attempting to create RefreshTokens table...');
        try {
          const tableCreated = await createRefreshTokensTableIfNotExists(TABLES.REFRESH_TOKENS);
          if (tableCreated) {
            console.log('✅ RefreshTokens table created, retrying token generation...');
            tokens = await generateTokenPair({ 
              userId: user.userId, 
              email: user.email,
              role: user.role,
              tenantId: user.tenantId
            }, TABLES.REFRESH_TOKENS);
          } else {
            throw new Error('Failed to create RefreshTokens table');
          }
        } catch (retryError) {
          console.error('❌ Failed to create RefreshTokens table:', retryError);
          res.status(500).json({ 
            message: "Failed to generate authentication tokens - table creation failed",
            error: process.env.NODE_ENV === 'development' ? (retryError instanceof Error ? retryError.message : 'Unknown error') : undefined
          });
          return;
        }
      } else {
        res.status(500).json({ 
          message: "Failed to generate authentication tokens",
          error: process.env.NODE_ENV === 'development' ? (tokenError instanceof Error ? tokenError.message : 'Unknown error') : undefined
        });
        return;
      }
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
        originalRole: user.role, // Keep the original role for display
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
      // Ensure RefreshTokens table exists before verifying tokens
      await ensureRefreshTokensTableExists();
      
      const decoded = await verifyRefreshToken(refreshToken, TABLES.REFRESH_TOKENS);

      // Verify user still exists and is not soft deleted
      let userResult;
      try {
        userResult = await docClient.send(new GetCommand({
          TableName: TABLES.USERS,
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
      }, TABLES.REFRESH_TOKENS);

      // Invalidate old refresh token
      if (decoded.jti) {
        await invalidateRefreshToken(decoded.jti, TABLES.REFRESH_TOKENS);
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
          originalRole: user.role, // Keep the original role for display
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
    const currentUser = (req as any).user;
    if (!currentUser) {
      res.status(401).json({ message: "User not found in token" });
      return;
    }
    
    const userId = currentUser.userId;
    const updateData = req.body;

    // Remove sensitive/unchangeable fields
    delete updateData.password;
    delete updateData.email;
    delete updateData.userId;

    const timestamp = new Date().toISOString();

    // Get user by userId first to find email (primary key)
    console.log("=== PROFILE UPDATE DEBUG ===");
    console.log("Looking for userId:", userId);
    console.log("Current user from token:", currentUser);
    console.log("Table name:", TABLES.USERS);
    
    const getUserResult = await docClient.send(new ScanCommand({
      TableName: TABLES.USERS,
      FilterExpression: "userId = :userId",
      ExpressionAttributeValues: {
        ":userId": userId
      }
    }));

    console.log("Scan result:", getUserResult.Items?.length || 0, "items found");
    if (getUserResult.Items && getUserResult.Items.length > 0) {
      console.log("First item userId:", getUserResult.Items[0].userId);
    }

    const user = getUserResult.Items?.[0] as any;
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    const result = await docClient.send(new UpdateCommand({
      TableName: TABLES.USERS,
      Key: { email: user.email },
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
      TableName: TABLES.USERS,
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
      TableName: TABLES.USERS,
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
      TableName: TABLES.USERS,
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
        originalRole: user.role, // Keep the original role for display
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

    const result = await autoRefreshTokens(accessToken, refreshToken, TABLES.REFRESH_TOKENS, TABLES.USERS);

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
        const decoded = await verifyRefreshToken(refreshToken, TABLES.REFRESH_TOKENS);
        
        // Invalidate this specific refresh token
        if (decoded.jti) {
          await invalidateRefreshToken(decoded.jti, TABLES.REFRESH_TOKENS);
        }
      } catch (error) {
        console.log('Refresh token already invalid or expired');
      }
    }

    // Optional: Invalidate all refresh tokens for this user
    if (userId) {
      await invalidateAllUserRefreshTokens(userId, TABLES.REFRESH_TOKENS);
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
router.put("/profile", authenticate as any, updateProfile);
router.post("/change-password", changePassword);
router.get("/profile", getProfile);

export default router;
