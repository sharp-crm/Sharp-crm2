"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.contactsService = exports.ContactsService = void 0;
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const uuid_1 = require("uuid");
const dynamoClient_1 = require("../services/dynamoClient");
const contactsRBAC_1 = require("./contactsRBAC");
class ContactsService {
    constructor() {
        this.tableName = dynamoClient_1.TABLES.CONTACTS;
    }
    // Create a new contact
    async createContact(input, userId, userEmail, tenantId) {
        const timestamp = new Date().toISOString();
        const contactId = (0, uuid_1.v4)();
        const contact = {
            id: contactId,
            contactOwner: input.contactOwner,
            firstName: input.firstName,
            lastName: input.lastName,
            companyName: input.companyName,
            email: input.email,
            leadSource: input.leadSource,
            phone: input.phone,
            title: input.title,
            department: input.department,
            street: input.street,
            area: input.area,
            city: input.city,
            state: input.state,
            country: input.country,
            zipCode: input.zipCode,
            description: input.description,
            status: input.status || 'Active',
            notes: input.notes || '',
            relatedProductIds: input.relatedProductIds || [],
            relatedQuoteIds: input.relatedQuoteIds || [],
            createdBy: userEmail,
            createdAt: timestamp,
            updatedBy: userEmail,
            updatedAt: timestamp,
            isDeleted: false,
            userId,
            tenantId
        };
        await dynamoClient_1.docClient.send(new lib_dynamodb_1.PutCommand({
            TableName: this.tableName,
            Item: contact,
            ConditionExpression: 'attribute_not_exists(id)'
        }));
        return contact;
    }
    // Get contact by ID (with tenant and visibility check)
    async getContactById(id, tenantId, userId) {
        const result = await dynamoClient_1.docClient.send(new lib_dynamodb_1.GetCommand({
            TableName: this.tableName,
            Key: { id }
        }));
        if (!result.Item ||
            result.Item.tenantId !== tenantId ||
            result.Item.isDeleted) {
            return null;
        }
        return result.Item;
    }
    // Get all contacts for a tenant (excluding soft deleted)
    async getContactsByTenant(tenantId, userId, includeDeleted = false) {
        console.log('🔍 getContactsByTenant called with:', { tenantId, userId, includeDeleted });
        // Use QueryCommand with TenantIndex GSI for better performance instead of ScanCommand
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
    // RBAC-aware method: Get contacts for user based on role and permissions
    async getContactsForUser(user, includeDeleted = false) {
        console.log(`🔐 [ContactsService.getContactsForUser] Getting contacts for user: ${user.email} (${user.role})`);
        return contactsRBAC_1.contactsRBACService.getContactsForUser(user, includeDeleted);
    }
    // RBAC-aware method: Get contact by ID with role-based access control
    async getContactByIdForUser(id, user) {
        console.log(`🔐 [ContactsService.getContactByIdForUser] Getting contact ${id} for user: ${user.email} (${user.role})`);
        return contactsRBAC_1.contactsRBACService.getContactByIdForUser(id, user);
    }
    // Get contacts by owner
    async getContactsByOwner(contactOwner, tenantId, userId) {
        const result = await dynamoClient_1.docClient.send(new lib_dynamodb_1.QueryCommand({
            TableName: this.tableName,
            IndexName: 'ContactOwnerIndex',
            KeyConditionExpression: 'contactOwner = :contactOwner',
            FilterExpression: 'tenantId = :tenantId AND isDeleted = :isDeleted',
            ExpressionAttributeValues: {
                ':contactOwner': contactOwner,
                ':tenantId': tenantId,
                ':isDeleted': false
            }
        }));
        return (result.Items || []);
    }
    // RBAC-aware method: Get contacts by owner with role-based access control
    async getContactsByOwnerForUser(contactOwner, user) {
        console.log(`🔐 [ContactsService.getContactsByOwnerForUser] Getting contacts for owner ${contactOwner} by user: ${user.email} (${user.role})`);
        return contactsRBAC_1.contactsRBACService.getContactsByOwnerForUser(contactOwner, user);
    }
    // Get contact by email
    async getContactByEmail(email, tenantId, userId) {
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
        const contacts = result.Items || [];
        return contacts.length > 0 ? contacts[0] : null;
    }
    // Update contact
    async updateContact(id, input, userId, userEmail, tenantId) {
        // First check if contact exists and belongs to tenant
        const existingContact = await this.getContactById(id, tenantId, userId);
        if (!existingContact) {
            return null;
        }
        const timestamp = new Date().toISOString();
        // Build update expression dynamically
        const updateExpressions = [];
        const expressionAttributeNames = {};
        const expressionAttributeValues = {
            ':updatedBy': userEmail,
            ':updatedAt': timestamp,
            ':tenantId': tenantId,
            ':isDeleted': false
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
        try {
            const result = await dynamoClient_1.docClient.send(new lib_dynamodb_1.UpdateCommand({
                TableName: this.tableName,
                Key: { id },
                UpdateExpression: updateExpression,
                ExpressionAttributeNames: expressionAttributeNames,
                ExpressionAttributeValues: expressionAttributeValues,
                ConditionExpression: 'tenantId = :tenantId AND isDeleted = :isDeleted',
                ReturnValues: 'ALL_NEW'
            }));
            return result.Attributes;
        }
        catch (error) {
            console.error('Error updating contact:', error);
            return null;
        }
    }
    // Soft delete contact
    async deleteContact(id, userId, userEmail, tenantId) {
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
                return false; // Contact not found or already deleted
            }
            throw error;
        }
    }
    // Restore soft deleted contact
    async restoreContact(id, userId, userEmail, tenantId) {
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
                return false; // Contact not found or not deleted
            }
            throw error;
        }
    }
    // Hard delete contact (permanent deletion)
    async hardDeleteContact(id, tenantId) {
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
                return false; // Contact not found
            }
            throw error;
        }
    }
    // Search contacts by various criteria
    async searchContacts(tenantId, userId, searchTerm) {
        // Use QueryCommand with TenantIndex GSI for better performance instead of ScanCommand
        // Search filtering is applied through FilterExpression after the efficient tenant-based query
        const result = await dynamoClient_1.docClient.send(new lib_dynamodb_1.QueryCommand({
            TableName: this.tableName,
            IndexName: 'TenantIndex',
            KeyConditionExpression: 'tenantId = :tenantId',
            FilterExpression: 'isDeleted = :isDeleted AND (contains(firstName, :searchTerm) OR contains(companyName, :searchTerm) OR contains(email, :searchTerm))',
            ExpressionAttributeValues: {
                ':tenantId': tenantId,
                ':isDeleted': false,
                ':searchTerm': searchTerm
            }
        }));
        return (result.Items || []);
    }
    // RBAC-aware method: Search contacts with role-based access control
    async searchContactsForUser(user, searchTerm) {
        console.log(`🔐 [ContactsService.searchContactsForUser] Searching contacts for term "${searchTerm}" by user: ${user.email} (${user.role})`);
        return contactsRBAC_1.contactsRBACService.searchContactsForUser(user, searchTerm);
    }
    // Get contacts stats for analytics
    async getContactsStats(tenantId, userId) {
        // Use QueryCommand with TenantIndex GSI for better performance instead of ScanCommand
        // Stats calculation is done in memory after efficient tenant-based query
        const result = await dynamoClient_1.docClient.send(new lib_dynamodb_1.QueryCommand({
            TableName: this.tableName,
            IndexName: 'TenantIndex',
            KeyConditionExpression: 'tenantId = :tenantId',
            ExpressionAttributeValues: {
                ':tenantId': tenantId
            }
        }));
        const contacts = (result.Items || []);
        const stats = {
            total: contacts.length,
            active: contacts.filter(c => !c.isDeleted).length,
            deleted: contacts.filter(c => c.isDeleted).length,
            byStatus: {},
            bySource: {}
        };
        // Count by status and source (only non-deleted contacts)
        contacts.filter(c => !c.isDeleted).forEach(contact => {
            const status = contact.status || 'Unknown';
            const source = contact.leadSource || 'Unknown';
            stats.byStatus[status] = (stats.byStatus[status] || 0) + 1;
            stats.bySource[source] = (stats.bySource[source] || 0) + 1;
        });
        return stats;
    }
}
exports.ContactsService = ContactsService;
exports.contactsService = new ContactsService();
