import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand, QueryCommand, UpdateCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';

export interface ChatChannel {
  id: string;
  name: string;
  type: 'public' | 'private' | 'direct';
  description?: string;
  createdBy: string;
  createdAt: string;
  tenantId: string;
  isDeleted: boolean;
}

export interface ChatMessage {
  channelId: string;
  timestamp: string;
  id: string;
  senderId: string;
  content: string;
  type: 'text' | 'file' | 'system';
  tenantId: string;
  reactions: Array<{
    emoji: string;
    users: string[];
  }>;
  readBy: Array<{
    userId: string;
    readAt: string;
  }>;
  files?: Array<{
    name: string;
    url: string;
    type: string;
    size: number;
  }>;
  replyTo?: string;
  isEdited: boolean;
  isDeleted: boolean;
}

export interface ChatChannelMember {
  channelId: string;
  userId: string;
  role: 'admin' | 'member';
  joinedAt: string;
  tenantId: string;
}

export default class ChatService {
  private dynamoDb: DynamoDBDocumentClient;

  constructor(dynamoDbClient: DynamoDBClient) {
    this.dynamoDb = DynamoDBDocumentClient.from(dynamoDbClient);
  }

  // Channel operations
  async createChannel(channel: Omit<ChatChannel, 'id' | 'createdAt'>): Promise<ChatChannel> {
    const now = new Date().toISOString();
    const channelId = uuidv4();

    const newChannel: ChatChannel = {
      ...channel,
      id: channelId,
      createdAt: now,
      isDeleted: false
    };

    await this.dynamoDb.send(new PutCommand({
      TableName: 'ChatChannels',
      Item: newChannel
    }));

    return newChannel;
  }

  async getChannel(channelId: string): Promise<ChatChannel | null> {
    const result = await this.dynamoDb.send(new GetCommand({
      TableName: 'ChatChannels',
      Key: { id: channelId }
    }));

    return result.Item as ChatChannel || null;
  }

  async getChannelsByTenant(tenantId: string): Promise<ChatChannel[]> {
    const result = await this.dynamoDb.send(new QueryCommand({
      TableName: 'ChatChannels',
      IndexName: 'TenantIndex',
      KeyConditionExpression: 'tenantId = :tenantId',
      ExpressionAttributeValues: {
        ':tenantId': tenantId,
        ':isDeleted': false
      },
      FilterExpression: 'isDeleted = :isDeleted'
    }));

    return result.Items as ChatChannel[] || [];
  }

  // Message operations
  async createMessage(message: Omit<ChatMessage, 'id' | 'timestamp'>): Promise<ChatMessage> {
    const now = new Date().toISOString();
    const messageId = uuidv4();

    const newMessage: ChatMessage = {
      ...message,
      id: messageId,
      timestamp: now,
      reactions: [],
      readBy: [],
      isEdited: false,
      isDeleted: false
    };

    await this.dynamoDb.send(new PutCommand({
      TableName: 'ChatMessages',
      Item: newMessage
    }));

    return newMessage;
  }

  async getChannelMessages(channelId: string, limit: number = 50, lastTimestamp?: string): Promise<ChatMessage[]> {
    const params: any = {
      TableName: 'ChatMessages',
      KeyConditionExpression: 'channelId = :channelId',
      ExpressionAttributeValues: {
        ':channelId': channelId,
        ':isDeleted': false
      },
      FilterExpression: 'isDeleted = :isDeleted',
      Limit: limit,
      ScanIndexForward: false // Get messages in descending order (newest first)
    };

    if (lastTimestamp) {
      params.ExclusiveStartKey = {
        channelId,
        timestamp: lastTimestamp
      };
    }

    const result = await this.dynamoDb.send(new QueryCommand(params));
    return result.Items as ChatMessage[] || [];
  }

  // Channel member operations
  async addChannelMember(member: ChatChannelMember): Promise<void> {
    await this.dynamoDb.send(new PutCommand({
      TableName: 'ChatChannelMembers',
      Item: {
        ...member,
        joinedAt: new Date().toISOString()
      }
    }));
  }

  async getChannelMembers(channelId: string): Promise<ChatChannelMember[]> {
    const result = await this.dynamoDb.send(new QueryCommand({
      TableName: 'ChatChannelMembers',
      KeyConditionExpression: 'channelId = :channelId',
      ExpressionAttributeValues: {
        ':channelId': channelId
      }
    }));

    return result.Items as ChatChannelMember[] || [];
  }

  async removeChannelMember(channelId: string, userId: string): Promise<void> {
    await this.dynamoDb.send(new DeleteCommand({
      TableName: 'ChatChannelMembers',
      Key: {
        channelId,
        userId
      }
    }));
  }

  // Message reactions
  async addMessageReaction(channelId: string, messageTimestamp: string, userId: string, emoji: string): Promise<void> {
    await this.dynamoDb.send(new UpdateCommand({
      TableName: 'ChatMessages',
      Key: {
        channelId,
        timestamp: messageTimestamp
      },
      UpdateExpression: 'SET reactions = list_append(if_not_exists(reactions, :empty_list), :new_reaction)',
      ExpressionAttributeValues: {
        ':empty_list': [],
        ':new_reaction': [{
          emoji,
          users: [userId]
        }]
      }
    }));
  }

  // Mark message as read
  async markMessageAsRead(channelId: string, messageTimestamp: string, userId: string): Promise<void> {
    await this.dynamoDb.send(new UpdateCommand({
      TableName: 'ChatMessages',
      Key: {
        channelId,
        timestamp: messageTimestamp
      },
      UpdateExpression: 'SET readBy = list_append(if_not_exists(readBy, :empty_list), :new_read)',
      ExpressionAttributeValues: {
        ':empty_list': [],
        ':new_read': [{
          userId,
          readAt: new Date().toISOString()
        }]
      }
    }));
  }
} 