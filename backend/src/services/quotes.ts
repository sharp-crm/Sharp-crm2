import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand, UpdateCommand, DeleteCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { TABLES } from './dynamoClient';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

export interface LineItem {
  id: string;
  productName: string;
  productId: string; // Product ID for database relationship
  description: string;
  quantity: number;
  listPrice: number;
  amount: number;
  discount: number;
  tax: number;
}

export interface Quote {
  id: string;
  quoteNumber: string;
  quoteName: string;
  quoteOwner: string;
  status: 'Draft' | 'Sent' | 'Accepted' | 'Rejected' | 'Expired';
  validUntil: string;
  activeStatus: boolean;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  lineItems: LineItem[];
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  adjustment: number;
  totalAmount: number;
  description: string;
  terms: string;
  notes: string;
  createdBy: string;
  createdAt: string;
  updatedBy: string;
  updatedAt: string;
  deletedBy?: string;
  isDeleted: boolean;
  deletedAt?: string;
  userId: string;
  tenantId: string;
  visibleTo?: string[];
}

class QuotesService {
  private tableName = TABLES.QUOTES;

  async getAllQuotes(userId: string, tenantId: string): Promise<Quote[]> {
    try {
      const command = new ScanCommand({
        TableName: this.tableName,
        FilterExpression: 'tenantId = :tenantId AND isDeleted = :isDeleted',
        ExpressionAttributeValues: {
          ':tenantId': tenantId,
          ':isDeleted': false
        }
      });

      const response = await docClient.send(command);
      return response.Items?.map(item => this.mapDynamoItemToQuote(item)) || [];
    } catch (error) {
      console.error('Error getting all quotes:', error);
      throw new Error('Failed to retrieve quotes');
    }
  }

  async getQuoteById(id: string, userId: string, tenantId: string): Promise<Quote | null> {
    try {
      const command = new GetCommand({
        TableName: this.tableName,
        Key: { id }
      });

      const response = await docClient.send(command);
      
      if (!response.Item || response.Item.isDeleted || response.Item.tenantId !== tenantId) {
        return null;
      }

      return this.mapDynamoItemToQuote(response.Item);
    } catch (error) {
      console.error('Error getting quote by ID:', error);
      throw new Error('Failed to retrieve quote');
    }
  }

  async createQuote(quoteData: Omit<Quote, 'id'>): Promise<Quote> {
    const timestamp = new Date().toISOString();
    const quoteId = uuidv4();

    const quote: Quote = {
      id: quoteId,
      ...quoteData,
      createdAt: timestamp,
      updatedAt: timestamp,
      isDeleted: false
    };

    try {
      await docClient.send(new PutCommand({
        TableName: this.tableName,
        Item: quote
      }));

      console.log(`✅ Quote created successfully - ID: ${quoteId}`);
      return quote;
    } catch (error) {
      console.error(`❌ Error creating quote:`, error);
      throw error;
    }
  }

  async updateQuote(id: string, updateData: Partial<Quote>, userId: string, tenantId: string): Promise<Quote | null> {
    try {
      // First, get the existing quote to ensure it exists and belongs to the tenant
      const existingQuote = await this.getQuoteById(id, userId, tenantId);
      if (!existingQuote) {
        return null;
      }

      const timestamp = new Date().toISOString();
      const updatedQuote: Quote = {
        ...existingQuote,
        ...updateData,
        updatedAt: timestamp,
        updatedBy: userId
      };

      await docClient.send(new PutCommand({
        TableName: this.tableName,
        Item: updatedQuote
      }));

      console.log(`✅ Quote updated successfully - ID: ${id}`);
      return updatedQuote;
    } catch (error) {
      console.error(`❌ Error updating quote:`, error);
      throw error;
    }
  }

  async deleteQuote(id: string, userId: string, tenantId: string): Promise<boolean> {
    try {
      // First, get the existing quote to ensure it exists and belongs to the tenant
      const existingQuote = await this.getQuoteById(id, userId, tenantId);
      if (!existingQuote) {
        return false;
      }

      const timestamp = new Date().toISOString();
      const deletedQuote: Quote = {
        ...existingQuote,
        isDeleted: true,
        deletedBy: userId,
        deletedAt: timestamp,
        updatedAt: timestamp,
        updatedBy: userId
      };

      await docClient.send(new PutCommand({
        TableName: this.tableName,
        Item: deletedQuote
      }));

      console.log(`✅ Quote deleted successfully - ID: ${id}`);
      return true;
    } catch (error) {
      console.error(`❌ Error deleting quote:`, error);
      throw error;
    }
  }

  async getQuotesByCustomer(customerId: string, userId: string, tenantId: string): Promise<Quote[]> {
    try {
      const command = new ScanCommand({
        TableName: this.tableName,
        FilterExpression: 'tenantId = :tenantId AND customerName = :customerId AND isDeleted = :isDeleted',
        ExpressionAttributeValues: {
          ':tenantId': tenantId,
          ':customerId': customerId,
          ':isDeleted': false
        }
      });

      const response = await docClient.send(command);
      return response.Items?.map(item => this.mapDynamoItemToQuote(item)) || [];
    } catch (error) {
      console.error('Error getting quotes by customer:', error);
      throw new Error('Failed to retrieve quotes by customer');
    }
  }

  async getQuotesByStatus(status: string, userId: string, tenantId: string): Promise<Quote[]> {
    try {
      const command = new ScanCommand({
        TableName: this.tableName,
        FilterExpression: 'tenantId = :tenantId AND status = :status AND isDeleted = :isDeleted',
        ExpressionAttributeValues: {
          ':tenantId': tenantId,
          ':status': status,
          ':isDeleted': false
        }
      });

      const response = await docClient.send(command);
      return response.Items?.map(item => this.mapDynamoItemToQuote(item)) || [];
    } catch (error) {
      console.error('Error getting quotes by status:', error);
      throw new Error('Failed to retrieve quotes by status');
    }
  }

  private mapQuoteToDynamoItem(quote: Quote): any {
    return quote;
  }

  private mapDynamoItemToQuote(item: any): Quote {
    return item as Quote;
  }
}

export const quotesService = new QuotesService(); 