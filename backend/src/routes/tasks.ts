import express, { Response, NextFunction } from "express";
import { PutCommand, GetCommand, QueryCommand, UpdateCommand, DeleteCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { docClient, TABLES } from "../services/dynamoClient";
import { v4 as uuidv4 } from "uuid";
import { AuthenticatedRequest } from "../middlewares/authenticate";

interface Task {
  id: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  dueDate: string;
  assignee: string;
  type: string;
  tenantId: string;
  createdAt: string;
  notes?: string;
  // New fields for related records
  contactLeadId?: string;
  contactLeadType?: string; // 'contact' or 'lead'
  relatedRecordId?: string;
  relatedRecordType?: string; // 'deal', 'product', or 'quote'
  visibleTo?: string[];
  // Auditing fields
  createdBy?: string;
  updatedAt?: string;
  updatedBy?: string;
  deletedAt?: string;
  deletedBy?: string;
  isDeleted?: boolean;
  userId?: string;
}

const router = express.Router();

// Test route to verify tasks router is working
router.get("/test", (async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    res.json({ message: "Tasks router is working", timestamp: new Date().toISOString() });
  } catch (error) {
    next(error);
  }
}) as express.RequestHandler);

// Test route to check filtering
router.get("/test-filter", (async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.user?.tenantId;
    const { recordType, recordId } = req.query;
    
    console.log('Test filter called with:', { recordType, recordId, tenantId });
    
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant ID required" });
    }

    // Get all tasks for this tenant to see what's in the database
    const allTasks = await docClient.send(
      new ScanCommand({
        TableName: TABLES.TASKS,
        FilterExpression: "tenantId = :tenantId AND (attribute_not_exists(isDeleted) OR isDeleted = :isDeleted)",
        ExpressionAttributeValues: {
          ":tenantId": tenantId,
          ":isDeleted": false
        }
      })
    );

    console.log('All tasks for tenant:', allTasks.Items);

    // If recordType and recordId are provided, also test the filter
    if (recordType && recordId) {
      const filteredTasks = await docClient.send(
        new ScanCommand({
          TableName: TABLES.TASKS,
          FilterExpression: "tenantId = :tenantId AND relatedRecordType = :recordType AND relatedRecordId = :recordId AND (attribute_not_exists(isDeleted) OR isDeleted = :isDeleted)",
          ExpressionAttributeValues: {
            ":tenantId": tenantId,
            ":recordType": recordType,
            ":recordId": recordId,
            ":isDeleted": false
          }
        })
      );

      console.log('Filtered tasks:', filteredTasks.Items);

      return res.json({ 
        message: "Filter test completed",
        allTasks: allTasks.Items,
        filteredTasks: filteredTasks.Items,
        filterParams: { recordType, recordId, tenantId }
      });
    }

    res.json({ 
      message: "All tasks retrieved",
      allTasks: allTasks.Items,
      tenantId
    });
  } catch (error) {
    console.error('Test filter error:', error);
    next(error);
  }
}) as express.RequestHandler);

// Get all tasks for tenant
router.get("/", (async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.user?.tenantId;
    const { recordType, recordId, contactLeadType, contactLeadId } = req.query;
    
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant ID required" });
    }

    // If recordType and recordId are provided, filter by related record
    if (recordType && recordId) {
      console.log('Filtering tasks by related record:', { recordType, recordId, tenantId });
      
      const result = await docClient.send(
        new ScanCommand({
          TableName: TABLES.TASKS,
          FilterExpression: "tenantId = :tenantId AND relatedRecordType = :recordType AND relatedRecordId = :recordId AND (attribute_not_exists(isDeleted) OR isDeleted = :isDeleted)",
          ExpressionAttributeValues: {
            ":tenantId": tenantId,
            ":recordType": recordType,
            ":recordId": recordId,
            ":isDeleted": false
          }
        })
      );

      console.log('DynamoDB result for related record filter:', { 
        count: result.Count, 
        scannedCount: result.ScannedCount,
        items: result.Items?.length || 0 
      });

      return res.json({ data: (result.Items as Task[]) || [] });
    }

    // If contactLeadType and contactLeadId are provided, filter by contact/lead
    if (contactLeadType && contactLeadId) {
      console.log('Filtering tasks by contact/lead:', { contactLeadType, contactLeadId, tenantId });
      
      const result = await docClient.send(
        new ScanCommand({
          TableName: TABLES.TASKS,
          FilterExpression: "tenantId = :tenantId AND contactLeadType = :contactLeadType AND contactLeadId = :contactLeadId AND (attribute_not_exists(isDeleted) OR isDeleted = :isDeleted)",
          ExpressionAttributeValues: {
            ":tenantId": tenantId,
            ":contactLeadType": contactLeadType,
            ":contactLeadId": contactLeadId,
            ":isDeleted": false
          }
        })
      );

      console.log('DynamoDB result for contact/lead filter:', { 
        count: result.Count, 
        scannedCount: result.ScannedCount,
        items: result.Items?.length || 0 
      });

      return res.json({ data: (result.Items as Task[]) || [] });
    }

    // Otherwise, get all tasks for tenant
    const result = await docClient.send(
      new ScanCommand({
        TableName: TABLES.TASKS,
        FilterExpression: "tenantId = :tenantId AND (attribute_not_exists(isDeleted) OR isDeleted = :isDeleted)",
        ExpressionAttributeValues: {
          ":tenantId": tenantId,
          ":isDeleted": false
        }
      })
    );

    res.json({ data: (result.Items as Task[]) || [] });
  } catch (error) {
    next(error);
  }
}) as express.RequestHandler);

// Get tasks by related record - MUST BE BEFORE /:id route
router.get("/by-related-record", (async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.user?.tenantId;
    const { recordType, recordId } = req.query;
    
    console.log('GET /by-related-record called with:', { recordType, recordId, tenantId });
    
    if (!tenantId) {
      console.log('Error: Tenant ID required');
      return res.status(400).json({ error: "Tenant ID required" });
    }

    if (!recordType || !recordId) {
      console.log('Error: Record type and record ID are required');
      return res.status(400).json({ error: "Record type and record ID are required" });
    }

    console.log('Querying DynamoDB with:', {
      TableName: TABLES.TASKS,
      FilterExpression: "tenantId = :tenantId AND relatedRecordType = :recordType AND relatedRecordId = :recordId AND (attribute_not_exists(isDeleted) OR isDeleted = :isDeleted)",
      ExpressionAttributeValues: {
        ":tenantId": tenantId,
        ":recordType": recordType,
        ":recordId": recordId,
        ":isDeleted": false
      }
    });

    const result = await docClient.send(
      new ScanCommand({
        TableName: TABLES.TASKS,
        FilterExpression: "tenantId = :tenantId AND relatedRecordType = :recordType AND relatedRecordId = :recordId AND (attribute_not_exists(isDeleted) OR isDeleted = :isDeleted)",
        ExpressionAttributeValues: {
          ":tenantId": tenantId,
          ":recordType": recordType,
          ":recordId": recordId,
          ":isDeleted": false
        }
      })
    );

    console.log('DynamoDB result:', { 
      count: result.Count, 
      scannedCount: result.ScannedCount,
      items: result.Items?.length || 0 
    });

    res.json({ data: (result.Items as Task[]) || [] });
  } catch (error) {
    console.error('Error in /by-related-record:', error);
    next(error);
  }
}) as express.RequestHandler);

// Get task by ID
router.get("/:id", (async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const tenantId = req.user?.tenantId;
    
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant ID required" });
    }

    const result = await docClient.send(
      new GetCommand({
        TableName: TABLES.TASKS,
        Key: { id }
      })
    );

    if (!result.Item) {
      return res.status(404).json({ error: "Task not found" });
    }

    // Check if task belongs to the same tenant
    if (result.Item.tenantId !== tenantId) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Check if task is soft deleted
    if (result.Item.isDeleted) {
      return res.status(404).json({ error: "Task not found" });
    }

    res.json({ data: result.Item as Task });
  } catch (error) {
    next(error);
  }
}) as express.RequestHandler);

// Create new task
router.post("/", (async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { 
      title, 
      description, 
      priority = "Medium", 
      status = "Open", 
      dueDate, 
      assignee,
      type = "Follow-up",
      contactLeadId,
      contactLeadType,
      relatedRecordId,
      relatedRecordType,
      visibleTo = [],
      notes
    } = req.body;
    const tenantId = req.user?.tenantId;
    const userId = req.user?.userId;
    const userEmail = req.user?.email;
    
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant ID required" });
    }

    const id = uuidv4();
    const createdAt = new Date().toISOString();

    const task: Task = {
      id,
      title,
      description,
      priority,
      status,
      dueDate,
      assignee,
      type,
      tenantId,
      createdAt,
      // Add new fields if provided
      ...(contactLeadId && { contactLeadId }),
      ...(contactLeadType && { contactLeadType }),
      ...(relatedRecordId && { relatedRecordId }),
      ...(relatedRecordType && { relatedRecordType }),
      ...(visibleTo && visibleTo.length > 0 && { visibleTo }),
      ...(notes && { notes }),
      // Auditing fields
      createdBy: userEmail || userId || 'Unknown',
      updatedAt: createdAt,
      updatedBy: userEmail || userId || 'Unknown',
      isDeleted: false,
      userId: userId || 'Unknown'
    };

    await docClient.send(
      new PutCommand({
        TableName: TABLES.TASKS,
        Item: task
      })
    );

    res.status(201).json({ data: task });
  } catch (error) {
    next(error);
  }
}) as express.RequestHandler);

// Update task
router.put("/:id", (async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const tenantId = req.user?.tenantId;
    const userId = req.user?.userId;
    const userEmail = req.user?.email;
    
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant ID required" });
    }

    // First check if task exists and belongs to tenant
    const existingTask = await docClient.send(
      new GetCommand({
        TableName: TABLES.TASKS,
        Key: { id }
      })
    );

    if (!existingTask.Item || existingTask.Item.tenantId !== tenantId) {
      return res.status(404).json({ error: "Task not found" });
    }
    
    // Build update expression
    const updateExpressions = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(updates)) {
      if (key !== 'id' && key !== 'tenantId') {
        updateExpressions.push(`#${key} = :${key}`);
        expressionAttributeNames[`#${key}`] = key;
        expressionAttributeValues[`:${key}`] = value;
      }
    }

    if (updateExpressions.length === 0) {
      return res.status(400).json({ error: "No valid fields to update" });
    }

    // Add auditing fields
    updateExpressions.push('#updatedAt = :updatedAt', '#updatedBy = :updatedBy');
    expressionAttributeNames['#updatedAt'] = 'updatedAt';
    expressionAttributeNames['#updatedBy'] = 'updatedBy';
    expressionAttributeValues[':updatedAt'] = new Date().toISOString();
    expressionAttributeValues[':updatedBy'] = userEmail || userId || 'Unknown';

    const result = await docClient.send(
      new UpdateCommand({
        TableName: TABLES.TASKS,
        Key: { id },
        UpdateExpression: `SET ${updateExpressions.join(', ')}`,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
        ReturnValues: "ALL_NEW"
      })
    );

    res.json({ data: result.Attributes as Task });
  } catch (error) {
    next(error);
  }
}) as express.RequestHandler);

// Delete task (soft delete)
router.delete("/:id", (async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const tenantId = req.user?.tenantId;
    const userId = req.user?.userId;
    const userEmail = req.user?.email;
    
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant ID required" });
    }

    // First check if task exists and belongs to tenant
    const existingTask = await docClient.send(
      new GetCommand({
        TableName: TABLES.TASKS,
        Key: { id }
      })
    );

    if (!existingTask.Item || existingTask.Item.tenantId !== tenantId) {
      return res.status(404).json({ error: "Task not found" });
    }

    // Soft delete by updating the task
    const result = await docClient.send(
      new UpdateCommand({
        TableName: TABLES.TASKS,
        Key: { id },
        UpdateExpression: 'SET #isDeleted = :isDeleted, #deletedAt = :deletedAt, #deletedBy = :deletedBy, #updatedAt = :updatedAt, #updatedBy = :updatedBy',
        ExpressionAttributeNames: {
          '#isDeleted': 'isDeleted',
          '#deletedAt': 'deletedAt',
          '#deletedBy': 'deletedBy',
          '#updatedAt': 'updatedAt',
          '#updatedBy': 'updatedBy'
        },
        ExpressionAttributeValues: {
          ':isDeleted': true,
          ':deletedAt': new Date().toISOString(),
          ':deletedBy': userEmail || userId || 'Unknown',
          ':updatedAt': new Date().toISOString(),
          ':updatedBy': userEmail || userId || 'Unknown'
        },
        ReturnValues: "ALL_NEW"
      })
    );

    res.json({ message: "Task deleted successfully", data: result.Attributes as Task });
  } catch (error) {
    next(error);
  }
}) as express.RequestHandler);

export default router;