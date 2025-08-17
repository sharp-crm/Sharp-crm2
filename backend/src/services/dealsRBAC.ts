import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, TABLES } from './dynamoClient';
import { Deal } from './deals';

export interface RBACUser {
  userId: string;
  email: string;
  role: 'ADMIN' | 'SALES_MANAGER' | 'SALES_REP';
  tenantId: string;
  reportingTo?: string;
}

export interface DealAccessFilter {
  filterExpression: string;
  expressionAttributeValues: Record<string, any>;
  expressionAttributeNames?: Record<string, string>;
}

export class DealsRBACService {
  private tableName = TABLES.DEALS;

  /**
   * Get all deals accessible by a user based on their role and tenant
   */
  async getDealsForUser(user: RBACUser, includeDeleted = false): Promise<Deal[]> {
    console.log(`🔐 [DealsRBACService] Getting deals for user: ${user.email} (${user.role}) in tenant: ${user.tenantId}`);
    
    try {
      // First ensure tenant-based segregation
      const tenantFilter = this.buildTenantFilter(user.tenantId, includeDeleted);
      
      // Then build role-based access filter
      const roleFilter = await this.buildRoleBasedFilter(user);
      
      // Combine filters
      const combinedFilter = this.combineFilters(tenantFilter, roleFilter);
      
      console.log(`🔐 [DealsRBACService] Filter expression: ${combinedFilter.filterExpression}`);
      console.log(`🔐 [DealsRBACService] Expression values:`, combinedFilter.expressionAttributeValues);
      console.log(`🔐 [DealsRBACService] Expression names:`, combinedFilter.expressionAttributeNames);
      
      const scanParams: any = {
        TableName: this.tableName,
        FilterExpression: combinedFilter.filterExpression,
        ExpressionAttributeValues: combinedFilter.expressionAttributeValues
      };
      
      // Only add ExpressionAttributeNames if it exists and has properties
      if (combinedFilter.expressionAttributeNames && Object.keys(combinedFilter.expressionAttributeNames).length > 0) {
        scanParams.ExpressionAttributeNames = combinedFilter.expressionAttributeNames;
      }
      
      const result = await docClient.send(new ScanCommand(scanParams));

      const deals = (result.Items || []) as Deal[];
      console.log(`🔐 [DealsRBACService] Retrieved ${deals.length} deals for user ${user.email}`);
      
      return deals;
    } catch (error) {
      console.error(`🔐 [DealsRBACService] Error getting deals for user ${user.email}:`, error);
      throw error;
    }
  }

  /**
   * Get a specific deal by ID if the user has access to it
   */
  async getDealByIdForUser(dealId: string, user: RBACUser): Promise<Deal | null> {
    console.log(`🔐 [DealsRBACService] Getting deal ${dealId} for user: ${user.email} (${user.role})`);
    
    // First get the deal
    const result = await docClient.send(new QueryCommand({
      TableName: this.tableName,
      KeyConditionExpression: 'id = :id',
      ExpressionAttributeValues: {
        ':id': dealId
      }
    }));

    if (!result.Items || result.Items.length === 0) {
      console.log(`🔐 [DealsRBACService] Deal ${dealId} not found`);
      return null;
    }

    const deal = result.Items[0] as Deal;
    
    // Check if user has access to this deal
    const hasAccess = await this.canUserAccessDeal(deal, user);
    
    if (!hasAccess) {
      console.log(`🔐 [DealsRBACService] User ${user.email} does not have access to deal ${dealId}`);
      return null;
    }

    console.log(`🔐 [DealsRBACService] User ${user.email} has access to deal ${dealId}`);
    return deal;
  }

  /**
   * Get deals by owner with RBAC filtering
   */
  async getDealsByOwnerForUser(dealOwner: string, user: RBACUser): Promise<Deal[]> {
    console.log(`🔐 [DealsRBACService] Getting deals for owner ${dealOwner}, requested by user: ${user.email} (${user.role})`);
    
    // Check if user can access deals owned by the specified owner
    const canAccessOwner = await this.canUserAccessDealsFromOwner(dealOwner, user);
    
    if (!canAccessOwner) {
      console.log(`🔐 [DealsRBACService] User ${user.email} cannot access deals from owner ${dealOwner}`);
      return [];
    }

    // Query by dealOwner using the GSI
    const result = await docClient.send(new QueryCommand({
      TableName: this.tableName,
      IndexName: 'DealOwnerIndex',
      KeyConditionExpression: 'dealOwner = :dealOwner',
      FilterExpression: 'tenantId = :tenantId AND isDeleted = :isDeleted',
      ExpressionAttributeValues: {
        ':dealOwner': dealOwner,
        ':tenantId': user.tenantId,
        ':isDeleted': false
      }
    }));

    const deals = (result.Items || []) as Deal[];
    console.log(`🔐 [DealsRBACService] Retrieved ${deals.length} deals for owner ${dealOwner}`);
    
    return deals;
  }

  /**
   * Get deals by stage with RBAC filtering
   */
  async getDealsByStageForUser(stage: string, user: RBACUser): Promise<Deal[]> {
    console.log(`🔐 [DealsRBACService] Getting deals for stage ${stage}, requested by user: ${user.email} (${user.role})`);
    
    // Query by stage using the GSI, then filter by RBAC
    const result = await docClient.send(new QueryCommand({
      TableName: this.tableName,
      IndexName: 'StageIndex',
      KeyConditionExpression: 'stage = :stage',
      FilterExpression: 'tenantId = :tenantId AND isDeleted = :isDeleted',
      ExpressionAttributeValues: {
        ':stage': stage,
        ':tenantId': user.tenantId,
        ':isDeleted': false
      }
    }));

    let deals = (result.Items || []) as Deal[];
    
    // Apply RBAC filtering to the results
    const accessibleDeals = [];
    for (const deal of deals) {
      const hasAccess = await this.canUserAccessDeal(deal, user);
      if (hasAccess) {
        accessibleDeals.push(deal);
      }
    }

    console.log(`🔐 [DealsRBACService] Retrieved ${accessibleDeals.length} accessible deals for stage ${stage}`);
    return accessibleDeals;
  }

  /**
   * Search deals with RBAC filtering
   */
  async searchDealsForUser(user: RBACUser, searchTerm: string): Promise<Deal[]> {
    console.log(`🔐 [DealsRBACService] Searching deals for term "${searchTerm}" by user: ${user.email} (${user.role})`);
    
    // Get all accessible deals first
    const accessibleDeals = await this.getDealsForUser(user, false);
    
    // Filter by search term (search in dealName, description, leadSource)
    const searchResults = accessibleDeals.filter(deal => {
      const searchLower = searchTerm.toLowerCase();
      return (
        deal.dealName?.toLowerCase().includes(searchLower) ||
        deal.description?.toLowerCase().includes(searchLower) ||
        deal.leadSource?.toLowerCase().includes(searchLower) ||
        deal.email?.toLowerCase().includes(searchLower)
      );
    });

    console.log(`🔐 [DealsRBACService] Found ${searchResults.length} deals matching search term "${searchTerm}"`);
    return searchResults;
  }

  /**
   * Get deals stats with RBAC filtering
   */
  async getDealsStatsForUser(user: RBACUser): Promise<{
    total: number;
    byStage: Record<string, number>;
    bySource: Record<string, number>;
    totalValue: number;
    avgValue: number;
    recentCount: number;
  }> {
    console.log(`🔐 [DealsRBACService] Getting deals stats for user: ${user.email} (${user.role})`);
    
    // Get all accessible deals
    const deals = await this.getDealsForUser(user, false);
    
    // Calculate statistics
    const byStage: Record<string, number> = {};
    const bySource: Record<string, number> = {};
    let totalValue = 0;
    let recentCount = 0;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    deals.forEach(deal => {
      // Count by stage
      byStage[deal.stage] = (byStage[deal.stage] || 0) + 1;
      
      // Count by source
      bySource[deal.leadSource] = (bySource[deal.leadSource] || 0) + 1;
      
      // Sum total value
      totalValue += deal.amount || 0;
      
      // Count recent deals
      if (new Date(deal.createdAt) >= thirtyDaysAgo) {
        recentCount++;
      }
    });

    const stats = {
      total: deals.length,
      byStage,
      bySource,
      totalValue,
      avgValue: deals.length > 0 ? totalValue / deals.length : 0,
      recentCount
    };

    console.log(`🔐 [DealsRBACService] Calculated stats for ${deals.length} deals`);
    return stats;
  }

  /**
   * Check if user can access a specific deal
   */
  private async canUserAccessDeal(deal: Deal, user: RBACUser): Promise<boolean> {
    // Tenant segregation - first and most important check
    if (deal.tenantId !== user.tenantId) {
      console.log(`🔐 [DealsRBACService] Tenant mismatch: deal.tenantId=${deal.tenantId}, user.tenantId=${user.tenantId}`);
      return false;
    }

    // Soft delete check
    if (deal.isDeleted) {
      console.log(`🔐 [DealsRBACService] Deal ${deal.id} is soft deleted`);
      return false;
    }

    switch (user.role) {
      case 'ADMIN':
        // Admin can see all deals in their tenant
        return true;

      case 'SALES_MANAGER':
        // Manager can see their own deals + deals from subordinates
        if (deal.dealOwner === user.userId) {
          return true;
        }
        
        // Check if deal owner is a subordinate
        const subordinates = await this.getSubordinates(user.userId, user.tenantId);
        return subordinates.includes(deal.dealOwner);

      case 'SALES_REP':
        // Rep can only see deals they own
        return deal.dealOwner === user.userId;

      default:
        return false;
    }
  }

  /**
   * Check if user can access deals from a specific owner
   */
  private async canUserAccessDealsFromOwner(ownerId: string, user: RBACUser): Promise<boolean> {
    switch (user.role) {
      case 'ADMIN':
        // Admin can access deals from any owner in their tenant
        return true;

      case 'SALES_MANAGER':
        // Manager can access their own deals + deals from subordinates
        if (ownerId === user.userId) {
          return true;
        }
        
        const subordinates = await this.getSubordinates(user.userId, user.tenantId);
        return subordinates.includes(ownerId);

      case 'SALES_REP':
        // Rep can only access their own deals
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
        FilterExpression: 'reportingTo = :managerId AND #role = :role AND tenantId = :tenantId AND isDeleted = :isDeleted',
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
      console.log(`🔐 [DealsRBACService] Manager ${managerId} has ${subordinateIds.length} subordinates: ${subordinateIds.join(', ')}`);
      
      return subordinateIds;
    } catch (error) {
      console.error(`🔐 [DealsRBACService] Error getting subordinates for manager ${managerId}:`, error);
      return [];
    }
  }

  /**
   * Build tenant-based filter (always applied first)
   */
  private buildTenantFilter(tenantId: string, includeDeleted: boolean): DealAccessFilter {
    return {
      filterExpression: includeDeleted 
        ? 'tenantId = :tenantId'
        : 'tenantId = :tenantId AND isDeleted = :isDeleted',
      expressionAttributeValues: {
        ':tenantId': tenantId,
        ...(includeDeleted ? {} : { ':isDeleted': false })
      }
    };
  }

  /**
   * Build role-based access filter
   */
  private async buildRoleBasedFilter(user: RBACUser): Promise<DealAccessFilter> {
    switch (user.role) {
      case 'ADMIN':
        // Admin can see all deals in tenant (no additional filter needed)
        return {
          filterExpression: '',
          expressionAttributeValues: {}
        };

      case 'SALES_MANAGER':
        // Manager can see their own deals + subordinates' deals
        const subordinates = await this.getSubordinates(user.userId, user.tenantId);
        const allAccessibleOwners = [user.userId, ...subordinates];
        
        if (allAccessibleOwners.length === 1) {
          return {
            filterExpression: 'dealOwner = :userId',
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
            filterExpression: `dealOwner IN (${placeholders})`,
            expressionAttributeValues
          };
        }

      case 'SALES_REP':
        // Rep can only see their own deals
        return {
          filterExpression: 'dealOwner = :userId',
          expressionAttributeValues: {
            ':userId': user.userId
          }
        };

      default:
        // No access
        return {
          filterExpression: 'dealOwner = :noAccess',
          expressionAttributeValues: {
            ':noAccess': 'NO_ACCESS'
          }
        };
    }
  }

  /**
   * Combine tenant filter and role filter
   */
  private combineFilters(tenantFilter: DealAccessFilter, roleFilter: DealAccessFilter): DealAccessFilter {
    if (!roleFilter.filterExpression) {
      // Admin case - only tenant filter applies
      return tenantFilter;
    }

    return {
      filterExpression: `(${tenantFilter.filterExpression}) AND (${roleFilter.filterExpression})`,
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
export const dealsRBACService = new DealsRBACService();
