"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireCreatePermission = exports.requireDeletePermission = exports.requireEditPermission = exports.requireViewPermission = void 0;
exports.requirePermission = requirePermission;
exports.requireOwnership = requireOwnership;
exports.filterByPermissions = filterByPermissions;
const rbac_1 = require("../utils/rbac");
/**
 * RBAC middleware factory - creates middleware for specific resource types and actions
 */
function requirePermission(action, resourceType) {
    return async (req, res, next) => {
        try {
            const user = req.user;
            if (!user) {
                res.status(401).json({ error: 'User not authenticated' });
                return;
            }
            // If resourceType is provided, check permission for the resource type
            if (resourceType) {
                const hasPermission = await (0, rbac_1.checkPermission)(user, action, resourceType);
                if (!hasPermission) {
                    res.status(403).json({
                        error: `Access denied. ${action} permission required for ${resourceType}.`
                    });
                    return;
                }
                next();
                return;
            }
            // If resource is provided in request body or params, check permission for specific resource
            let resource;
            // Try to get resource from request body
            if (req.body && req.body.id) {
                resource = req.body;
            }
            // Try to get resource from params
            if (!resource && req.params.id) {
                // For now, we'll check permission based on the resource type inferred from the route
                // In a real implementation, you'd fetch the resource from the database
                const inferredType = inferResourceTypeFromRoute(req.path);
                if (inferredType) {
                    const hasPermission = await (0, rbac_1.checkPermission)(user, action, inferredType);
                    if (!hasPermission) {
                        res.status(403).json({
                            error: `Access denied. ${action} permission required for ${inferredType}.`
                        });
                        return;
                    }
                }
                next();
                return;
            }
            // If no specific resource, check permission for resource type
            const inferredType = inferResourceTypeFromRoute(req.path);
            if (inferredType) {
                const hasPermission = await (0, rbac_1.checkPermission)(user, action, inferredType);
                if (!hasPermission) {
                    res.status(403).json({
                        error: `Access denied. ${action} permission required for ${inferredType}.`
                    });
                    return;
                }
            }
            next();
        }
        catch (error) {
            console.error('RBAC middleware error:', error);
            res.status(500).json({ error: 'Internal server error during permission check' });
        }
    };
}
/**
 * Infer resource type from route path
 */
function inferResourceTypeFromRoute(path) {
    const pathLower = path.toLowerCase();
    if (pathLower.includes('/leads'))
        return 'lead';
    if (pathLower.includes('/contacts'))
        return 'contact';
    if (pathLower.includes('/deals'))
        return 'deal';
    if (pathLower.includes('/products'))
        return 'product';
    if (pathLower.includes('/quotes'))
        return 'quote';
    if (pathLower.includes('/tasks'))
        return 'task';
    if (pathLower.includes('/subsidiaries'))
        return 'subsidiary';
    if (pathLower.includes('/dealers'))
        return 'dealer';
    if (pathLower.includes('/users'))
        return 'user';
    return null;
}
/**
 * Middleware to check if user can view resources
 */
const requireViewPermission = (resourceType) => requirePermission('view', resourceType);
exports.requireViewPermission = requireViewPermission;
/**
 * Middleware to check if user can edit resources
 */
const requireEditPermission = (resourceType) => requirePermission('edit', resourceType);
exports.requireEditPermission = requireEditPermission;
/**
 * Middleware to check if user can delete resources
 */
const requireDeletePermission = (resourceType) => requirePermission('delete', resourceType);
exports.requireDeletePermission = requireDeletePermission;
/**
 * Middleware to check if user can create resources
 */
const requireCreatePermission = (resourceType) => requirePermission('create', resourceType);
exports.requireCreatePermission = requireCreatePermission;
/**
 * Middleware to check ownership of a resource
 */
function requireOwnership(resourceType) {
    return async (req, res, next) => {
        try {
            const user = req.user;
            const resourceId = req.params.id;
            if (!user || !resourceId) {
                return res.status(400).json({ error: 'User or resource ID not provided' });
            }
            // Fetch the resource from the database
            const resource = await fetchResource(resourceType, resourceId);
            if (!resource) {
                return res.status(404).json({ error: 'Resource not found' });
            }
            // Check if user can access this resource
            const canAccess = await (0, rbac_1.checkPermission)(user, 'view', resource, resourceType);
            if (!canAccess) {
                return res.status(403).json({ error: 'Access denied. You do not have permission to access this resource.' });
            }
            // Attach the resource to the request for downstream use
            req.rbac = {
                resourceType,
                resource,
                action: 'view'
            };
            next();
        }
        catch (error) {
            console.error('Ownership check error:', error);
            return res.status(500).json({ error: 'Internal server error during ownership check' });
        }
    };
}
/**
 * Fetch a resource from the database
 */
async function fetchResource(resourceType, resourceId) {
    // This is a placeholder implementation
    // In a real implementation, you'd fetch the resource from the appropriate table
    // based on the resourceType
    // For now, return null to indicate resource not found
    // This will be implemented when we integrate with the actual database queries
    return null;
}
/**
 * Middleware to filter query results based on user permissions
 */
function filterByPermissions(resourceType) {
    return async (req, res, next) => {
        try {
            const user = req.user;
            if (!user) {
                return res.status(401).json({ error: 'User not authenticated' });
            }
            // Attach permission filter to request for downstream use
            req.rbac = {
                resourceType,
                action: 'view'
            };
            next();
        }
        catch (error) {
            console.error('Permission filter error:', error);
            return res.status(500).json({ error: 'Internal server error during permission filtering' });
        }
    };
}
