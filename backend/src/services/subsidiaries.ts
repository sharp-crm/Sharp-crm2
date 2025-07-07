import { docClient } from './dynamoClient';
import { 
  GetCommand, 
  PutCommand, 
  UpdateCommand, 
  DeleteCommand, 
  QueryCommand, 
  ScanCommand 
} from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';

// Interface definitions
export interface Subsidiary {
  id: string;
  name: string;
  email: string;
  address: string;
  contact: string;
  totalEmployees: number;
  description?: string;
  // Auditing fields
  createdBy: string;
  createdAt: string;
  updatedBy?: string;
  updatedAt?: string;
  deletedBy?: string;
  isDeleted?: boolean;
  deletedAt?: string;
  userId: string;
  tenantId: string;
}

export interface CreateSubsidiaryInput {
  name: string;
  email: string;
  address: string;
  contact: string;
  totalEmployees?: number;
  description?: string;
}

export interface UpdateSubsidiaryInput {
  name?: string;
  email?: string;
  address?: string;
  contact?: string;
  totalEmployees?: number;
  description?: string;
}

export interface SubsidiaryStats {
  total: number;
  active: number;
  deleted: number;
  totalEmployees: number;
  averageEmployees: number;
  recentlyCreated: number;
}

export class SubsidiariesService {
  private tableName = 'Subsidiaries';

  async createSubsidiary(
    input: CreateSubsidiaryInput,
    userId: string,
    tenantId: string
  ): Promise<Subsidiary> {
    const timestamp = new Date().toISOString();
    const id = uuidv4();

    const subsidiary: Subsidiary = {
      id,
      ...input,
      totalEmployees: input.totalEmployees || 0,
      createdBy: userId,
      createdAt: timestamp,
      userId,
      tenantId,
      isDeleted: false
    };

    await docClient.send(new PutCommand({
      TableName: this.tableName,
      Item: subsidiary,
      ConditionExpression: 'attribute_not_exists(id)'
    }));

    return subsidiary;
  }

  async getSubsidiaryById(id: string, tenantId: string): Promise<Subsidiary | null> {
    const result = await docClient.send(new GetCommand({
      TableName: this.tableName,
      Key: { id }
    }));

    if (!result.Item || result.Item.tenantId !== tenantId || result.Item.isDeleted) {
      return null;
    }

    return result.Item as Subsidiary;
  }

  async getSubsidiariesByTenant(tenantId: string, userId: string, userRole: string): Promise<Subsidiary[]> {
    const result = await docClient.send(new QueryCommand({
      TableName: this.tableName,
      IndexName: 'TenantIdIndex',
      KeyConditionExpression: 'tenantId = :tenantId',
      FilterExpression: 'isDeleted <> :deleted',
      ExpressionAttributeValues: {
        ':tenantId': tenantId,
        ':deleted': true
      }
    }));

    const subsidiaries = (result.Items || []) as Subsidiary[];
    
    // Filter based on role
    return subsidiaries.filter(subsidiary => {
      // Admins can see all subsidiaries
      if (userRole === 'ADMIN' || userRole === 'SUPER_ADMIN') {
        return true;
      }
      
      // Managers can see subsidiaries
      if (userRole === 'SALES_MANAGER') {
        return true;
      }
      
      // Sales reps cannot see subsidiaries
      return false;
    });
  }

  async getSubsidiariesByCreator(createdBy: string, tenantId: string): Promise<Subsidiary[]> {
    const result = await docClient.send(new QueryCommand({
      TableName: this.tableName,
      IndexName: 'CreatedByIndex',
      KeyConditionExpression: 'createdBy = :createdBy',
      FilterExpression: 'tenantId = :tenantId AND isDeleted <> :deleted',
      ExpressionAttributeValues: {
        ':createdBy': createdBy,
        ':tenantId': tenantId,
        ':deleted': true
      }
    }));

    return (result.Items || []) as Subsidiary[];
  }

  async getSubsidiaryByName(name: string, tenantId: string): Promise<Subsidiary | null> {
    const result = await docClient.send(new QueryCommand({
      TableName: this.tableName,
      IndexName: 'NameIndex',
      KeyConditionExpression: '#name = :name',
      FilterExpression: 'tenantId = :tenantId AND isDeleted <> :deleted',
      ExpressionAttributeNames: {
        '#name': 'name'
      },
      ExpressionAttributeValues: {
        ':name': name,
        ':tenantId': tenantId,
        ':deleted': true
      }
    }));

    return result.Items?.[0] as Subsidiary || null;
  }

  async updateSubsidiary(
    id: string,
    input: UpdateSubsidiaryInput,
    userId: string,
    tenantId: string
  ): Promise<Subsidiary | null> {
    const timestamp = new Date().toISOString();
    
    // Build update expression dynamically
    const updateExpressions: string[] = [];
    const expressionAttributeNames: { [key: string]: string } = {};
    const expressionAttributeValues: { [key: string]: any } = {};
    
    // Always update the timestamp and updatedBy
    updateExpressions.push('updatedAt = :updatedAt', 'updatedBy = :updatedBy');
    expressionAttributeValues[':updatedAt'] = timestamp;
    expressionAttributeValues[':updatedBy'] = userId;
    
    // Add other fields if they exist
    Object.entries(input).forEach(([key, value]) => {
      if (value !== undefined) {
        const attrName = `#${key}`;
        const attrValue = `:${key}`;
        updateExpressions.push(`${attrName} = ${attrValue}`);
        expressionAttributeNames[attrName] = key;
        expressionAttributeValues[attrValue] = value;
      }
    });
    
    // Add condition values
    expressionAttributeValues[':tenantId'] = tenantId;
    expressionAttributeValues[':deleted'] = true;

    const result = await docClient.send(new UpdateCommand({
      TableName: this.tableName,
      Key: { id },
      UpdateExpression: `SET ${updateExpressions.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ConditionExpression: 'tenantId = :tenantId AND isDeleted <> :deleted',
      ReturnValues: 'ALL_NEW'
    }));

    return result.Attributes as Subsidiary;
  }

  async deleteSubsidiary(id: string, userId: string, tenantId: string): Promise<boolean> {
    const timestamp = new Date().toISOString();
    
    try {
      await docClient.send(new UpdateCommand({
        TableName: this.tableName,
        Key: { id },
        UpdateExpression: 'SET isDeleted = :deleted, deletedAt = :deletedAt, deletedBy = :deletedBy',
        ExpressionAttributeValues: {
          ':deleted': true,
          ':deletedAt': timestamp,
          ':deletedBy': userId,
          ':tenantId': tenantId,
          ':notDeleted': true
        },
        ConditionExpression: 'tenantId = :tenantId AND isDeleted <> :notDeleted'
      }));
      
      return true;
    } catch (error) {
      return false;
    }
  }

  async restoreSubsidiary(id: string, userId: string, tenantId: string): Promise<boolean> {
    const timestamp = new Date().toISOString();
    
    try {
      await docClient.send(new UpdateCommand({
        TableName: this.tableName,
        Key: { id },
        UpdateExpression: 'SET isDeleted = :deleted, updatedAt = :updatedAt, updatedBy = :updatedBy REMOVE deletedAt, deletedBy',
        ExpressionAttributeValues: {
          ':deleted': false,
          ':updatedAt': timestamp,
          ':updatedBy': userId,
          ':tenantId': tenantId,
          ':isDeleted': true
        },
        ConditionExpression: 'tenantId = :tenantId AND isDeleted = :isDeleted'
      }));
      
      return true;
    } catch (error) {
      return false;
    }
  }

  async hardDeleteSubsidiary(id: string, tenantId: string): Promise<boolean> {
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
    } catch (error) {
      return false;
    }
  }

  async searchSubsidiaries(
    searchTerm: string,
    tenantId: string,
    limit: number = 50
  ): Promise<Subsidiary[]> {
    const result = await docClient.send(new QueryCommand({
      TableName: this.tableName,
      IndexName: 'TenantIdIndex',
      KeyConditionExpression: 'tenantId = :tenantId',
      FilterExpression: 'isDeleted <> :deleted AND (contains(#name, :searchTerm) OR contains(email, :searchTerm) OR contains(address, :searchTerm))',
      ExpressionAttributeNames: {
        '#name': 'name'
      },
      ExpressionAttributeValues: {
        ':tenantId': tenantId,
        ':deleted': true,
        ':searchTerm': searchTerm
      },
      Limit: limit
    }));

    return (result.Items || []) as Subsidiary[];
  }

  async getSubsidiariesStats(tenantId: string): Promise<SubsidiaryStats> {
    const result = await docClient.send(new QueryCommand({
      TableName: this.tableName,
      IndexName: 'TenantIdIndex',
      KeyConditionExpression: 'tenantId = :tenantId',
      ExpressionAttributeValues: {
        ':tenantId': tenantId
      }
    }));

    const subsidiaries = (result.Items || []) as Subsidiary[];
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const active = subsidiaries.filter(s => !s.isDeleted);
    const deleted = subsidiaries.filter(s => s.isDeleted);
    const totalEmployees = active.reduce((sum, s) => sum + (s.totalEmployees || 0), 0);
    const recentlyCreated = active.filter(s => new Date(s.createdAt) > thirtyDaysAgo);

    return {
      total: subsidiaries.length,
      active: active.length,
      deleted: deleted.length,
      totalEmployees,
      averageEmployees: active.length > 0 ? totalEmployees / active.length : 0,
      recentlyCreated: recentlyCreated.length
    };
  }
}

export const subsidiariesService = new SubsidiariesService();
