import { Router, RequestHandler } from 'express';
import { tasksService, CreateTaskInput, UpdateTaskInput } from '../services/tasks';
import { RBACUser } from '../services/tasksRBAC';

interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
    tenantId: string;
    role: string;
    reportingTo?: string;
  };
}

const router = Router();

// Validation helpers
const validateRequiredFields = (data: any, fields: string[]): string[] | null => {
  const missing = fields.filter(field => !data[field] || data[field].toString().trim() === '');
  return missing.length > 0 ? missing : null;
};

// Helper function to convert authenticated request user to RBACUser format
function convertToRBACUser(user: any): RBACUser {
  return {
    userId: user.userId,
    email: user.email,
    role: normalizeRole(user.role),
    tenantId: user.tenantId,
    reportingTo: user.reportingTo
  };
}

// Helper function to normalize role string
function normalizeRole(role: string): 'ADMIN' | 'SALES_MANAGER' | 'SALES_REP' {
  const normalized = role.toUpperCase();
  if (normalized === 'ADMIN' || normalized === 'SUPER_ADMIN') return 'ADMIN';
  if (normalized === 'SALES_MANAGER' || normalized === 'MANAGER') return 'SALES_MANAGER';
  if (normalized === 'SALES_REP' || normalized === 'REP') return 'SALES_REP';
  return 'SALES_REP'; // Default to SALES_REP
}

// Get all tasks for tenant (RBAC-aware)
const getAllTasks: RequestHandler = async (req: any, res) => {
  const operation = 'getAllTasks_RBAC';
  const user = req.user;
  
  console.log(`🔍 [${operation}] Starting RBAC request - User: ${user?.email} (${user?.role}), TenantId: ${user?.tenantId}`);
  
  try {
    const includeDeleted = req.query.includeDeleted === 'true';
    const { recordType, recordId, contactLeadType, contactLeadId } = req.query;
    
    if (!user || !user.tenantId) {
      console.log(`❌ [${operation}] Missing user context or tenant ID`);
      res.status(400).json({ error: "User authentication required" });
      return;
    }

    const rbacUser = convertToRBACUser(user);
    console.log(`🔐 [${operation}] Using RBAC - User: ${rbacUser.email} (${rbacUser.role}), TenantId: ${rbacUser.tenantId}`);
    
    let tasks;
    
    // Handle filtering by related record
    if (recordType && recordId) {
      console.log(`🔍 [${operation}] Filtering by related record: ${recordType}:${recordId}`);
      tasks = await tasksService.getTasksByRelatedRecordForUser(recordType as string, recordId as string, rbacUser);
    } else {
      tasks = await tasksService.getTasksForUser(rbacUser, includeDeleted);
    }
    
    console.log(`✅ [${operation}] Successfully retrieved ${tasks.length} tasks for user ${rbacUser.email} (${rbacUser.role})`);
    res.json({ 
      data: tasks,
      total: tasks.length,
      message: `Retrieved ${tasks.length} tasks`,
      rbac: {
        userRole: rbacUser.role,
        appliedFilter: `Role-based access control applied for ${rbacUser.role}`
      }
    });
  } catch (error) {
    console.error(`❌ [${operation}] Error occurred:`);
    console.error(`   - Error message: ${error instanceof Error ? error.message : 'Unknown error'}`);
    console.error(`   - Error stack: ${error instanceof Error ? error.stack : 'No stack trace'}`);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get task by ID (RBAC-aware)
const getTaskById: RequestHandler = async (req: any, res) => {
  const operation = 'getTaskById_RBAC';
  const user = req.user;
  const { id } = req.params;
  
  console.log(`🔍 [${operation}] Starting RBAC request - User: ${user?.email} (${user?.role}), TaskId: ${id}`);
  
  try {
    if (!user || !user.tenantId) {
      console.log(`❌ [${operation}] Missing user context or tenant ID`);
      res.status(400).json({ error: "User authentication required" });
      return;
    }

    const rbacUser = convertToRBACUser(user);
    console.log(`🔐 [${operation}] Using RBAC - User: ${rbacUser.email} (${rbacUser.role}), TaskId: ${id}`);
    
    const task = await tasksService.getTaskByIdForUser(id, rbacUser);
    
    if (!task) {
      console.log(`❌ [${operation}] Task not found or access denied - TaskId: ${id}, User: ${rbacUser.email} (${rbacUser.role})`);
      res.status(404).json({ message: "Task not found or you don't have permission to access it" });
      return;
    }

    console.log(`✅ [${operation}] Successfully retrieved task - TaskId: ${id}, User: ${rbacUser.email} (${rbacUser.role})`);
    res.json({ 
      data: task,
      rbac: {
        userRole: rbacUser.role,
        accessGranted: true
      }
    });
  } catch (error) {
    console.error(`❌ [${operation}] Error occurred:`);
    console.error(`   - Error message: ${error instanceof Error ? error.message : 'Unknown error'}`);
    console.error(`   - Error stack: ${error instanceof Error ? error.stack : 'No stack trace'}`);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get tasks by assignee (RBAC-aware)
const getTasksByAssignee: RequestHandler = async (req: any, res) => {
  const operation = 'getTasksByAssignee_RBAC';
  const user = req.user;
  const { assignee } = req.params;
  
  console.log(`🔍 [${operation}] Starting RBAC request - User: ${user?.email} (${user?.role}), TargetAssignee: ${assignee}`);
  
  try {
    if (!user || !user.tenantId) {
      console.log(`❌ [${operation}] Missing user context or tenant ID`);
      res.status(400).json({ error: "User authentication required" });
      return;
    }

    const rbacUser = convertToRBACUser(user);
    console.log(`🔐 [${operation}] Using RBAC - User: ${rbacUser.email} (${rbacUser.role}), TargetAssignee: ${assignee}`);
    
    const tasks = await tasksService.getTasksByAssigneeForUser(assignee, rbacUser);
    
    console.log(`✅ [${operation}] Successfully retrieved ${tasks.length} tasks for assignee ${assignee}, requested by ${rbacUser.email} (${rbacUser.role})`);
    res.json({ 
      data: tasks,
      total: tasks.length,
      rbac: {
        userRole: rbacUser.role,
        targetAssignee: assignee,
        accessGranted: true
      }
    });
  } catch (error) {
    console.error(`❌ [${operation}] Error occurred:`, error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get tasks by status (RBAC-aware)
const getTasksByStatus: RequestHandler = async (req: any, res) => {
  const operation = 'getTasksByStatus_RBAC';
  const user = req.user;
  const { status } = req.params;
  
  console.log(`🔍 [${operation}] Starting RBAC request - User: ${user?.email} (${user?.role}), Status: ${status}`);
  
  try {
    if (!user || !user.tenantId) {
      console.log(`❌ [${operation}] Missing user context or tenant ID`);
      res.status(400).json({ error: "User authentication required" });
      return;
    }

    const rbacUser = convertToRBACUser(user);
    console.log(`🔐 [${operation}] Using RBAC - User: ${rbacUser.email} (${rbacUser.role}), Status: ${status}`);
    
    const tasks = await tasksService.getTasksByStatusForUser(status, rbacUser);
    
    console.log(`✅ [${operation}] Successfully retrieved ${tasks.length} tasks for status ${status}, User: ${rbacUser.email} (${rbacUser.role})`);
    res.json({ 
      data: tasks,
      total: tasks.length,
      rbac: {
        userRole: rbacUser.role,
        targetStatus: status,
        accessGranted: true
      }
    });
  } catch (error) {
    console.error(`❌ [${operation}] Error occurred:`, error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Search tasks (RBAC-aware)
const searchTasks: RequestHandler = async (req: any, res) => {
  const operation = 'searchTasks_RBAC';
  const user = req.user;
  const { q } = req.query;
  
  console.log(`🔍 [${operation}] Starting RBAC search - User: ${user?.email} (${user?.role}), Query: "${q}"`);
  
  try {
    if (!user || !user.tenantId) {
      console.log(`❌ [${operation}] Missing user context or tenant ID`);
      res.status(400).json({ error: "User authentication required" });
      return;
    }

    if (!q || typeof q !== 'string') {
      console.log(`❌ [${operation}] Missing or invalid search query`);
      res.status(400).json({ error: "Search query required" });
      return;
    }

    const rbacUser = convertToRBACUser(user);
    console.log(`🔐 [${operation}] Using RBAC - User: ${rbacUser.email} (${rbacUser.role}), Query: "${q}"`);
    
    const tasks = await tasksService.searchTasksForUser(rbacUser, q);
    
    console.log(`✅ [${operation}] Successfully found ${tasks.length} tasks for query "${q}", User: ${rbacUser.email} (${rbacUser.role})`);
    res.json({ 
      data: tasks,
      total: tasks.length,
      query: q,
      rbac: {
        userRole: rbacUser.role,
        appliedFilter: `Search results filtered for ${rbacUser.role}`
      }
    });
  } catch (error) {
    console.error(`❌ [${operation}] Error occurred:`, error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get task statistics (RBAC-aware)
const getTasksStats: RequestHandler = async (req: any, res) => {
  const operation = 'getTasksStats_RBAC';
  const user = req.user;
  
  console.log(`🔍 [${operation}] Starting RBAC stats request - User: ${user?.email} (${user?.role})`);
  
  try {
    if (!user || !user.tenantId) {
      console.log(`❌ [${operation}] Missing user context or tenant ID`);
      res.status(400).json({ error: "User authentication required" });
      return;
    }

    const rbacUser = convertToRBACUser(user);
    console.log(`🔐 [${operation}] Using RBAC - User: ${rbacUser.email} (${rbacUser.role})`);
    
    const stats = await tasksService.getTasksStatsForUser(rbacUser);
    
    console.log(`✅ [${operation}] Successfully calculated stats for ${stats.total} tasks, User: ${rbacUser.email} (${rbacUser.role})`);
    res.json({ 
      data: stats,
      rbac: {
        userRole: rbacUser.role,
        appliedFilter: `Statistics calculated for ${rbacUser.role} accessible tasks`
      }
    });
  } catch (error) {
    console.error(`❌ [${operation}] Error occurred:`, error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Create new task
const createTask: RequestHandler = async (req: any, res) => {
  const operation = 'createTask';
  const user = req.user;
  
  console.log(`🔍 [${operation}] Starting request - User: ${user?.email} (${user?.role})`);
  
  try {
    const requiredFields = ['title', 'description', 'priority', 'dueDate', 'assignee', 'type'];
    const missingFields = validateRequiredFields(req.body, requiredFields);
    
    if (missingFields) {
      console.error(`❌ [${operation}] Missing required fields: ${missingFields.join(', ')}`);
      res.status(400).json({ 
        error: "Missing required fields", 
        missing: missingFields 
      });
      return;
    }

    if (!user || !user.tenantId) {
      res.status(400).json({ error: "User authentication required" });
      return;
    }

    const taskInput: CreateTaskInput = {
      title: req.body.title,
      description: req.body.description,
      priority: req.body.priority,
      status: req.body.status || 'Open',
      dueDate: req.body.dueDate,
      assignee: req.body.assignee,
      type: req.body.type,
      notes: req.body.notes,
      contactLeadId: req.body.contactLeadId,
      contactLeadType: req.body.contactLeadType,
      relatedRecordId: req.body.relatedRecordId,
      relatedRecordType: req.body.relatedRecordType
    };

    console.log(`📊 [${operation}] Creating task for user: ${user.userId}`);
    const task = await tasksService.createTask(taskInput, user.userId, user.email, user.tenantId);

    console.log(`✅ [${operation}] Task created successfully: ${task.id}`);
    res.status(201).json({ 
      data: task,
      message: "Task created successfully"
    });
  } catch (error) {
    console.error(`❌ [${operation}] Error creating task:`, error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Update task
const updateTask: RequestHandler = async (req: any, res) => {
  const operation = 'updateTask';
  const user = req.user;
  const { id } = req.params;
  
  console.log(`🔍 [${operation}] Starting update - TaskId: ${id}, User: ${user?.email}`);
  
  try {
    if (!user || !user.tenantId) {
      res.status(400).json({ error: "User authentication required" });
      return;
    }

    const updateInput: UpdateTaskInput = {
      title: req.body.title,
      description: req.body.description,
      priority: req.body.priority,
      status: req.body.status,
      dueDate: req.body.dueDate,
      assignee: req.body.assignee,
      type: req.body.type,
      notes: req.body.notes,
      contactLeadId: req.body.contactLeadId,
      contactLeadType: req.body.contactLeadType,
      relatedRecordId: req.body.relatedRecordId,
      relatedRecordType: req.body.relatedRecordType
    };

    console.log(`📊 [${operation}] Updating task for user: ${user.userId}`);
    const task = await tasksService.updateTask(id, updateInput, user.userId, user.email, user.tenantId);

    if (!task) {
      res.status(404).json({ message: "Task not found" });
      return;
    }

    console.log(`✅ [${operation}] Task updated successfully: ${id}`);
    res.json({ 
      data: task,
      message: "Task updated successfully"
    });
  } catch (error) {
    console.error(`❌ [${operation}] Error:`, error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Delete task (soft delete)
const deleteTask: RequestHandler = async (req: any, res) => {
  const operation = 'deleteTask';
  const user = req.user;
  const { id } = req.params;
  
  console.log(`🔍 [${operation}] Starting - TaskId: ${id}, User: ${user?.email}`);
  
  try {
    if (!user || !user.tenantId) {
      res.status(400).json({ error: "User authentication required" });
      return;
    }

    const success = await tasksService.deleteTask(id, user.userId, user.email, user.tenantId);

    if (!success) {
      res.status(404).json({ message: "Task not found" });
      return;
    }

    console.log(`✅ [${operation}] Task updated successfully: ${id}`);
    res.json({ message: "Task deleted successfully" });
  } catch (error) {
    console.error(`❌ [${operation}] Error:`, error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Hard delete task (permanent removal)
const hardDeleteTask: RequestHandler = async (req: any, res) => {
  const operation = 'hardDeleteTask';
  const user = req.user;
  const { id } = req.params;
  
  console.log(`🔍 [${operation}] Starting - TaskId: ${id}, User: ${user?.email}`);
  
  try {
    if (!user || !user.tenantId) {
      res.status(400).json({ error: "User authentication required" });
      return;
    }

    // Only allow admins to hard delete
    if (user.role !== 'ADMIN') {
      res.status(403).json({ error: "Only administrators can permanently delete tasks" });
      return;
    }

    const success = await tasksService.hardDeleteTask(id, user.tenantId);

    if (!success) {
      res.status(404).json({ message: "Task not found" });
      return;
    }

    console.log(`✅ [${operation}] Task updated successfully: ${id}`);
    res.json({ message: "Task permanently deleted" });
  } catch (error) {
    console.error(`❌ [${operation}] Error:`, error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Routes
router.get('/', getAllTasks);
router.get('/stats', getTasksStats);
router.get('/search', searchTasks);
router.get('/assignee/:assignee', getTasksByAssignee);
router.get('/status/:status', getTasksByStatus);
router.get('/:id', getTaskById);
router.post('/', createTask);
router.put('/:id', updateTask);
router.delete('/:id', deleteTask);
router.delete('/:id/hard', hardDeleteTask);

export default router;