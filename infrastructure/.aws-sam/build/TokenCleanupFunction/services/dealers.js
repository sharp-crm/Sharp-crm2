"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dealersService = exports.DealersService = void 0;
const dynamoClient_1 = require("./dynamoClient");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const uuid_1 = require("uuid");
class DealersService {
    constructor() {
        this.tableName = dynamoClient_1.TABLES.DEALERS;
    }
    async createDealer(input, userId, tenantId) {
        const timestamp = new Date().toISOString();
        const id = (0, uuid_1.v4)();
        const dealer = {
            id,
            ...input,
            status: input.status || 'Active',
            createdBy: userId,
            createdAt: timestamp,
            userId,
            tenantId,
            isDeleted: false
        };
        await dynamoClient_1.docClient.send(new lib_dynamodb_1.PutCommand({
            TableName: this.tableName,
            Item: dealer,
            ConditionExpression: 'attribute_not_exists(id)'
        }));
        return dealer;
    }
    async getDealerById(id, tenantId) {
        const result = await dynamoClient_1.docClient.send(new lib_dynamodb_1.GetCommand({
            TableName: this.tableName,
            Key: { id }
        }));
        if (!result.Item || result.Item.tenantId !== tenantId || result.Item.isDeleted) {
            return null;
        }
        return result.Item;
    }
    async getDealersByTenant(tenantId, userId, userRole) {
        // Use ScanCommand instead of QueryCommand since TenantIdIndex doesn't exist
        const result = await dynamoClient_1.docClient.send(new lib_dynamodb_1.ScanCommand({
            TableName: this.tableName,
            FilterExpression: 'tenantId = :tenantId AND isDeleted <> :deleted',
            ExpressionAttributeValues: {
                ':tenantId': tenantId,
                ':deleted': true
            }
        }));
        const dealers = (result.Items || []);
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
    async getDealersByCreator(createdBy, tenantId) {
        const result = await dynamoClient_1.docClient.send(new lib_dynamodb_1.ScanCommand({
            TableName: this.tableName,
            FilterExpression: 'createdBy = :createdBy AND tenantId = :tenantId AND isDeleted <> :deleted',
            ExpressionAttributeValues: {
                ':createdBy': createdBy,
                ':tenantId': tenantId,
                ':deleted': true
            }
        }));
        return (result.Items || []);
    }
    async getDealersByTerritory(territory, tenantId) {
        const result = await dynamoClient_1.docClient.send(new lib_dynamodb_1.ScanCommand({
            TableName: this.tableName,
            FilterExpression: 'territory = :territory AND tenantId = :tenantId AND isDeleted <> :deleted',
            ExpressionAttributeValues: {
                ':territory': territory,
                ':tenantId': tenantId,
                ':deleted': true
            }
        }));
        return (result.Items || []);
    }
    async getDealerByName(name, tenantId) {
        const result = await dynamoClient_1.docClient.send(new lib_dynamodb_1.ScanCommand({
            TableName: this.tableName,
            FilterExpression: '#name = :name AND tenantId = :tenantId AND isDeleted <> :deleted',
            ExpressionAttributeNames: {
                '#name': 'name'
            },
            ExpressionAttributeValues: {
                ':name': name,
                ':tenantId': tenantId,
                ':deleted': true
            }
        }));
        return result.Items?.[0] || null;
    }
    async updateDealer(id, input, userId, tenantId) {
        const timestamp = new Date().toISOString();
        // Build update expression dynamically
        const updateExpressions = [];
        const expressionAttributeNames = {};
        const expressionAttributeValues = {};
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
        const result = await dynamoClient_1.docClient.send(new lib_dynamodb_1.UpdateCommand({
            TableName: this.tableName,
            Key: { id },
            UpdateExpression: `SET ${updateExpressions.join(', ')}`,
            ExpressionAttributeNames: expressionAttributeNames,
            ExpressionAttributeValues: expressionAttributeValues,
            ConditionExpression: 'tenantId = :tenantId AND isDeleted <> :deleted',
            ReturnValues: 'ALL_NEW'
        }));
        return result.Attributes;
    }
    async deleteDealer(id, userId, tenantId) {
        const timestamp = new Date().toISOString();
        try {
            await dynamoClient_1.docClient.send(new lib_dynamodb_1.UpdateCommand({
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
        }
        catch (error) {
            return false;
        }
    }
    async restoreDealer(id, userId, tenantId) {
        const timestamp = new Date().toISOString();
        try {
            await dynamoClient_1.docClient.send(new lib_dynamodb_1.UpdateCommand({
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
        }
        catch (error) {
            return false;
        }
    }
    async hardDeleteDealer(id, tenantId) {
        try {
            await dynamoClient_1.docClient.send(new lib_dynamodb_1.DeleteCommand({
                TableName: this.tableName,
                Key: { id },
                ConditionExpression: 'tenantId = :tenantId',
                ExpressionAttributeValues: {
                    ':tenantId': tenantId
                }
            }));
            return true;
        }
        catch (error) {
            return false;
        }
    }
    async searchDealers(searchTerm, tenantId, limit = 50) {
        const result = await dynamoClient_1.docClient.send(new lib_dynamodb_1.ScanCommand({
            TableName: this.tableName,
            FilterExpression: 'tenantId = :tenantId AND isDeleted <> :deleted AND (contains(#name, :searchTerm) OR contains(email, :searchTerm) OR contains(company, :searchTerm) OR contains(territory, :searchTerm))',
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
        return (result.Items || []);
    }
    async getDealersStats(tenantId) {
        const result = await dynamoClient_1.docClient.send(new lib_dynamodb_1.ScanCommand({
            TableName: this.tableName,
            FilterExpression: 'tenantId = :tenantId',
            ExpressionAttributeValues: {
                ':tenantId': tenantId
            }
        }));
        const dealers = (result.Items || []);
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
        }, {});
        // Group by status
        const byStatus = active.reduce((acc, dealer) => {
            const status = dealer.status || 'Unknown';
            acc[status] = (acc[status] || 0) + 1;
            return acc;
        }, {});
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
exports.DealersService = DealersService;
exports.dealersService = new DealersService();
