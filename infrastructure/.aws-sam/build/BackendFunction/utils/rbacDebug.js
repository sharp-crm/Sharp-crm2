"use strict";
/**
 * RBAC Debug Utilities
 * Helper functions to debug RBAC issues and check user data
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authenticate_1 = require("../middlewares/authenticate");
const leadsRBAC_1 = require("../services/leadsRBAC");
const dynamoClient_1 = require("../services/dynamoClient");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const router = (0, express_1.Router)();
// Helper function to convert authenticated request user to RBACUser format
function convertToRBACUser(user) {
    return {
        userId: user.userId,
        email: user.email,
        role: normalizeRole(user.role),
        tenantId: user.tenantId,
        reportingTo: user.reportingTo
    };
}
// Helper function to normalize role string
function normalizeRole(role) {
    const normalized = role.toUpperCase();
    if (normalized === 'ADMIN' || normalized === 'SUPER_ADMIN')
        return 'ADMIN';
    if (normalized === 'SALES_MANAGER' || normalized === 'MANAGER')
        return 'SALES_MANAGER';
    if (normalized === 'SALES_REP' || normalized === 'REP')
        return 'SALES_REP';
    return 'SALES_REP'; // Default to SALES_REP
}
// Debug route to check user context and RBAC data
const debugUserContext = async (req, res) => {
    console.log(`🐛 [DEBUG] User context debug requested`);
    try {
        const user = req.user;
        if (!user) {
            res.status(401).json({ error: "No user context found" });
            return;
        }
        const rbacUser = convertToRBACUser(user);
        // Get user's subordinates if they are a manager
        let subordinates = [];
        if (rbacUser.role === 'SALES_MANAGER') {
            try {
                const result = await dynamoClient_1.docClient.send(new lib_dynamodb_1.ScanCommand({
                    TableName: dynamoClient_1.TABLES.USERS,
                    FilterExpression: 'reportingTo = :managerId AND #role = :role AND tenantId = :tenantId AND isDeleted = :isDeleted',
                    ExpressionAttributeNames: {
                        '#role': 'role'
                    },
                    ExpressionAttributeValues: {
                        ':managerId': rbacUser.userId,
                        ':role': 'SALES_REP',
                        ':tenantId': rbacUser.tenantId,
                        ':isDeleted': false
                    }
                }));
                subordinates = (result.Items || []).map(item => item.userId);
            }
            catch (error) {
                console.error(`🐛 [DEBUG] Error getting subordinates:`, error);
            }
        }
        // Get sample leads the user should have access to
        let accessibleLeads = [];
        try {
            accessibleLeads = await leadsRBAC_1.leadsRBACService.getLeadsForUser(rbacUser, false);
        }
        catch (error) {
            console.error(`🐛 [DEBUG] Error getting accessible leads:`, error);
        }
        const debugData = {
            authUser: user,
            rbacUser: rbacUser,
            subordinates: subordinates,
            accessibleLeadsCount: accessibleLeads.length,
            accessibleLeads: accessibleLeads.slice(0, 3), // Show first 3 leads only
            rbacRules: {
                role: rbacUser.role,
                canSeeOwnLeads: true,
                canSeeSubordinateLeads: rbacUser.role === 'SALES_MANAGER' || rbacUser.role === 'ADMIN',
                canSeeAllTenantLeads: rbacUser.role === 'ADMIN',
                tenantIsolation: `Only data from tenant: ${rbacUser.tenantId}`
            }
        };
        console.log(`🐛 [DEBUG] User context data:`, debugData);
        res.json({
            success: true,
            message: "RBAC Debug Information",
            data: debugData
        });
    }
    catch (error) {
        console.error(`🐛 [DEBUG] Error in debug route:`, error);
        res.status(500).json({
            error: "Debug failed",
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
// Debug route to check all users in the system
const debugAllUsers = async (req, res) => {
    console.log(`🐛 [DEBUG] All users debug requested`);
    try {
        const user = req.user;
        if (!user || user.role !== 'ADMIN') {
            res.status(403).json({ error: "Admin access required for this debug route" });
            return;
        }
        const result = await dynamoClient_1.docClient.send(new lib_dynamodb_1.ScanCommand({
            TableName: dynamoClient_1.TABLES.USERS,
            FilterExpression: 'tenantId = :tenantId AND isDeleted = :isDeleted',
            ExpressionAttributeValues: {
                ':tenantId': user.tenantId,
                ':isDeleted': false
            }
        }));
        const users = (result.Items || []).map(item => ({
            userId: item.userId,
            email: item.email,
            role: item.role,
            tenantId: item.tenantId,
            reportingTo: item.reportingTo,
            firstName: item.firstName,
            lastName: item.lastName
        }));
        res.json({
            success: true,
            message: "All Users Debug Information",
            data: {
                totalUsers: users.length,
                users: users,
                hierarchy: buildHierarchy(users)
            }
        });
    }
    catch (error) {
        console.error(`🐛 [DEBUG] Error in all users debug route:`, error);
        res.status(500).json({
            error: "Debug failed",
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
// Helper function to build hierarchy visualization
function buildHierarchy(users) {
    const admins = users.filter(u => normalizeRole(u.role) === 'ADMIN');
    const managers = users.filter(u => normalizeRole(u.role) === 'SALES_MANAGER');
    const reps = users.filter(u => normalizeRole(u.role) === 'SALES_REP');
    return {
        admins: admins.map(admin => ({
            ...admin,
            manages: 'All users in tenant'
        })),
        managers: managers.map(manager => ({
            ...manager,
            subordinates: reps.filter(rep => rep.reportingTo === manager.userId)
        })),
        unassignedReps: reps.filter(rep => !managers.some(manager => manager.userId === rep.reportingTo))
    };
}
// Register debug routes
router.get('/debug/user', authenticate_1.authenticate, debugUserContext);
router.get('/debug/users', authenticate_1.authenticate, debugAllUsers);
exports.default = router;
