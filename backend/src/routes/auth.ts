import { Router, Request, Response, RequestHandler } from 'express';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken, invalidateRefreshToken } from '../utils/tokenUtils';
import { docClient } from '../services/dynamoClient';

const router = Router();

// Register new user
const register: RequestHandler = async (req, res, next) => {
  try {
    const { email, password, firstName, lastName, role, phoneNumber } = req.body;

    // Check if user already exists
    const existingUser = await docClient.send(new GetCommand({
      TableName: "Users",
      Key: { email }
    }));

    if (existingUser.Item) {
      res.status(400).json({ message: "User already exists" });
      return;
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new user
    const userId = uuidv4();
    const timestamp = new Date().toISOString();

    const newUser = {
      userId,
      email,
      password: hashedPassword,
      firstName,
      lastName,
      role,
      tenantId: "UNASSIGNED", // New registrations start with unassigned tenant
      createdBy: "SELF_REGISTRATION", // Self-registration
      phoneNumber,
      isDeleted: false,
      createdAt: timestamp,
      updatedAt: timestamp
    };

    await docClient.send(new PutCommand({
      TableName: "Users",
      Item: newUser
    }));

    // Generate tokens
    const accessToken = generateAccessToken({ userId, email, role, tenantId: "UNASSIGNED" });
    const refreshToken = await generateRefreshToken({ userId, email });

    res.status(201).json({
      message: "User registered successfully",
      accessToken,
      refreshToken,
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
    const result = await docClient.send(new GetCommand({
      TableName: "Users",
      Key: { email }
    }));

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

    if (!isValidPassword) {
      res.status(401).json({ message: "Invalid credentials" });
      return;
    }

    // Generate tokens
    const accessToken = generateAccessToken({ 
      userId: user.userId, 
      email: user.email, 
      role: user.role,
      tenantId: user.tenantId
    });
    
    const refreshToken = await generateRefreshToken({ 
      userId: user.userId, 
      email: user.email 
    });

    res.json({
      accessToken,
      refreshToken,
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
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(401).json({ message: "Refresh token required" });
      return;
    }

    try {
      const decoded = await verifyRefreshToken(refreshToken);

      // Verify user still exists and is not soft deleted
      const userResult = await docClient.send(new GetCommand({
        TableName: "Users",
        Key: { email: decoded.email }
      }));

      const user = userResult.Item;

      if (!user) {
        res.status(401).json({ message: "User not found" });
        return;
      }

      if (user.isDeleted) {
        res.status(401).json({ message: "No user found" });
        return;
      }

      // Generate new access token with current user data
      const accessToken = generateAccessToken({
        userId: user.userId,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId
      });

      // Generate new refresh token
      const newRefreshToken = await generateRefreshToken({
        userId: user.userId,
        email: user.email
      });

      // Invalidate old refresh token
      if (decoded.jti) {
        await invalidateRefreshToken(decoded.jti);
      }

      res.json({ accessToken, refreshToken: newRefreshToken });
    } catch (error) {
      if (error instanceof Error && error.name === 'JsonWebTokenError') {
        res.status(401).json({ message: "Invalid refresh token" });
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
      TableName: "Users",
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
      TableName: "Users",
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
      TableName: "Users",
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
      TableName: "Users",
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

// Route handlers
router.post("/register", register);
router.post("/login", login);
router.post("/refresh", refresh);
router.put("/profile", updateProfile);
router.post("/change-password", changePassword);
router.get("/profile", getProfile);

export default router;
