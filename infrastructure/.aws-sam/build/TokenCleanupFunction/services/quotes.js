"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.quotesService = void 0;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const uuid_1 = require("uuid");
const dynamoClient_1 = require("./dynamoClient");
const quotesRBAC_1 = require("./quotesRBAC");
const client = new client_dynamodb_1.DynamoDBClient({});
const docClient = lib_dynamodb_1.DynamoDBDocumentClient.from(client);
class QuotesService {
    constructor() {
        this.tableName = dynamoClient_1.TABLES.QUOTES;
    }
    async getAllQuotes(userId, tenantId) {
        try {
            const command = new lib_dynamodb_1.ScanCommand({
                TableName: this.tableName,
                FilterExpression: 'tenantId = :tenantId AND isDeleted = :isDeleted',
                ExpressionAttributeValues: {
                    ':tenantId': tenantId,
                    ':isDeleted': false
                }
            });
            const response = await docClient.send(command);
            return response.Items?.map(item => this.mapDynamoItemToQuote(item)) || [];
        }
        catch (error) {
            console.error('Error getting all quotes:', error);
            throw new Error('Failed to retrieve quotes');
        }
    }
    async getQuoteById(id, userId, tenantId) {
        try {
            const command = new lib_dynamodb_1.GetCommand({
                TableName: this.tableName,
                Key: { id }
            });
            const response = await docClient.send(command);
            if (!response.Item || response.Item.isDeleted || response.Item.tenantId !== tenantId) {
                return null;
            }
            return this.mapDynamoItemToQuote(response.Item);
        }
        catch (error) {
            console.error('Error getting quote by ID:', error);
            throw new Error('Failed to retrieve quote');
        }
    }
    async createQuote(quoteData) {
        const timestamp = new Date().toISOString();
        const quoteId = (0, uuid_1.v4)();
        const quote = {
            id: quoteId,
            ...quoteData,
            createdAt: timestamp,
            updatedAt: timestamp,
            isDeleted: false
        };
        try {
            await docClient.send(new lib_dynamodb_1.PutCommand({
                TableName: this.tableName,
                Item: quote
            }));
            console.log(`✅ Quote created successfully - ID: ${quoteId}`);
            return quote;
        }
        catch (error) {
            console.error(`❌ Error creating quote:`, error);
            throw error;
        }
    }
    async updateQuote(id, updateData, userId, tenantId) {
        try {
            // First, get the existing quote to ensure it exists and belongs to the tenant
            const existingQuote = await this.getQuoteById(id, userId, tenantId);
            if (!existingQuote) {
                return null;
            }
            const timestamp = new Date().toISOString();
            const updatedQuote = {
                ...existingQuote,
                ...updateData,
                updatedAt: timestamp,
                updatedBy: userId
            };
            await docClient.send(new lib_dynamodb_1.PutCommand({
                TableName: this.tableName,
                Item: updatedQuote
            }));
            console.log(`✅ Quote updated successfully - ID: ${id}`);
            return updatedQuote;
        }
        catch (error) {
            console.error(`❌ Error updating quote:`, error);
            throw error;
        }
    }
    async deleteQuote(id, userId, tenantId) {
        try {
            // First, get the existing quote to ensure it exists and belongs to the tenant
            const existingQuote = await this.getQuoteById(id, userId, tenantId);
            if (!existingQuote) {
                return false;
            }
            const timestamp = new Date().toISOString();
            const deletedQuote = {
                ...existingQuote,
                isDeleted: true,
                deletedBy: userId,
                deletedAt: timestamp,
                updatedAt: timestamp,
                updatedBy: userId
            };
            await docClient.send(new lib_dynamodb_1.PutCommand({
                TableName: this.tableName,
                Item: deletedQuote
            }));
            console.log(`✅ Quote deleted successfully - ID: ${id}`);
            return true;
        }
        catch (error) {
            console.error(`❌ Error deleting quote:`, error);
            throw error;
        }
    }
    async getQuotesByStatus(status, userId, tenantId) {
        try {
            const command = new lib_dynamodb_1.ScanCommand({
                TableName: this.tableName,
                FilterExpression: 'tenantId = :tenantId AND status = :status AND isDeleted = :isDeleted',
                ExpressionAttributeValues: {
                    ':tenantId': tenantId,
                    ':status': status,
                    ':isDeleted': false
                }
            });
            const response = await docClient.send(command);
            return response.Items?.map(item => this.mapDynamoItemToQuote(item)) || [];
        }
        catch (error) {
            console.error('Error getting quotes by status:', error);
            throw new Error('Failed to retrieve quotes by status');
        }
    }
    mapQuoteToDynamoItem(quote) {
        return quote;
    }
    mapDynamoItemToQuote(item) {
        return item;
    }
    // RBAC-aware method: Get quotes for user based on role and permissions
    async getQuotesForUser(user, includeDeleted = false) {
        console.log(`🔐 [QuotesService.getQuotesForUser] Getting quotes for user: ${user.email} (${user.role})`);
        return quotesRBAC_1.quotesRBACService.getQuotesForUser(user, includeDeleted);
    }
    // RBAC-aware method: Get quote by ID with role-based access control
    async getQuoteByIdForUser(id, user) {
        console.log(`🔐 [QuotesService.getQuoteByIdForUser] Getting quote ${id} for user: ${user.email} (${user.role})`);
        return quotesRBAC_1.quotesRBACService.getQuoteByIdForUser(id, user);
    }
    // RBAC-aware method: Get quotes by owner with role-based access control
    async getQuotesByOwnerForUser(quoteOwner, user) {
        console.log(`🔐 [QuotesService.getQuotesByOwnerForUser] Getting quotes for owner ${quoteOwner} by user: ${user.email} (${user.role})`);
        return quotesRBAC_1.quotesRBACService.getQuotesByOwnerForUser(quoteOwner, user);
    }
    // RBAC-aware method: Get quotes by status with role-based access control
    async getQuotesByStatusForUser(status, user) {
        console.log(`🔐 [QuotesService.getQuotesByStatusForUser] Getting quotes for status ${status} by user: ${user.email} (${user.role})`);
        return quotesRBAC_1.quotesRBACService.getQuotesByStatusForUser(status, user);
    }
    // RBAC-aware method: Get quotes by validity with role-based access control
    async getQuotesByValidityForUser(isValid, user) {
        console.log(`🔐 [QuotesService.getQuotesByValidityForUser] Getting ${isValid ? 'valid' : 'expired'} quotes by user: ${user.email} (${user.role})`);
        return quotesRBAC_1.quotesRBACService.getQuotesByValidityForUser(isValid, user);
    }
    // RBAC-aware method: Search quotes with role-based access control
    async searchQuotesForUser(user, searchTerm) {
        console.log(`🔐 [QuotesService.searchQuotesForUser] Searching quotes for term "${searchTerm}" by user: ${user.email} (${user.role})`);
        return quotesRBAC_1.quotesRBACService.searchQuotesForUser(user, searchTerm);
    }
    // RBAC-aware method: Get quote statistics with role-based access control
    async getQuotesStatsForUser(user) {
        console.log(`🔐 [QuotesService.getQuotesStatsForUser] Getting quote stats for user: ${user.email} (${user.role})`);
        return quotesRBAC_1.quotesRBACService.getQuotesStatsForUser(user);
    }
}
exports.quotesService = new QuotesService();
