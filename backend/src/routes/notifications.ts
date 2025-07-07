import express from "express";
import { PutCommand, GetCommand, ScanCommand, UpdateCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";
import { docClient } from "../services/dynamoClient";
import { v4 as uuidv4 } from "uuid";
import { createError } from "../middlewares/errorHandler";

const router = express.Router();

// Get all notifications for current user
router.get("/", async (req, res, next) => {
  try {
    const userId = (req as any).user?.userId;
    const { unreadOnly, limit = 50 } = req.query;
    
    const result = await docClient.send(
      new ScanCommand({
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
      })
    );

    // Sort by timestamp descending
    const notifications = (result.Items || [])
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    res.json({ data: notifications });
  } catch (error) {
    next(error);
  }
});

// Get notification by ID
router.get("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.userId;
    
    const result = await docClient.send(
      new GetCommand({
        TableName: "Notifications",
        Key: { id }
      })
    );

    if (!result.Item) {
      throw createError("Notification not found", 404);
    }

    // Ensure user can only access their own notifications
    if (result.Item.userId !== userId) {
      throw createError("Access denied", 403);
    }

    res.json({ data: result.Item });
  } catch (error) {
    next(error);
  }
});

// Create new notification
router.post("/", async (req, res, next) => {
  try {
    const { 
      title, 
      message, 
      type = "info", 
      targetUserId, 
      relatedEntityId,
      relatedEntityType
    } = req.body;

    if (!title || !message) {
      throw createError("Title and message are required", 400);
    }

    const id = uuidv4();
    const timestamp = new Date().toISOString();
    const createdBy = (req as any).user?.userId;

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

    await docClient.send(
      new PutCommand({
        TableName: "Notifications",
        Item: notification
      })
    );

    res.status(201).json({ data: notification });
  } catch (error) {
    next(error);
  }
});

// Mark notification as read
router.patch("/:id/read", async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.userId;

    // First check if notification exists and belongs to user
    const getResult = await docClient.send(
      new GetCommand({
        TableName: "Notifications",
        Key: { id }
      })
    );

    if (!getResult.Item) {
      throw createError("Notification not found", 404);
    }

    if (getResult.Item.userId !== userId) {
      throw createError("Access denied", 403);
    }

    const result = await docClient.send(
      new UpdateCommand({
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
      })
    );

    res.json({ data: result.Attributes });
  } catch (error) {
    next(error);
  }
});

// Mark all notifications as read for current user
router.patch("/mark-all-read", async (req, res, next) => {
  try {
    const userId = (req as any).user?.userId;

    // Get all unread notifications for user
    const scanResult = await docClient.send(
      new ScanCommand({
        TableName: "Notifications",
        FilterExpression: "userId = :userId AND #read = :read",
        ExpressionAttributeNames: {
          "#read": "read"
        },
        ExpressionAttributeValues: {
          ":userId": userId,
          ":read": false
        }
      })
    );

    const updatePromises = (scanResult.Items || []).map(notification =>
      docClient.send(
        new UpdateCommand({
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
        })
      )
    );

    await Promise.all(updatePromises);

    res.json({ 
      message: "All notifications marked as read",
      updatedCount: updatePromises.length
    });
  } catch (error) {
    next(error);
  }
});

// Delete notification
router.delete("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.userId;

    // First check if notification exists and belongs to user
    const getResult = await docClient.send(
      new GetCommand({
        TableName: "Notifications",
        Key: { id }
      })
    );

    if (!getResult.Item) {
      throw createError("Notification not found", 404);
    }

    if (getResult.Item.userId !== userId) {
      throw createError("Access denied", 403);
    }

    await docClient.send(
      new DeleteCommand({
        TableName: "Notifications",
        Key: { id }
      })
    );

    res.json({ message: "Notification deleted successfully" });
  } catch (error) {
    next(error);
  }
});

// Get notification counts
router.get("/counts/summary", async (req, res, next) => {
  try {
    const userId = (req as any).user?.userId;
    
    const result = await docClient.send(
      new ScanCommand({
        TableName: "Notifications",
        FilterExpression: "userId = :userId",
        ExpressionAttributeValues: {
          ":userId": userId
        }
      })
    );

    const notifications = result.Items || [];
    const total = notifications.length;
    const unread = notifications.filter(n => !n.read).length;
    const read = total - unread;

    const byType = notifications.reduce((acc, notification) => {
      acc[notification.type] = (acc[notification.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    res.json({
      data: {
        total,
        unread,
        read,
        byType
      }
    });
  } catch (error) {
    next(error);
  }
});

// Create system notification (for automated notifications)
export const createSystemNotification = async (
  userId: string, 
  title: string, 
  message: string, 
  type: 'info' | 'warning' | 'success' | 'error' = 'info',
  relatedEntityId?: string,
  relatedEntityType?: string
) => {
  const id = uuidv4();
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

  await docClient.send(
    new PutCommand({
      TableName: "Notifications",
      Item: notification
    })
  );

  return notification;
};

export default router; 