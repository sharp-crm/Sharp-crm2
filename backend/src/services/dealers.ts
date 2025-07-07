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
export interface Dealer {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  location: string;
  territory: string;
  status: string;
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

export interface CreateDealerInput {
  name: string;
  email: string;
  phone: string;
  company: string;
  location: string;
  territory: string;
  status?: string;
  description?: string;
}

export interface UpdateDealerInput {
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
  location?: string;
  territory?: string;
  status?: string;
  description?: string;
}

export interface DealerStats {
  total: number;
  active: number;
  inactive: number;
  deleted: number;
  byTerritory: { [key: string]: number };
  byStatus: { [key: string]: number };
  recentlyCreated: number;
}

export class DealersService {
  private tableName = 'Dealers';

  async createDealer(
    input: CreateDealerInput,
    userId: string,
    tenantId: string
  ): Promise<Dealer> {
    const timestamp = new Date().toISOString();
    const id = uuidv4();

    const dealer: Dealer = {
      id,
      ...input,
      status: input.status || 'Active',
      createdBy: userId,
      createdAt: timestamp,
      userId,
      tenantId,
      isDeleted: false
    };

    await docClient.send(new PutCommand({
      TableName: this.tableName,
      Item: dealer,
      ConditionExpression: 'attribute_not_exists(id)'
    }));

    return dealer;
  }

  async getDealerById(id: string, tenantId: string): Promise<Dealer | null> {
    const result = await docClient.send(new GetCommand({
      TableName: this.tableName,
      Key: { id }
    }));

    if (!result.Item || result.Item.tenantId !== tenantId || result.Item.isDeleted) {
      return null;
    }

    return result.Item as Dealer;
  }

  async getDealersByTenant(tenantId: string, userId: string, userRole: string): Promise<Dealer[]> {
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

    const dealers = (result.Items || []) as Dealer[];
    
    // Filter based on role
    return dealers.filter(dealer => {
      // Admins can see all dealers
      if (userRole === 'ADMIN' || userRole === 'SUPER_ADMIN') {
        return true;
      }
      
      // Managers can see dealers
      if (userRole === 'SALES_MANAGER') {
        return true;
      }
      
      // Sales reps cannot see dealers
      return false;
    });
  }

  async getDealersByCreator(createdBy: string, tenantId: string): Promise<Dealer[]> {
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

    return (result.Items || []) as Dealer[];
  }

  async getDealersByTerritory(territory: string, tenantId: string): Promise<Dealer[]> {
    const result = await docClient.send(new QueryCommand({
      TableName: this.tableName,
      IndexName: 'TerritoryIndex',
      KeyConditionExpression: 'territory = :territory',
      FilterExpression: 'tenantId = :tenantId AND isDeleted <> :deleted',
      ExpressionAttributeValues: {
        ':territory': territory,
        ':tenantId': tenantId,
        ':deleted': true
      }
    }));

    return (result.Items || []) as Dealer[];
  }

  async getDealerByName(name: string, tenantId: string): Promise<Dealer | null> {
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

    return result.Items?.[0] as Dealer || null;
  }

  async updateDealer(
    id: string,
    input: UpdateDealerInput,
    userId: string,
    tenantId: string
  ): Promise<Dealer | null> {
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

    return result.Attributes as Dealer;
  }

  async deleteDealer(id: string, userId: string, tenantId: string): Promise<boolean> {
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

  async restoreDealer(id: string, userId: string, tenantId: string): Promise<boolean> {
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

  async hardDeleteDealer(id: string, tenantId: string): Promise<boolean> {
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

  async searchDealers(
    searchTerm: string,
    tenantId: string,
    limit: number = 50
  ): Promise<Dealer[]> {
    const result = await docClient.send(new QueryCommand({
      TableName: this.tableName,
      IndexName: 'TenantIdIndex',
      KeyConditionExpression: 'tenantId = :tenantId',
      FilterExpression: 'isDeleted <> :deleted AND (contains(#name, :searchTerm) OR contains(email, :searchTerm) OR contains(company, :searchTerm) OR contains(territory, :searchTerm))',
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

    return (result.Items || []) as Dealer[];
  }

  async getDealersStats(tenantId: string): Promise<DealerStats> {
    const result = await docClient.send(new QueryCommand({
      TableName: this.tableName,
      IndexName: 'TenantIdIndex',
      KeyConditionExpression: 'tenantId = :tenantId',
      ExpressionAttributeValues: {
        ':tenantId': tenantId
      }
    }));

    const dealers = (result.Items || []) as Dealer[];
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const active = dealers.filter(d => !d.isDeleted);
    const deleted = dealers.filter(d => d.isDeleted);
    const recentlyCreated = active.filter(d => new Date(d.createdAt) > thirtyDaysAgo);

    // Group by territory
    const byTerritory = active.reduce((acc, dealer) => {
      const territory = dealer.territory || 'Unknown';
      acc[territory] = (acc[territory] || 0) + 1;
      return acc;
    }, {} as { [key: string]: number });

    // Group by status
    const byStatus = active.reduce((acc, dealer) => {
      const status = dealer.status || 'Unknown';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as { [key: string]: number });

    return {
      total: dealers.length,
      active: active.length,
      inactive: byStatus['Inactive'] || 0,
      deleted: deleted.length,
      byTerritory,
      byStatus,
      recentlyCreated: recentlyCreated.length
    };
  }
}

export const dealersService = new DealersService();
