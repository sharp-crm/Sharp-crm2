import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, TABLES } from './dynamoClient';
import { Lead } from './leads';

export interface RBACUser {
  userId: string;
  email: string;
  role: 'ADMIN' | 'SALES_MANAGER' | 'SALES_REP';
  tenantId: string;
  reportingTo?: string;
}

export interface LeadAccessFilter {
  filterExpression: string | undefined;
  expressionAttributeValues: Record<string, any>;
  expressionAttributeNames?: Record<string, string>;
}

export class LeadsRBACService {
  private tableName = TABLES.LEADS;

  /**
   * Get all leads accessible by a user based on their role and tenant
   */
  async getLeadsForUser(user: RBACUser, includeDeleted = false): Promise<Lead[]> {
    console.log(`🔐 [LeadsRBACService] Getting leads for user: ${user.email} (${user.role}) in tenant: ${user.tenantId}`);
    
    try {
      // First ensure tenant-based segregation
      const tenantFilter = this.buildTenantFilter(user.tenantId, includeDeleted);
      
      // Then build role-based access filter
      const roleFilter = await this.buildRoleBasedFilter(user);
      
      // Combine filters
      const combinedFilter = this.combineFilters(tenantFilter, roleFilter);
      
      console.log(`🔐 [LeadsRBACService] Filter expression: ${combinedFilter.filterExpression}`);
      console.log(`🔐 [LeadsRBACService] Expression values:`, combinedFilter.expressionAttributeValues);
      console.log(`🔐 [LeadsRBACService] Expression names:`, combinedFilter.expressionAttributeNames);
      
      // Use TenantIndex GSI for efficient tenant-based queries, then apply role-based filtering
      // Assumption: TenantIndex exists with tenantId as partition key
      // Note: tenantId is the partition key in TenantIndex, so it goes in KeyConditionExpression
      const queryParams: any = {
        TableName: this.tableName,
        IndexName: 'TenantIndex',
        KeyConditionExpression: 'tenantId = :tenantId',
        ExpressionAttributeValues: {
          ':tenantId': user.tenantId,
          ...combinedFilter.expressionAttributeValues
        }
      };
      
      // Only add FilterExpression if it exists
      if (combinedFilter.filterExpression) {
        queryParams.FilterExpression = combinedFilter.filterExpression;
      }
      
      // Only add ExpressionAttributeNames if it exists and has properties
      if (combinedFilter.expressionAttributeNames && Object.keys(combinedFilter.expressionAttributeNames).length > 0) {
        queryParams.ExpressionAttributeNames = combinedFilter.expressionAttributeNames;
      }
      
      const result = await docClient.send(new QueryCommand(queryParams));

      const leads = (result.Items || []) as Lead[];
      console.log(`🔐 [LeadsRBACService] Retrieved ${leads.length} leads for user ${user.email}`);
      
      return leads;
    } catch (error) {
      console.error(`🔐 [LeadsRBACService] Error getting leads for user ${user.email}:`, error);
      throw error;
    }
  }

  /**
   * Get a specific lead by ID if the user has access to it
   */
  async getLeadByIdForUser(leadId: string, user: RBACUser): Promise<Lead | null> {
    console.log(`🔐 [LeadsRBACService] Getting lead ${leadId} for user: ${user.email} (${user.role})`);
    
    // First get the lead
    const result = await docClient.send(new QueryCommand({
      TableName: this.tableName,
      KeyConditionExpression: 'id = :id',
      ExpressionAttributeValues: {
        ':id': leadId
      }
    }));

    if (!result.Items || result.Items.length === 0) {
      console.log(`🔐 [LeadsRBACService] Lead ${leadId} not found`);
      return null;
    }

    const lead = result.Items[0] as Lead;
    
    // Check if user has access to this lead
    const hasAccess = await this.canUserAccessLead(lead, user);
    
    if (!hasAccess) {
      console.log(`🔐 [LeadsRBACService] User ${user.email} does not have access to lead ${leadId}`);
      return null;
    }

    console.log(`🔐 [LeadsRBACService] User ${user.email} has access to lead ${leadId}`);
    return lead;
  }

  /**
   * Get leads by owner with RBAC filtering
   */
  async getLeadsByOwnerForUser(leadOwner: string, user: RBACUser): Promise<Lead[]> {
    console.log(`🔐 [LeadsRBACService] Getting leads for owner ${leadOwner}, requested by user: ${user.email} (${user.role})`);
    
    // Check if user can access leads owned by the specified owner
    const canAccessOwner = await this.canUserAccessLeadsFromOwner(leadOwner, user);
    
    if (!canAccessOwner) {
      console.log(`🔐 [LeadsRBACService] User ${user.email} cannot access leads from owner ${leadOwner}`);
      return [];
    }

    // Query by leadOwner using the GSI
    const result = await docClient.send(new QueryCommand({
      TableName: this.tableName,
      IndexName: 'LeadOwnerIndex',
      KeyConditionExpression: 'leadOwner = :leadOwner',
      FilterExpression: 'tenantId = :tenantId AND isDeleted = :isDeleted',
      ExpressionAttributeValues: {
        ':leadOwner': leadOwner,
        ':tenantId': user.tenantId,
        ':isDeleted': false
      }
    }));

    const leads = (result.Items || []) as Lead[];
    console.log(`🔐 [LeadsRBACService] Retrieved ${leads.length} leads for owner ${leadOwner}`);
    
    return leads;
  }

  /**
   * Search leads with RBAC filtering
   */
  async searchLeadsForUser(user: RBACUser, searchTerm: string): Promise<Lead[]> {
    console.log(`🔐 [LeadsRBACService] Searching leads for term "${searchTerm}" by user: ${user.email} (${user.role})`);
    
    // Get all accessible leads first
    const accessibleLeads = await this.getLeadsForUser(user, false);
    
    // Filter by search term (search in firstName, lastName, company, email)
    const searchResults = accessibleLeads.filter(lead => {
      const searchLower = searchTerm.toLowerCase();
      return (
        lead.firstName?.toLowerCase().includes(searchLower) ||
        lead.lastName?.toLowerCase().includes(searchLower) ||
        lead.company?.toLowerCase().includes(searchLower) ||
        lead.email?.toLowerCase().includes(searchLower)
      );
    });

    console.log(`🔐 [LeadsRBACService] Found ${searchResults.length} leads matching search term "${searchTerm}"`);
    return searchResults;
  }

  /**
   * Check if user can access a specific lead
   */
  private async canUserAccessLead(lead: Lead, user: RBACUser): Promise<boolean> {
    // Tenant segregation - first and most important check
    if (lead.tenantId !== user.tenantId) {
      console.log(`🔐 [LeadsRBACService] Tenant mismatch: lead.tenantId=${lead.tenantId}, user.tenantId=${user.tenantId}`);
      return false;
    }

    // Soft delete check
    if (lead.isDeleted) {
      console.log(`🔐 [LeadsRBACService] Lead ${lead.id} is soft deleted`);
      return false;
    }

    switch (user.role) {
      case 'ADMIN':
        // Admin can see all leads in their tenant
        return true;

      case 'SALES_MANAGER':
        // Manager can see their own leads + leads from subordinates
        if (lead.leadOwner === user.userId) {
          return true;
        }
        
        // Check if lead owner is a subordinate
        const subordinates = await this.getSubordinates(user.userId, user.tenantId);
        return subordinates.includes(lead.leadOwner);

      case 'SALES_REP':
        // Rep can only see leads they own
        return lead.leadOwner === user.userId;

      default:
        return false;
    }
  }

  /**
   * Check if user can access leads from a specific owner
   */
  private async canUserAccessLeadsFromOwner(ownerId: string, user: RBACUser): Promise<boolean> {
    switch (user.role) {
      case 'ADMIN':
        // Admin can access leads from any owner in their tenant
        return true;

      case 'SALES_MANAGER':
        // Manager can access their own leads + leads from subordinates
        if (ownerId === user.userId) {
          return true;
        }
        
        const subordinates = await this.getSubordinates(user.userId, user.tenantId);
        return subordinates.includes(ownerId);

      case 'SALES_REP':
        // Rep can only access their own leads
        return ownerId === user.userId;

      default:
        return false;
    }
  }

  /**
   * Get all subordinates (sales reps) that report to a manager
   * Now using ReportingToIndex GSI for efficient reporting hierarchy queries
   * Assumption: ReportingToIndex exists with reportingTo as partition key
   */
  private async getSubordinates(managerId: string, tenantId: string): Promise<string[]> {
    try {
      const result = await docClient.send(new QueryCommand({
        TableName: TABLES.USERS,
        IndexName: 'ReportingToIndex',
        KeyConditionExpression: 'reportingTo = :managerId',
        FilterExpression: '#role = :role AND tenantId = :tenantId AND isDeleted = :isDeleted',
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
      console.log(`🔐 [LeadsRBACService] Manager ${managerId} has ${subordinateIds.length} subordinates: ${subordinateIds.join(', ')}`);
      
      return subordinateIds;
    } catch (error) {
      console.error(`🔐 [LeadsRBACService] Error getting subordinates for manager ${managerId}:`, error);
      return [];
    }
  }

  /**
   * Build tenant-based filter (always applied first)
   * Note: tenantId is handled in KeyConditionExpression when using TenantIndex GSI
   */
  private buildTenantFilter(tenantId: string, includeDeleted: boolean): LeadAccessFilter {
    return {
      filterExpression: includeDeleted 
        ? undefined
        : 'isDeleted = :isDeleted',
      expressionAttributeValues: {
        ...(includeDeleted ? {} : { ':isDeleted': false })
      }
    };
  }

  /**
   * Build role-based access filter
   */
  private async buildRoleBasedFilter(user: RBACUser): Promise<LeadAccessFilter> {
    switch (user.role) {
      case 'ADMIN':
        // Admin can see all leads in tenant (no additional filter needed)
        return {
          filterExpression: '',
          expressionAttributeValues: {}
        };

      case 'SALES_MANAGER':
        // Manager can see their own leads + subordinates' leads
        const subordinates = await this.getSubordinates(user.userId, user.tenantId);
        const allAccessibleOwners = [user.userId, ...subordinates];
        
        if (allAccessibleOwners.length === 1) {
          return {
            filterExpression: 'leadOwner = :userId',
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
            filterExpression: `leadOwner IN (${placeholders})`,
            expressionAttributeValues
          };
        }

      case 'SALES_REP':
        // Rep can only see their own leads
        return {
          filterExpression: 'leadOwner = :userId',
          expressionAttributeValues: {
            ':userId': user.userId
          }
        };

      default:
        // No access
        return {
          filterExpression: 'leadOwner = :noAccess',
          expressionAttributeValues: {
            ':noAccess': 'NO_ACCESS'
          }
        };
    }
  }

  /**
   * Combine tenant filter and role filter
   */
  private combineFilters(tenantFilter: LeadAccessFilter, roleFilter: LeadAccessFilter): LeadAccessFilter {
    // If no role filter, return tenant filter (or empty if no tenant filter)
    if (!roleFilter.filterExpression) {
      return tenantFilter;
    }

    // If no tenant filter, return role filter
    if (!tenantFilter.filterExpression) {
      return roleFilter;
    }

    // Combine both filters
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
export const leadsRBACService = new LeadsRBACService();
