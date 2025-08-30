"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailHistoryModel = void 0;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
class EmailHistoryModel {
    constructor() {
        const dynamoClient = new client_dynamodb_1.DynamoDBClient({
            region: process.env.AWS_REGION || 'us-east-1',
        });
        this.client = lib_dynamodb_1.DynamoDBDocumentClient.from(dynamoClient);
        this.tableName = process.env.EMAIL_HISTORY_TABLE || 'SharpCRM-EmailHistory-development';
    }
    async createEmailRecord(emailRecord) {
        try {
            const now = new Date().toISOString();
            const command = new lib_dynamodb_1.PutCommand({
                TableName: this.tableName,
                Item: {
                    ...emailRecord,
                    sentAt: emailRecord.sentAt || now,
                    updatedAt: now,
                },
            });
            await this.client.send(command);
            console.log(`✅ Email record created: ${emailRecord.id}`);
            return emailRecord;
        }
        catch (error) {
            console.error('❌ Error creating email record:', error);
            throw new Error('Failed to create email record');
        }
    }
    async getEmailRecord(id) {
        try {
            const command = new lib_dynamodb_1.GetCommand({
                TableName: this.tableName,
                Key: { id },
            });
            const response = await this.client.send(command);
            return response.Item || null;
        }
        catch (error) {
            console.error('❌ Error getting email record:', error);
            throw new Error('Failed to get email record');
        }
    }
    async queryEmailHistory(query) {
        try {
            let filterExpression = '';
            let expressionAttributeNames = {};
            let expressionAttributeValues = {};
            // Build filter expression based on query parameters
            if (query.userId) {
                filterExpression += '#userId = :userId';
                expressionAttributeNames['#userId'] = 'userId';
                expressionAttributeValues[':userId'] = query.userId;
            }
            if (query.senderEmail) {
                if (filterExpression)
                    filterExpression += ' AND ';
                filterExpression += '#senderEmail = :senderEmail';
                expressionAttributeNames['#senderEmail'] = 'senderEmail';
                expressionAttributeValues[':senderEmail'] = query.senderEmail;
            }
            if (query.recipientEmail) {
                if (filterExpression)
                    filterExpression += ' AND ';
                filterExpression += '#recipientEmail = :recipientEmail';
                expressionAttributeNames['#recipientEmail'] = 'recipientEmail';
                expressionAttributeValues[':recipientEmail'] = query.recipientEmail;
            }
            if (query.status) {
                if (filterExpression)
                    filterExpression += ' AND ';
                filterExpression += '#status = :status';
                expressionAttributeNames['#status'] = 'status';
                expressionAttributeValues[':status'] = query.status;
            }
            if (query.startDate || query.endDate) {
                if (filterExpression)
                    filterExpression += ' AND ';
                if (query.startDate && query.endDate) {
                    filterExpression += '#sentAt BETWEEN :startDate AND :endDate';
                    expressionAttributeNames['#sentAt'] = 'sentAt';
                    expressionAttributeValues[':startDate'] = query.startDate;
                    expressionAttributeValues[':endDate'] = query.endDate;
                }
                else if (query.startDate) {
                    filterExpression += '#sentAt >= :startDate';
                    expressionAttributeNames['#sentAt'] = 'sentAt';
                    expressionAttributeValues[':startDate'] = query.startDate;
                }
                else if (query.endDate) {
                    filterExpression += '#sentAt <= :endDate';
                    expressionAttributeNames['#sentAt'] = 'sentAt';
                    expressionAttributeValues[':endDate'] = query.endDate;
                }
            }
            const command = new lib_dynamodb_1.ScanCommand({
                TableName: this.tableName,
                FilterExpression: filterExpression || undefined,
                ExpressionAttributeNames: Object.keys(expressionAttributeNames).length > 0 ? expressionAttributeNames : undefined,
                ExpressionAttributeValues: Object.keys(expressionAttributeValues).length > 0 ? expressionAttributeValues : undefined,
                Limit: query.limit || 50,
                ExclusiveStartKey: query.nextToken ? { id: query.nextToken } : undefined,
            });
            const response = await this.client.send(command);
            return {
                emails: response.Items || [],
                nextToken: response.LastEvaluatedKey?.id,
            };
        }
        catch (error) {
            console.error('❌ Error querying email history:', error);
            throw new Error('Failed to query email history');
        }
    }
    async getUserEmailHistory(userId, limit = 50) {
        try {
            const command = new lib_dynamodb_1.QueryCommand({
                TableName: this.tableName,
                IndexName: 'UserIdIndex',
                KeyConditionExpression: 'userId = :userId',
                ExpressionAttributeValues: {
                    ':userId': userId,
                },
                ScanIndexForward: false, // Most recent first
                Limit: limit,
            });
            const response = await this.client.send(command);
            return response.Items || [];
        }
        catch (error) {
            console.error('❌ Error getting user email history:', error);
            // Fallback to scan if index doesn't exist
            return this.queryEmailHistory({ userId, limit }).then(result => result.emails);
        }
    }
    async updateEmailStatus(id, status, messageId, errorMessage) {
        try {
            // First get the existing record
            const existingRecord = await this.getEmailRecord(id);
            if (!existingRecord) {
                throw new Error(`Email record with id ${id} not found`);
            }
            // Update the record with new status and optional fields
            const updatedRecord = {
                ...existingRecord,
                status,
                messageId: messageId || existingRecord.messageId,
                errorMessage: errorMessage || existingRecord.errorMessage,
                updatedAt: new Date().toISOString(),
            };
            const command = new lib_dynamodb_1.PutCommand({
                TableName: this.tableName,
                Item: updatedRecord,
            });
            await this.client.send(command);
            console.log(`✅ Email status updated: ${id} -> ${status}`);
        }
        catch (error) {
            console.error('❌ Error updating email status:', error);
            throw new Error('Failed to update email status');
        }
    }
}
exports.EmailHistoryModel = EmailHistoryModel;
