import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, TABLES } from './dynamoClient';
import { Quote } from './quotes';

export interface RBACUser {
  userId: string;
  email: string;
  role: 'ADMIN' | 'SALES_MANAGER' | 'SALES_REP';
  tenantId: string;
  reportingTo?: string;
}

export interface QuoteAccessFilter {
  filterExpression: string;
  expressionAttributeValues: Record<string, any>;
  expressionAttributeNames?: Record<string, string>;
}

export class QuotesRBACService {
  private tableName = TABLES.QUOTES;

  /**
   * Get all quotes accessible by a user based on their role and tenant
   */
  async getQuotesForUser(user: RBACUser, includeDeleted = false): Promise<Quote[]> {
    console.log(`🔐 [QuotesRBACService] Getting quotes for user: ${user.email} (${user.role}) in tenant: ${user.tenantId}`);
    
    try {
      // First ensure tenant-based segregation
      const tenantFilter = this.buildTenantFilter(user.tenantId, includeDeleted);
      
      // Then build role-based access filter
      const roleFilter = await this.buildRoleBasedFilter(user);
      
      // Combine filters
      const combinedFilter = this.combineFilters(tenantFilter, roleFilter);
      
      console.log(`🔐 [QuotesRBACService] Filter expression: ${combinedFilter.filterExpression}`);
      console.log(`🔐 [QuotesRBACService] Expression values:`, combinedFilter.expressionAttributeValues);
      console.log(`🔐 [QuotesRBACService] Expression names:`, combinedFilter.expressionAttributeNames);
      
      // Use QueryCommand with TenantIndex for better performance
      const queryParams: any = {
        TableName: this.tableName,
        IndexName: 'TenantIndex',
        KeyConditionExpression: 'tenantId = :tenantId',
        ExpressionAttributeValues: {
          ':tenantId': user.tenantId,
          ...combinedFilter.expressionAttributeValues
        }
      };

      // Add filter expression if we have role-based filtering
      if (roleFilter.filterExpression) {
        queryParams.FilterExpression = roleFilter.filterExpression;
        if (!includeDeleted) {
          queryParams.FilterExpression = `(attribute_not_exists(isDeleted) OR isDeleted = :isDeleted) AND (${roleFilter.filterExpression})`;
          queryParams.ExpressionAttributeValues[':isDeleted'] = false;
        }
      } else if (!includeDeleted) {
        queryParams.FilterExpression = 'attribute_not_exists(isDeleted) OR isDeleted = :isDeleted';
        queryParams.ExpressionAttributeValues[':isDeleted'] = false;
      }
      
      // Only add ExpressionAttributeNames if it exists and has properties
      if (combinedFilter.expressionAttributeNames && Object.keys(combinedFilter.expressionAttributeNames).length > 0) {
        queryParams.ExpressionAttributeNames = combinedFilter.expressionAttributeNames;
      }
      
      const result = await docClient.send(new QueryCommand(queryParams));

      const quotes = (result.Items || []) as Quote[];
      console.log(`🔐 [QuotesRBACService] Retrieved ${quotes.length} quotes for user ${user.email}`);
      
      return quotes;
    } catch (error) {
      console.error(`🔐 [QuotesRBACService] Error getting quotes for user ${user.email}:`, error);
      throw error;
    }
  }

  /**
   * Get a specific quote by ID if the user has access to it
   */
  async getQuoteByIdForUser(quoteId: string, user: RBACUser): Promise<Quote | null> {
    console.log(`🔐 [QuotesRBACService] Getting quote ${quoteId} for user: ${user.email} (${user.role})`);
    
    // First get the quote
    const result = await docClient.send(new QueryCommand({
      TableName: this.tableName,
      KeyConditionExpression: 'id = :id',
      ExpressionAttributeValues: {
        ':id': quoteId
      }
    }));

    if (!result.Items || result.Items.length === 0) {
      console.log(`🔐 [QuotesRBACService] Quote ${quoteId} not found`);
      return null;
    }

    const quote = result.Items[0] as Quote;
    
    // Check if user has access to this quote
    const hasAccess = await this.canUserAccessQuote(quote, user);
    
    if (!hasAccess) {
      console.log(`🔐 [QuotesRBACService] User ${user.email} does not have access to quote ${quoteId}`);
      return null;
    }

    console.log(`🔐 [QuotesRBACService] User ${user.email} has access to quote ${quoteId}`);
    return quote;
  }

  /**
   * Get quotes by owner with RBAC filtering
   */
  async getQuotesByOwnerForUser(quoteOwner: string, user: RBACUser): Promise<Quote[]> {
    console.log(`🔐 [QuotesRBACService] Getting quotes for owner ${quoteOwner}, requested by user: ${user.email} (${user.role})`);
    
    // Check if user can access quotes owned by the specified owner
    const canAccessOwner = await this.canUserAccessQuotesFromOwner(quoteOwner, user);
    
    if (!canAccessOwner) {
      console.log(`🔐 [QuotesRBACService] User ${user.email} cannot access quotes from owner ${quoteOwner}`);
      return [];
    }

    // Get all quotes first and filter by owner and RBAC
    const accessibleQuotes = await this.getQuotesForUser(user, false);
    const ownerQuotes = accessibleQuotes.filter(quote => quote.quoteOwner === quoteOwner);

    console.log(`🔐 [QuotesRBACService] Retrieved ${ownerQuotes.length} quotes for owner ${quoteOwner}`);
    return ownerQuotes;
  }

  /**
   * Get quotes by status with RBAC filtering
   */
  async getQuotesByStatusForUser(status: string, user: RBACUser): Promise<Quote[]> {
    console.log(`🔐 [QuotesRBACService] Getting quotes for status ${status}, requested by user: ${user.email} (${user.role})`);
    
    // Get all accessible quotes first, then filter by status
    const accessibleQuotes = await this.getQuotesForUser(user, false);
    
    // Filter by status
    const statusQuotes = accessibleQuotes.filter(quote => quote.status === status);

    console.log(`🔐 [QuotesRBACService] Retrieved ${statusQuotes.length} accessible quotes for status ${status}`);
    return statusQuotes;
  }

  /**
   * Get quotes by validity (expired/valid) with RBAC filtering
   */
  async getQuotesByValidityForUser(isValid: boolean, user: RBACUser): Promise<Quote[]> {
    console.log(`🔐 [QuotesRBACService] Getting ${isValid ? 'valid' : 'expired'} quotes, requested by user: ${user.email} (${user.role})`);
    
    // Get all accessible quotes first
    const accessibleQuotes = await this.getQuotesForUser(user, false);
    const currentDate = new Date();
    
    // Filter by validity
    const filteredQuotes = accessibleQuotes.filter(quote => {
      const validUntil = new Date(quote.validUntil);
      const isQuoteValid = validUntil > currentDate;
      return isValid ? isQuoteValid : !isQuoteValid;
    });

    console.log(`🔐 [QuotesRBACService] Retrieved ${filteredQuotes.length} ${isValid ? 'valid' : 'expired'} quotes`);
    return filteredQuotes;
  }

  /**
   * Search quotes with RBAC filtering
   */
  async searchQuotesForUser(user: RBACUser, searchTerm: string): Promise<Quote[]> {
    console.log(`🔐 [QuotesRBACService] Searching quotes for term "${searchTerm}" by user: ${user.email} (${user.role})`);
    
    // Get all accessible quotes first
    const accessibleQuotes = await this.getQuotesForUser(user, false);
    
    // Filter by search term (search in quoteName, quoteNumber, description, notes, terms)
    const searchResults = accessibleQuotes.filter(quote => {
      const searchLower = searchTerm.toLowerCase();
      return (
        quote.quoteName?.toLowerCase().includes(searchLower) ||
        quote.quoteNumber?.toLowerCase().includes(searchLower) ||
        quote.description?.toLowerCase().includes(searchLower) ||
        quote.notes?.toLowerCase().includes(searchLower) ||
        quote.terms?.toLowerCase().includes(searchLower)
      );
    });

    console.log(`🔐 [QuotesRBACService] Found ${searchResults.length} quotes matching search term "${searchTerm}"`);
    return searchResults;
  }

  /**
   * Get quote statistics with RBAC filtering
   */
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
    console.log(`🔐 [QuotesRBACService] Getting quote stats for user: ${user.email} (${user.role})`);
    
    // Get all accessible quotes
    const quotes = await this.getQuotesForUser(user, false);
    const currentDate = new Date();
    
    // Calculate statistics
    const byStatus: Record<string, number> = {};
    let totalValue = 0;
    let validQuotes = 0;
    let expiredQuotes = 0;
    let activeQuotes = 0;
    let inactiveQuotes = 0;

    quotes.forEach(quote => {
      // Count by status
      byStatus[quote.status] = (byStatus[quote.status] || 0) + 1;
      
      // Sum total value
      totalValue += quote.totalAmount || 0;
      
      // Count validity status
      const validUntil = new Date(quote.validUntil);
      if (validUntil > currentDate) {
        validQuotes++;
      } else {
        expiredQuotes++;
      }
      
      // Count active status
      if (quote.activeStatus) {
        activeQuotes++;
      } else {
        inactiveQuotes++;
      }
    });

    const stats = {
      total: quotes.length,
      byStatus,
      totalValue,
      avgValue: quotes.length > 0 ? totalValue / quotes.length : 0,
      validQuotes,
      expiredQuotes,
      activeQuotes,
      inactiveQuotes
    };

    console.log(`🔐 [QuotesRBACService] Calculated stats for ${quotes.length} quotes`);
    return stats;
  }

  /**
   * Check if user can access a specific quote
   */
  private async canUserAccessQuote(quote: Quote, user: RBACUser): Promise<boolean> {
    // Tenant segregation - first and most important check
    if (quote.tenantId !== user.tenantId) {
      console.log(`🔐 [QuotesRBACService] Tenant mismatch: quote.tenantId=${quote.tenantId}, user.tenantId=${user.tenantId}`);
      return false;
    }

    // Soft delete check
    if (quote.isDeleted) {
      console.log(`🔐 [QuotesRBACService] Quote ${quote.id} is soft deleted`);
      return false;
    }

    switch (user.role) {
      case 'ADMIN':
        // Admin can see all quotes in their tenant
        return true;

      case 'SALES_MANAGER':
        // Manager can see their own quotes + quotes from subordinates
        if (quote.quoteOwner === user.userId) {
          return true;
        }
        
        // Check if quote owner is a subordinate
        const subordinates = await this.getSubordinates(user.userId, user.tenantId);
        return subordinates.includes(quote.quoteOwner);

      case 'SALES_REP':
        // Rep can only see quotes they own
        return quote.quoteOwner === user.userId;

      default:
        return false;
    }
  }

  /**
   * Check if user can access quotes from a specific owner
   */
  private async canUserAccessQuotesFromOwner(ownerId: string, user: RBACUser): Promise<boolean> {
    switch (user.role) {
      case 'ADMIN':
        // Admin can access quotes from any owner in their tenant
        return true;

      case 'SALES_MANAGER':
        // Manager can access their own quotes + quotes from subordinates
        if (ownerId === user.userId) {
          return true;
        }
        
        const subordinates = await this.getSubordinates(user.userId, user.tenantId);
        return subordinates.includes(ownerId);

      case 'SALES_REP':
        // Rep can only access their own quotes
        return ownerId === user.userId;

      default:
        return false;
    }
  }

  /**
   * Get all subordinates (sales reps) that report to a manager
   */
  private async getSubordinates(managerId: string, tenantId: string): Promise<string[]> {
    try {
      const result = await docClient.send(new ScanCommand({
        TableName: TABLES.USERS,
        FilterExpression: 'reportingTo = :managerId AND #role = :role AND tenantId = :tenantId AND (attribute_not_exists(isDeleted) OR isDeleted = :isDeleted)',
        ExpressionAttributeNames: {
          '#role': 'role'
        },
        ExpressionAttributeValues: {
          ':managerId': managerId,
          ':role': 'SALES_REP',
          ':tenantId': tenantId,
          ':isDeleted': false
        }
      }));

      const subordinateIds = (result.Items || []).map(user => user.userId);
      console.log(`🔐 [QuotesRBACService] Manager ${managerId} has ${subordinateIds.length} subordinates: ${subordinateIds.join(', ')}`);
      
      return subordinateIds;
    } catch (error) {
      console.error(`🔐 [QuotesRBACService] Error getting subordinates for manager ${managerId}:`, error);
      return [];
    }
  }

  /**
   * Build tenant-based filter (always applied first)
   */
  private buildTenantFilter(tenantId: string, includeDeleted: boolean): QuoteAccessFilter {
    return {
      filterExpression: includeDeleted 
        ? ''  // No filter needed for tenant as we use KeyConditionExpression
        : '(attribute_not_exists(isDeleted) OR isDeleted = :isDeleted)',
      expressionAttributeValues: {
        ...(includeDeleted ? {} : { ':isDeleted': false })
      }
    };
  }

  /**
   * Build role-based access filter
   */
  private async buildRoleBasedFilter(user: RBACUser): Promise<QuoteAccessFilter> {
    switch (user.role) {
      case 'ADMIN':
        // Admin can see all quotes in tenant (no additional filter needed)
        return {
          filterExpression: '',
          expressionAttributeValues: {}
        };

      case 'SALES_MANAGER':
        // Manager can see their own quotes + subordinates' quotes
        const subordinates = await this.getSubordinates(user.userId, user.tenantId);
        const allAccessibleOwners = [user.userId, ...subordinates];
        
        if (allAccessibleOwners.length === 1) {
          return {
            filterExpression: 'quoteOwner = :userId',
            expressionAttributeValues: {
              ':userId': user.userId
            }
          };
        } else {
          const placeholders = allAccessibleOwners.map((_, index) => `:owner${index}`).join(', ');
          const expressionAttributeValues: Record<string, any> = {};
          
          allAccessibleOwners.forEach((ownerId, index) => {
            expressionAttributeValues[`:owner${index}`] = ownerId;
          });
          
          return {
            filterExpression: `quoteOwner IN (${placeholders})`,
            expressionAttributeValues
          };
        }

      case 'SALES_REP':
        // Rep can only see their own quotes
        return {
          filterExpression: 'quoteOwner = :userId',
          expressionAttributeValues: {
            ':userId': user.userId
          }
        };

      default:
        // No access
        return {
          filterExpression: 'quoteOwner = :noAccess',
          expressionAttributeValues: {
            ':noAccess': 'NO_ACCESS'
          }
        };
    }
  }

  /**
   * Combine tenant filter and role filter
   */
  private combineFilters(tenantFilter: QuoteAccessFilter, roleFilter: QuoteAccessFilter): QuoteAccessFilter {
    const filters: string[] = [];
    
    if (tenantFilter.filterExpression) {
      filters.push(tenantFilter.filterExpression);
    }
    
    if (roleFilter.filterExpression) {
      filters.push(roleFilter.filterExpression);
    }

    return {
      filterExpression: filters.join(' AND '),
      expressionAttributeValues: {
        ...tenantFilter.expressionAttributeValues,
        ...roleFilter.expressionAttributeValues
      },
      expressionAttributeNames: {
        ...tenantFilter.expressionAttributeNames,
        ...roleFilter.expressionAttributeNames
      }
    };
  }
}

// Export singleton instance
export const quotesRBACService = new QuotesRBACService();
