"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkPermission = checkPermission;
exports.canCreate = canCreate;
exports.canView = canView;
exports.canEdit = canEdit;
exports.canDelete = canDelete;
exports.getAccessibleResources = getAccessibleResources;
exports.createPermissionFilter = createPermissionFilter;
const dynamoClient_1 = require("../services/dynamoClient");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
// Role hierarchy and permissions
const ROLE_HIERARCHY = {
    SUPER_ADMIN: 4,
    ADMIN: 3,
    SALES_MANAGER: 2,
    SALES_REP: 1
};
// Permission matrix - defines what each role can do
const PERMISSIONS = {
    SUPER_ADMIN: {
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
    ADMIN: {
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
    SALES_MANAGER: {
        lead: ['view', 'edit', 'delete', 'create'],
        contact: ['view', 'edit', 'delete', 'create'],
        deal: ['view', 'edit', 'delete', 'create'],
        product: ['view', 'edit', 'delete', 'create'],
        quote: ['view', 'edit', 'delete', 'create'],
        task: ['view', 'edit', 'delete', 'create'],
        subsidiary: ['view'], // Can only view subsidiaries
        dealer: ['view'], // Can only view dealers
        user: ['view'] // Can view users for dropdowns and team management
    },
    SALES_REP: {
        lead: ['view', 'edit', 'delete', 'create'],
        contact: ['view', 'edit', 'delete', 'create'],
        deal: ['view', 'edit', 'delete', 'create'],
        product: ['view', 'edit', 'delete', 'create'],
        quote: ['view', 'edit', 'delete', 'create'],
        task: ['view', 'edit', 'delete', 'create'],
        subsidiary: [], // Cannot access subsidiaries
        dealer: [], // Cannot access dealers
        user: ['view'] // Can view users for dropdowns and display names
    }
};
/**
 * Check if a user has permission to perform an action on a resource
 */
async function checkPermission(user, action, resource, resourceType) {
    try {
        // Normalize user role
        const userRole = normalizeRole(user.role);
        // If resource is a string (resource type), check if user can perform action on that type
        if (typeof resource === 'string') {
            const resourceTypeStr = resource;
            return PERMISSIONS[userRole]?.[resourceTypeStr]?.includes(action) || false;
        }
        // If resource is an object, check ownership and permissions
        const resourceObj = resource;
        const actualResourceType = resourceType || inferResourceType(resourceObj);
        // Check if user has permission for this resource type and action
        if (!PERMISSIONS[userRole]?.[actualResourceType]?.includes(action)) {
            return false;
        }
        // SUPER_ADMIN has full access to all resources across all tenants
        if (userRole === 'SUPER_ADMIN') {
            return true;
        }
        // Admin has full access to all resources in their tenant
        if (userRole === 'ADMIN') {
            return resourceObj.tenantId === user.tenantId;
        }
        // Manager can access their own resources and resources created by their reporting reps
        if (userRole === 'SALES_MANAGER') {
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
        if (userRole === 'SALES_REP') {
            return resourceObj.createdBy === user.userId;
        }
        return false;
    }
    catch (error) {
        console.error('Error checking permission:', error);
        return false;
    }
}
/**
 * Get all sales representatives that report to a manager
 */
async function getReportingReps(managerId) {
    try {
        const result = await dynamoClient_1.docClient.send(new lib_dynamodb_1.ScanCommand({
            TableName: dynamoClient_1.TABLES.USERS,
            FilterExpression: 'reportingTo = :managerId AND #role = :role AND isDeleted = :isDeleted',
            ExpressionAttributeNames: {
                '#role': 'role'
            },
            ExpressionAttributeValues: {
                ':managerId': managerId,
                ':role': 'SALES_REP',
                ':isDeleted': false
            }
        }));
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
    }
    catch (error) {
        console.error('Error getting reporting reps:', error);
        return [];
    }
}
/**
 * Normalize role string to our internal format
 */
function normalizeRole(role) {
    const normalized = role.toUpperCase();
    if (normalized === 'SUPER_ADMIN')
        return 'SUPER_ADMIN';
    if (normalized === 'ADMIN')
        return 'ADMIN';
    if (normalized === 'SALES_MANAGER' || normalized === 'MANAGER')
        return 'SALES_MANAGER';
    if (normalized === 'SALES_REP' || normalized === 'REP')
        return 'SALES_REP';
    return 'SALES_REP'; // Default to SALES_REP
}
/**
 * Infer resource type from resource object
 */
function inferResourceType(resource) {
    // Check for common fields to infer type
    if (resource.hasOwnProperty('leadOwner'))
        return 'lead';
    if (resource.hasOwnProperty('dealOwner'))
        return 'deal';
    if (resource.hasOwnProperty('assignee'))
        return 'task';
    if (resource.hasOwnProperty('quoteOwner'))
        return 'quote';
    if (resource.hasOwnProperty('category'))
        return 'product';
    if (resource.hasOwnProperty('companyName'))
        return 'contact';
    if (resource.hasOwnProperty('registrationNumber'))
        return 'subsidiary';
    if (resource.hasOwnProperty('website'))
        return 'dealer';
    if (resource.hasOwnProperty('role'))
        return 'user';
    return 'lead'; // Default fallback
}
/**
 * Check if user can create a specific resource type
 */
async function canCreate(user, resourceType) {
    return checkPermission(user, 'create', resourceType);
}
/**
 * Check if user can view a specific resource
 */
async function canView(user, resource, resourceType) {
    return checkPermission(user, 'view', resource, resourceType);
}
/**
 * Check if user can edit a specific resource
 */
async function canEdit(user, resource, resourceType) {
    return checkPermission(user, 'edit', resource, resourceType);
}
/**
 * Check if user can delete a specific resource
 */
async function canDelete(user, resource, resourceType) {
    return checkPermission(user, 'delete', resource, resourceType);
}
/**
 * Get all resources a user can access (for filtering queries)
 */
async function getAccessibleResources(user, resourceType) {
    const userRole = normalizeRole(user.role);
    if (userRole === 'SUPER_ADMIN') {
        // SUPER_ADMIN can access all resources across all tenants
        return ['*']; // Special marker for all resources
    }
    if (userRole === 'ADMIN') {
        // Admin can access all resources in their tenant
        return ['*']; // Special marker for all resources
    }
    if (userRole === 'SALES_MANAGER') {
        // Manager can access their own resources and their reporting reps' resources
        const reportingReps = await getReportingReps(user.userId);
        const repIds = reportingReps.map(rep => rep.userId);
        return [user.userId, ...repIds];
    }
    if (userRole === 'SALES_REP') {
        // Rep can only access their own resources
        return [user.userId];
    }
    return [];
}
/**
 * Create a filter expression for DynamoDB queries based on user permissions
 */
async function createPermissionFilter(user, resourceType) {
    const accessibleResources = await getAccessibleResources(user, resourceType);
    if (accessibleResources.includes('*')) {
        // SUPER_ADMIN or Admin - no filter needed (all resources accessible)
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
        const expressionAttributeValues = {};
        const expressionAttributeNames = {
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
