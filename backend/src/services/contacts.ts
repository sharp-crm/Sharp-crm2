import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand, QueryCommand, DeleteCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { docClient, TABLES } from '../services/dynamoClient';

// Contact interface based on AddNewModal fields + auditing
export interface Contact {
  id: string;
  // Required fields from AddNewModal
  contactOwner: string;
  firstName: string;
  lastName: string;
  companyName: string;
  email: string;
  leadSource: string;
  
  // Optional fields from AddNewModal
  phone?: string;
  title?: string;
  department?: string;
  
  // Address fields
  street?: string;
  area?: string;
  city?: string;
  state?: string;
  country?: string;
  zipCode?: string;
  
  // Additional fields
  description?: string;
  status?: string;
  notes?: string;
  relatedProductIds?: string[]; // Array of product IDs related to this contact
  relatedQuoteIds?: string[]; // Array of quote IDs related to this contact
  
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

export interface CreateContactInput {
  contactOwner: string;
  firstName: string;
  lastName: string;
  companyName: string;
  email: string;
  leadSource: string;
  phone?: string;
  title?: string;
  department?: string;
  street?: string;
  area?: string;
  city?: string;
  state?: string;
  country?: string;
  zipCode?: string;
  description?: string;
  status?: string;
  notes?: string;
  relatedProductIds?: string[]; // Array of product IDs related to this contact
  relatedQuoteIds?: string[]; // Array of quote IDs related to this contact
}

export interface UpdateContactInput {
  contactOwner?: string;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  email?: string;
  leadSource?: string;
  phone?: string;
  title?: string;
  department?: string;
  street?: string;
  area?: string;
  city?: string;
  state?: string;
  country?: string;
  zipCode?: string;
  description?: string;
  status?: string;
  notes?: string;
  relatedProductIds?: string[]; // Array of product IDs related to this contact
  relatedQuoteIds?: string[]; // Array of quote IDs related to this contact
}

export class ContactsService {
  private tableName = TABLES.CONTACTS;

  // Create a new contact
  async createContact(input: CreateContactInput, userId: string, userEmail: string, tenantId: string): Promise<Contact> {
    const timestamp = new Date().toISOString();
    const contactId = uuidv4();

    const contact: Contact = {
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

    await docClient.send(new PutCommand({
      TableName: this.tableName,
      Item: contact,
      ConditionExpression: 'attribute_not_exists(id)'
    }));

    return contact;
  }

  // Get contact by ID (with tenant and visibility check)
  async getContactById(id: string, tenantId: string, userId: string): Promise<Contact | null> {
    const result = await docClient.send(new GetCommand({
      TableName: this.tableName,
      Key: { id }
    }));

    if (!result.Item || 
        result.Item.tenantId !== tenantId || 
        result.Item.isDeleted ||
        (result.Item.createdBy !== userId)) {
      return null;
    }

    return result.Item as Contact;
  }

  // Get all contacts for a tenant (excluding soft deleted)
  async getContactsByTenant(tenantId: string, userId: string, includeDeleted = false): Promise<Contact[]> {
    console.log('🔍 getContactsByTenant called with:', { tenantId, userId, includeDeleted });
    
    // Use ScanCommand instead of QueryCommand since TenantIdIndex doesn't exist
    const result = await docClient.send(new ScanCommand({
      TableName: this.tableName,
      FilterExpression: includeDeleted 
        ? 'tenantId = :tenantId AND (attribute_not_exists(visibleTo) OR size(visibleTo) = :zero OR contains(visibleTo, :userId) OR createdBy = :userId)'
        : 'tenantId = :tenantId AND isDeleted = :isDeleted AND (attribute_not_exists(visibleTo) OR size(visibleTo) = :zero OR contains(visibleTo, :userId) OR createdBy = :userId)',
      ExpressionAttributeValues: {
        ':tenantId': tenantId,
        ':userId': userId,
        ':zero': 0,
        ...(includeDeleted ? {} : { ':isDeleted': false })
      }
    }));

    return (result.Items || []) as Contact[];
  }

  // Get contacts by owner
  async getContactsByOwner(contactOwner: string, tenantId: string, userId: string): Promise<Contact[]> {
    const result = await docClient.send(new QueryCommand({
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

    return (result.Items || []) as Contact[];
  }

  // Get contact by email
  async getContactByEmail(email: string, tenantId: string, userId?: string): Promise<Contact | null> {
    const result = await docClient.send(new QueryCommand({
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
    return contacts.length > 0 ? contacts[0] as Contact : null;
  }

  // Update contact
  async updateContact(id: string, input: UpdateContactInput, userId: string, userEmail: string, tenantId: string): Promise<Contact | null> {
    // First check if contact exists and belongs to tenant
    const existingContact = await this.getContactById(id, tenantId, userId);
    if (!existingContact) {
      return null;
    }

    const timestamp = new Date().toISOString();
    
    // Build update expression dynamically
    const updateExpressions: string[] = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, any> = {
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
      const result = await docClient.send(new UpdateCommand({
        TableName: this.tableName,
        Key: { id },
        UpdateExpression: updateExpression,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
        ConditionExpression: 'tenantId = :tenantId AND isDeleted = :isDeleted',
        ReturnValues: 'ALL_NEW'
      }));

      return result.Attributes as Contact;
    } catch (error) {
      console.error('Error updating contact:', error);
      return null;
    }
  }

  // Soft delete contact
  async deleteContact(id: string, userId: string, userEmail: string, tenantId: string): Promise<boolean> {
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
        return false; // Contact not found or already deleted
      }
      throw error;
    }
  }

  // Restore soft deleted contact
  async restoreContact(id: string, userId: string, userEmail: string, tenantId: string): Promise<boolean> {
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
        return false; // Contact not found or not deleted
      }
      throw error;
    }
  }

  // Hard delete contact (permanent deletion)
  async hardDeleteContact(id: string, tenantId: string): Promise<boolean> {
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
        return false; // Contact not found
      }
      throw error;
    }
  }

  // Search contacts by various criteria
  async searchContacts(tenantId: string, userId: string, searchTerm: string): Promise<Contact[]> {
    const result = await docClient.send(new ScanCommand({
      TableName: this.tableName,
      FilterExpression: 'tenantId = :tenantId AND isDeleted = :isDeleted AND (contains(firstName, :searchTerm) OR contains(companyName, :searchTerm) OR contains(email, :searchTerm))',
      ExpressionAttributeValues: {
        ':tenantId': tenantId,
        ':isDeleted': false,
        ':searchTerm': searchTerm
      }
    }));

    return (result.Items || []) as Contact[];
  }

  // Get contacts stats for analytics
  async getContactsStats(tenantId: string, userId: string): Promise<{
    total: number;
    active: number;
    deleted: number;
    byStatus: Record<string, number>;
    bySource: Record<string, number>;
  }> {
    const result = await docClient.send(new ScanCommand({
      TableName: this.tableName,
      FilterExpression: 'tenantId = :tenantId',
      ExpressionAttributeValues: {
        ':tenantId': tenantId
      }
    }));

    const contacts = (result.Items || []) as Contact[];
    
    const stats = {
      total: contacts.length,
      active: contacts.filter(c => !c.isDeleted).length,
      deleted: contacts.filter(c => c.isDeleted).length,
      byStatus: {} as Record<string, number>,
      bySource: {} as Record<string, number>
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

export const contactsService = new ContactsService();
