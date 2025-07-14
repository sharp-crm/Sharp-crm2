import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand, QueryCommand, DeleteCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { docClient } from '../services/dynamoClient';

// Deal interface based on AddNewModal fields + auditing
export interface Deal {
  id: string;
  // Required fields from AddNewModal
  dealOwner: string;
  dealName: string;
  leadSource: string;
  stage: string;
  amount: number;
  
  // Optional fields from AddNewModal  
  description?: string;
  
  // Additional fields for deal functionality
  value?: number; // same as amount for backward compatibility
  probability?: number;
  closeDate?: string;
  
  // Visibility field
  visibleTo: string[]; // Making this required but can be empty array
  
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

export interface CreateDealInput {
  dealOwner: string;
  dealName: string;
  leadSource: string;
  stage: string;
  amount: number;
  description?: string;
  probability?: number;
  closeDate?: string;
  visibleTo?: string[];
}

export interface UpdateDealInput {
  dealOwner?: string;
  dealName?: string;
  leadSource?: string;
  stage?: string;
  amount?: number;
  description?: string;
  probability?: number;
  closeDate?: string;
  visibleTo?: string[];
}

export class DealsService {
  private tableName = 'Deals';

  // Create a new deal
  async createDeal(input: CreateDealInput, userId: string, userEmail: string, tenantId: string): Promise<Deal> {
    console.log('📝 Creating deal with input:', { ...input, userId, tenantId });
    
    const timestamp = new Date().toISOString();
    const dealId = uuidv4();

    // Ensure numeric fields are numbers and not strings
    const amount = Number(input.amount) || 0;
    const probability = input.probability !== undefined ? Number(input.probability) : this.getDefaultProbability(input.stage);

    // Validate amount is a number
    if (isNaN(amount)) {
      throw new Error('Amount must be a valid number');
    }

    // Validate probability is a number between 0 and 100
    if (probability !== undefined && (isNaN(probability) || probability < 0 || probability > 100)) {
      throw new Error('Probability must be a number between 0 and 100');
    }

    // Ensure visibleTo is an array
    const visibleTo = Array.isArray(input.visibleTo) ? input.visibleTo : (input.visibleTo ? [input.visibleTo] : []);

    // Create deal object with required fields
    const deal: Deal = {
      id: dealId,
      dealOwner: input.dealOwner,
      dealName: input.dealName,
      leadSource: input.leadSource,
      stage: input.stage,
      amount: amount,
      value: amount,
      probability: probability,
      description: input.description || '',
      closeDate: input.closeDate || this.getDefaultCloseDate(),
      visibleTo: visibleTo,
      createdBy: userEmail,
      createdAt: timestamp,
      updatedBy: userEmail,
      updatedAt: timestamp,
      isDeleted: false,
      userId,
      tenantId
    };

    console.log('💾 Saving deal:', JSON.stringify(deal, null, 2));

    try {
      await docClient.send(new PutCommand({
        TableName: this.tableName,
        Item: deal,
        ConditionExpression: 'attribute_not_exists(id)'
      }));

      return deal;
    } catch (error) {
      console.error('Error saving deal:', error);
      throw error;
    }
  }

  // Get default probability based on stage
  private getDefaultProbability(stage: string): number {
    switch (stage) {
      case 'Need Analysis': return 10;
      case 'Value Proposition': return 25;
      case 'Identify Decision Makers': return 50;
      case 'Negotiation/Review': return 75;
      case 'Closed Won': return 100;
      case 'Closed Lost': return 0;
      case 'Closed Lost to Competition': return 0;
      default: return 25;
    }
  }

  // Get default close date (30 days from now)
  private getDefaultCloseDate(): string {
    const date = new Date();
    date.setDate(date.getDate() + 30);
    return date.toISOString().split('T')[0];
  }

  // Get deal by ID (with tenant, visibility and soft delete check)
  async getDealById(id: string, tenantId: string, userId: string): Promise<Deal | null> {
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

    return result.Item as Deal;
  }

  // Get all deals for a tenant (excluding soft deleted)
  async getDealsByTenant(tenantId: string, userId: string, includeDeleted = false): Promise<Deal[]> {
    console.log('🔍 Getting deals by tenant:', { tenantId, userId, includeDeleted });
    
    const result = await docClient.send(new QueryCommand({
      TableName: this.tableName,
      IndexName: 'TenantIdIndex',
      KeyConditionExpression: 'tenantId = :tenantId',
      FilterExpression: includeDeleted 
        ? '(attribute_not_exists(visibleTo) OR size(visibleTo) = :zero OR contains(visibleTo, :userId) OR userId = :userId)'
        : 'isDeleted = :isDeleted AND (attribute_not_exists(visibleTo) OR size(visibleTo) = :zero OR contains(visibleTo, :userId) OR userId = :userId)',
      ExpressionAttributeValues: {
        ':tenantId': tenantId,
        ':userId': userId,
        ':zero': 0,
        ...(includeDeleted ? {} : { ':isDeleted': false })
      }
    }));

    console.log('📊 Found deals:', result.Items?.length);
    return (result.Items || []) as Deal[];
  }

  // Get deals by owner
  async getDealsByOwner(dealOwner: string, tenantId: string, userId: string): Promise<Deal[]> {
    const result = await docClient.send(new QueryCommand({
      TableName: this.tableName,
      IndexName: 'DealOwnerIndex',
      KeyConditionExpression: 'dealOwner = :dealOwner',
      FilterExpression: 'tenantId = :tenantId AND isDeleted = :isDeleted AND (attribute_not_exists(visibleTo) OR size(visibleTo) = :zero OR contains(visibleTo, :userId) OR userId = :userId)',
      ExpressionAttributeValues: {
        ':dealOwner': dealOwner,
        ':tenantId': tenantId,
        ':userId': userId,
        ':zero': 0,
        ':isDeleted': false
      }
    }));

    return (result.Items || []) as Deal[];
  }

  // Get deals by stage
  async getDealsByStage(stage: string, tenantId: string, userId: string): Promise<Deal[]> {
    const result = await docClient.send(new QueryCommand({
      TableName: this.tableName,
      IndexName: 'StageIndex',
      KeyConditionExpression: 'stage = :stage',
      FilterExpression: 'tenantId = :tenantId AND isDeleted = :isDeleted AND (attribute_not_exists(visibleTo) OR size(visibleTo) = :zero OR contains(visibleTo, :userId) OR userId = :userId)',
      ExpressionAttributeValues: {
        ':stage': stage,
        ':tenantId': tenantId,
        ':userId': userId,
        ':zero': 0,
        ':isDeleted': false
      }
    }));

    return (result.Items || []) as Deal[];
  }

  // Search deals
  async searchDeals(tenantId: string, userId: string, query: string): Promise<Deal[]> {
    const result = await docClient.send(new QueryCommand({
      TableName: this.tableName,
      IndexName: 'TenantIdIndex',
      KeyConditionExpression: 'tenantId = :tenantId',
      FilterExpression: 'isDeleted = :isDeleted AND (attribute_not_exists(visibleTo) OR size(visibleTo) = :zero OR contains(visibleTo, :userId) OR userId = :userId) AND (contains(dealName, :query) OR contains(dealOwner, :query))',
      ExpressionAttributeValues: {
        ':tenantId': tenantId,
        ':userId': userId,
        ':zero': 0,
        ':isDeleted': false,
        ':query': query
      }
    }));

    return (result.Items || []) as Deal[];
  }

  // Update deal
  async updateDeal(id: string, input: UpdateDealInput, userId: string, userEmail: string, tenantId: string): Promise<Deal | null> {
    // First check if deal exists and belongs to tenant
    const existingDeal = await this.getDealById(id, tenantId, userId);
    if (!existingDeal) {
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

    // Keep track of fields that have been processed to avoid duplicates
    const processedFields = new Set<string>();

    // Add fields to update if they are provided
    Object.entries(input).forEach(([key, value]) => {
      if (value !== undefined && !processedFields.has(key)) {
        updateExpressions.push(`#${key} = :${key}`);
        expressionAttributeNames[`#${key}`] = key;
        expressionAttributeValues[`:${key}`] = value;
        processedFields.add(key);
        
        // If amount is updated, also update value for backward compatibility
        if (key === 'amount' && !processedFields.has('value')) {
          updateExpressions.push(`#value = :value`);
          expressionAttributeNames[`#value`] = 'value';
          expressionAttributeValues[`:value`] = value;
          processedFields.add('value');
        }
        
        // If stage is updated, update probability only if not explicitly provided
        if (key === 'stage' && !input.probability && !processedFields.has('probability')) {
          const probability = this.getDefaultProbability(value as string);
          updateExpressions.push(`#probability = :probability`);
          expressionAttributeNames[`#probability`] = 'probability';
          expressionAttributeValues[`:probability`] = probability;
          processedFields.add('probability');
        }
      }
    });

    // Always update audit fields
    updateExpressions.push('#updatedBy = :updatedBy', '#updatedAt = :updatedAt');
    expressionAttributeNames['#updatedBy'] = 'updatedBy';
    expressionAttributeNames['#updatedAt'] = 'updatedAt';

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

    return result.Attributes as Deal;
  }

  // Soft delete deal
  async deleteDeal(id: string, userId: string, userEmail: string, tenantId: string): Promise<boolean> {
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
        return false; // Deal not found or already deleted
      }
      throw error;
    }
  }

  // Restore soft deleted deal
  async restoreDeal(id: string, userId: string, userEmail: string, tenantId: string): Promise<boolean> {
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
        return false; // Deal not found or not deleted
      }
      throw error;
    }
  }

  // Hard delete deal (permanent)
  async hardDeleteDeal(id: string, tenantId: string): Promise<boolean> {
    try {
      await docClient.send(new DeleteCommand({
        TableName: this.tableName,
        Key: { id },
        ConditionExpression: 'tenantId = :tenantId',
        ExpressionAttributeValues: {
          ':tenantId': tenantId
        }
      }));

      return true;
    } catch (error: any) {
      if (error.name === 'ConditionalCheckFailedException') {
        return false; // Deal not found
      }
      throw error;
    }
  }

  // Get deals stats for analytics
  async getDealsStats(tenantId: string, userId: string): Promise<{
    total: number;
    byStage: Record<string, number>;
    bySource: Record<string, number>;
    totalValue: number;
    avgValue: number;
    recentCount: number;
  }> {
    const result = await docClient.send(new QueryCommand({
      TableName: this.tableName,
      IndexName: 'TenantIdIndex',
      KeyConditionExpression: 'tenantId = :tenantId',
      FilterExpression: 'isDeleted = :isDeleted AND (attribute_not_exists(visibleTo) OR size(visibleTo) = :zero OR contains(visibleTo, :userId) OR userId = :userId)',
      ExpressionAttributeValues: {
        ':tenantId': tenantId,
        ':userId': userId,
        ':zero': 0,
        ':isDeleted': false
      }
    }));

    const deals = result.Items || [];
    
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

    return {
      total: deals.length,
      byStage,
      bySource,
      totalValue,
      avgValue: deals.length > 0 ? totalValue / deals.length : 0,
      recentCount
    };
  }
}

// Create singleton instance
export const dealsService = new DealsService();
