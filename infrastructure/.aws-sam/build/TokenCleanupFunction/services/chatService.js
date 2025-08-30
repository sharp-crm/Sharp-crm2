"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const uuid_1 = require("uuid");
class ChatService {
    constructor(dynamoDbClient) {
        this.dynamoDb = lib_dynamodb_1.DynamoDBDocumentClient.from(dynamoDbClient);
    }
    // Channel operations
    async createChannel(channel) {
        const now = new Date().toISOString();
        const channelId = (0, uuid_1.v4)();
        const newChannel = {
            ...channel,
            id: channelId,
            createdAt: now,
            isDeleted: false
        };
        await this.dynamoDb.send(new lib_dynamodb_1.PutCommand({
            TableName: 'ChatChannels',
            Item: newChannel
        }));
        return newChannel;
    }
    async getChannel(channelId) {
        const result = await this.dynamoDb.send(new lib_dynamodb_1.GetCommand({
            TableName: 'ChatChannels',
            Key: { id: channelId }
        }));
        return result.Item || null;
    }
    async getChannelsByTenant(tenantId) {
        const result = await this.dynamoDb.send(new lib_dynamodb_1.QueryCommand({
            TableName: 'ChatChannels',
            IndexName: 'TenantIndex',
            KeyConditionExpression: 'tenantId = :tenantId',
            ExpressionAttributeValues: {
                ':tenantId': tenantId,
                ':isDeleted': false
            },
            FilterExpression: 'isDeleted = :isDeleted'
        }));
        return result.Items || [];
    }
    // Message operations
    async createMessage(message) {
        const now = new Date().toISOString();
        const messageId = (0, uuid_1.v4)();
        const newMessage = {
            ...message,
            id: messageId,
            timestamp: now,
            reactions: [],
            readBy: [],
            isEdited: false,
            isDeleted: false
        };
        await this.dynamoDb.send(new lib_dynamodb_1.PutCommand({
            TableName: 'ChatMessages',
            Item: newMessage
        }));
        return newMessage;
    }
    async getChannelMessages(channelId, limit = 50, lastTimestamp) {
        const params = {
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
        const result = await this.dynamoDb.send(new lib_dynamodb_1.QueryCommand(params));
        return result.Items || [];
    }
    // Channel member operations
    async addChannelMember(member) {
        await this.dynamoDb.send(new lib_dynamodb_1.PutCommand({
            TableName: 'ChatChannelMembers',
            Item: {
                ...member,
                joinedAt: new Date().toISOString()
            }
        }));
    }
    async getChannelMembers(channelId) {
        const result = await this.dynamoDb.send(new lib_dynamodb_1.QueryCommand({
            TableName: 'ChatChannelMembers',
            KeyConditionExpression: 'channelId = :channelId',
            ExpressionAttributeValues: {
                ':channelId': channelId
            }
        }));
        return result.Items || [];
    }
    async removeChannelMember(channelId, userId) {
        await this.dynamoDb.send(new lib_dynamodb_1.DeleteCommand({
            TableName: 'ChatChannelMembers',
            Key: {
                channelId,
                userId
            }
        }));
    }
    // Message reactions
    async addMessageReaction(channelId, messageTimestamp, userId, emoji) {
        await this.dynamoDb.send(new lib_dynamodb_1.UpdateCommand({
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
    async markMessageAsRead(channelId, messageTimestamp, userId) {
        await this.dynamoDb.send(new lib_dynamodb_1.UpdateCommand({
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
exports.default = ChatService;
