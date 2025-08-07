import { docClient, TABLES } from '../services/dynamoClient';
import { ScanCommand } from '@aws-sdk/lib-dynamodb';

export interface User {
  id: string;
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'manager' | 'rep';
  tenantId: string;
  reportingTo?: string;
  createdBy?: string;
  isDeleted?: boolean;
}

export interface Resource {
  id: string;
  createdBy: string;
  tenantId: string;
  [key: string]: any;
}

export type Action = 'view' | 'edit' | 'delete' | 'create';
export type ResourceType = 'lead' | 'contact' | 'deal' | 'product' | 'quote' | 'task' | 'subsidiary' | 'dealer' | 'user';

// Role hierarchy and permissions
const ROLE_HIERARCHY = {
  admin: 3,
  manager: 2,
  rep: 1
};

// Permission matrix - defines what each role can do
const PERMISSIONS: Record<'admin' | 'manager' | 'rep', Record<ResourceType, Action[]>> = {
  admin: {
    lead: ['view', 'edit', 'delete', 'create'],
    contact: ['view', 'edit', 'delete', 'create'],
    deal: ['view', 'edit', 'delete', 'create'],
    product: ['view', 'edit', 'delete', 'create'],
    quote: ['view', 'edit', 'delete', 'create'],
    task: ['view', 'edit', 'delete', 'create'],
    subsidiary: ['view', 'edit', 'delete', 'create'],
    dealer: ['view', 'edit', 'delete', 'create'],
    user: ['view', 'edit', 'delete', 'create']
  },
  manager: {
    lead: ['view', 'edit', 'delete', 'create'],
    contact: ['view', 'edit', 'delete', 'create'],
    deal: ['view', 'edit', 'delete', 'create'],
    product: ['view', 'edit', 'delete', 'create'],
    quote: ['view', 'edit', 'delete', 'create'],
    task: ['view', 'edit', 'delete', 'create'],
    subsidiary: ['view'], // Can only view subsidiaries
    dealer: ['view'], // Can only view dealers
    user: [] // Cannot manage users
  },
  rep: {
    lead: ['view', 'edit', 'delete', 'create'],
    contact: ['view', 'edit', 'delete', 'create'],
    deal: ['view', 'edit', 'delete', 'create'],
    product: ['view', 'edit', 'delete', 'create'],
    quote: ['view', 'edit', 'delete', 'create'],
    task: ['view', 'edit', 'delete', 'create'],
    subsidiary: [], // Cannot access subsidiaries
    dealer: [], // Cannot access dealers
    user: [] // Cannot manage users
  }
};

/**
 * Check if a user has permission to perform an action on a resource
 */
export async function checkPermission(
  user: User,
  action: Action,
  resource: Resource | ResourceType,
  resourceType?: ResourceType
): Promise<boolean> {
  try {
    // Normalize user role
    const userRole = normalizeRole(user.role);
    
    // If resource is a string (resource type), check if user can perform action on that type
    if (typeof resource === 'string') {
      const resourceTypeStr = resource as ResourceType;
      return PERMISSIONS[userRole]?.[resourceTypeStr]?.includes(action) || false;
    }

    // If resource is an object, check ownership and permissions
    const resourceObj = resource as Resource;
    const actualResourceType = resourceType || inferResourceType(resourceObj);
    
    // Check if user has permission for this resource type and action
    if (!PERMISSIONS[userRole]?.[actualResourceType]?.includes(action)) {
      return false;
    }

    // Admin has full access to all resources in their tenant
    if (userRole === 'admin') {
      return resourceObj.tenantId === user.tenantId;
    }

    // Manager can access their own resources and resources created by their reporting reps
    if (userRole === 'manager') {
      // Own resources
      if (resourceObj.createdBy === user.userId) {
        return true;
      }
      
      // Resources created by reporting reps
      const reportingReps = await getReportingReps(user.userId);
      if (reportingReps.some(rep => rep.userId === resourceObj.createdBy)) {
        return true;
      }
      
      return false;
    }

    // Rep can only access their own resources
    if (userRole === 'rep') {
      return resourceObj.createdBy === user.userId;
    }

    return false;
  } catch (error) {
    console.error('Error checking permission:', error);
    return false;
  }
}

/**
 * Get all sales representatives that report to a manager
 */
async function getReportingReps(managerId: string): Promise<User[]> {
  try {
    const result = await docClient.send(
      new ScanCommand({
        TableName: TABLES.USERS,
        FilterExpression: 'reportingTo = :managerId AND #role = :role AND isDeleted = :isDeleted',
        ExpressionAttributeNames: {
          '#role': 'role'
        },
        ExpressionAttributeValues: {
          ':managerId': managerId,
          ':role': 'rep',
          ':isDeleted': false
        }
      })
    );

    return (result.Items || []).map(item => ({
      id: item.userId,
      userId: item.userId,
      email: item.email,
      firstName: item.firstName || '',
      lastName: item.lastName || '',
      role: normalizeRole(item.role),
      tenantId: item.tenantId,
      reportingTo: item.reportingTo,
      createdBy: item.createdBy,
      isDeleted: item.isDeleted
    }));
  } catch (error) {
    console.error('Error getting reporting reps:', error);
    return [];
  }
}

/**
 * Normalize role string to our internal format
 */
function normalizeRole(role: string): 'admin' | 'manager' | 'rep' {
  const normalized = role.toLowerCase();
  if (normalized === 'admin' || normalized === 'super_admin') return 'admin';
  if (normalized === 'manager' || normalized === 'sales_manager') return 'manager';
  if (normalized === 'rep' || normalized === 'sales_rep') return 'rep';
  return 'rep'; // Default to rep
}

/**
 * Infer resource type from resource object
 */
function inferResourceType(resource: Resource): ResourceType {
  // Check for common fields to infer type
  if (resource.hasOwnProperty('leadOwner')) return 'lead';
  if (resource.hasOwnProperty('dealOwner')) return 'deal';
  if (resource.hasOwnProperty('assignee')) return 'task';
  if (resource.hasOwnProperty('quoteOwner')) return 'quote';
  if (resource.hasOwnProperty('category')) return 'product';
  if (resource.hasOwnProperty('companyName')) return 'contact';
  if (resource.hasOwnProperty('registrationNumber')) return 'subsidiary';
  if (resource.hasOwnProperty('website')) return 'dealer';
  if (resource.hasOwnProperty('role')) return 'user';
  
  return 'lead'; // Default fallback
}

/**
 * Check if user can create a specific resource type
 */
export async function canCreate(user: User, resourceType: ResourceType): Promise<boolean> {
  return checkPermission(user, 'create', resourceType);
}

/**
 * Check if user can view a specific resource
 */
export async function canView(user: User, resource: Resource, resourceType?: ResourceType): Promise<boolean> {
  return checkPermission(user, 'view', resource, resourceType);
}

/**
 * Check if user can edit a specific resource
 */
export async function canEdit(user: User, resource: Resource, resourceType?: ResourceType): Promise<boolean> {
  return checkPermission(user, 'edit', resource, resourceType);
}

/**
 * Check if user can delete a specific resource
 */
export async function canDelete(user: User, resource: Resource, resourceType?: ResourceType): Promise<boolean> {
  return checkPermission(user, 'delete', resource, resourceType);
}

/**
 * Get all resources a user can access (for filtering queries)
 */
export async function getAccessibleResources(user: User, resourceType: ResourceType): Promise<string[]> {
  const userRole = normalizeRole(user.role);
  
  if (userRole === 'admin') {
    // Admin can access all resources in their tenant
    return ['*']; // Special marker for all resources
  }
  
  if (userRole === 'manager') {
    // Manager can access their own resources and their reporting reps' resources
    const reportingReps = await getReportingReps(user.userId);
    const repIds = reportingReps.map(rep => rep.userId);
    return [user.userId, ...repIds];
  }
  
  if (userRole === 'rep') {
    // Rep can only access their own resources
    return [user.userId];
  }
  
  return [];
}

/**
 * Create a filter expression for DynamoDB queries based on user permissions
 */
export async function createPermissionFilter(user: User, resourceType: ResourceType): Promise<{
  filterExpression?: string;
  expressionAttributeValues?: Record<string, any>;
  expressionAttributeNames?: Record<string, string>;
}> {
  const accessibleResources = await getAccessibleResources(user, resourceType);
  
  if (accessibleResources.includes('*')) {
    // Admin - no filter needed (all resources accessible)
    return {};
  }
  
  if (accessibleResources.length === 1) {
    // Single user (rep or manager's own resources)
    return {
      filterExpression: 'createdBy = :userId',
      expressionAttributeValues: {
        ':userId': accessibleResources[0]
      }
    };
  }
  
  if (accessibleResources.length > 1) {
    // Multiple users (manager with reporting reps)
    const placeholders = accessibleResources.map((_, index) => `:userId${index}`).join(', ');
    const expressionAttributeValues: Record<string, any> = {};
    const expressionAttributeNames: Record<string, string> = {
      '#createdBy': 'createdBy'
    };
    
    accessibleResources.forEach((userId, index) => {
      expressionAttributeValues[`:userId${index}`] = userId;
    });
    
    return {
      filterExpression: `#createdBy IN (${placeholders})`,
      expressionAttributeValues,
      expressionAttributeNames
    };
  }
  
  // No access
  return {
    filterExpression: 'createdBy = :noAccess',
    expressionAttributeValues: {
      ':noAccess': 'NO_ACCESS'
    }
  };
} 