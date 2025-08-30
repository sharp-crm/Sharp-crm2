import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { AuthenticatedRequest, authenticate } from '../middlewares/authenticate';
import { docClient, TABLES } from '../services/dynamoClient';
import { 
  PutCommand, 
  GetCommand, 
  QueryCommand, 
  UpdateCommand,
  DeleteCommand
} from '@aws-sdk/lib-dynamodb';

const router = express.Router();

// Middleware to authenticate all chat routes
router.use(authenticate);

// Get all channels for tenant
router.get('/channels', async (req, res) => {
  try {
    const userId = (req as AuthenticatedRequest).user?.userId;
    const tenantId = (req as AuthenticatedRequest).user?.tenantId;
    
    if (!userId || !tenantId) {
      res.status(401).json({ 
        success: false, 
        message: 'User not authenticated' 
      });
      return;
    }

    const result = await docClient.send(new QueryCommand({
      TableName: TABLES.CHANNELS,
      IndexName: 'TenantIdIndex',
      KeyConditionExpression: 'tenantId = :tenantId',
      ExpressionAttributeValues: {
        ':tenantId': tenantId
      }
    }));

    res.json({
      success: true,
      data: result.Items || []
    });
  } catch (error) {
    console.error('Error fetching channels:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch channels'
    });
  }
});

// Create new channel
router.post('/channels', async (req, res) => {
  try {
    const { name, type, description } = req.body;
    const userId = (req as AuthenticatedRequest).user?.userId;
    const tenantId = (req as AuthenticatedRequest).user?.tenantId;
    
    if (!userId || !tenantId) {
      res.status(401).json({ 
        success: false, 
        message: 'User not authenticated' 
      });
      return;
    }
    
    if (!name || !type) {
      res.status(400).json({ 
        success: false, 
        message: 'Channel name and type are required' 
      });
      return;
    }

    const channelId = uuidv4();
    const timestamp = new Date().toISOString();

    const channel = {
      channelId,
      tenantId,
      name,
      type,
      description: description || '',
      createdBy: userId,
      createdAt: timestamp,
      updatedAt: timestamp,
      members: [userId],
      memberPermissions: {
        [userId]: {
          canPost: true,
          canInvite: true,
          canManage: true
        }
      }
    };

    await docClient.send(new PutCommand({
      TableName: TABLES.CHANNELS,
      Item: channel
    }));

    res.status(201).json({
      success: true,
      data: channel
    });
  } catch (error) {
    console.error('Error creating channel:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create channel'
    });
  }
});

// Get channel messages
router.get('/channels/:channelId/messages', async (req, res) => {
  try {
    const { channelId } = req.params;
    const authReq = req as unknown as AuthenticatedRequest;
    const userId = authReq.user?.userId;
    const tenantId = authReq.user?.tenantId;
    
    if (!userId || !tenantId) {
      res.status(401).json({ 
        success: false, 
        message: 'User not authenticated' 
      });
      return;
    }

    // Check if user is member of channel
    const channelResult = await docClient.send(new GetCommand({
      TableName: TABLES.CHANNELS,
      Key: { channelId, tenantId }
    }));

    if (!channelResult.Item || !channelResult.Item.members.includes(userId)) {
      res.status(403).json({
        success: false,
        message: 'Access denied'
      });
      return;
    }

    const messagesResult = await docClient.send(new QueryCommand({
      TableName: TABLES.MESSAGES,
      KeyConditionExpression: 'channelId = :channelId',
      ExpressionAttributeValues: {
        ':channelId': channelId
      },
      ScanIndexForward: false, // Most recent first
      Limit: 50
    }));

    res.json({
      success: true,
      data: messagesResult.Items || []
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch messages'
    });
  }
});

// Send message to channel
router.post('/channels/:channelId/messages', async (req, res) => {
  try {
    const { channelId } = req.params;
    const { content, type = 'text' } = req.body;
    const authReq = req as unknown as AuthenticatedRequest;
    const userId = authReq.user?.userId;
    const tenantId = authReq.user?.tenantId;
    
    if (!userId || !tenantId) {
      res.status(401).json({ 
        success: false, 
        message: 'User not authenticated' 
      });
      return;
    }

    if (!content) {
      res.status(400).json({
        success: false,
        message: 'Message content is required'
      });
      return;
    }

    // Check if user can post to channel
    const channelResult = await docClient.send(new GetCommand({
      TableName: TABLES.CHANNELS,
      Key: { channelId, tenantId }
    }));

    if (!channelResult.Item || !channelResult.Item.members.includes(userId)) {
      res.status(403).json({
        success: false,
        message: 'Access denied'
      });
      return;
    }

    const canPost = channelResult.Item.memberPermissions?.[userId]?.canPost;
    if (!canPost) {
      res.status(403).json({
        success: false,
        message: 'No permission to post'
      });
      return;
    }

    const messageId = uuidv4();
    const timestamp = new Date().toISOString();

    const message = {
      messageId,
      channelId,
      tenantId: authReq.user.tenantId!,
      senderId: userId,
      content,
      type,
      timestamp,
      readBy: {},
      reactions: {}
    };

    await docClient.send(new PutCommand({
      TableName: TABLES.MESSAGES,
      Item: message
    }));

    res.status(201).json({
      success: true,
      data: message
    });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send message'
    });
  }
});

// Add reaction to message
router.post('/channels/:channelId/messages/:messageTimestamp/reactions', async (req, res) => {
  try {
    const { channelId, messageTimestamp } = req.params;
    const { emoji } = req.body;
    const authReq = req as unknown as AuthenticatedRequest;
    const userId = authReq.user?.userId;
    const tenantId = authReq.user?.tenantId;
    
    if (!userId || !tenantId) {
      res.status(401).json({ 
        success: false, 
        message: 'User not authenticated' 
      });
      return;
    }

    if (!emoji) {
      res.status(400).json({
        success: false,
        message: 'Emoji is required'
      });
      return;
    }

    // Check if user is member of channel
    const channelResult = await docClient.send(new GetCommand({
      TableName: TABLES.CHANNELS,
      Key: { channelId, tenantId }
    }));

    if (!channelResult.Item || !channelResult.Item.members.includes(userId)) {
      res.status(403).json({
        success: false,
        message: 'Access denied'
      });
      return;
    }

    // Update message with reaction
    await docClient.send(new UpdateCommand({
      TableName: TABLES.MESSAGES,
      Key: { channelId, timestamp: messageTimestamp },
      UpdateExpression: 'SET reactions.#emoji = if_not_exists(reactions.#emoji, :emptyList) + :userId',
      ExpressionAttributeNames: {
        '#emoji': emoji
      },
      ExpressionAttributeValues: {
        ':userId': [userId],
        ':emptyList': []
      }
    }));

    res.json({
      success: true,
      message: 'Reaction added'
    });
  } catch (error) {
    console.error('Error adding reaction:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add reaction'
    });
  }
});

// Mark message as read
router.post('/channels/:channelId/messages/:messageTimestamp/read', async (req, res) => {
  try {
    const { channelId, messageTimestamp } = req.params;
    const authReq = req as unknown as AuthenticatedRequest;
    const userId = authReq.user?.userId;
    const tenantId = authReq.user?.tenantId;
    
    if (!userId || !tenantId) {
      res.status(401).json({ 
        success: false, 
        message: 'User not authenticated' 
      });
      return;
    }

    // Check if user is member of channel
    const channelResult = await docClient.send(new GetCommand({
      TableName: TABLES.CHANNELS,
      Key: { channelId, tenantId }
    }));

    if (!channelResult.Item || !channelResult.Item.members.includes(userId)) {
      res.status(403).json({
        success: false,
        message: 'Access denied'
      });
      return;
    }

    const readTimestamp = new Date().toISOString();

    // Update message with read receipt
    await docClient.send(new UpdateCommand({
      TableName: TABLES.MESSAGES,
      Key: { channelId, timestamp: messageTimestamp },
      UpdateExpression: 'SET readBy.#userId = :readTimestamp',
      ExpressionAttributeNames: {
        '#userId': userId
      },
      ExpressionAttributeValues: {
        ':readTimestamp': readTimestamp
      }
    }));

    res.json({
      success: true,
      message: 'Message marked as read'
    });
  } catch (error) {
    console.error('Error marking message as read:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark message as read'
    });
  }
});

// Add member to channel
router.post('/channels/:channelId/members', async (req, res) => {
  try {
    const { channelId } = req.params;
    const { userId: newMemberId, permissions } = req.body;
    const authReq = req as unknown as AuthenticatedRequest;
    const userId = authReq.user?.userId;
    const tenantId = authReq.user?.tenantId;
    
    if (!userId || !tenantId) {
      res.status(401).json({ 
        success: false, 
        message: 'User not authenticated' 
      });
      return;
    }

    if (!newMemberId) {
      res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
      return;
    }

    // Check if user can invite to channel
    const channelResult = await docClient.send(new GetCommand({
      TableName: TABLES.CHANNELS,
      Key: { channelId, tenantId }
    }));

    if (!channelResult.Item) {
      res.status(404).json({
        success: false,
        message: 'Channel not found'
      });
      return;
    }

    if (!channelResult.Item.members.includes(userId)) {
      res.status(403).json({
        success: false,
        message: 'Access denied'
      });
      return;
    }

    const canInvite = channelResult.Item.memberPermissions?.[userId]?.canInvite;
    if (!canInvite) {
      res.status(403).json({
        success: false,
        message: 'No permission to invite members'
      });
      return;
    }

    // Add member to channel
    await docClient.send(new UpdateCommand({
      TableName: TABLES.CHANNELS,
      Key: { channelId, tenantId },
      UpdateExpression: 'ADD members :newMember SET memberPermissions.#newMemberId = :permissions, updatedAt = :timestamp',
      ExpressionAttributeNames: {
        '#newMemberId': newMemberId
      },
      ExpressionAttributeValues: {
        ':newMember': new Set([newMemberId]),
        ':permissions': permissions || { canPost: true, canInvite: false, canManage: false },
        ':timestamp': new Date().toISOString()
      }
    }));

    res.json({
      success: true,
      message: 'Member added to channel'
    });
  } catch (error) {
    console.error('Error adding member:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add member'
    });
  }
});

// Remove member from channel
router.delete('/channels/:channelId/members/:memberId', async (req, res) => {
  try {
    const { channelId, memberId } = req.params;
    const authReq = req as unknown as AuthenticatedRequest;
    const userId = authReq.user?.userId;
    const tenantId = authReq.user?.tenantId;
    
    if (!userId || !tenantId) {
      res.status(401).json({ 
        success: false, 
        message: 'User not authenticated' 
      });
      return;
    }

    // Check if user can manage channel
    const channelResult = await docClient.send(new GetCommand({
      TableName: TABLES.CHANNELS,
      Key: { channelId, tenantId }
    }));

    if (!channelResult.Item) {
      res.status(404).json({
        success: false,
        message: 'Channel not found'
      });
      return;
    }

    if (!channelResult.Item.members.includes(userId)) {
      res.status(403).json({
        success: false,
        message: 'Access denied'
      });
      return;
    }

    const canManage = channelResult.Item.memberPermissions?.[userId]?.canManage;
    if (!canManage && userId !== memberId) {
      res.status(403).json({
        success: false,
        message: 'No permission to remove members'
      });
      return;
    }

    // Remove member from channel
    await docClient.send(new UpdateCommand({
      TableName: TABLES.CHANNELS,
      Key: { channelId, tenantId },
      UpdateExpression: 'DELETE members :member REMOVE memberPermissions.#memberId SET updatedAt = :timestamp',
      ExpressionAttributeNames: {
        '#memberId': memberId
      },
      ExpressionAttributeValues: {
        ':member': new Set([memberId]),
        ':timestamp': new Date().toISOString()
      }
    }));

    res.json({
      success: true,
      message: 'Member removed from channel'
    });
  } catch (error) {
    console.error('Error removing member:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove member'
    });
  }
});

// Direct Messages endpoints

// Get direct message conversations for a user
router.get('/direct-messages', async (req, res) => {
  try {
    const authReq = req as unknown as AuthenticatedRequest;
    const userId = authReq.user?.userId;
    const tenantId = authReq.user?.tenantId;
    
    if (!userId || !tenantId) {
      res.status(401).json({ 
        success: false, 
        message: 'User not authenticated' 
      });
      return;
    }

    // Query messages where user is sender or recipient
    const senderResult = await docClient.send(new QueryCommand({
      TableName: TABLES.DIRECT_MESSAGES,
      IndexName: 'SenderIdIndex',
      KeyConditionExpression: 'senderId = :userId',
      FilterExpression: 'tenantId = :tenantId',
      ExpressionAttributeValues: {
        ':userId': userId,
        ':tenantId': tenantId
      },
      ScanIndexForward: false,
      Limit: 50
    }));

    const recipientResult = await docClient.send(new QueryCommand({
      TableName: TABLES.DIRECT_MESSAGES,
      IndexName: 'RecipientIdIndex',
      KeyConditionExpression: 'recipientId = :userId',
      FilterExpression: 'tenantId = :tenantId',
      ExpressionAttributeValues: {
        ':userId': userId,
        ':tenantId': tenantId
      },
      ScanIndexForward: false,
      Limit: 50
    }));

    // Combine and sort messages
    const allMessages = [
      ...(senderResult.Items || []),
      ...(recipientResult.Items || [])
    ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    res.json({
      success: true,
      data: allMessages
    });
  } catch (error) {
    console.error('Error fetching direct messages:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch direct messages'
    });
  }
});

// Get conversation messages between two users
router.get('/direct-messages/:otherUserId', async (req, res) => {
  try {
    const { otherUserId } = req.params;
    const authReq = req as unknown as AuthenticatedRequest;
    const userId = authReq.user?.userId;
    const tenantId = authReq.user?.tenantId;
    
    if (!userId || !tenantId) {
      res.status(401).json({ 
        success: false, 
        message: 'User not authenticated' 
      });
      return;
    }

    // Create conversation ID (consistent ordering)
    const conversationId = [userId, otherUserId].sort().join('_');

    const result = await docClient.send(new QueryCommand({
      TableName: TABLES.DIRECT_MESSAGES,
      KeyConditionExpression: 'conversationId = :conversationId',
      FilterExpression: 'tenantId = :tenantId',
      ExpressionAttributeValues: {
        ':conversationId': conversationId,
        ':tenantId': tenantId
      },
      ScanIndexForward: false,
      Limit: 50
    }));

    res.json({
      success: true,
      data: result.Items || []
    });
  } catch (error) {
    console.error('Error fetching conversation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch conversation'
    });
  }
});

// Send a direct message
router.post('/direct-messages', async (req, res) => {
  try {
    const { recipientId, content, type = 'text', files } = req.body;
    const authReq = req as unknown as AuthenticatedRequest;
    const userId = authReq.user?.userId;
    const tenantId = authReq.user?.tenantId;
    
    if (!userId || !tenantId) {
      res.status(401).json({ 
        success: false, 
        message: 'User not authenticated' 
      });
      return;
    }

    if (!recipientId || !content) {
      res.status(400).json({
        success: false,
        message: 'Recipient ID and content are required'
      });
      return;
    }

    // Verify recipient exists and is in same tenant
    const recipientResult = await docClient.send(new QueryCommand({
      TableName: TABLES.USERS,
      IndexName: 'UserIdIndex',
      KeyConditionExpression: 'userId = :userId',
      FilterExpression: 'tenantId = :tenantId AND isDeleted = :isDeleted',
      ExpressionAttributeValues: {
        ':userId': recipientId,
        ':tenantId': tenantId,
        ':isDeleted': false
      }
    }));

    if (!recipientResult.Items || recipientResult.Items.length === 0) {
      res.status(404).json({
        success: false,
        message: 'Recipient not found or not in same tenant'
      });
      return;
    }

    const messageId = uuidv4();
    const timestamp = new Date().toISOString();
    const conversationId = [userId, recipientId].sort().join('_');

    const message = {
      messageId,
      conversationId,
      timestamp,
      senderId: userId,
      recipientId,
      tenantId,
      content,
      type,
      files: files || [],
      isEdited: false,
      isDeleted: false,
      readBy: [],
      reactions: {}
    };

    await docClient.send(new PutCommand({
      TableName: TABLES.DIRECT_MESSAGES,
      Item: message
    }));

    res.status(201).json({
      success: true,
      data: message
    });
  } catch (error) {
    console.error('Error sending direct message:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send direct message'
    });
  }
});

// Mark direct message as read
router.post('/direct-messages/:messageId/read', async (req, res) => {
  try {
    const { messageId } = req.params;
    const authReq = req as unknown as AuthenticatedRequest;
    const userId = authReq.user?.userId;
    const tenantId = authReq.user?.tenantId;
    
    if (!userId || !tenantId) {
      res.status(401).json({ 
        success: false, 
        message: 'User not authenticated' 
      });
      return;
    }

    // Find the message first
    const messageResult = await docClient.send(new QueryCommand({
      TableName: TABLES.DIRECT_MESSAGES,
      IndexName: 'MessageIdIndex',
      KeyConditionExpression: 'messageId = :messageId',
      FilterExpression: 'tenantId = :tenantId AND (senderId = :userId OR recipientId = :userId)',
      ExpressionAttributeValues: {
        ':messageId': messageId,
        ':tenantId': tenantId,
        ':userId': userId
      }
    }));

    if (!messageResult.Items || messageResult.Items.length === 0) {
      res.status(404).json({
        success: false,
        message: 'Message not found or access denied'
      });
      return;
    }

    const message = messageResult.Items[0];
    const readTimestamp = new Date().toISOString();

    // Update message with read receipt
    await docClient.send(new UpdateCommand({
      TableName: TABLES.DIRECT_MESSAGES,
      Key: { 
        conversationId: message.conversationId, 
        timestamp: message.timestamp 
      },
      UpdateExpression: 'SET readBy = list_append(if_not_exists(readBy, :emptyList), :readBy)',
      ExpressionAttributeValues: {
        ':emptyList': [],
        ':readBy': [{
          userId: userId,
          readAt: readTimestamp
        }]
      }
    }));

    res.json({
      success: true,
      message: 'Message marked as read'
    });
  } catch (error) {
    console.error('Error marking message as read:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark message as read'
    });
  }
});

export default router; 