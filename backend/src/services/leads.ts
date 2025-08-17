import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand, QueryCommand, DeleteCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { docClient, TABLES } from '../services/dynamoClient';
import { leadsRBACService, RBACUser } from './leadsRBAC';

// Lead interface based on AddNewModal fields + auditing
export interface Lead {
  id: string;
  // Required fields from AddNewModal
  leadOwner: string;
  firstName: string;
  lastName: string;
  company: string;
  email: string;
  leadSource: string;
  leadStatus: string;
  
  // Optional fields from AddNewModal
  phone?: string;
  title?: string;
  
  // Address fields
  street?: string;
  area?: string;
  city?: string;
  state?: string;
  country?: string;
  zipCode?: string;
  
  // Additional fields
  description?: string;
  value?: number;
  notes?: string;
  relatedProductIds?: string[]; // Array of product IDs related to this lead
  
  // Auditing fields
  createdBy: string;
  createdAt: string;
  updatedBy: string;
  updatedAt: string;
  deletedBy?: string;
  isDeleted: boolean;
  deletedAt?: string;
  userId: string;
  tenantId: string;
}

export interface CreateLeadInput {
  leadOwner: string;
  firstName: string;
  lastName: string;
  company: string;
  email: string; // Required field
  leadSource: string;
  leadStatus: string;
  phone: string; // Required for contacting the lead
  title?: string;
  street?: string;
  area?: string;
  city?: string;
  state?: string;
  country?: string;
  zipCode?: string;
  description?: string;
  value?: number;
  notes?: string;
  relatedProductIds?: string[]; // Array of product IDs related to this lead
}

export interface UpdateLeadInput {
  leadOwner?: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  email?: string;
  leadSource?: string;
  leadStatus?: string;
  phone?: string;
  title?: string;
  street?: string;
  area?: string;
  city?: string;
  state?: string;
  country?: string;
  zipCode?: string;
  description?: string;
  value?: number;
  notes?: string;
  relatedProductIds?: string[]; // Array of product IDs related to this lead
}

export class LeadsService {
  private tableName = TABLES.LEADS;

  // Create a new lead
  async createLead(input: CreateLeadInput, userId: string, userEmail: string, tenantId: string): Promise<Lead> {
    const timestamp = new Date().toISOString();
    const leadId = uuidv4();

    console.log('🔍 [LeadsService.createLead] Input received:', input);
    console.log('🔍 [LeadsService.createLead] relatedProductIds from input:', input.relatedProductIds);
    console.log('🔍 [LeadsService.createLead] relatedProductIds type:', typeof input.relatedProductIds);
    console.log('🔍 [LeadsService.createLead] relatedProductIds length:', input.relatedProductIds?.length);

    const lead: Lead = {
      id: leadId,
      leadOwner: input.leadOwner,
      firstName: input.firstName,
      lastName: input.lastName,
      company: input.company,
      email: input.email, // Required field - no fallback needed
      leadSource: input.leadSource,
      leadStatus: input.leadStatus,
      phone: input.phone || '', // Handle required phone field
      title: input.title,
      street: input.street,
      area: input.area,
      city: input.city,
      state: input.state,
      country: input.country,
      zipCode: input.zipCode,
      description: input.description,
      value: input.value || 0,
      notes: input.notes || '',
      relatedProductIds: input.relatedProductIds || [], // Initialize related products array
      createdBy: userEmail,
      createdAt: timestamp,
      updatedBy: userEmail,
      updatedAt: timestamp,
      isDeleted: false,
      userId,
      tenantId
    };

    console.log('🔍 [LeadsService.createLead] Lead object being saved:', lead);
    console.log('🔍 [LeadsService.createLead] relatedProductIds in lead object:', lead.relatedProductIds);

    await docClient.send(new PutCommand({
      TableName: this.tableName,
      Item: lead,
      ConditionExpression: 'attribute_not_exists(id)'
    }));

    console.log('✅ [LeadsService.createLead] Lead saved to database successfully');
    console.log('✅ [LeadsService.createLead] Final lead object:', lead);

    return lead;
  }

  // Get lead by ID (with tenant and visibility check)
  async getLeadById(id: string, tenantId: string, userId: string): Promise<Lead | null> {
    const result = await docClient.send(new GetCommand({
      TableName: this.tableName,
      Key: { id }
    }));

    if (!result.Item || 
        result.Item.tenantId !== tenantId || 
        result.Item.isDeleted ||
        (result.Item.userId !== userId)) {
      return null;
    }

    return result.Item as Lead;
  }

  // Get leads by tenant
  async getLeadsByTenant(tenantId: string, userId: string, includeDeleted = false): Promise<Lead[]> {
    const result = await docClient.send(new ScanCommand({
      TableName: this.tableName,
      FilterExpression: includeDeleted 
        ? 'tenantId = :tenantId'
        : 'tenantId = :tenantId AND isDeleted = :isDeleted',
      ExpressionAttributeValues: {
        ':tenantId': tenantId,
        ...(includeDeleted ? {} : { ':isDeleted': false })
      }
    }));

    return (result.Items || []) as Lead[];
  }

  // RBAC-aware method: Get leads for user based on role and permissions
  async getLeadsForUser(user: RBACUser, includeDeleted = false): Promise<Lead[]> {
    console.log(`🔐 [LeadsService.getLeadsForUser] Getting leads for user: ${user.email} (${user.role})`);
    return leadsRBACService.getLeadsForUser(user, includeDeleted);
  }

  // RBAC-aware method: Get lead by ID with role-based access control
  async getLeadByIdForUser(id: string, user: RBACUser): Promise<Lead | null> {
    console.log(`🔐 [LeadsService.getLeadByIdForUser] Getting lead ${id} for user: ${user.email} (${user.role})`);
    return leadsRBACService.getLeadByIdForUser(id, user);
  }

  // Get leads by owner
  async getLeadsByOwner(leadOwner: string, tenantId: string, userId: string): Promise<Lead[]> {
    const result = await docClient.send(new ScanCommand({
      TableName: this.tableName,
      FilterExpression: 'leadOwner = :leadOwner AND tenantId = :tenantId AND isDeleted = :isDeleted',
      ExpressionAttributeValues: {
        ':leadOwner': leadOwner,
        ':tenantId': tenantId,
        ':isDeleted': false
      }
    }));

    return (result.Items || []) as Lead[];
  }

  // RBAC-aware method: Get leads by owner with role-based access control
  async getLeadsByOwnerForUser(leadOwner: string, user: RBACUser): Promise<Lead[]> {
    console.log(`🔐 [LeadsService.getLeadsByOwnerForUser] Getting leads for owner ${leadOwner} by user: ${user.email} (${user.role})`);
    return leadsRBACService.getLeadsByOwnerForUser(leadOwner, user);
  }

  // Get lead by email (returns first match - multiple leads can have the same email)
  async getLeadByEmail(email: string, tenantId: string, userId?: string): Promise<Lead | null> {
    const result = await docClient.send(new ScanCommand({
      TableName: this.tableName,
      FilterExpression: 'email = :email AND tenantId = :tenantId AND isDeleted = :isDeleted',
      ExpressionAttributeValues: {
        ':email': email,
        ':tenantId': tenantId,
        ':isDeleted': false
      }
    }));

    const leads = result.Items || [];
    return leads.length > 0 ? leads[0] as Lead : null;
  }

  // Get all leads by email (useful when multiple leads can have the same email)
  async getAllLeadsByEmail(email: string, tenantId: string, userId?: string): Promise<Lead[]> {
    const result = await docClient.send(new ScanCommand({
      TableName: this.tableName,
      FilterExpression: 'email = :email AND tenantId = :tenantId AND isDeleted = :isDeleted',
      ExpressionAttributeValues: {
        ':email': email,
        ':tenantId': tenantId,
        ':isDeleted': false
      }
    }));

    return (result.Items || []) as Lead[];
  }

  // Update lead
  async updateLead(id: string, input: UpdateLeadInput, userId: string, userEmail: string, tenantId: string): Promise<Lead | null> {
    console.log(`🔍 [updateLead] Starting update for lead ${id}`);
    console.log(`🔍 [updateLead] Input:`, input);
    
    // First check if lead exists and belongs to tenant
    const existingLead = await this.getLeadById(id, tenantId, userId);
    if (!existingLead) {
      console.log(`❌ [updateLead] Lead not found or access denied`);
      return null;
    }

    console.log(`🔍 [updateLead] Existing lead:`, existingLead);

    const timestamp = new Date().toISOString();
    
    // Build update expression dynamically
    const updateExpressions: string[] = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, any> = {
      ':updatedBy': userEmail,
      ':updatedAt': timestamp
    };

    // Add fields to update if they are provided
    Object.entries(input).forEach(([key, value]) => {
      if (value !== undefined) {
        updateExpressions.push(`#${key} = :${key}`);
        expressionAttributeNames[`#${key}`] = key;
        expressionAttributeValues[`:${key}`] = value;
        console.log(`🔍 [updateLead] Adding field ${key} = ${value}`);
      }
    });

    // Always update audit fields
    updateExpressions.push('updatedBy = :updatedBy', 'updatedAt = :updatedAt');

    const updateExpression = `SET ${updateExpressions.join(', ')}`;
    console.log(`🔍 [updateLead] Update expression:`, updateExpression);
    console.log(`🔍 [updateLead] Expression attribute names:`, expressionAttributeNames);
    console.log(`🔍 [updateLead] Expression attribute values:`, expressionAttributeValues);

    const result = await docClient.send(new UpdateCommand({
      TableName: this.tableName,
      Key: { id },
      UpdateExpression: updateExpression,
      ExpressionAttributeNames: Object.keys(expressionAttributeNames).length > 0 ? expressionAttributeNames : undefined,
      ConditionExpression: 'tenantId = :tenantId AND isDeleted = :isDeleted',
      ExpressionAttributeValues: {
        ...expressionAttributeValues,
        ':tenantId': tenantId,
        ':isDeleted': false
      },
      ReturnValues: 'ALL_NEW'
    }));

    console.log(`🔍 [updateLead] DynamoDB result:`, result.Attributes);
    return result.Attributes as Lead;
  }

  // Soft delete lead
  async deleteLead(id: string, userId: string, userEmail: string, tenantId: string): Promise<boolean> {
    const timestamp = new Date().toISOString();

    try {
      await docClient.send(new UpdateCommand({
        TableName: this.tableName,
        Key: { id },
        UpdateExpression: 'SET isDeleted = :isDeleted, deletedBy = :deletedBy, deletedAt = :deletedAt, updatedBy = :updatedBy, updatedAt = :updatedAt',
        ConditionExpression: 'tenantId = :tenantId AND isDeleted = :currentDeleted',
        ExpressionAttributeValues: {
          ':isDeleted': true,
          ':deletedBy': userEmail,
          ':deletedAt': timestamp,
          ':updatedBy': userEmail,
          ':updatedAt': timestamp,
          ':tenantId': tenantId,
          ':currentDeleted': false
        }
      }));

      return true;
    } catch (error: any) {
      if (error.name === 'ConditionalCheckFailedException') {
        return false; // Lead not found or already deleted
      }
      throw error;
    }
  }

  // Restore soft deleted lead
  async restoreLead(id: string, userId: string, userEmail: string, tenantId: string): Promise<boolean> {
    const timestamp = new Date().toISOString();

    try {
      await docClient.send(new UpdateCommand({
        TableName: this.tableName,
        Key: { id },
        UpdateExpression: 'SET isDeleted = :isDeleted, updatedBy = :updatedBy, updatedAt = :updatedAt REMOVE deletedBy, deletedAt',
        ConditionExpression: 'tenantId = :tenantId AND isDeleted = :currentDeleted',
        ExpressionAttributeValues: {
          ':isDeleted': false,
          ':updatedBy': userEmail,
          ':updatedAt': timestamp,
          ':tenantId': tenantId,
          ':currentDeleted': true
        }
      }));

      return true;
    } catch (error: any) {
      if (error.name === 'ConditionalCheckFailedException') {
        return false; // Lead not found or not deleted
      }
      throw error;
    }
  }

  // Hard delete lead (permanent)
  async hardDeleteLead(id: string, tenantId: string): Promise<boolean> {
    try {
      // First check if lead exists and belongs to tenant
      const existingLead = await this.getLeadById(id, tenantId, '');
      if (!existingLead) {
        return false;
      }

      await docClient.send(new DeleteCommand({
        TableName: this.tableName,
        Key: { id }
      }));

      return true;
    } catch (error) {
      throw error;
    }
  }

  // Search leads by various criteria
  async searchLeads(tenantId: string, userId: string, searchTerm: string): Promise<Lead[]> {
    const result = await docClient.send(new ScanCommand({
      TableName: this.tableName,
      FilterExpression: 'tenantId = :tenantId AND isDeleted = :isDeleted AND (contains(firstName, :searchTerm) OR contains(lastName, :searchTerm) OR contains(company, :searchTerm) OR contains(email, :searchTerm))',
      ExpressionAttributeValues: {
        ':tenantId': tenantId,
        ':isDeleted': false,
        ':searchTerm': searchTerm
      }
    }));

    return (result.Items || []) as Lead[];
  }

  // RBAC-aware method: Search leads with role-based access control
  async searchLeadsForUser(user: RBACUser, searchTerm: string): Promise<Lead[]> {
    console.log(`🔐 [LeadsService.searchLeadsForUser] Searching leads for term "${searchTerm}" by user: ${user.email} (${user.role})`);
    return leadsRBACService.searchLeadsForUser(user, searchTerm);
  }

  // Get leads stats for analytics
  async getLeadsStats(tenantId: string, userId: string): Promise<{
    total: number;
    byStatus: Record<string, number>;
    bySource: Record<string, number>;
    totalValue: number;
    avgValue: number;
    recentCount: number;
  }> {
    const result = await docClient.send(new ScanCommand({
      TableName: this.tableName,
      FilterExpression: 'tenantId = :tenantId AND isDeleted = :isDeleted',
      ExpressionAttributeValues: {
        ':tenantId': tenantId,
        ':isDeleted': false
      }
    }));

    const leads = result.Items || [];
    
    // Calculate statistics
    const byStatus: Record<string, number> = {};
    const bySource: Record<string, number> = {};
    let totalValue = 0;
    let recentCount = 0;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    leads.forEach(lead => {
      // Count by status
      byStatus[lead.leadStatus] = (byStatus[lead.leadStatus] || 0) + 1;

      // Count by source
      bySource[lead.leadSource] = (bySource[lead.leadSource] || 0) + 1;
      
      // Sum total value
      totalValue += lead.value || 0;
      
      // Count recent leads
      if (new Date(lead.createdAt) >= thirtyDaysAgo) {
        recentCount++;
      }
    });

    return {
      total: leads.length,
      byStatus,
      bySource,
      totalValue,
      avgValue: leads.length > 0 ? totalValue / leads.length : 0,
      recentCount
    };
  }
}

// Export singleton instance
export const leadsService = new LeadsService();
