"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tasksRBACService = exports.TasksRBACService = void 0;
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const dynamoClient_1 = require("./dynamoClient");
class TasksRBACService {
    constructor() {
        this.tableName = dynamoClient_1.TABLES.TASKS;
    }
    /**
     * Get all tasks accessible by a user based on their role and tenant
     */
    async getTasksForUser(user, includeDeleted = false) {
        console.log(`🔐 [TasksRBACService] Getting tasks for user: ${user.email} (${user.role}) in tenant: ${user.tenantId}`);
        try {
            // First ensure tenant-based segregation
            const tenantFilter = this.buildTenantFilter(user.tenantId, includeDeleted);
            // Then build role-based access filter
            const roleFilter = await this.buildRoleBasedFilter(user);
            // Combine filters
            const combinedFilter = this.combineFilters(tenantFilter, roleFilter);
            console.log(`🔐 [TasksRBACService] Filter expression: ${combinedFilter.filterExpression}`);
            console.log(`🔐 [TasksRBACService] Expression values:`, combinedFilter.expressionAttributeValues);
            console.log(`🔐 [TasksRBACService] Expression names:`, combinedFilter.expressionAttributeNames);
            const scanParams = {
                TableName: this.tableName,
                FilterExpression: combinedFilter.filterExpression,
                ExpressionAttributeValues: combinedFilter.expressionAttributeValues
            };
            // Only add ExpressionAttributeNames if it exists and has properties
            if (combinedFilter.expressionAttributeNames && Object.keys(combinedFilter.expressionAttributeNames).length > 0) {
                scanParams.ExpressionAttributeNames = combinedFilter.expressionAttributeNames;
            }
            const result = await dynamoClient_1.docClient.send(new lib_dynamodb_1.ScanCommand(scanParams));
            const tasks = (result.Items || []);
            console.log(`🔐 [TasksRBACService] Retrieved ${tasks.length} tasks for user ${user.email}`);
            return tasks;
        }
        catch (error) {
            console.error(`🔐 [TasksRBACService] Error getting tasks for user ${user.email}:`, error);
            throw error;
        }
    }
    /**
     * Get a specific task by ID if the user has access to it
     */
    async getTaskByIdForUser(taskId, user) {
        console.log(`🔐 [TasksRBACService] Getting task ${taskId} for user: ${user.email} (${user.role})`);
        // First get the task
        const result = await dynamoClient_1.docClient.send(new lib_dynamodb_1.QueryCommand({
            TableName: this.tableName,
            KeyConditionExpression: 'id = :id',
            ExpressionAttributeValues: {
                ':id': taskId
            }
        }));
        if (!result.Items || result.Items.length === 0) {
            console.log(`🔐 [TasksRBACService] Task ${taskId} not found`);
            return null;
        }
        const task = result.Items[0];
        // Check if user has access to this task
        const hasAccess = await this.canUserAccessTask(task, user);
        if (!hasAccess) {
            console.log(`🔐 [TasksRBACService] User ${user.email} does not have access to task ${taskId}`);
            return null;
        }
        console.log(`🔐 [TasksRBACService] User ${user.email} has access to task ${taskId}`);
        return task;
    }
    /**
     * Get tasks by assignee with RBAC filtering
     */
    async getTasksByAssigneeForUser(assignedTo, user) {
        console.log(`🔐 [TasksRBACService] Getting tasks for assignee ${assignedTo}, requested by user: ${user.email} (${user.role})`);
        // Check if user can access tasks assigned to the specified user
        const canAccessAssignee = await this.canUserAccessTasksFromAssignee(assignedTo, user);
        if (!canAccessAssignee) {
            console.log(`🔐 [TasksRBACService] User ${user.email} cannot access tasks from assignee ${assignedTo}`);
            return [];
        }
        // Query by assignedTo using the GSI
        const result = await dynamoClient_1.docClient.send(new lib_dynamodb_1.QueryCommand({
            TableName: this.tableName,
            IndexName: 'AssignedToIndex',
            KeyConditionExpression: 'assignedTo = :assignedTo',
            FilterExpression: 'tenantId = :tenantId AND (attribute_not_exists(isDeleted) OR isDeleted = :isDeleted)',
            ExpressionAttributeValues: {
                ':assignedTo': assignedTo,
                ':tenantId': user.tenantId,
                ':isDeleted': false
            }
        }));
        const tasks = (result.Items || []);
        console.log(`🔐 [TasksRBACService] Retrieved ${tasks.length} tasks for assignee ${assignedTo}`);
        return tasks;
    }
    /**
     * Get tasks by status with RBAC filtering
     */
    async getTasksByStatusForUser(status, user) {
        console.log(`🔐 [TasksRBACService] Getting tasks for status ${status}, requested by user: ${user.email} (${user.role})`);
        // Get all accessible tasks first, then filter by status
        const accessibleTasks = await this.getTasksForUser(user, false);
        // Filter by status
        const statusTasks = accessibleTasks.filter(task => task.status === status);
        console.log(`🔐 [TasksRBACService] Retrieved ${statusTasks.length} accessible tasks for status ${status}`);
        return statusTasks;
    }
    /**
     * Get tasks by due date with RBAC filtering
     */
    async getTasksByDueDateForUser(dueDate, user) {
        console.log(`🔐 [TasksRBACService] Getting tasks for due date ${dueDate}, requested by user: ${user.email} (${user.role})`);
        // Query by dueDate using the GSI, then filter by RBAC
        const result = await dynamoClient_1.docClient.send(new lib_dynamodb_1.QueryCommand({
            TableName: this.tableName,
            IndexName: 'DueDateIndex',
            KeyConditionExpression: 'dueDate = :dueDate',
            FilterExpression: 'tenantId = :tenantId AND (attribute_not_exists(isDeleted) OR isDeleted = :isDeleted)',
            ExpressionAttributeValues: {
                ':dueDate': dueDate,
                ':tenantId': user.tenantId,
                ':isDeleted': false
            }
        }));
        let tasks = (result.Items || []);
        // Apply RBAC filtering to the results
        const accessibleTasks = [];
        for (const task of tasks) {
            const hasAccess = await this.canUserAccessTask(task, user);
            if (hasAccess) {
                accessibleTasks.push(task);
            }
        }
        console.log(`🔐 [TasksRBACService] Retrieved ${accessibleTasks.length} accessible tasks for due date ${dueDate}`);
        return accessibleTasks;
    }
    /**
     * Search tasks with RBAC filtering
     */
    async searchTasksForUser(user, searchTerm) {
        console.log(`🔐 [TasksRBACService] Searching tasks for term "${searchTerm}" by user: ${user.email} (${user.role})`);
        // Get all accessible tasks first
        const accessibleTasks = await this.getTasksForUser(user, false);
        // Filter by search term (search in title, description, notes)
        const searchResults = accessibleTasks.filter(task => {
            const searchLower = searchTerm.toLowerCase();
            return (task.title?.toLowerCase().includes(searchLower) ||
                task.description?.toLowerCase().includes(searchLower) ||
                task.notes?.toLowerCase().includes(searchLower) ||
                task.type?.toLowerCase().includes(searchLower));
        });
        console.log(`🔐 [TasksRBACService] Found ${searchResults.length} tasks matching search term "${searchTerm}"`);
        return searchResults;
    }
    /**
     * Get tasks by related record with RBAC filtering
     */
    async getTasksByRelatedRecordForUser(recordType, recordId, user) {
        console.log(`🔐 [TasksRBACService] Getting tasks for related record ${recordType}:${recordId}, requested by user: ${user.email} (${user.role})`);
        // Get all accessible tasks first
        const accessibleTasks = await this.getTasksForUser(user, false);
        // Filter by related record
        const relatedTasks = accessibleTasks.filter(task => task.relatedRecordType === recordType && task.relatedRecordId === recordId);
        console.log(`🔐 [TasksRBACService] Retrieved ${relatedTasks.length} accessible tasks for related record ${recordType}:${recordId}`);
        return relatedTasks;
    }
    /**
     * Get task statistics with RBAC filtering
     */
    async getTasksStatsForUser(user) {
        console.log(`🔐 [TasksRBACService] Getting task stats for user: ${user.email} (${user.role})`);
        // Get all accessible tasks
        const tasks = await this.getTasksForUser(user, false);
        // Calculate statistics
        const byStatus = {};
        const byPriority = {};
        const byType = {};
        let overdue = 0;
        let dueToday = 0;
        let dueThisWeek = 0;
        const today = new Date();
        const todayString = today.toISOString().split('T')[0];
        const oneWeekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
        const oneWeekString = oneWeekFromNow.toISOString().split('T')[0];
        tasks.forEach(task => {
            // Count by status
            byStatus[task.status] = (byStatus[task.status] || 0) + 1;
            // Count by priority
            byPriority[task.priority] = (byPriority[task.priority] || 0) + 1;
            // Count by type
            byType[task.type] = (byType[task.type] || 0) + 1;
            // Count due dates
            if (task.dueDate) {
                const taskDueDate = task.dueDate.split('T')[0]; // Get date part only
                if (taskDueDate < todayString && task.status !== 'Completed') {
                    overdue++;
                }
                else if (taskDueDate === todayString) {
                    dueToday++;
                }
                else if (taskDueDate <= oneWeekString) {
                    dueThisWeek++;
                }
            }
        });
        const stats = {
            total: tasks.length,
            byStatus,
            byPriority,
            byType,
            overdue,
            dueToday,
            dueThisWeek
        };
        console.log(`🔐 [TasksRBACService] Calculated stats for ${tasks.length} tasks`);
        return stats;
    }
    /**
     * Check if user can access a specific task
     */
    async canUserAccessTask(task, user) {
        // Tenant segregation - first and most important check
        if (task.tenantId !== user.tenantId) {
            console.log(`🔐 [TasksRBACService] Tenant mismatch: task.tenantId=${task.tenantId}, user.tenantId=${user.tenantId}`);
            return false;
        }
        // Soft delete check
        if (task.isDeleted) {
            console.log(`🔐 [TasksRBACService] Task ${task.id} is soft deleted`);
            return false;
        }
        // Get the task assignee (could be in assignee or assignedTo field)
        const taskAssignee = task.assignedTo || task.assignee;
        switch (user.role) {
            case 'ADMIN':
                // Admin can see all tasks in their tenant
                return true;
            case 'SALES_MANAGER':
                // Manager can see their own tasks + tasks assigned to subordinates
                if (taskAssignee === user.userId) {
                    return true;
                }
                // Check if task is assigned to a subordinate
                const subordinates = await this.getSubordinates(user.userId, user.tenantId);
                return subordinates.includes(taskAssignee);
            case 'SALES_REP':
                // Rep can only see tasks assigned to them
                return taskAssignee === user.userId;
            default:
                return false;
        }
    }
    /**
     * Check if user can access tasks from a specific assignee
     */
    async canUserAccessTasksFromAssignee(assigneeId, user) {
        switch (user.role) {
            case 'ADMIN':
                // Admin can access tasks from any assignee in their tenant
                return true;
            case 'SALES_MANAGER':
                // Manager can access their own tasks + tasks from subordinates
                if (assigneeId === user.userId) {
                    return true;
                }
                const subordinates = await this.getSubordinates(user.userId, user.tenantId);
                return subordinates.includes(assigneeId);
            case 'SALES_REP':
                // Rep can only access their own tasks
                return assigneeId === user.userId;
            default:
                return false;
        }
    }
    /**
     * Get all subordinates (sales reps) that report to a manager
     */
    async getSubordinates(managerId, tenantId) {
        try {
            const result = await dynamoClient_1.docClient.send(new lib_dynamodb_1.ScanCommand({
                TableName: dynamoClient_1.TABLES.USERS,
                FilterExpression: 'reportingTo = :managerId AND #role = :role AND tenantId = :tenantId AND (attribute_not_exists(isDeleted) OR isDeleted = :isDeleted)',
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
            console.log(`🔐 [TasksRBACService] Manager ${managerId} has ${subordinateIds.length} subordinates: ${subordinateIds.join(', ')}`);
            return subordinateIds;
        }
        catch (error) {
            console.error(`🔐 [TasksRBACService] Error getting subordinates for manager ${managerId}:`, error);
            return [];
        }
    }
    /**
     * Build tenant-based filter (always applied first)
     */
    buildTenantFilter(tenantId, includeDeleted) {
        return {
            filterExpression: includeDeleted
                ? 'tenantId = :tenantId'
                : 'tenantId = :tenantId AND (attribute_not_exists(isDeleted) OR isDeleted = :isDeleted)',
            expressionAttributeValues: {
                ':tenantId': tenantId,
                ...(includeDeleted ? {} : { ':isDeleted': false })
            }
        };
    }
    /**
     * Build role-based access filter
     */
    async buildRoleBasedFilter(user) {
        switch (user.role) {
            case 'ADMIN':
                // Admin can see all tasks in tenant (no additional filter needed)
                return {
                    filterExpression: '',
                    expressionAttributeValues: {}
                };
            case 'SALES_MANAGER':
                // Manager can see their own tasks + subordinates' tasks
                const subordinates = await this.getSubordinates(user.userId, user.tenantId);
                const allAccessibleAssignees = [user.userId, ...subordinates];
                if (allAccessibleAssignees.length === 1) {
                    return {
                        filterExpression: 'assignedTo = :userId',
                        expressionAttributeValues: {
                            ':userId': user.userId
                        }
                    };
                }
                else {
                    const placeholders = allAccessibleAssignees.map((_, index) => `:assignee${index}`).join(', ');
                    const expressionAttributeValues = {};
                    allAccessibleAssignees.forEach((assigneeId, index) => {
                        expressionAttributeValues[`:assignee${index}`] = assigneeId;
                    });
                    return {
                        filterExpression: `assignedTo IN (${placeholders})`,
                        expressionAttributeValues
                    };
                }
            case 'SALES_REP':
                // Rep can only see their own tasks
                return {
                    filterExpression: 'assignedTo = :userId',
                    expressionAttributeValues: {
                        ':userId': user.userId
                    }
                };
            default:
                // No access
                return {
                    filterExpression: 'assignedTo = :noAccess',
                    expressionAttributeValues: {
                        ':noAccess': 'NO_ACCESS'
                    }
                };
        }
    }
    /**
     * Combine tenant filter and role filter
     */
    combineFilters(tenantFilter, roleFilter) {
        if (!roleFilter.filterExpression) {
            // Admin case - only tenant filter applies
            return tenantFilter;
        }
        return {
            filterExpression: `(${tenantFilter.filterExpression}) AND (${roleFilter.filterExpression})`,
            expressionAttributeValues: {
                ...tenantFilter.expressionAttributeValues,
                ...roleFilter.expressionAttributeValues
            },
            expressionAttributeNames: {
                ...tenantFilter.expressionAttributeNames,
                ...roleFilter.expressionAttributeNames
            }
        };
    }
}
exports.TasksRBACService = TasksRBACService;
// Export singleton instance
exports.tasksRBACService = new TasksRBACService();
