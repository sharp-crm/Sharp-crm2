"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.subsidiariesService = exports.SubsidiariesService = void 0;
const dynamoClient_1 = require("./dynamoClient");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const uuid_1 = require("uuid");
class SubsidiariesService {
    constructor() {
        this.tableName = dynamoClient_1.TABLES.SUBSIDIARIES;
    }
    async createSubsidiary(input, userId, tenantId) {
        const timestamp = new Date().toISOString();
        const id = (0, uuid_1.v4)();
        const subsidiary = {
            id,
            ...input,
            totalEmployees: input.totalEmployees || 0,
            createdBy: userId,
            createdAt: timestamp,
            userId,
            tenantId,
            isDeleted: false
        };
        await dynamoClient_1.docClient.send(new lib_dynamodb_1.PutCommand({
            TableName: this.tableName,
            Item: subsidiary,
            ConditionExpression: 'attribute_not_exists(id)'
        }));
        return subsidiary;
    }
    async getSubsidiaryById(id, tenantId) {
        const result = await dynamoClient_1.docClient.send(new lib_dynamodb_1.GetCommand({
            TableName: this.tableName,
            Key: { id }
        }));
        if (!result.Item || result.Item.tenantId !== tenantId || result.Item.isDeleted) {
            return null;
        }
        return result.Item;
    }
    async getSubsidiariesByTenant(tenantId, userId, userRole) {
        // Use ScanCommand instead of QueryCommand since TenantIdIndex doesn't exist
        const result = await dynamoClient_1.docClient.send(new lib_dynamodb_1.ScanCommand({
            TableName: this.tableName,
            FilterExpression: 'tenantId = :tenantId AND isDeleted <> :deleted',
            ExpressionAttributeValues: {
                ':tenantId': tenantId,
                ':deleted': true
            }
        }));
        const subsidiaries = (result.Items || []);
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
    async getSubsidiariesByCreator(createdBy, tenantId) {
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
    async getSubsidiaryByName(name, tenantId) {
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
    async updateSubsidiary(id, input, userId, tenantId) {
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
    async deleteSubsidiary(id, userId, tenantId) {
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
    async restoreSubsidiary(id, userId, tenantId) {
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
    async hardDeleteSubsidiary(id, tenantId) {
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
    async searchSubsidiaries(searchTerm, tenantId, limit = 50) {
        const result = await dynamoClient_1.docClient.send(new lib_dynamodb_1.ScanCommand({
            TableName: this.tableName,
            FilterExpression: 'tenantId = :tenantId AND isDeleted <> :deleted AND (contains(#name, :searchTerm) OR contains(email, :searchTerm) OR contains(address, :searchTerm))',
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
    async getSubsidiariesStats(tenantId) {
        const result = await dynamoClient_1.docClient.send(new lib_dynamodb_1.ScanCommand({
            TableName: this.tableName,
            FilterExpression: 'tenantId = :tenantId',
            ExpressionAttributeValues: {
                ':tenantId': tenantId
            }
        }));
        const subsidiaries = (result.Items || []);
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
exports.SubsidiariesService = SubsidiariesService;
exports.subsidiariesService = new SubsidiariesService();
