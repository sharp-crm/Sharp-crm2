import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand, QueryCommand, DeleteCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { docClient, TABLES } from './dynamoClient';
import { tasksRBACService, RBACUser, Task } from './tasksRBAC';

// Input interfaces for creating and updating tasks
export interface CreateTaskInput {
  title: string;
  description: string;
  priority: 'Low' | 'Normal' | 'High';
  status: string;
  dueDate: string;
  assignee: string; // Frontend uses 'assignee', backend uses 'assignedTo'
  type: 'Call' | 'Email' | 'Meeting' | 'Follow-up' | 'Demo';
  notes?: string;
  contactLeadId?: string;
  contactLeadType?: string;
  relatedRecordId?: string;
  relatedRecordType?: string;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  priority?: 'Low' | 'Normal' | 'High';
  status?: string;
  dueDate?: string;
  assignee?: string;
  type?: 'Call' | 'Email' | 'Meeting' | 'Follow-up' | 'Demo';
  notes?: string;
  contactLeadId?: string;
  contactLeadType?: string;
  relatedRecordId?: string;
  relatedRecordType?: string;
}

export class TasksService {
  private tableName = TABLES.TASKS;

  // Create a new task
  async createTask(input: CreateTaskInput, userId: string, userEmail: string, tenantId: string): Promise<Task> {
    const timestamp = new Date().toISOString();
    const taskId = uuidv4();

    const task: Task = {
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

    await docClient.send(new PutCommand({
      TableName: this.tableName,
      Item: task
    }));

    console.log(`✅ Task created: ${taskId} by ${userEmail}`);
    return task;
  }

  // Get task by ID (legacy method without RBAC)
  async getTaskById(id: string, tenantId: string, userId: string): Promise<Task | null> {
    const result = await docClient.send(new GetCommand({
      TableName: this.tableName,
      Key: { id }
    }));

    if (!result.Item || 
        result.Item.tenantId !== tenantId || 
        result.Item.isDeleted) {
      return null;
    }

    return result.Item as Task;
  }

  // Get all tasks for a tenant (legacy method without RBAC)
  async getTasksByTenant(tenantId: string, userId: string, includeDeleted = false): Promise<Task[]> {
    console.log('🔍 Getting tasks by tenant:', { tenantId, userId, includeDeleted });
    
    const result = await docClient.send(new ScanCommand({
      TableName: this.tableName,
      FilterExpression: includeDeleted 
        ? 'tenantId = :tenantId'
        : 'tenantId = :tenantId AND (attribute_not_exists(isDeleted) OR isDeleted = :isDeleted)',
      ExpressionAttributeValues: {
        ':tenantId': tenantId,
        ...(includeDeleted ? {} : { ':isDeleted': false })
      }
    }));

    return (result.Items || []) as Task[];
  }

  // RBAC-aware method: Get tasks for user based on role and permissions
  async getTasksForUser(user: RBACUser, includeDeleted = false): Promise<Task[]> {
    console.log(`🔐 [TasksService.getTasksForUser] Getting tasks for user: ${user.email} (${user.role})`);
    return tasksRBACService.getTasksForUser(user, includeDeleted);
  }

  // RBAC-aware method: Get task by ID with role-based access control
  async getTaskByIdForUser(id: string, user: RBACUser): Promise<Task | null> {
    console.log(`🔐 [TasksService.getTaskByIdForUser] Getting task ${id} for user: ${user.email} (${user.role})`);
    return tasksRBACService.getTaskByIdForUser(id, user);
  }

  // RBAC-aware method: Get tasks by assignee with role-based access control
  async getTasksByAssigneeForUser(assignedTo: string, user: RBACUser): Promise<Task[]> {
    console.log(`🔐 [TasksService.getTasksByAssigneeForUser] Getting tasks for assignee ${assignedTo} by user: ${user.email} (${user.role})`);
    return tasksRBACService.getTasksByAssigneeForUser(assignedTo, user);
  }

  // RBAC-aware method: Get tasks by status with role-based access control
  async getTasksByStatusForUser(status: string, user: RBACUser): Promise<Task[]> {
    console.log(`🔐 [TasksService.getTasksByStatusForUser] Getting tasks for status ${status} by user: ${user.email} (${user.role})`);
    return tasksRBACService.getTasksByStatusForUser(status, user);
  }

  // RBAC-aware method: Get tasks by due date with role-based access control
  async getTasksByDueDateForUser(dueDate: string, user: RBACUser): Promise<Task[]> {
    console.log(`🔐 [TasksService.getTasksByDueDateForUser] Getting tasks for due date ${dueDate} by user: ${user.email} (${user.role})`);
    return tasksRBACService.getTasksByDueDateForUser(dueDate, user);
  }

  // RBAC-aware method: Search tasks with role-based access control
  async searchTasksForUser(user: RBACUser, searchTerm: string): Promise<Task[]> {
    console.log(`🔐 [TasksService.searchTasksForUser] Searching tasks for term "${searchTerm}" by user: ${user.email} (${user.role})`);
    return tasksRBACService.searchTasksForUser(user, searchTerm);
  }

  // RBAC-aware method: Get tasks by related record with role-based access control
  async getTasksByRelatedRecordForUser(recordType: string, recordId: string, user: RBACUser): Promise<Task[]> {
    console.log(`🔐 [TasksService.getTasksByRelatedRecordForUser] Getting tasks for related record ${recordType}:${recordId} by user: ${user.email} (${user.role})`);
    return tasksRBACService.getTasksByRelatedRecordForUser(recordType, recordId, user);
  }

  // RBAC-aware method: Get task statistics with role-based access control
  async getTasksStatsForUser(user: RBACUser): Promise<{
    total: number;
    byStatus: Record<string, number>;
    byPriority: Record<string, number>;
    byType: Record<string, number>;
    overdue: number;
    dueToday: number;
    dueThisWeek: number;
  }> {
    console.log(`🔐 [TasksService.getTasksStatsForUser] Getting task stats for user: ${user.email} (${user.role})`);
    return tasksRBACService.getTasksStatsForUser(user);
  }

  // Update a task
  async updateTask(id: string, input: UpdateTaskInput, userId: string, userEmail: string, tenantId: string): Promise<Task | null> {
    const timestamp = new Date().toISOString();
    
    // First check if task exists and user has access
    const existingTask = await this.getTaskById(id, tenantId, userId);
    if (!existingTask) {
      return null;
    }

    // Build update expression
    const updateExpressions: string[] = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, any> = {};

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

    await docClient.send(new UpdateCommand({
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
  async deleteTask(id: string, userId: string, userEmail: string, tenantId: string): Promise<boolean> {
    const timestamp = new Date().toISOString();

    try {
      await docClient.send(new UpdateCommand({
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
    } catch (error) {
      if (error instanceof Error && 'name' in error && error.name === 'ConditionalCheckFailedException') {
        return false; // Task not found
      }
      throw error;
    }
  }

  // Hard delete a task (permanent removal)
  async hardDeleteTask(id: string, tenantId: string): Promise<boolean> {
    try {
      await docClient.send(new DeleteCommand({
        TableName: this.tableName,
        Key: { id },
        ConditionExpression: 'attribute_exists(id) AND tenantId = :tenantId',
        ExpressionAttributeValues: {
          ':tenantId': tenantId
        }
      }));

      console.log(`✅ Task hard deleted: ${id}`);
      return true;
    } catch (error) {
      if (error instanceof Error && 'name' in error && error.name === 'ConditionalCheckFailedException') {
        return false; // Task not found
      }
      throw error;
    }
  }
}

// Create singleton instance
export const tasksService = new TasksService();

// Legacy exports for backward compatibility
export const addTask = async (task: any) => {
  await docClient.send(new PutCommand({
    TableName: TABLES.TASKS,
    Item: task,
  }));
};

export const getTasks = async () => {
  const result = await docClient.send(new ScanCommand({ TableName: TABLES.TASKS }));
  return result.Items;
};