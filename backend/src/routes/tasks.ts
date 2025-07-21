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
}

const router = express.Router();

// Get all tasks for tenant
router.get("/", (async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant ID required" });
    }

    const result = await docClient.send(
      new ScanCommand({
        TableName: TABLES.TASKS,
        FilterExpression: "tenantId = :tenantId",
        ExpressionAttributeValues: {
          ":tenantId": tenantId
        }
      })
    );

    res.json({ data: (result.Items as Task[]) || [] });
  } catch (error) {
    next(error);
  }
}) as express.RequestHandler);

// Get task by ID (tenant-aware)
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
      type = "Follow-up"
    } = req.body;
    const tenantId = req.user?.tenantId;
    
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
      createdAt
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

// Delete task
router.delete("/:id", (async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const tenantId = req.user?.tenantId;
    
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

    await docClient.send(
      new DeleteCommand({
        TableName: TABLES.TASKS,
        Key: { id }
      })
    );

    res.json({ message: "Task deleted successfully" });
  } catch (error) {
    next(error);
  }
}) as express.RequestHandler);

export default router;