"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSystemNotification = void 0;
const express_1 = __importDefault(require("express"));
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const dynamoClient_1 = require("../services/dynamoClient");
const uuid_1 = require("uuid");
const errorHandler_1 = require("../middlewares/errorHandler");
const router = express_1.default.Router();
// Get all notifications for current user
router.get("/", async (req, res, next) => {
    try {
        const userId = req.user?.userId;
        const { unreadOnly, limit = 50 } = req.query;
        const result = await dynamoClient_1.docClient.send(new lib_dynamodb_1.ScanCommand({
            TableName: "Notifications",
            FilterExpression: "userId = :userId" + (unreadOnly === 'true' ? " AND #read = :read" : ""),
            ExpressionAttributeValues: {
                ":userId": userId,
                ...(unreadOnly === 'true' && { ":read": false })
            },
            ...(unreadOnly === 'true' && {
                ExpressionAttributeNames: {
                    "#read": "read"
                }
            }),
            Limit: Number(limit)
        }));
        // Sort by timestamp descending
        const notifications = (result.Items || [])
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        res.json({ data: notifications });
    }
    catch (error) {
        next(error);
    }
});
// Get notification by ID
router.get("/:id", async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user?.userId;
        const result = await dynamoClient_1.docClient.send(new lib_dynamodb_1.GetCommand({
            TableName: "Notifications",
            Key: { id }
        }));
        if (!result.Item) {
            throw (0, errorHandler_1.createError)("Notification not found", 404);
        }
        // Ensure user can only access their own notifications
        if (result.Item.userId !== userId) {
            throw (0, errorHandler_1.createError)("Access denied", 403);
        }
        res.json({ data: result.Item });
    }
    catch (error) {
        next(error);
    }
});
// Create new notification
router.post("/", async (req, res, next) => {
    try {
        const { title, message, type = "info", targetUserId, relatedEntityId, relatedEntityType } = req.body;
        if (!title || !message) {
            throw (0, errorHandler_1.createError)("Title and message are required", 400);
        }
        const id = (0, uuid_1.v4)();
        const timestamp = new Date().toISOString();
        const createdBy = req.user?.userId;
        const notification = {
            id,
            title,
            message,
            type, // 'info', 'warning', 'success', 'error'
            userId: targetUserId || createdBy,
            read: false,
            timestamp,
            createdBy,
            relatedEntityId,
            relatedEntityType
        };
        await dynamoClient_1.docClient.send(new lib_dynamodb_1.PutCommand({
            TableName: "Notifications",
            Item: notification
        }));
        res.status(201).json({ data: notification });
    }
    catch (error) {
        next(error);
    }
});
// Mark notification as read
router.patch("/:id/read", async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user?.userId;
        // First check if notification exists and belongs to user
        const getResult = await dynamoClient_1.docClient.send(new lib_dynamodb_1.GetCommand({
            TableName: "Notifications",
            Key: { id }
        }));
        if (!getResult.Item) {
            throw (0, errorHandler_1.createError)("Notification not found", 404);
        }
        if (getResult.Item.userId !== userId) {
            throw (0, errorHandler_1.createError)("Access denied", 403);
        }
        const result = await dynamoClient_1.docClient.send(new lib_dynamodb_1.UpdateCommand({
            TableName: "Notifications",
            Key: { id },
            UpdateExpression: "SET #read = :read, readAt = :readAt",
            ExpressionAttributeNames: {
                "#read": "read"
            },
            ExpressionAttributeValues: {
                ":read": true,
                ":readAt": new Date().toISOString()
            },
            ReturnValues: "ALL_NEW"
        }));
        res.json({ data: result.Attributes });
    }
    catch (error) {
        next(error);
    }
});
// Mark all notifications as read for current user
router.patch("/mark-all-read", async (req, res, next) => {
    try {
        const userId = req.user?.userId;
        // Get all unread notifications for user
        const scanResult = await dynamoClient_1.docClient.send(new lib_dynamodb_1.ScanCommand({
            TableName: "Notifications",
            FilterExpression: "userId = :userId AND #read = :read",
            ExpressionAttributeNames: {
                "#read": "read"
            },
            ExpressionAttributeValues: {
                ":userId": userId,
                ":read": false
            }
        }));
        const updatePromises = (scanResult.Items || []).map(notification => dynamoClient_1.docClient.send(new lib_dynamodb_1.UpdateCommand({
            TableName: "Notifications",
            Key: { id: notification.id },
            UpdateExpression: "SET #read = :read, readAt = :readAt",
            ExpressionAttributeNames: {
                "#read": "read"
            },
            ExpressionAttributeValues: {
                ":read": true,
                ":readAt": new Date().toISOString()
            }
        })));
        await Promise.all(updatePromises);
        res.json({
            message: "All notifications marked as read",
            updatedCount: updatePromises.length
        });
    }
    catch (error) {
        next(error);
    }
});
// Delete notification
router.delete("/:id", async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user?.userId;
        // First check if notification exists and belongs to user
        const getResult = await dynamoClient_1.docClient.send(new lib_dynamodb_1.GetCommand({
            TableName: "Notifications",
            Key: { id }
        }));
        if (!getResult.Item) {
            throw (0, errorHandler_1.createError)("Notification not found", 404);
        }
        if (getResult.Item.userId !== userId) {
            throw (0, errorHandler_1.createError)("Access denied", 403);
        }
        await dynamoClient_1.docClient.send(new lib_dynamodb_1.DeleteCommand({
            TableName: "Notifications",
            Key: { id }
        }));
        res.json({ message: "Notification deleted successfully" });
    }
    catch (error) {
        next(error);
    }
});
// Get notification counts
router.get("/counts/summary", async (req, res, next) => {
    try {
        const userId = req.user?.userId;
        const result = await dynamoClient_1.docClient.send(new lib_dynamodb_1.ScanCommand({
            TableName: "Notifications",
            FilterExpression: "userId = :userId",
            ExpressionAttributeValues: {
                ":userId": userId
            }
        }));
        const notifications = result.Items || [];
        const total = notifications.length;
        const unread = notifications.filter(n => !n.read).length;
        const read = total - unread;
        const byType = notifications.reduce((acc, notification) => {
            acc[notification.type] = (acc[notification.type] || 0) + 1;
            return acc;
        }, {});
        res.json({
            data: {
                total,
                unread,
                read,
                byType
            }
        });
    }
    catch (error) {
        next(error);
    }
});
// Create system notification (for automated notifications)
const createSystemNotification = async (userId, title, message, type = 'info', relatedEntityId, relatedEntityType) => {
    const id = (0, uuid_1.v4)();
    const timestamp = new Date().toISOString();
    const notification = {
        id,
        title,
        message,
        type,
        userId,
        read: false,
        timestamp,
        createdBy: 'SYSTEM',
        relatedEntityId,
        relatedEntityType
    };
    await dynamoClient_1.docClient.send(new lib_dynamodb_1.PutCommand({
        TableName: "Notifications",
        Item: notification
    }));
    return notification;
};
exports.createSystemNotification = createSystemNotification;
exports.default = router;
