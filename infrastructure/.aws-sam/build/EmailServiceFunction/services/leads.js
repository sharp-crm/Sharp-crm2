"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.leadsService = exports.LeadsService = void 0;
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const uuid_1 = require("uuid");
const dynamoClient_1 = require("../services/dynamoClient");
const leadsRBAC_1 = require("./leadsRBAC");
class LeadsService {
    constructor() {
        this.tableName = dynamoClient_1.TABLES.LEADS;
    }
    // Create a new lead
    async createLead(input, userId, userEmail, tenantId) {
        const timestamp = new Date().toISOString();
        const leadId = (0, uuid_1.v4)();
        console.log('🔍 [LeadsService.createLead] Input received:', input);
        console.log('🔍 [LeadsService.createLead] relatedProductIds from input:', input.relatedProductIds);
        console.log('🔍 [LeadsService.createLead] relatedProductIds type:', typeof input.relatedProductIds);
        console.log('🔍 [LeadsService.createLead] relatedProductIds length:', input.relatedProductIds?.length);
        const lead = {
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
        await dynamoClient_1.docClient.send(new lib_dynamodb_1.PutCommand({
            TableName: this.tableName,
            Item: lead,
            ConditionExpression: 'attribute_not_exists(id)'
        }));
        console.log('✅ [LeadsService.createLead] Lead saved to database successfully');
        console.log('✅ [LeadsService.createLead] Final lead object:', lead);
        return lead;
    }
    // Get lead by ID (with tenant and visibility check)
    async getLeadById(id, tenantId, userId) {
        const result = await dynamoClient_1.docClient.send(new lib_dynamodb_1.GetCommand({
            TableName: this.tableName,
            Key: { id }
        }));
        if (!result.Item ||
            result.Item.tenantId !== tenantId ||
            result.Item.isDeleted ||
            (result.Item.userId !== userId)) {
            return null;
        }
        return result.Item;
    }
    // Get leads by tenant
    async getLeadsByTenant(tenantId, userId, includeDeleted = false) {
        // Use TenantIndex GSI for efficient tenant-based queries
        // Assumption: TenantIndex exists with tenantId as partition key
        const result = await dynamoClient_1.docClient.send(new lib_dynamodb_1.QueryCommand({
            TableName: this.tableName,
            IndexName: 'TenantIndex',
            KeyConditionExpression: 'tenantId = :tenantId',
            FilterExpression: includeDeleted ? undefined : 'isDeleted = :isDeleted',
            ExpressionAttributeValues: {
                ':tenantId': tenantId,
                ...(includeDeleted ? {} : { ':isDeleted': false })
            }
        }));
        return (result.Items || []);
    }
    // RBAC-aware method: Get leads for user based on role and permissions
    async getLeadsForUser(user, includeDeleted = false) {
        console.log(`🔐 [LeadsService.getLeadsForUser] Getting leads for user: ${user.email} (${user.role})`);
        return leadsRBAC_1.leadsRBACService.getLeadsForUser(user, includeDeleted);
    }
    // RBAC-aware method: Get lead by ID with role-based access control
    async getLeadByIdForUser(id, user) {
        console.log(`🔐 [LeadsService.getLeadByIdForUser] Getting lead ${id} for user: ${user.email} (${user.role})`);
        return leadsRBAC_1.leadsRBACService.getLeadByIdForUser(id, user);
    }
    // Get leads by owner
    async getLeadsByOwner(leadOwner, tenantId, userId) {
        // Use LeadOwnerIndex GSI for efficient owner-based queries
        // Assumption: LeadOwnerIndex exists with leadOwner as partition key
        const result = await dynamoClient_1.docClient.send(new lib_dynamodb_1.QueryCommand({
            TableName: this.tableName,
            IndexName: 'LeadOwnerIndex',
            KeyConditionExpression: 'leadOwner = :leadOwner',
            FilterExpression: 'tenantId = :tenantId AND isDeleted = :isDeleted',
            ExpressionAttributeValues: {
                ':leadOwner': leadOwner,
                ':tenantId': tenantId,
                ':isDeleted': false
            }
        }));
        return (result.Items || []);
    }
    // RBAC-aware method: Get leads by owner with role-based access control
    async getLeadsByOwnerForUser(leadOwner, user) {
        console.log(`🔐 [LeadsService.getLeadsByOwnerForUser] Getting leads for owner ${leadOwner} by user: ${user.email} (${user.role})`);
        return leadsRBAC_1.leadsRBACService.getLeadsByOwnerForUser(leadOwner, user);
    }
    // Get lead by email (returns first match - multiple leads can have the same email)
    async getLeadByEmail(email, tenantId, userId) {
        // Use EmailIndex GSI for efficient email-based queries
        // Assumption: EmailIndex exists with email as partition key
        const result = await dynamoClient_1.docClient.send(new lib_dynamodb_1.QueryCommand({
            TableName: this.tableName,
            IndexName: 'EmailIndex',
            KeyConditionExpression: 'email = :email',
            FilterExpression: 'tenantId = :tenantId AND isDeleted = :isDeleted',
            ExpressionAttributeValues: {
                ':email': email,
                ':tenantId': tenantId,
                ':isDeleted': false
            }
        }));
        const leads = result.Items || [];
        return leads.length > 0 ? leads[0] : null;
    }
    // Get all leads by email (useful when multiple leads can have the same email)
    async getAllLeadsByEmail(email, tenantId, userId) {
        // Use EmailIndex GSI for efficient email-based queries
        // Assumption: EmailIndex exists with email as partition key
        const result = await dynamoClient_1.docClient.send(new lib_dynamodb_1.QueryCommand({
            TableName: this.tableName,
            IndexName: 'EmailIndex',
            KeyConditionExpression: 'email = :email',
            FilterExpression: 'tenantId = :tenantId AND isDeleted = :isDeleted',
            ExpressionAttributeValues: {
                ':email': email,
                ':tenantId': tenantId,
                ':isDeleted': false
            }
        }));
        return (result.Items || []);
    }
    // Update lead
    async updateLead(id, input, userId, userEmail, tenantId) {
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
        const updateExpressions = [];
        const expressionAttributeNames = {};
        const expressionAttributeValues = {
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
        console.log(`🔍 [updateLead] DynamoDB result:`, result.Attributes);
        return result.Attributes;
    }
    // Soft delete lead
    async deleteLead(id, userId, userEmail, tenantId) {
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
                return false; // Lead not found or already deleted
            }
            throw error;
        }
    }
    // Restore soft deleted lead
    async restoreLead(id, userId, userEmail, tenantId) {
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
                return false; // Lead not found or not deleted
            }
            throw error;
        }
    }
    // Hard delete lead (permanent)
    async hardDeleteLead(id, tenantId) {
        try {
            // First check if lead exists and belongs to tenant
            const existingLead = await this.getLeadById(id, tenantId, '');
            if (!existingLead) {
                return false;
            }
            await dynamoClient_1.docClient.send(new lib_dynamodb_1.DeleteCommand({
                TableName: this.tableName,
                Key: { id }
            }));
            return true;
        }
        catch (error) {
            throw error;
        }
    }
    // Search leads by various criteria
    async searchLeads(tenantId, userId, searchTerm) {
        // Use TenantIndex GSI for efficient tenant-based queries, then filter by search terms
        // Assumption: TenantIndex exists with tenantId as partition key
        // Note: Text search still requires filtering, but we avoid scanning the entire table
        const result = await dynamoClient_1.docClient.send(new lib_dynamodb_1.QueryCommand({
            TableName: this.tableName,
            IndexName: 'TenantIndex',
            KeyConditionExpression: 'tenantId = :tenantId',
            FilterExpression: 'isDeleted = :isDeleted AND (contains(firstName, :searchTerm) OR contains(lastName, :searchTerm) OR contains(company, :searchTerm) OR contains(email, :searchTerm))',
            ExpressionAttributeValues: {
                ':tenantId': tenantId,
                ':isDeleted': false,
                ':searchTerm': searchTerm
            }
        }));
        return (result.Items || []);
    }
    // RBAC-aware method: Search leads with role-based access control
    async searchLeadsForUser(user, searchTerm) {
        console.log(`🔐 [LeadsService.searchLeadsForUser] Searching leads for term "${searchTerm}" by user: ${user.email} (${user.role})`);
        return leadsRBAC_1.leadsRBACService.searchLeadsForUser(user, searchTerm);
    }
    // Get leads stats for analytics
    async getLeadsStats(tenantId, userId) {
        // Use TenantIndex GSI for efficient tenant-based queries
        // Assumption: TenantIndex exists with tenantId as partition key
        const result = await dynamoClient_1.docClient.send(new lib_dynamodb_1.QueryCommand({
            TableName: this.tableName,
            IndexName: 'TenantIndex',
            KeyConditionExpression: 'tenantId = :tenantId',
            FilterExpression: 'isDeleted = :isDeleted',
            ExpressionAttributeValues: {
                ':tenantId': tenantId,
                ':isDeleted': false
            }
        }));
        const leads = result.Items || [];
        // Calculate statistics
        const byStatus = {};
        const bySource = {};
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
exports.LeadsService = LeadsService;
// Export singleton instance
exports.leadsService = new LeadsService();
