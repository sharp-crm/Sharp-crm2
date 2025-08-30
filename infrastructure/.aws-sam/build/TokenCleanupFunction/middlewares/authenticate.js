"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = void 0;
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const dynamoClient_1 = require("../services/dynamoClient");
const tokenUtils_1 = require("../utils/tokenUtils");
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";
const authenticate = async (req, res, next) => {
    console.log(`🔍 [authenticate] Starting authentication for path: ${req.path}`);
    console.log(`🔍 [authenticate] Request headers:`, req.headers);
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
        console.log(`❌ [authenticate] No token provided`);
        res.status(401).json({ error: "No token provided" });
        return;
    }
    try {
        // Validate token structure
        const validation = (0, tokenUtils_1.validateTokenStructure)(token);
        if (!validation.valid) {
            res.status(403).json({ error: "Invalid token structure" });
            return;
        }
        const nearExpiry = (0, tokenUtils_1.isTokenNearExpiry)(token);
        try {
            const decoded = (0, tokenUtils_1.verifyAccessToken)(token);
            // Optionally verify user still exists and is not deleted
            try {
                const userResult = await dynamoClient_1.docClient.send(new lib_dynamodb_1.GetCommand({
                    TableName: dynamoClient_1.TABLES.USERS,
                    Key: { email: decoded.email }
                }));
                if (!userResult.Item) {
                    res.status(401).json({ error: "User not found" });
                    return;
                }
                if (userResult.Item.isDeleted) {
                    res.status(401).json({ error: "User account has been Soft Deleted" });
                    return;
                }
                // Update user context with latest data
                const userData = {
                    userId: userResult.Item.userId,
                    email: userResult.Item.email,
                    firstName: userResult.Item.firstName || '',
                    lastName: userResult.Item.lastName || '',
                    role: userResult.Item.role || 'SALES_REP',
                    originalRole: userResult.Item.role || 'SALES_REP', // Keep original role for display
                    tenantId: userResult.Item.tenantId || 'DEFAULT_TENANT',
                    reportingTo: userResult.Item.reportingTo, // Include reportingTo for RBAC
                    isDeleted: userResult.Item.isDeleted || false
                };
                req.user = userData;
                console.log(`✅ [authenticate] User authenticated successfully:`, userData);
                // Also attach token expiry info
                req.tokenInfo = {
                    nearExpiry,
                    expiresAt: validation.payload?.exp ? validation.payload.exp * 1000 : 0
                };
            }
            catch (dbError) {
                // If DB check fails, fall back to token data but log the error
                console.warn("Failed to verify user in database:", dbError);
                req.user = decoded;
                req.tokenInfo = {
                    nearExpiry,
                    expiresAt: validation.payload?.exp ? validation.payload.exp * 1000 : 0
                };
            }
            next();
        }
        catch (error) {
            res.status(403).json({ error: "Invalid token" });
            return;
        }
    }
    catch (error) {
        res.status(403).json({ error: "Invalid token" });
        return;
    }
};
exports.authenticate = authenticate;
