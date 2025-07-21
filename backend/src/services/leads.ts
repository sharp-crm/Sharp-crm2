import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand, QueryCommand, DeleteCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { docClient, TABLES } from '../services/dynamoClient';

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
  visibleTo?: string[]; // Array of user IDs who can view this lead
  
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
  email: string;
  leadSource: string;
  leadStatus: string;
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
  visibleTo?: string[]; // Array of user IDs who can view this lead
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
  visibleTo?: string[]; // Array of user IDs who can view this lead
}

export class LeadsService {
  private tableName = TABLES.LEADS;

  // Create a new lead
  async createLead(input: CreateLeadInput, userId: string, userEmail: string, tenantId: string): Promise<Lead> {
    const timestamp = new Date().toISOString();
    const leadId = uuidv4();

    const lead: Lead = {
      id: leadId,
      leadOwner: input.leadOwner,
      firstName: input.firstName,
      lastName: input.lastName,
      company: input.company,
      email: input.email,
      leadSource: input.leadSource,
      leadStatus: input.leadStatus,
      phone: input.phone,
      title: input.title,
      street: input.street,
      area: input.area,
      city: input.city,
      state: input.state,
      country: input.country,
      zipCode: input.zipCode,
      description: input.description,
      value: input.value || 0,
      visibleTo: input.visibleTo || [], // Initialize visibility array
      createdBy: userEmail,
      createdAt: timestamp,
      updatedBy: userEmail,
      updatedAt: timestamp,
      isDeleted: false,
      userId,
      tenantId
    };

    await docClient.send(new PutCommand({
      TableName: this.tableName,
      Item: lead,
      ConditionExpression: 'attribute_not_exists(id)'
    }));

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
        (result.Item.visibleTo && 
         result.Item.visibleTo.length > 0 && 
         !result.Item.visibleTo.includes(userId) && 
         result.Item.userId !== userId)) {
      return null;
    }

    return result.Item as Lead;
  }

  // Get all leads for a tenant (excluding soft deleted)
  async getLeadsByTenant(tenantId: string, userId: string, includeDeleted = false): Promise<Lead[]> {
    console.log('🔍 getLeadsByTenant called with:', { tenantId, userId, includeDeleted });
    
    // Use ScanCommand instead of QueryCommand since TenantIdIndex doesn't exist
    const result = await docClient.send(new ScanCommand({
      TableName: this.tableName,
      FilterExpression: includeDeleted 
        ? 'tenantId = :tenantId AND (attribute_not_exists(visibleTo) OR size(visibleTo) = :zero OR contains(visibleTo, :userId) OR userId = :userId)'
        : 'tenantId = :tenantId AND isDeleted = :isDeleted AND (attribute_not_exists(visibleTo) OR size(visibleTo) = :zero OR contains(visibleTo, :userId) OR userId = :userId)',
      ExpressionAttributeValues: {
        ':tenantId': tenantId,
        ':userId': userId,
        ':zero': 0,
        ...(includeDeleted ? {} : { ':isDeleted': false })
      }
    }));

    console.log('📊 Raw DynamoDB result:', result.Items?.length, 'items');
    console.log('📋 Items:', result.Items?.map(item => ({
      id: item.id,
      firstName: item.firstName,
      visibleTo: item.visibleTo,
      userId: item.userId,
      createdBy: item.createdBy
    })));

    return (result.Items || []) as Lead[];
  }

  // Get leads by owner
  async getLeadsByOwner(leadOwner: string, tenantId: string, userId: string): Promise<Lead[]> {
    const result = await docClient.send(new ScanCommand({
      TableName: this.tableName,
      FilterExpression: 'leadOwner = :leadOwner AND tenantId = :tenantId AND isDeleted = :isDeleted AND (attribute_not_exists(visibleTo) OR size(visibleTo) = :zero OR contains(visibleTo, :userId) OR userId = :userId)',
      ExpressionAttributeValues: {
        ':leadOwner': leadOwner,
        ':tenantId': tenantId,
        ':userId': userId,
        ':zero': 0,
        ':isDeleted': false
      }
    }));

    return (result.Items || []) as Lead[];
  }

  // Get lead by email
  async getLeadByEmail(email: string, tenantId: string, userId?: string): Promise<Lead | null> {
    const result = await docClient.send(new ScanCommand({
      TableName: this.tableName,
      FilterExpression: userId 
        ? 'email = :email AND tenantId = :tenantId AND isDeleted = :isDeleted AND (attribute_not_exists(visibleTo) OR size(visibleTo) = :zero OR contains(visibleTo, :userId) OR userId = :userId)'
        : 'email = :email AND tenantId = :tenantId AND isDeleted = :isDeleted',
      ExpressionAttributeValues: {
        ':email': email,
        ':tenantId': tenantId,
        ':isDeleted': false,
        ...(userId ? { ':userId': userId, ':zero': 0 } : {})
      }
    }));

    const leads = result.Items || [];
    return leads.length > 0 ? leads[0] as Lead : null;
  }

  // Update lead
  async updateLead(id: string, input: UpdateLeadInput, userId: string, userEmail: string, tenantId: string): Promise<Lead | null> {
    // First check if lead exists and belongs to tenant
    const existingLead = await this.getLeadById(id, tenantId, userId);
    if (!existingLead) {
      return null;
    }

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
      }
    });

    // Always update audit fields
    updateExpressions.push('updatedBy = :updatedBy', 'updatedAt = :updatedAt');

    const updateExpression = `SET ${updateExpressions.join(', ')}`;

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
      FilterExpression: 'tenantId = :tenantId AND isDeleted = :isDeleted AND (attribute_not_exists(visibleTo) OR size(visibleTo) = :zero OR contains(visibleTo, :userId) OR userId = :userId) AND (contains(firstName, :searchTerm) OR contains(lastName, :searchTerm) OR contains(company, :searchTerm) OR contains(email, :searchTerm))',
      ExpressionAttributeValues: {
        ':tenantId': tenantId,
        ':userId': userId,
        ':zero': 0,
        ':isDeleted': false,
        ':searchTerm': searchTerm
      }
    }));

    return (result.Items || []) as Lead[];
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
      FilterExpression: 'tenantId = :tenantId AND isDeleted = :isDeleted AND (attribute_not_exists(visibleTo) OR size(visibleTo) = :zero OR contains(visibleTo, :userId) OR userId = :userId)',
      ExpressionAttributeValues: {
        ':tenantId': tenantId,
        ':userId': userId,
        ':zero': 0,
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
