"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const router = (0, express_1.Router)();
// Local DynamoDB configuration
const clientConfig = {
    region: "us-east-1",
    endpoint: "http://localhost:8000",
    credentials: {
        accessKeyId: "fakeMyKeyId",
        secretAccessKey: "fakeSecretAccessKey"
    }
};
const client = new client_dynamodb_1.DynamoDBClient(clientConfig);
const docClient = lib_dynamodb_1.DynamoDBDocumentClient.from(client);
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key';
// Login user
const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        console.log('Login attempt for:', email);
        // Find user
        const result = await docClient.send(new lib_dynamodb_1.GetCommand({
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
        const isValidPassword = await bcryptjs_1.default.compare(password, user.password);
        if (!isValidPassword) {
            res.status(401).json({ message: "Invalid credentials" });
            return;
        }
        // Generate tokens
        const accessToken = jsonwebtoken_1.default.sign({
            userId: user.userId,
            email: user.email,
            role: user.role,
            tenantId: user.tenantId
        }, JWT_SECRET, { expiresIn: '24h' });
        const refreshToken = jsonwebtoken_1.default.sign({
            userId: user.userId,
            email: user.email
        }, JWT_REFRESH_SECRET, { expiresIn: '7d' });
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
    }
    catch (error) {
        console.error('Login error:', error);
        next(error);
    }
};
// Route handlers
router.post("/login", login);
exports.default = router;
