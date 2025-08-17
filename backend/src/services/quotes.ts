import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand, UpdateCommand, DeleteCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { TABLES } from './dynamoClient';
import { quotesRBACService, RBACUser } from './quotesRBAC';

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

  // RBAC-aware method: Get quotes for user based on role and permissions
  async getQuotesForUser(user: RBACUser, includeDeleted = false): Promise<Quote[]> {
    console.log(`🔐 [QuotesService.getQuotesForUser] Getting quotes for user: ${user.email} (${user.role})`);
    return quotesRBACService.getQuotesForUser(user, includeDeleted);
  }

  // RBAC-aware method: Get quote by ID with role-based access control
  async getQuoteByIdForUser(id: string, user: RBACUser): Promise<Quote | null> {
    console.log(`🔐 [QuotesService.getQuoteByIdForUser] Getting quote ${id} for user: ${user.email} (${user.role})`);
    return quotesRBACService.getQuoteByIdForUser(id, user);
  }

  // RBAC-aware method: Get quotes by owner with role-based access control
  async getQuotesByOwnerForUser(quoteOwner: string, user: RBACUser): Promise<Quote[]> {
    console.log(`🔐 [QuotesService.getQuotesByOwnerForUser] Getting quotes for owner ${quoteOwner} by user: ${user.email} (${user.role})`);
    return quotesRBACService.getQuotesByOwnerForUser(quoteOwner, user);
  }

  // RBAC-aware method: Get quotes by status with role-based access control
  async getQuotesByStatusForUser(status: string, user: RBACUser): Promise<Quote[]> {
    console.log(`🔐 [QuotesService.getQuotesByStatusForUser] Getting quotes for status ${status} by user: ${user.email} (${user.role})`);
    return quotesRBACService.getQuotesByStatusForUser(status, user);
  }

  // RBAC-aware method: Get quotes by validity with role-based access control
  async getQuotesByValidityForUser(isValid: boolean, user: RBACUser): Promise<Quote[]> {
    console.log(`🔐 [QuotesService.getQuotesByValidityForUser] Getting ${isValid ? 'valid' : 'expired'} quotes by user: ${user.email} (${user.role})`);
    return quotesRBACService.getQuotesByValidityForUser(isValid, user);
  }

  // RBAC-aware method: Search quotes with role-based access control
  async searchQuotesForUser(user: RBACUser, searchTerm: string): Promise<Quote[]> {
    console.log(`🔐 [QuotesService.searchQuotesForUser] Searching quotes for term "${searchTerm}" by user: ${user.email} (${user.role})`);
    return quotesRBACService.searchQuotesForUser(user, searchTerm);
  }

  // RBAC-aware method: Get quote statistics with role-based access control
  async getQuotesStatsForUser(user: RBACUser): Promise<{
    total: number;
    byStatus: Record<string, number>;
    totalValue: number;
    avgValue: number;
    validQuotes: number;
    expiredQuotes: number;
    activeQuotes: number;
    inactiveQuotes: number;
  }> {
    console.log(`🔐 [QuotesService.getQuotesStatsForUser] Getting quote stats for user: ${user.email} (${user.role})`);
    return quotesRBACService.getQuotesStatsForUser(user);
  }
}

export const quotesService = new QuotesService(); 