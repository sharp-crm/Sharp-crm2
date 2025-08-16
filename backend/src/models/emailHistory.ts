import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, QueryCommand, ScanCommand, GetCommand } from '@aws-sdk/lib-dynamodb';

export interface EmailRecord {
  id: string;
  senderEmail: string;
  recipientEmail: string;
  subject: string;
  message: string;
  messageId?: string;
  status: 'sent' | 'failed' | 'pending';
  errorMessage?: string;
  sentAt: string;
  userId: string;
  tenantId?: string;
  metadata?: {
    ipAddress?: string;
    userAgent?: string;
    campaignId?: string;
    dealId?: string;
    contactId?: string;
  };
}

export interface EmailHistoryQuery {
  userId?: string;
  senderEmail?: string;
  recipientEmail?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  nextToken?: string;
}

export class EmailHistoryModel {
  private client: DynamoDBDocumentClient;
  private tableName: string;

  constructor() {
    const dynamoClient = new DynamoDBClient({
      region: process.env.AWS_REGION || 'us-east-1',
    });
    this.client = DynamoDBDocumentClient.from(dynamoClient);
    this.tableName = process.env.EMAIL_HISTORY_TABLE || 'SharpCRM-EmailHistory-development';
  }

  async createEmailRecord(emailRecord: EmailRecord): Promise<EmailRecord> {
    try {
      const command = new PutCommand({
        TableName: this.tableName,
        Item: {
          ...emailRecord,
          sentAt: emailRecord.sentAt || new Date().toISOString(),
        },
      });

      await this.client.send(command);
      console.log(`✅ Email record created: ${emailRecord.id}`);
      return emailRecord;
    } catch (error) {
      console.error('❌ Error creating email record:', error);
      throw new Error('Failed to create email record');
    }
  }

  async getEmailRecord(id: string): Promise<EmailRecord | null> {
    try {
      const command = new GetCommand({
        TableName: this.tableName,
        Key: { id },
      });

      const response = await this.client.send(command);
      return response.Item as EmailRecord || null;
    } catch (error) {
      console.error('❌ Error getting email record:', error);
      throw new Error('Failed to get email record');
    }
  }

  async queryEmailHistory(query: EmailHistoryQuery): Promise<{
    emails: EmailRecord[];
    nextToken?: string;
  }> {
    try {
      let filterExpression = '';
      let expressionAttributeNames: Record<string, string> = {};
      let expressionAttributeValues: Record<string, any> = {};

      // Build filter expression based on query parameters
      if (query.userId) {
        filterExpression += '#userId = :userId';
        expressionAttributeNames['#userId'] = 'userId';
        expressionAttributeValues[':userId'] = query.userId;
      }

      if (query.senderEmail) {
        if (filterExpression) filterExpression += ' AND ';
        filterExpression += '#senderEmail = :senderEmail';
        expressionAttributeNames['#senderEmail'] = 'senderEmail';
        expressionAttributeValues[':senderEmail'] = query.senderEmail;
      }

      if (query.recipientEmail) {
        if (filterExpression) filterExpression += ' AND ';
        filterExpression += '#recipientEmail = :recipientEmail';
        expressionAttributeNames['#recipientEmail'] = 'recipientEmail';
        expressionAttributeValues[':recipientEmail'] = query.recipientEmail;
      }

      if (query.status) {
        if (filterExpression) filterExpression += ' AND ';
        filterExpression += '#status = :status';
        expressionAttributeNames['#status'] = 'status';
        expressionAttributeValues[':status'] = query.status;
      }

      if (query.startDate || query.endDate) {
        if (filterExpression) filterExpression += ' AND ';
        if (query.startDate && query.endDate) {
          filterExpression += '#sentAt BETWEEN :startDate AND :endDate';
          expressionAttributeNames['#sentAt'] = 'sentAt';
          expressionAttributeValues[':startDate'] = query.startDate;
          expressionAttributeValues[':endDate'] = query.endDate;
        } else if (query.startDate) {
          filterExpression += '#sentAt >= :startDate';
          expressionAttributeNames['#sentAt'] = 'sentAt';
          expressionAttributeValues[':startDate'] = query.startDate;
        } else if (query.endDate) {
          filterExpression += '#sentAt <= :endDate';
          expressionAttributeNames['#sentAt'] = 'sentAt';
          expressionAttributeValues[':endDate'] = query.endDate;
        }
      }

      const command = new ScanCommand({
        TableName: this.tableName,
        FilterExpression: filterExpression || undefined,
        ExpressionAttributeNames: Object.keys(expressionAttributeNames).length > 0 ? expressionAttributeNames : undefined,
        ExpressionAttributeValues: Object.keys(expressionAttributeValues).length > 0 ? expressionAttributeValues : undefined,
        Limit: query.limit || 50,
        ExclusiveStartKey: query.nextToken ? { id: query.nextToken } : undefined,
      });

      const response = await this.client.send(command);
      
      return {
        emails: response.Items as EmailRecord[] || [],
        nextToken: response.LastEvaluatedKey?.id,
      };
    } catch (error) {
      console.error('❌ Error querying email history:', error);
      throw new Error('Failed to query email history');
    }
  }

  async getUserEmailHistory(userId: string, limit: number = 50): Promise<EmailRecord[]> {
    try {
      const command = new QueryCommand({
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
      return response.Items as EmailRecord[] || [];
    } catch (error) {
      console.error('❌ Error getting user email history:', error);
      // Fallback to scan if index doesn't exist
      return this.queryEmailHistory({ userId, limit }).then(result => result.emails);
    }
  }

  async updateEmailStatus(id: string, status: 'sent' | 'failed' | 'pending', messageId?: string, errorMessage?: string): Promise<void> {
    try {
      const command = new PutCommand({
        TableName: this.tableName,
        Item: {
          id,
          status,
          messageId,
          errorMessage,
          updatedAt: new Date().toISOString(),
        },
      });

      await this.client.send(command);
      console.log(`✅ Email status updated: ${id} -> ${status}`);
    } catch (error) {
      console.error('❌ Error updating email status:', error);
      throw new Error('Failed to update email status');
    }
  }
}
