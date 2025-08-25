import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, TABLES } from './dynamoClient';
import { Contact } from './contacts';

export interface RBACUser {
  userId: string;
  email: string;
  role: 'ADMIN' | 'SALES_MANAGER' | 'SALES_REP';
  tenantId: string;
  reportingTo?: string;
}

export interface ContactAccessFilter {
  filterExpression: string;
  expressionAttributeValues: Record<string, any>;
  expressionAttributeNames?: Record<string, string>;
}

export class ContactsRBACService {
  private tableName = TABLES.CONTACTS;

  /**
   * Get all contacts accessible by a user based on their role and tenant
   */
  async getContactsForUser(user: RBACUser, includeDeleted = false): Promise<Contact[]> {
    console.log(`🔐 [ContactsRBACService] Getting contacts for user: ${user.email} (${user.role}) in tenant: ${user.tenantId}`);
    
    try {
      // Use QueryCommand with TenantIndex GSI for efficient tenant-based querying
      // RBAC filtering is applied through FilterExpression after the efficient partition key query
      const baseQueryParams: any = {
        TableName: this.tableName,
        IndexName: 'TenantIndex',
        KeyConditionExpression: 'tenantId = :tenantId',
        ExpressionAttributeValues: {
          ':tenantId': user.tenantId
        }
      };

      // Add soft delete filter if needed
      if (!includeDeleted) {
        baseQueryParams.FilterExpression = 'isDeleted = :isDeleted';
        baseQueryParams.ExpressionAttributeValues[':isDeleted'] = false;
      }

      // Add role-based access filtering
      const roleFilter = await this.buildRoleBasedFilter(user);
      if (roleFilter.filterExpression) {
        const currentFilter = baseQueryParams.FilterExpression || '';
        const newFilter = currentFilter 
          ? `(${currentFilter}) AND (${roleFilter.filterExpression})`
          : roleFilter.filterExpression;
        
        baseQueryParams.FilterExpression = newFilter;
        baseQueryParams.ExpressionAttributeValues = {
          ...baseQueryParams.ExpressionAttributeValues,
          ...roleFilter.expressionAttributeValues
        };
        
        if (roleFilter.expressionAttributeNames) {
          baseQueryParams.ExpressionAttributeNames = roleFilter.expressionAttributeNames;
        }
      }
      
      console.log(`🔐 [ContactsRBACService] Query params:`, {
        filterExpression: baseQueryParams.FilterExpression,
        expressionValues: baseQueryParams.ExpressionAttributeValues,
        expressionNames: baseQueryParams.ExpressionAttributeNames
      });
      
      const result = await docClient.send(new QueryCommand(baseQueryParams));

      const contacts = (result.Items || []) as Contact[];
      console.log(`🔐 [ContactsRBACService] Retrieved ${contacts.length} contacts for user ${user.email}`);
      
      return contacts;
    } catch (error) {
      console.error(`🔐 [ContactsRBACService] Error getting contacts for user ${user.email}:`, error);
      throw error;
    }
  }

  /**
   * Get a specific contact by ID if the user has access to it
   */
  async getContactByIdForUser(contactId: string, user: RBACUser): Promise<Contact | null> {
    console.log(`🔐 [ContactsRBACService] Getting contact ${contactId} for user: ${user.email} (${user.role})`);
    
    // First get the contact
    const result = await docClient.send(new QueryCommand({
      TableName: this.tableName,
      KeyConditionExpression: 'id = :id',
      ExpressionAttributeValues: {
        ':id': contactId
      }
    }));

    if (!result.Items || result.Items.length === 0) {
      console.log(`🔐 [ContactsRBACService] Contact ${contactId} not found`);
      return null;
    }

    const contact = result.Items[0] as Contact;
    
    // Check if user has access to this contact
    const hasAccess = await this.canUserAccessContact(contact, user);
    
    if (!hasAccess) {
      console.log(`🔐 [ContactsRBACService] User ${user.email} does not have access to contact ${contactId}`);
      return null;
    }

    console.log(`🔐 [ContactsRBACService] User ${user.email} has access to contact ${contactId}`);
    return contact;
  }

  /**
   * Get contacts by owner with RBAC filtering
   */
  async getContactsByOwnerForUser(contactOwner: string, user: RBACUser): Promise<Contact[]> {
    console.log(`🔐 [ContactsRBACService] Getting contacts for owner ${contactOwner}, requested by user: ${user.email} (${user.role})`);
    
    // Check if user can access contacts owned by the specified owner
    const canAccessOwner = await this.canUserAccessContactsFromOwner(contactOwner, user);
    
    if (!canAccessOwner) {
      console.log(`🔐 [ContactsRBACService] User ${user.email} cannot access contacts from owner ${contactOwner}`);
      return [];
    }

    // Query by contactOwner using the GSI
    const result = await docClient.send(new QueryCommand({
      TableName: this.tableName,
      IndexName: 'ContactOwnerIndex',
      KeyConditionExpression: 'contactOwner = :contactOwner',
      FilterExpression: 'tenantId = :tenantId AND isDeleted = :isDeleted',
      ExpressionAttributeValues: {
        ':contactOwner': contactOwner,
        ':tenantId': user.tenantId,
        ':isDeleted': false
      }
    }));

    const contacts = (result.Items || []) as Contact[];
    console.log(`🔐 [ContactsRBACService] Retrieved ${contacts.length} contacts for owner ${contactOwner}`);
    
    return contacts;
  }

  /**
   * Search contacts with RBAC filtering
   */
  async searchContactsForUser(user: RBACUser, searchTerm: string): Promise<Contact[]> {
    console.log(`🔐 [ContactsRBACService] Searching contacts for term "${searchTerm}" by user: ${user.email} (${user.role})`);
    
    // Get all accessible contacts first
    const accessibleContacts = await this.getContactsForUser(user, false);
    
    // Filter by search term (search in firstName, lastName, companyName, email)
    const searchResults = accessibleContacts.filter(contact => {
      const searchLower = searchTerm.toLowerCase();
      return (
        contact.firstName?.toLowerCase().includes(searchLower) ||
        contact.lastName?.toLowerCase().includes(searchLower) ||
        contact.companyName?.toLowerCase().includes(searchLower) ||
        contact.email?.toLowerCase().includes(searchLower)
      );
    });

    console.log(`🔐 [ContactsRBACService] Found ${searchResults.length} contacts matching search term "${searchTerm}"`);
    return searchResults;
  }

  /**
   * Check if user can access a specific contact
   */
  private async canUserAccessContact(contact: Contact, user: RBACUser): Promise<boolean> {
    // Tenant segregation - first and most important check
    if (contact.tenantId !== user.tenantId) {
      console.log(`🔐 [ContactsRBACService] Tenant mismatch: contact.tenantId=${contact.tenantId}, user.tenantId=${user.tenantId}`);
      return false;
    }

    // Soft delete check
    if (contact.isDeleted) {
      console.log(`🔐 [ContactsRBACService] Contact ${contact.id} is soft deleted`);
      return false;
    }

    switch (user.role) {
      case 'ADMIN':
        // Admin can see all contacts in their tenant
        return true;

      case 'SALES_MANAGER':
        // Manager can see their own contacts + contacts from subordinates
        if (contact.contactOwner === user.userId) {
          return true;
        }
        
        // Check if contact owner is a subordinate
        const subordinates = await this.getSubordinates(user.userId, user.tenantId);
        return subordinates.includes(contact.contactOwner);

      case 'SALES_REP':
        // Rep can only see contacts they own
        return contact.contactOwner === user.userId;

      default:
        return false;
    }
  }

  /**
   * Check if user can access contacts from a specific owner
   */
  private async canUserAccessContactsFromOwner(ownerId: string, user: RBACUser): Promise<boolean> {
    switch (user.role) {
      case 'ADMIN':
        // Admin can access contacts from any owner in their tenant
        return true;

      case 'SALES_MANAGER':
        // Manager can access their own contacts + contacts from subordinates
        if (ownerId === user.userId) {
          return true;
        }
        
        const subordinates = await this.getSubordinates(user.userId, user.tenantId);
        return subordinates.includes(ownerId);

      case 'SALES_REP':
        // Rep can only access their own contacts
        return ownerId === user.userId;

      default:
        return false;
    }
  }

  /**
   * Get all subordinates (sales reps) that report to a manager
   */
  private async getSubordinates(managerId: string, tenantId: string): Promise<string[]> {
    try {
      // Use QueryCommand with ReportingToIndex GSI for better performance instead of ScanCommand
      // Additional filtering for role and tenant is applied through FilterExpression
      const result = await docClient.send(new QueryCommand({
        TableName: TABLES.USERS,
        IndexName: 'ReportingToIndex',
        KeyConditionExpression: 'reportingTo = :managerId',
        FilterExpression: '#role = :role AND tenantId = :tenantId AND isDeleted = :isDeleted',
        ExpressionAttributeNames: {
          '#role': 'role'
        },
        ExpressionAttributeValues: {
          ':managerId': managerId,
          ':role': 'SALES_REP',
          ':tenantId': tenantId,
          ':isDeleted': false
        }
      }));

      const subordinateIds = (result.Items || []).map(user => user.userId);
      console.log(`🔐 [ContactsRBACService] Manager ${managerId} has ${subordinateIds.length} subordinates: ${subordinateIds.join(', ')}`);
      
      return subordinateIds;
    } catch (error) {
      console.error(`🔐 [ContactsRBACService] Error getting subordinates for manager ${managerId}:`, error);
      return [];
    }
  }

  /**
   * Build role-based access filter
   */
  private async buildRoleBasedFilter(user: RBACUser): Promise<ContactAccessFilter> {
    switch (user.role) {
      case 'ADMIN':
        // Admin can see all contacts in tenant (no additional filter needed)
        // Return a filter that always evaluates to true
        return {
          filterExpression: 'attribute_exists(id)',
          expressionAttributeValues: {}
        };

      case 'SALES_MANAGER':
        // Manager can see their own contacts + subordinates' contacts
        const subordinates = await this.getSubordinates(user.userId, user.tenantId);
        const allAccessibleOwners = [user.userId, ...subordinates];
        
        if (allAccessibleOwners.length === 1) {
          return {
            filterExpression: 'contactOwner = :userId',
            expressionAttributeValues: {
              ':userId': user.userId
            }
          };
        } else {
          const placeholders = allAccessibleOwners.map((_, index) => `:owner${index}`).join(', ');
          const expressionAttributeValues: Record<string, any> = {};
          
          allAccessibleOwners.forEach((ownerId, index) => {
            expressionAttributeValues[`:owner${index}`] = ownerId;
          });
          
          return {
            filterExpression: `contactOwner IN (${placeholders})`,
            expressionAttributeValues
          };
        }

      case 'SALES_REP':
        // Rep can only see their own contacts
        return {
          filterExpression: 'contactOwner = :userId',
          expressionAttributeValues: {
            ':userId': user.userId
          }
        };

      default:
        // No access
        return {
          filterExpression: 'contactOwner = :noAccess',
          expressionAttributeValues: {
            ':noAccess': 'NO_ACCESS'
          }
        };
    }
  }
}

// Export singleton instance
export const contactsRBACService = new ContactsRBACService();
