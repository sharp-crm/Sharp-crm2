"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dealsService = exports.DealsService = void 0;
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const uuid_1 = require("uuid");
const dynamoClient_1 = require("../services/dynamoClient");
const dealsRBAC_1 = require("./dealsRBAC");
class DealsService {
    constructor() {
        this.tableName = dynamoClient_1.TABLES.DEALS;
    }
    // Create a new deal
    async createDeal(input, userId, userEmail, tenantId) {
        console.log('📝 Creating deal with input:', { ...input, userId, tenantId });
        const timestamp = new Date().toISOString();
        const dealId = (0, uuid_1.v4)();
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
        // Create deal object with required fields
        const deal = {
            id: dealId,
            dealOwner: input.dealOwner,
            dealName: input.dealName,
            leadSource: input.leadSource,
            stage: input.stage,
            amount: amount,
            value: amount,
            probability: probability,
            phone: input.phone || '', // Handle required phone field
            email: input.email || '', // Handle optional email field
            description: input.description || '',
            notes: input.notes || '', // Handle optional notes field
            closeDate: input.closeDate || this.getDefaultCloseDate(),
            relatedProductIds: input.relatedProductIds || [],
            relatedQuoteIds: input.relatedQuoteIds || [],
            relatedContactIds: input.relatedContactIds || [],
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
            await dynamoClient_1.docClient.send(new lib_dynamodb_1.PutCommand({
                TableName: this.tableName,
                Item: deal,
                ConditionExpression: 'attribute_not_exists(id)'
            }));
            return deal;
        }
        catch (error) {
            console.error('Error saving deal:', error);
            throw error;
        }
    }
    // Get default probability based on stage
    getDefaultProbability(stage) {
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
    getDefaultCloseDate() {
        const date = new Date();
        date.setDate(date.getDate() + 30);
        return date.toISOString().split('T')[0];
    }
    // Get deal by ID (with tenant, visibility and soft delete check)
    async getDealById(id, tenantId, userId) {
        const result = await dynamoClient_1.docClient.send(new lib_dynamodb_1.GetCommand({
            TableName: this.tableName,
            Key: { id }
        }));
        if (!result.Item ||
            result.Item.tenantId !== tenantId ||
            result.Item.isDeleted ||
            result.Item.userId !== userId) {
            return null;
        }
        return result.Item;
    }
    // Get all deals for a tenant (excluding soft deleted)
    async getDealsByTenant(tenantId, userId, includeDeleted = false) {
        console.log('🔍 Getting deals by tenant:', { tenantId, userId, includeDeleted });
        // Use ScanCommand instead of QueryCommand since TenantIdIndex doesn't exist
        const result = await dynamoClient_1.docClient.send(new lib_dynamodb_1.ScanCommand({
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
        console.log('📊 Found deals:', result.Items?.length);
        return (result.Items || []);
    }
    // RBAC-aware method: Get deals for user based on role and permissions
    async getDealsForUser(user, includeDeleted = false) {
        console.log(`🔐 [DealsService.getDealsForUser] Getting deals for user: ${user.email} (${user.role})`);
        return dealsRBAC_1.dealsRBACService.getDealsForUser(user, includeDeleted);
    }
    // RBAC-aware method: Get deal by ID with role-based access control
    async getDealByIdForUser(id, user) {
        console.log(`🔐 [DealsService.getDealByIdForUser] Getting deal ${id} for user: ${user.email} (${user.role})`);
        return dealsRBAC_1.dealsRBACService.getDealByIdForUser(id, user);
    }
    // RBAC-aware method: Get deals by owner with role-based access control
    async getDealsByOwnerForUser(dealOwner, user) {
        console.log(`🔐 [DealsService.getDealsByOwnerForUser] Getting deals for owner ${dealOwner} by user: ${user.email} (${user.role})`);
        return dealsRBAC_1.dealsRBACService.getDealsByOwnerForUser(dealOwner, user);
    }
    // Get deals by owner
    async getDealsByOwner(dealOwner, tenantId, userId) {
        const result = await dynamoClient_1.docClient.send(new lib_dynamodb_1.ScanCommand({
            TableName: this.tableName,
            FilterExpression: 'dealOwner = :dealOwner AND tenantId = :tenantId AND isDeleted = :isDeleted',
            ExpressionAttributeValues: {
                ':dealOwner': dealOwner,
                ':tenantId': tenantId,
                ':isDeleted': false
            }
        }));
        return (result.Items || []);
    }
    // Get deals by stage
    async getDealsByStage(stage, tenantId, userId) {
        const result = await dynamoClient_1.docClient.send(new lib_dynamodb_1.ScanCommand({
            TableName: this.tableName,
            FilterExpression: 'stage = :stage AND tenantId = :tenantId AND isDeleted = :isDeleted',
            ExpressionAttributeValues: {
                ':stage': stage,
                ':tenantId': tenantId,
                ':isDeleted': false
            }
        }));
        return (result.Items || []);
    }
    // RBAC-aware method: Search deals with role-based access control
    async searchDealsForUser(user, query) {
        console.log(`🔐 [DealsService.searchDealsForUser] Searching deals for query "${query}" by user: ${user.email} (${user.role})`);
        return dealsRBAC_1.dealsRBACService.searchDealsForUser(user, query);
    }
    // RBAC-aware method: Get deals by stage with role-based access control
    async getDealsByStageForUser(stage, user) {
        console.log(`🔐 [DealsService.getDealsByStageForUser] Getting deals for stage ${stage} by user: ${user.email} (${user.role})`);
        return dealsRBAC_1.dealsRBACService.getDealsByStageForUser(stage, user);
    }
    // Search deals
    async searchDeals(tenantId, userId, query) {
        const result = await dynamoClient_1.docClient.send(new lib_dynamodb_1.ScanCommand({
            TableName: this.tableName,
            FilterExpression: 'tenantId = :tenantId AND isDeleted = :isDeleted AND (contains(dealName, :query) OR contains(dealOwner, :query))',
            ExpressionAttributeValues: {
                ':tenantId': tenantId,
                ':isDeleted': false,
                ':query': query
            }
        }));
        return (result.Items || []);
    }
    // Update deal
    async updateDeal(id, input, userId, userEmail, tenantId) {
        // First check if deal exists and belongs to tenant
        const existingDeal = await this.getDealById(id, tenantId, userId);
        if (!existingDeal) {
            return null;
        }
        const timestamp = new Date().toISOString();
        // Build update expression dynamically
        const updateExpressions = [];
        const expressionAttributeNames = {};
        const expressionAttributeValues = {
            ':updatedBy': userEmail,
            ':updatedAt': timestamp
        };
        // Keep track of fields that have been processed to avoid duplicates
        const processedFields = new Set();
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
                    const probability = this.getDefaultProbability(value);
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
        const result = await dynamoClient_1.docClient.send(new lib_dynamodb_1.UpdateCommand({
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
        return result.Attributes;
    }
    // Soft delete deal
    async deleteDeal(id, userId, userEmail, tenantId) {
        const timestamp = new Date().toISOString();
        try {
            await dynamoClient_1.docClient.send(new lib_dynamodb_1.UpdateCommand({
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
        }
        catch (error) {
            if (error.name === 'ConditionalCheckFailedException') {
                return false; // Deal not found or already deleted
            }
            throw error;
        }
    }
    // Restore soft deleted deal
    async restoreDeal(id, userId, userEmail, tenantId) {
        const timestamp = new Date().toISOString();
        try {
            await dynamoClient_1.docClient.send(new lib_dynamodb_1.UpdateCommand({
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
        }
        catch (error) {
            if (error.name === 'ConditionalCheckFailedException') {
                return false; // Deal not found or not deleted
            }
            throw error;
        }
    }
    // Hard delete deal (permanent)
    async hardDeleteDeal(id, tenantId) {
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
            if (error.name === 'ConditionalCheckFailedException') {
                return false; // Deal not found
            }
            throw error;
        }
    }
    // RBAC-aware method: Get deals stats with role-based access control
    async getDealsStatsForUser(user) {
        console.log(`🔐 [DealsService.getDealsStatsForUser] Getting deals stats for user: ${user.email} (${user.role})`);
        return dealsRBAC_1.dealsRBACService.getDealsStatsForUser(user);
    }
    // Get deals stats for analytics
    async getDealsStats(tenantId, userId) {
        const result = await dynamoClient_1.docClient.send(new lib_dynamodb_1.ScanCommand({
            TableName: this.tableName,
            FilterExpression: 'tenantId = :tenantId AND isDeleted = :isDeleted AND (attribute_not_exists(visibleTo) OR size(visibleTo) = :zero OR contains(visibleTo, :userId) OR userId = :userId)',
            ExpressionAttributeValues: {
                ':tenantId': tenantId,
                ':userId': userId,
                ':zero': 0,
                ':isDeleted': false
            }
        }));
        const deals = result.Items || [];
        // Calculate statistics
        const byStage = {};
        const bySource = {};
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
exports.DealsService = DealsService;
// Create singleton instance
exports.dealsService = new DealsService();
