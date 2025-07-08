import { Router, Request, Response, RequestHandler } from 'express';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';

const router = Router();

// Local DynamoDB configuration
const clientConfig = {
  region: "us-east-1",
  endpoint: "http://localhost:8000",
  credentials: {
    accessKeyId: "fakeMyKeyId",
    secretAccessKey: "fakeSecretAccessKey"
  }
};

const client = new DynamoDBClient(clientConfig);
const docClient = DynamoDBDocumentClient.from(client);

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key';

// Login user
const login: RequestHandler = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    console.log('Login attempt for:', email);

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
    const accessToken = jwt.sign(
      { 
        userId: user.userId, 
        email: user.email, 
        role: user.role,
        tenantId: user.tenantId
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    const refreshToken = jwt.sign(
      { 
        userId: user.userId, 
        email: user.email 
      },
      JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    );

    console.log('Login successful for:', email);

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

// Route handlers
router.post("/login", login);

export default router; 