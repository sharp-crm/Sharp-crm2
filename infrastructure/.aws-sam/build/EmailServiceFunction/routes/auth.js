"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const uuid_1 = require("uuid");
const tokenUtils_1 = require("../utils/tokenUtils");
const dynamoClient_1 = require("../services/dynamoClient");
const authenticate_1 = require("../middlewares/authenticate");
const router = (0, express_1.Router)();
// Helper function to check if RefreshTokens table exists and create if needed
const ensureRefreshTokensTableExists = async () => {
    console.log('🔍 Ensuring RefreshTokens table exists:', dynamoClient_1.TABLES.REFRESH_TOKENS);
    try {
        // Try to create the table if it doesn't exist
        const tableReady = await (0, tokenUtils_1.createRefreshTokensTableIfNotExists)(dynamoClient_1.TABLES.REFRESH_TOKENS);
        if (!tableReady) {
            console.error('❌ Failed to ensure RefreshTokens table exists:', dynamoClient_1.TABLES.REFRESH_TOKENS);
            throw new Error(`Failed to ensure RefreshTokens table exists: ${dynamoClient_1.TABLES.REFRESH_TOKENS}`);
        }
        console.log('✅ RefreshTokens table is ready:', dynamoClient_1.TABLES.REFRESH_TOKENS);
        return true;
    }
    catch (error) {
        console.error('❌ Error ensuring RefreshTokens table exists:', error);
        throw error;
    }
};
// Register new user
const register = async (req, res, next) => {
    try {
        const { email, password, firstName, lastName, role, phoneNumber } = req.body;
        // Check if user already exists
        let existingUser;
        try {
            existingUser = await dynamoClient_1.docClient.send(new lib_dynamodb_1.GetCommand({
                TableName: dynamoClient_1.TABLES.USERS,
                Key: { email }
            }));
        }
        catch (dbError) {
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
        const salt = await bcryptjs_1.default.genSalt(10);
        const hashedPassword = await bcryptjs_1.default.hash(password, salt);
        // Debug log for registration
        console.log("=== REGISTRATION DEBUG ===");
        console.log("Plain password:", password);
        console.log("Hashed password during registration:", hashedPassword);
        console.log("=========================");
        // Create new user
        const userId = (0, uuid_1.v4)();
        const timestamp = new Date().toISOString();
        // Create user object, filtering out undefined values
        const newUser = {
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
        await dynamoClient_1.docClient.send(new lib_dynamodb_1.PutCommand({
            TableName: dynamoClient_1.TABLES.USERS,
            Item: newUser
        }));
        // Generate token pair
        const tokens = await (0, tokenUtils_1.generateTokenPair)({
            userId,
            email,
            role,
            tenantId: "UNASSIGNED"
        }, dynamoClient_1.TABLES.REFRESH_TOKENS);
        // Set secure HTTP-only cookie for refresh token
        (0, tokenUtils_1.setRefreshTokenCookie)(res, tokens.refreshToken);
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
    }
    catch (error) {
        console.error('Registration error:', error);
        next(error);
    }
};
// Login user
const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        // Find user
        let result;
        try {
            result = await dynamoClient_1.docClient.send(new lib_dynamodb_1.GetCommand({
                TableName: dynamoClient_1.TABLES.USERS,
                Key: { email }
            }));
        }
        catch (dbError) {
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
        const isValidPassword = await bcryptjs_1.default.compare(password, user.password);
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
            await (0, tokenUtils_1.invalidateAllUserRefreshTokens)(user.userId, dynamoClient_1.TABLES.REFRESH_TOKENS);
        }
        catch (error) {
            console.warn('Failed to invalidate existing refresh tokens (non-critical):', error instanceof Error ? error.message : 'Unknown error');
        }
        // Generate new token pair
        let tokens;
        try {
            // Ensure RefreshTokens table exists before generating tokens
            console.log('🔍 Ensuring RefreshTokens table exists before login...');
            await ensureRefreshTokensTableExists();
            console.log('🔍 Generating token pair...');
            tokens = await (0, tokenUtils_1.generateTokenPair)({
                userId: user.userId,
                email: user.email,
                role: user.role,
                tenantId: user.tenantId
            }, dynamoClient_1.TABLES.REFRESH_TOKENS);
            console.log('✅ Token pair generated successfully');
        }
        catch (tokenError) {
            console.error('❌ Token generation error:', tokenError);
            // If it's a table issue, try to create the table
            if (tokenError instanceof Error && tokenError.message.includes('RefreshTokens table not found')) {
                console.log('🔄 Attempting to create RefreshTokens table...');
                try {
                    const tableCreated = await (0, tokenUtils_1.createRefreshTokensTableIfNotExists)(dynamoClient_1.TABLES.REFRESH_TOKENS);
                    if (tableCreated) {
                        console.log('✅ RefreshTokens table created, retrying token generation...');
                        tokens = await (0, tokenUtils_1.generateTokenPair)({
                            userId: user.userId,
                            email: user.email,
                            role: user.role,
                            tenantId: user.tenantId
                        }, dynamoClient_1.TABLES.REFRESH_TOKENS);
                    }
                    else {
                        throw new Error('Failed to create RefreshTokens table');
                    }
                }
                catch (retryError) {
                    console.error('❌ Failed to create RefreshTokens table:', retryError);
                    res.status(500).json({
                        message: "Failed to generate authentication tokens - table creation failed",
                        error: process.env.NODE_ENV === 'development' ? (retryError instanceof Error ? retryError.message : 'Unknown error') : undefined
                    });
                    return;
                }
            }
            else {
                res.status(500).json({
                    message: "Failed to generate authentication tokens",
                    error: process.env.NODE_ENV === 'development' ? (tokenError instanceof Error ? tokenError.message : 'Unknown error') : undefined
                });
                return;
            }
        }
        // Set secure HTTP-only cookie for refresh token
        try {
            (0, tokenUtils_1.setRefreshTokenCookie)(res, tokens.refreshToken);
        }
        catch (cookieError) {
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
    }
    catch (error) {
        console.error('Login error:', error);
        next(error);
    }
};
// Refresh token
const refresh = async (req, res, next) => {
    try {
        // Get refresh token from cookie (primary) or body (fallback)
        const refreshToken = (0, tokenUtils_1.getRefreshTokenFromCookie)(req) || req.body.refreshToken;
        if (!refreshToken) {
            res.status(401).json({ message: "Refresh token required" });
            return;
        }
        try {
            // Ensure RefreshTokens table exists before verifying tokens
            await ensureRefreshTokensTableExists();
            const decoded = await (0, tokenUtils_1.verifyRefreshToken)(refreshToken, dynamoClient_1.TABLES.REFRESH_TOKENS);
            // Verify user still exists and is not soft deleted
            let userResult;
            try {
                userResult = await dynamoClient_1.docClient.send(new lib_dynamodb_1.GetCommand({
                    TableName: dynamoClient_1.TABLES.USERS,
                    Key: { email: decoded.email }
                }));
            }
            catch (dbError) {
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
            const tokens = await (0, tokenUtils_1.generateTokenPair)({
                userId: user.userId,
                email: user.email,
                role: user.role,
                tenantId: user.tenantId
            }, dynamoClient_1.TABLES.REFRESH_TOKENS);
            // Invalidate old refresh token
            if (decoded.jti) {
                await (0, tokenUtils_1.invalidateRefreshToken)(decoded.jti, dynamoClient_1.TABLES.REFRESH_TOKENS);
            }
            // Set new refresh token in secure cookie
            (0, tokenUtils_1.setRefreshTokenCookie)(res, tokens.refreshToken);
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
        }
        catch (error) {
            if (error instanceof Error && (error.name === 'JsonWebTokenError' || error.message.includes('expired'))) {
                res.status(401).json({ message: "Invalid or expired refresh token" });
                return;
            }
            throw error;
        }
    }
    catch (error) {
        console.error('Refresh token error:', error);
        next(error);
    }
};
// Update profile
const updateProfile = async (req, res, next) => {
    try {
        const currentUser = req.user;
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
        console.log("Table name:", dynamoClient_1.TABLES.USERS);
        const getUserResult = await dynamoClient_1.docClient.send(new lib_dynamodb_1.ScanCommand({
            TableName: dynamoClient_1.TABLES.USERS,
            FilterExpression: "userId = :userId",
            ExpressionAttributeValues: {
                ":userId": userId
            }
        }));
        console.log("Scan result:", getUserResult.Items?.length || 0, "items found");
        if (getUserResult.Items && getUserResult.Items.length > 0) {
            console.log("First item userId:", getUserResult.Items[0].userId);
        }
        const user = getUserResult.Items?.[0];
        if (!user) {
            res.status(404).json({ message: "User not found" });
            return;
        }
        const result = await dynamoClient_1.docClient.send(new lib_dynamodb_1.UpdateCommand({
            TableName: dynamoClient_1.TABLES.USERS,
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
    }
    catch (error) {
        if (error.name === 'JsonWebTokenError') {
            res.status(401).json({ message: "Invalid token" });
            return;
        }
        res.status(500).json({ message: "Internal server error" });
    }
};
// Change password
const changePassword = async (req, res, next) => {
    try {
        const { userId, currentPassword, newPassword } = req.body;
        // Get current user
        const result = await dynamoClient_1.docClient.send(new lib_dynamodb_1.GetCommand({
            TableName: dynamoClient_1.TABLES.USERS,
            Key: { userId }
        }));
        const user = result.Item;
        if (!user) {
            res.status(404).json({ message: "User not found" });
            return;
        }
        // Verify current password
        const isValidPassword = await bcryptjs_1.default.compare(currentPassword, user.password);
        if (!isValidPassword) {
            res.status(401).json({ message: "Current password is incorrect" });
            return;
        }
        // Hash new password
        const salt = await bcryptjs_1.default.genSalt(10);
        const hashedPassword = await bcryptjs_1.default.hash(newPassword, salt);
        // Update password
        await dynamoClient_1.docClient.send(new lib_dynamodb_1.UpdateCommand({
            TableName: dynamoClient_1.TABLES.USERS,
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
    }
    catch (error) {
        if (error.name === 'JsonWebTokenError') {
            res.status(401).json({ message: "Invalid token" });
            return;
        }
        res.status(500).json({ message: "Internal server error" });
    }
};
// Get profile
const getProfile = async (req, res, next) => {
    try {
        const { userId } = req.body;
        const result = await dynamoClient_1.docClient.send(new lib_dynamodb_1.GetCommand({
            TableName: dynamoClient_1.TABLES.USERS,
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
    }
    catch (error) {
        if (error.name === 'JsonWebTokenError') {
            res.status(401).json({ message: "Invalid token" });
            return;
        }
        res.status(500).json({ message: "Internal server error" });
    }
};
// Auto-refresh endpoint
const autoRefresh = async (req, res, next) => {
    try {
        const { accessToken, refreshToken } = req.body;
        if (!accessToken || !refreshToken) {
            res.status(400).json({ message: "Both access and refresh tokens required" });
            return;
        }
        const result = await (0, tokenUtils_1.autoRefreshTokens)(accessToken, refreshToken, dynamoClient_1.TABLES.REFRESH_TOKENS, dynamoClient_1.TABLES.USERS);
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
    }
    catch (error) {
        console.error('Auto-refresh error:', error);
        next(error);
    }
};
// Logout endpoint
const logout = async (req, res, next) => {
    try {
        // Get refresh token from cookie (primary) or body (fallback)
        const refreshToken = (0, tokenUtils_1.getRefreshTokenFromCookie)(req) || req.body.refreshToken;
        const { userId } = req.body;
        if (refreshToken) {
            try {
                // Validate and get token info
                const decoded = await (0, tokenUtils_1.verifyRefreshToken)(refreshToken, dynamoClient_1.TABLES.REFRESH_TOKENS);
                // Invalidate this specific refresh token
                if (decoded.jti) {
                    await (0, tokenUtils_1.invalidateRefreshToken)(decoded.jti, dynamoClient_1.TABLES.REFRESH_TOKENS);
                }
            }
            catch (error) {
                console.log('Refresh token already invalid or expired');
            }
        }
        // Optional: Invalidate all refresh tokens for this user
        if (userId) {
            await (0, tokenUtils_1.invalidateAllUserRefreshTokens)(userId, dynamoClient_1.TABLES.REFRESH_TOKENS);
        }
        // Clear refresh token cookie
        (0, tokenUtils_1.clearRefreshTokenCookie)(res);
        res.json({ message: "Logged out successfully" });
    }
    catch (error) {
        console.error('Logout error:', error);
        next(error);
    }
};
// Token validation endpoint
const validateToken = async (req, res, next) => {
    try {
        const { accessToken } = req.body;
        if (!accessToken) {
            res.status(400).json({ message: "Access token required" });
            return;
        }
        const validation = (0, tokenUtils_1.validateTokenStructure)(accessToken);
        const nearExpiry = (0, tokenUtils_1.isTokenNearExpiry)(accessToken);
        res.json({
            valid: validation.valid,
            expired: validation.expired,
            nearExpiry,
            payload: validation.payload
        });
    }
    catch (error) {
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
router.put("/profile", authenticate_1.authenticate, updateProfile);
router.post("/change-password", changePassword);
router.get("/profile", getProfile);
exports.default = router;
