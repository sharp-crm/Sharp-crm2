"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTasks = exports.addTask = exports.tasksService = exports.TasksService = void 0;
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const uuid_1 = require("uuid");
const dynamoClient_1 = require("./dynamoClient");
const tasksRBAC_1 = require("./tasksRBAC");
class TasksService {
    constructor() {
        this.tableName = dynamoClient_1.TABLES.TASKS;
    }
    // Create a new task
    async createTask(input, userId, userEmail, tenantId) {
        const timestamp = new Date().toISOString();
        const taskId = (0, uuid_1.v4)();
        const task = {
            id: taskId,
            title: input.title,
            description: input.description,
            priority: input.priority,
            status: input.status || 'Open',
            dueDate: input.dueDate,
            assignee: input.assignee,
            assignedTo: input.assignee, // Store in both fields for compatibility
            type: input.type,
            tenantId,
            notes: input.notes || '',
            contactLeadId: input.contactLeadId,
            contactLeadType: input.contactLeadType,
            relatedRecordId: input.relatedRecordId,
            relatedRecordType: input.relatedRecordType,
            createdAt: timestamp,
            createdBy: userEmail,
            updatedAt: timestamp,
            updatedBy: userEmail,
            isDeleted: false,
            userId
        };
        await dynamoClient_1.docClient.send(new lib_dynamodb_1.PutCommand({
            TableName: this.tableName,
            Item: task
        }));
        console.log(`✅ Task created: ${taskId} by ${userEmail}`);
        return task;
    }
    // Get task by ID (legacy method without RBAC)
    async getTaskById(id, tenantId, userId) {
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
    // Get all tasks for a tenant (legacy method without RBAC)
    async getTasksByTenant(tenantId, userId, includeDeleted = false) {
        console.log('🔍 Getting tasks by tenant:', { tenantId, userId, includeDeleted });
        const result = await dynamoClient_1.docClient.send(new lib_dynamodb_1.ScanCommand({
            TableName: this.tableName,
            FilterExpression: includeDeleted
                ? 'tenantId = :tenantId'
                : 'tenantId = :tenantId AND (attribute_not_exists(isDeleted) OR isDeleted = :isDeleted)',
            ExpressionAttributeValues: {
                ':tenantId': tenantId,
                ...(includeDeleted ? {} : { ':isDeleted': false })
            }
        }));
        return (result.Items || []);
    }
    // RBAC-aware method: Get tasks for user based on role and permissions
    async getTasksForUser(user, includeDeleted = false) {
        console.log(`🔐 [TasksService.getTasksForUser] Getting tasks for user: ${user.email} (${user.role})`);
        return tasksRBAC_1.tasksRBACService.getTasksForUser(user, includeDeleted);
    }
    // RBAC-aware method: Get task by ID with role-based access control
    async getTaskByIdForUser(id, user) {
        console.log(`🔐 [TasksService.getTaskByIdForUser] Getting task ${id} for user: ${user.email} (${user.role})`);
        return tasksRBAC_1.tasksRBACService.getTaskByIdForUser(id, user);
    }
    // RBAC-aware method: Get tasks by assignee with role-based access control
    async getTasksByAssigneeForUser(assignedTo, user) {
        console.log(`🔐 [TasksService.getTasksByAssigneeForUser] Getting tasks for assignee ${assignedTo} by user: ${user.email} (${user.role})`);
        return tasksRBAC_1.tasksRBACService.getTasksByAssigneeForUser(assignedTo, user);
    }
    // RBAC-aware method: Get tasks by status with role-based access control
    async getTasksByStatusForUser(status, user) {
        console.log(`🔐 [TasksService.getTasksByStatusForUser] Getting tasks for status ${status} by user: ${user.email} (${user.role})`);
        return tasksRBAC_1.tasksRBACService.getTasksByStatusForUser(status, user);
    }
    // RBAC-aware method: Get tasks by due date with role-based access control
    async getTasksByDueDateForUser(dueDate, user) {
        console.log(`🔐 [TasksService.getTasksByDueDateForUser] Getting tasks for due date ${dueDate} by user: ${user.email} (${user.role})`);
        return tasksRBAC_1.tasksRBACService.getTasksByDueDateForUser(dueDate, user);
    }
    // RBAC-aware method: Search tasks with role-based access control
    async searchTasksForUser(user, searchTerm) {
        console.log(`🔐 [TasksService.searchTasksForUser] Searching tasks for term "${searchTerm}" by user: ${user.email} (${user.role})`);
        return tasksRBAC_1.tasksRBACService.searchTasksForUser(user, searchTerm);
    }
    // RBAC-aware method: Get tasks by related record with role-based access control
    async getTasksByRelatedRecordForUser(recordType, recordId, user) {
        console.log(`🔐 [TasksService.getTasksByRelatedRecordForUser] Getting tasks for related record ${recordType}:${recordId} by user: ${user.email} (${user.role})`);
        return tasksRBAC_1.tasksRBACService.getTasksByRelatedRecordForUser(recordType, recordId, user);
    }
    // RBAC-aware method: Get task statistics with role-based access control
    async getTasksStatsForUser(user) {
        console.log(`🔐 [TasksService.getTasksStatsForUser] Getting task stats for user: ${user.email} (${user.role})`);
        return tasksRBAC_1.tasksRBACService.getTasksStatsForUser(user);
    }
    // Update a task
    async updateTask(id, input, userId, userEmail, tenantId) {
        const timestamp = new Date().toISOString();
        // First check if task exists and user has access
        const existingTask = await this.getTaskById(id, tenantId, userId);
        if (!existingTask) {
            return null;
        }
        // Build update expression
        const updateExpressions = [];
        const expressionAttributeNames = {};
        const expressionAttributeValues = {};
        if (input.title !== undefined) {
            updateExpressions.push('#title = :title');
            expressionAttributeNames['#title'] = 'title';
            expressionAttributeValues[':title'] = input.title;
        }
        if (input.description !== undefined) {
            updateExpressions.push('#description = :description');
            expressionAttributeNames['#description'] = 'description';
            expressionAttributeValues[':description'] = input.description;
        }
        if (input.priority !== undefined) {
            updateExpressions.push('#priority = :priority');
            expressionAttributeNames['#priority'] = 'priority';
            expressionAttributeValues[':priority'] = input.priority;
        }
        if (input.status !== undefined) {
            updateExpressions.push('#status = :status');
            expressionAttributeNames['#status'] = 'status';
            expressionAttributeValues[':status'] = input.status;
        }
        if (input.dueDate !== undefined) {
            updateExpressions.push('dueDate = :dueDate');
            expressionAttributeValues[':dueDate'] = input.dueDate;
        }
        if (input.assignee !== undefined) {
            updateExpressions.push('assignee = :assignee, assignedTo = :assignee');
            expressionAttributeValues[':assignee'] = input.assignee;
        }
        if (input.type !== undefined) {
            updateExpressions.push('#type = :type');
            expressionAttributeNames['#type'] = 'type';
            expressionAttributeValues[':type'] = input.type;
        }
        if (input.notes !== undefined) {
            updateExpressions.push('notes = :notes');
            expressionAttributeValues[':notes'] = input.notes;
        }
        if (input.contactLeadId !== undefined) {
            updateExpressions.push('contactLeadId = :contactLeadId');
            expressionAttributeValues[':contactLeadId'] = input.contactLeadId;
        }
        if (input.contactLeadType !== undefined) {
            updateExpressions.push('contactLeadType = :contactLeadType');
            expressionAttributeValues[':contactLeadType'] = input.contactLeadType;
        }
        if (input.relatedRecordId !== undefined) {
            updateExpressions.push('relatedRecordId = :relatedRecordId');
            expressionAttributeValues[':relatedRecordId'] = input.relatedRecordId;
        }
        if (input.relatedRecordType !== undefined) {
            updateExpressions.push('relatedRecordType = :relatedRecordType');
            expressionAttributeValues[':relatedRecordType'] = input.relatedRecordType;
        }
        // Always update timestamp
        updateExpressions.push('updatedAt = :updatedAt, updatedBy = :updatedBy');
        expressionAttributeValues[':updatedAt'] = timestamp;
        expressionAttributeValues[':updatedBy'] = userEmail;
        if (updateExpressions.length === 1) { // Only timestamp update
            return existingTask;
        }
        await dynamoClient_1.docClient.send(new lib_dynamodb_1.UpdateCommand({
            TableName: this.tableName,
            Key: { id },
            UpdateExpression: `SET ${updateExpressions.join(', ')}`,
            ExpressionAttributeNames: Object.keys(expressionAttributeNames).length > 0 ? expressionAttributeNames : undefined,
            ExpressionAttributeValues: expressionAttributeValues,
            ConditionExpression: 'attribute_exists(id)'
        }));
        // Return updated task
        return this.getTaskById(id, tenantId, userId);
    }
    // Soft delete a task
    async deleteTask(id, userId, userEmail, tenantId) {
        const timestamp = new Date().toISOString();
        try {
            await dynamoClient_1.docClient.send(new lib_dynamodb_1.UpdateCommand({
                TableName: this.tableName,
                Key: { id },
                UpdateExpression: 'SET isDeleted = :isDeleted, deletedAt = :deletedAt, deletedBy = :deletedBy',
                ExpressionAttributeValues: {
                    ':isDeleted': true,
                    ':deletedAt': timestamp,
                    ':deletedBy': userEmail,
                    ':tenantId': tenantId
                },
                ConditionExpression: 'attribute_exists(id) AND tenantId = :tenantId'
            }));
            console.log(`✅ Task soft deleted: ${id} by ${userEmail}`);
            return true;
        }
        catch (error) {
            if (error instanceof Error && 'name' in error && error.name === 'ConditionalCheckFailedException') {
                return false; // Task not found
            }
            throw error;
        }
    }
    // Hard delete a task (permanent removal)
    async hardDeleteTask(id, tenantId) {
        try {
            await dynamoClient_1.docClient.send(new lib_dynamodb_1.DeleteCommand({
                TableName: this.tableName,
                Key: { id },
                ConditionExpression: 'attribute_exists(id) AND tenantId = :tenantId',
                ExpressionAttributeValues: {
                    ':tenantId': tenantId
                }
            }));
            console.log(`✅ Task hard deleted: ${id}`);
            return true;
        }
        catch (error) {
            if (error instanceof Error && 'name' in error && error.name === 'ConditionalCheckFailedException') {
                return false; // Task not found
            }
            throw error;
        }
    }
}
exports.TasksService = TasksService;
// Create singleton instance
exports.tasksService = new TasksService();
// Legacy exports for backward compatibility
const addTask = async (task) => {
    await dynamoClient_1.docClient.send(new lib_dynamodb_1.PutCommand({
        TableName: dynamoClient_1.TABLES.TASKS,
        Item: task,
    }));
};
exports.addTask = addTask;
const getTasks = async () => {
    const result = await dynamoClient_1.docClient.send(new lib_dynamodb_1.ScanCommand({ TableName: dynamoClient_1.TABLES.TASKS }));
    return result.Items;
};
exports.getTasks = getTasks;
