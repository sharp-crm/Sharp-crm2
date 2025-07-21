import express, { Router, RequestHandler } from "express";
import { PutCommand, GetCommand, ScanCommand, UpdateCommand, DeleteCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { docClient, TABLES } from "../services/dynamoClient";
import { v4 as uuidv4 } from "uuid";
import { createError } from "../middlewares/errorHandler";
import { dealsService } from '../services/deals';

const router = Router();

interface Report {
  id: string;
  name: string;
  description: string;
  reportType: string;
  data: any;
  createdBy: string;
  createdAt: string;
  lastRun?: string;
  runCount: number;
  isPublic: boolean;
  sharedWith: string[];
  tenantId: string;
}

// Get all reports for current user
router.get("/", async (req, res, next) => {
  try {
    const userId = (req as any).user?.userId;
    const tenantId = (req as any).user?.tenantId;
    const { type, status } = req.query;
    
    // Get all reports in the tenant
    const result = await docClient.send(
      new ScanCommand({
        TableName: TABLES.REPORTS,
        FilterExpression: "tenantId = :tenantId",
        ExpressionAttributeValues: {
          ":tenantId": tenantId
        }
      })
    );

    // Filter reports based on visibility
    let reports = (result.Items || []).filter(report => {
      // User can see reports they created
      if (report.createdBy === userId) return true;
      
      // User can see public reports
      if (report.isPublic) return true;
      
      // User can see reports shared with them
      if (report.sharedWith && Array.isArray(report.sharedWith) && report.sharedWith.includes(userId)) return true;
      
      return false;
    });

    // Apply additional filters
    if (type) {
      reports = reports.filter(report => report.reportType === type);
    }

    if (status) {
      reports = reports.filter(report => report.status === status);
    }

    // Sort by creation date descending
    reports = reports.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.json({ data: reports });
  } catch (error) {
    next(error);
  }
});

// Get favorite reports (MOVED BEFORE /:id route)
router.get("/favorites/list", async (req, res, next) => {
  try {
    const userId = (req as any).user?.userId;
    const tenantId = (req as any).user?.tenantId;
    
    const result = await docClient.send(
      new ScanCommand({
        TableName: TABLES.REPORTS,
        FilterExpression: "tenantId = :tenantId AND (createdBy = :userId OR contains(sharedWith, :userId) OR isPublic = :isPublic) AND isFavorite = :isFavorite",
        ExpressionAttributeValues: {
          ":tenantId": tenantId,
          ":userId": userId,
          ":isPublic": true,
          ":isFavorite": true
        }
      })
    );

    const reports = (result.Items || [])
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    res.json({ data: reports });
  } catch (error) {
    next(error);
  }
});

// Get scheduled reports (MOVED BEFORE /:id route)  
router.get("/scheduled/list", async (req, res, next) => {
  try {
    const userId = (req as any).user?.userId;
    const tenantId = (req as any).user?.tenantId;
    
    const result = await docClient.send(
      new ScanCommand({
        TableName: TABLES.REPORTS,
        FilterExpression: "tenantId = :tenantId AND attribute_exists(schedule) AND schedule <> :emptySchedule",
        ExpressionAttributeValues: {
          ":tenantId": tenantId,
          ":emptySchedule": ""
        }
      })
    );

    // Filter reports based on visibility (same logic as main reports endpoint)
    const reports = (result.Items || []).filter(report => {
      // User can see reports they created
      if (report.createdBy === userId) return true;
      
      // User can see public reports
      if (report.isPublic) return true;
      
      // User can see reports shared with them
      if (report.sharedWith && report.sharedWith.includes(userId)) return true;
      
      return false;
    });

    // Sort by creation date descending
    const sortedReports = reports.sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime());

    res.json({ data: sortedReports });
  } catch (error) {
    next(error);
  }
});

// Get report by ID (MOVED AFTER specific routes)
router.get("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.userId;
    const tenantId = (req as any).user?.tenantId;
    
    const result = await docClient.send(
      new GetCommand({
        TableName: TABLES.REPORTS,
        Key: { id }
      })
    );

    if (!result.Item) {
      throw createError("Report not found", 404);
    }

    const report = result.Item;

    // Check tenant access
    if (report.tenantId !== tenantId) {
      throw createError("Access denied", 403);
    }

    // Check visibility - user can access their own reports, shared reports, or public reports
    if (report.createdBy !== userId && 
        !report.isPublic && 
        (!report.sharedWith || !report.sharedWith.includes(userId))) {
      throw createError("Access denied", 403);
    }

    res.json({ data: report });
  } catch (error) {
    next(error);
  }
});

// Create new report
router.post("/", async (req, res, next) => {
  try {
    const { 
      name, 
      description,
      reportType, // 'sales', 'leads', 'contacts', 'deals', 'tasks', 'custom'
      filters,
      columns,
      chartType,
      schedule,
      isPublic = false
    } = req.body;

    if (!name || !reportType) {
      throw createError("Name and report type are required", 400);
    }

    const id = uuidv4();
    const userId = (req as any).user?.userId;
    const tenantId = (req as any).user?.tenantId;
    const createdAt = new Date().toISOString();

    const report = {
      id,
      name,
      description: description || '',
      reportType,
      filters: filters || {},
      columns: columns || [],
      chartType: chartType || 'table',
      schedule: schedule || null,
      isPublic,
      isFavorite: false,
      status: 'active',
      createdBy: userId,
      createdAt,
      updatedAt: createdAt,
      lastRun: null,
      runCount: 0,
      sharedWith: [],
      tenantId
    };

    await docClient.send(
      new PutCommand({
        TableName: TABLES.REPORTS,
        Item: report
      })
    );

    res.status(201).json({ data: report });
  } catch (error) {
    next(error);
  }
});

// Run report and get data
router.post("/:id/run", async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.userId;
    const tenantId = (req as any).user?.tenantId;

    // Get report configuration
    const reportResult = await docClient.send(
      new GetCommand({
        TableName: TABLES.REPORTS,
        Key: { id }
      })
    );

    if (!reportResult.Item) {
      throw createError("Report not found", 404);
    }

    // Check access
    if (reportResult.Item.createdBy !== userId && 
        !reportResult.Item.isPublic &&
        (!reportResult.Item.sharedWith || !reportResult.Item.sharedWith.includes(userId))) {
      throw createError("Access denied", 403);
    }

    const report = reportResult.Item;
    let data = await generateReportData(report.reportType, tenantId, userId);

    // Update report run statistics
    await docClient.send(
      new UpdateCommand({
        TableName: TABLES.REPORTS,
        Key: { id },
        UpdateExpression: "SET lastRun = :lastRun, runCount = runCount + :increment, #data = :data",
        ExpressionAttributeNames: {
          "#data": "data"
        },
        ExpressionAttributeValues: {
          ":lastRun": new Date().toISOString(),
          ":increment": 1,
          ":data": data
        }
      })
    );

    res.json({
      data: {
        reportInfo: {
          id: report.id,
          name: report.name,
          type: report.reportType,
          runAt: new Date().toISOString(),
          recordCount: data.totalDeals || data.totalLeads || data.totalTasks || data.totalContacts || 0
        },
        results: data
      }
    });
  } catch (error) {
    next(error);
  }
});

// Helper function to generate report data
async function generateReportData(reportType: string, tenantId: string, userId: string): Promise<any> {
  switch (reportType) {
    case 'deals-pipeline': {
      const deals = await dealsService.getDealsByTenant(tenantId, userId);
      const stages = ['Need Analysis', 'Value Proposition', 'Identify Decision Makers', 
                     'Negotiation/Review', 'Closed Won', 'Closed Lost'];
      
      const pipelineData = stages.map(stage => {
        const stageDeals = deals.filter(d => d.stage === stage);
        return {
          stage,
          count: stageDeals.length,
          value: stageDeals.reduce((sum, deal) => sum + (deal.amount || 0), 0)
        };
      });

      return {
        pipelineData,
        totalValue: pipelineData.reduce((sum, stage) => sum + stage.value, 0),
        totalDeals: pipelineData.reduce((sum, stage) => sum + stage.count, 0)
      };
    }

    case 'sales-forecast': {
      const deals = await dealsService.getDealsByTenant(tenantId, userId);
      const forecast = deals.reduce((acc, deal) => {
        const weightedValue = (deal.amount || 0) * ((deal.probability || 0) / 100);
        return {
          totalPipeline: acc.totalPipeline + (deal.amount || 0),
          weightedPipeline: acc.weightedPipeline + weightedValue,
          byProbability: {
            ...acc.byProbability,
            [deal.probability || 0]: (acc.byProbability[deal.probability || 0] || 0) + (deal.amount || 0)
          }
        };
      }, { totalPipeline: 0, weightedPipeline: 0, byProbability: {} as Record<number, number> });

      return {
        forecast,
        timeline: {
          thisMonth: deals.filter(d => {
            const closeDate = new Date(d.closeDate || '');
            const now = new Date();
            return closeDate.getMonth() === now.getMonth() && 
                   closeDate.getFullYear() === now.getFullYear();
          }).reduce((sum, deal) => sum + ((deal.amount || 0) * (deal.probability || 0) / 100), 0),
          nextMonth: deals.filter(d => {
            const closeDate = new Date(d.closeDate || '');
            const nextMonth = new Date();
            nextMonth.setMonth(nextMonth.getMonth() + 1);
            return closeDate.getMonth() === nextMonth.getMonth() && 
                   closeDate.getFullYear() === nextMonth.getFullYear();
          }).reduce((sum, deal) => sum + ((deal.amount || 0) * (deal.probability || 0) / 100), 0)
        }
      };
    }

    case 'lead-conversion': {
      const leads = await docClient.send(new ScanCommand({
        TableName: TABLES.LEADS,
        FilterExpression: 'tenantId = :tenantId',
        ExpressionAttributeValues: {
          ':tenantId': tenantId
        }
      }));

      const leadData = (leads.Items || []).reduce((acc: any, lead: any) => {
        const source = lead.leadSource || 'Other';
        if (!acc[source]) {
          acc[source] = {
            total: 0,
            converted: 0,
            value: 0
          };
        }
        acc[source].total++;
        if (lead.status === 'Converted') {
          acc[source].converted++;
          acc[source].value += lead.value || 0;
        }
        return acc;
      }, {});

      return {
        bySource: leadData,
        summary: {
          totalLeads: (leads.Items || []).length,
          convertedLeads: (leads.Items || []).filter((l: any) => l.status === 'Converted').length,
          averageValue: (leads.Items || [])
            .filter((l: any) => l.status === 'Converted')
            .reduce((sum: number, l: any) => sum + (l.value || 0), 0) / 
            (leads.Items || []).filter((l: any) => l.status === 'Converted').length || 0
        }
      };
    }

    case 'task-completion': {
      const tasks = await docClient.send(new ScanCommand({
        TableName: TABLES.TASKS,
        FilterExpression: 'tenantId = :tenantId',
        ExpressionAttributeValues: {
          ':tenantId': tenantId
        }
      }));

      const taskData = (tasks.Items || []).reduce((acc: any, task: any) => {
        const type = task.type || 'Other';
        if (!acc[type]) {
          acc[type] = {
            total: 0,
            completed: 0,
            overdue: 0
          };
        }
        acc[type].total++;
        if (task.status === 'Completed') {
          acc[type].completed++;
        }
        if (new Date(task.dueDate) < new Date() && task.status !== 'Completed') {
          acc[type].overdue++;
        }
        return acc;
      }, {});

      return {
        byType: taskData,
        summary: {
          totalTasks: (tasks.Items || []).length,
          completedTasks: (tasks.Items || []).filter((t: any) => t.status === 'Completed').length,
          overdueTasks: (tasks.Items || []).filter((t: any) => 
            new Date(t.dueDate) < new Date() && t.status !== 'Completed'
          ).length
        }
      };
    }

    case 'contact-engagement': {
      const contacts = await docClient.send(new ScanCommand({
        TableName: TABLES.CONTACTS,
        FilterExpression: 'tenantId = :tenantId',
        ExpressionAttributeValues: {
          ':tenantId': tenantId
        }
      }));

      const tasks = await docClient.send(new ScanCommand({
        TableName: TABLES.TASKS,
        FilterExpression: 'tenantId = :tenantId',
        ExpressionAttributeValues: {
          ':tenantId': tenantId
        }
      }));

      const contactData = (contacts.Items || []).reduce((acc: any, contact: any) => {
        const source = contact.leadSource || 'Other';
        if (!acc[source]) {
          acc[source] = {
            total: 0,
            withTasks: 0,
            taskCount: 0
          };
        }
        acc[source].total++;
        const contactTasks = (tasks.Items || []).filter((t: any) => t.contactId === contact.id);
        if (contactTasks.length > 0) {
          acc[source].withTasks++;
          acc[source].taskCount += contactTasks.length;
        }
        return acc;
      }, {});

      return {
        bySource: contactData,
        summary: {
          totalContacts: (contacts.Items || []).length,
          activeContacts: (contacts.Items || []).filter((c: any) => 
            (tasks.Items || []).some((t: any) => t.contactId === c.id)
          ).length,
          totalInteractions: (tasks.Items || []).filter((t: any) => t.contactId).length
        }
      };
    }

    default:
      throw createError("Unsupported report type", 400);
  }
}

// Update report
router.put("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const userId = (req as any).user?.userId;

    // First check if report exists and user has access
    const getResult = await docClient.send(
      new GetCommand({
        TableName: TABLES.REPORTS,
        Key: { id }
      })
    );

    if (!getResult.Item) {
      throw createError("Report not found", 404);
    }

    // Only creator can update
    if (getResult.Item.createdBy !== userId) {
      throw createError("Access denied. Only report creator can update.", 403);
    }

    // Build update expression
    const updateExpressions = [];
    const expressionAttributeNames: any = {};
    const expressionAttributeValues: any = {};
    
    // Always use expression attribute names to avoid reserved keyword issues
    for (const [key, value] of Object.entries(updates)) {
      if (key !== 'id' && key !== 'createdBy' && key !== 'createdAt' && value !== undefined) {
        updateExpressions.push(`#${key} = :${key}`);
        expressionAttributeNames[`#${key}`] = key;
        expressionAttributeValues[`:${key}`] = value;
      }
    }

    // Add updatedAt (always use expression attribute names for consistency)
    updateExpressions.push('#updatedAt = :updatedAt');
    expressionAttributeNames['#updatedAt'] = 'updatedAt';
    expressionAttributeValues[':updatedAt'] = new Date().toISOString();

    if (updateExpressions.length === 1) {
      throw createError("No valid fields to update", 400);
    }

    const result = await docClient.send(
      new UpdateCommand({
        TableName: TABLES.REPORTS,
        Key: { id },
        UpdateExpression: `SET ${updateExpressions.join(', ')}`,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
        ReturnValues: "ALL_NEW"
      })
    );

    res.json({ data: result.Attributes });
  } catch (error) {
    next(error);
  }
});

// Delete report
router.delete("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.userId;

    // First check if report exists and user has access
    const getResult = await docClient.send(
      new GetCommand({
        TableName: TABLES.REPORTS,
        Key: { id }
      })
    );

    if (!getResult.Item) {
      throw createError("Report not found", 404);
    }

    // Only creator can delete
    if (getResult.Item.createdBy !== userId) {
      throw createError("Access denied. Only report creator can delete.", 403);
    }

    await docClient.send(
      new DeleteCommand({
        TableName: TABLES.REPORTS,
        Key: { id }
      })
    );

    res.json({ message: "Report deleted successfully" });
  } catch (error) {
    next(error);
  }
});

// Toggle favorite status
router.patch("/:id/favorite", async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.userId;
    const { isFavorite } = req.body;

    // First check if report exists and user has access
    const getResult = await docClient.send(
      new GetCommand({
        TableName: TABLES.REPORTS,
        Key: { id }
      })
    );

    if (!getResult.Item) {
      throw createError("Report not found", 404);
    }

    // Check access
    if (getResult.Item.createdBy !== userId && 
        !getResult.Item.sharedWith?.includes(userId) && 
        !getResult.Item.isPublic) {
      throw createError("Access denied", 403);
    }

    const result = await docClient.send(
      new UpdateCommand({
        TableName: TABLES.REPORTS,
        Key: { id },
        UpdateExpression: "SET isFavorite = :isFavorite",
        ExpressionAttributeValues: {
          ":isFavorite": !!isFavorite
        },
        ReturnValues: "ALL_NEW"
      })
    );

    res.json({ data: result.Attributes });
  } catch (error) {
    next(error);
  }
});



// Share report with other users
router.post("/:id/share", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { userIds, isPublic } = req.body;
    const userId = (req as any).user?.userId;

    // First check if report exists and user has access
    const getResult = await docClient.send(
      new GetCommand({
        TableName: TABLES.REPORTS,
        Key: { id }
      })
    );

    if (!getResult.Item) {
      throw createError("Report not found", 404);
    }

    // Only creator can share
    if (getResult.Item.createdBy !== userId) {
      throw createError("Access denied. Only report creator can share.", 403);
    }

    // Validate userIds array
    if (userIds && Array.isArray(userIds)) {
      // Verify all userIds exist in the tenant
      const userResults = await Promise.all(
        userIds.map(uid => 
          docClient.send(
            new ScanCommand({
              TableName: TABLES.USERS,
              FilterExpression: "userId = :userId",
              ExpressionAttributeValues: {
                ":userId": uid
              }
            })
          )
        )
      );

      // Check if any userIds are invalid
      const invalidUsers = userIds.filter((uid, index) => !userResults[index].Items?.length);
      if (invalidUsers.length > 0) {
        throw createError(`Invalid user IDs: ${invalidUsers.join(", ")}`, 400);
      }
    }

    const updateExpression = [];
    const expressionAttributeValues: any = {};

    if (userIds && Array.isArray(userIds)) {
      updateExpression.push("sharedWith = :sharedWith");
      expressionAttributeValues[":sharedWith"] = userIds;
    }

    if (typeof isPublic === 'boolean') {
      updateExpression.push("isPublic = :isPublic");
      expressionAttributeValues[":isPublic"] = isPublic;
    }

    if (updateExpression.length === 0) {
      throw createError("No sharing settings provided", 400);
    }

    const result = await docClient.send(
      new UpdateCommand({
        TableName: TABLES.REPORTS,
        Key: { id },
        UpdateExpression: `SET ${updateExpression.join(', ')}, updatedAt = :updatedAt`,
        ExpressionAttributeValues: {
          ...expressionAttributeValues,
          ":updatedAt": new Date().toISOString()
        },
        ReturnValues: "ALL_NEW"
      })
    );

    res.json({ data: result.Attributes });
  } catch (error) {
    next(error);
  }
});

// Get all reports
const getAllReports: RequestHandler = async (req: any, res) => {
  try {
    const { tenantId } = req.user;

    const result = await docClient.send(new ScanCommand({
      TableName: TABLES.REPORTS,
      FilterExpression: 'tenantId = :tenantId',
      ExpressionAttributeValues: {
        ':tenantId': tenantId
      }
    }));

    res.json({ data: result.Items || [] });
  } catch (error) {
    console.error('Get reports error:', error);
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
};

// Generate report
const generateReport: RequestHandler = async (req: any, res) => {
  try {
    const { tenantId, userId, email } = req.user;
    const { reportType, name, description, isPublic } = req.body;

    if (!reportType || !name) {
      res.status(400).json({ error: 'Report type and name are required' });
      return;
    }

    let reportData: any = {};

    // Generate report data based on type
    switch (reportType) {
      case 'deals-pipeline': {
        const deals = await dealsService.getDealsByTenant(tenantId, userId);
        const stages = ['Need Analysis', 'Value Proposition', 'Identify Decision Makers', 
                       'Negotiation/Review', 'Closed Won', 'Closed Lost'];
        
        const pipelineData = stages.map(stage => {
          const stageDeals = deals.filter(d => d.stage === stage);
          return {
            stage,
            count: stageDeals.length,
            value: stageDeals.reduce((sum, deal) => sum + (deal.amount || 0), 0),
            deals: stageDeals.map(d => ({
              id: d.id,
              name: d.dealName,
              amount: d.amount,
              probability: d.probability
            }))
          };
        });

        const conversionRates = stages.slice(0, -1).map((stage, index) => {
          const currentStage = pipelineData[index];
          const nextStage = pipelineData[index + 1];
          return {
            from: stage,
            to: stages[index + 1],
            rate: currentStage.count ? (nextStage.count / currentStage.count) * 100 : 0
          };
        });

        reportData = {
          pipelineData,
          conversionRates,
          totalValue: pipelineData.reduce((sum, stage) => sum + stage.value, 0),
          totalDeals: pipelineData.reduce((sum, stage) => sum + stage.count, 0)
        };
        break;
      }

      case 'sales-forecast': {
        const deals = await dealsService.getDealsByTenant(tenantId, userId);
        const forecast = deals.reduce((acc, deal) => {
          const weightedValue = (deal.amount || 0) * ((deal.probability || 0) / 100);
          return {
            totalPipeline: acc.totalPipeline + (deal.amount || 0),
            weightedPipeline: acc.weightedPipeline + weightedValue
          };
        }, { totalPipeline: 0, weightedPipeline: 0 });

        reportData = {
          forecast,
          timeline: {
            thisMonth: deals.filter(d => {
              const closeDate = new Date(d.closeDate || '');
              const now = new Date();
              return closeDate.getMonth() === now.getMonth() && 
                     closeDate.getFullYear() === now.getFullYear();
            }).reduce((sum, deal) => sum + ((deal.amount || 0) * (deal.probability || 0) / 100), 0),
            nextMonth: deals.filter(d => {
              const closeDate = new Date(d.closeDate || '');
              const nextMonth = new Date();
              nextMonth.setMonth(nextMonth.getMonth() + 1);
              return closeDate.getMonth() === nextMonth.getMonth() && 
                     closeDate.getFullYear() === nextMonth.getFullYear();
            }).reduce((sum, deal) => sum + ((deal.amount || 0) * (deal.probability || 0) / 100), 0)
          }
        };
        break;
      }

      case 'lead-conversion': {
        const leads = await docClient.send(new ScanCommand({
          TableName: TABLES.LEADS,
          FilterExpression: 'tenantId = :tenantId',
          ExpressionAttributeValues: {
            ':tenantId': tenantId
          }
        }));

        const leadData = (leads.Items || []).reduce((acc: any, lead: any) => {
          const source = lead.leadSource || 'Other';
          if (!acc[source]) {
            acc[source] = {
              total: 0,
              converted: 0,
              value: 0
            };
          }
          acc[source].total++;
          if (lead.status === 'Converted') {
            acc[source].converted++;
            acc[source].value += lead.value || 0;
          }
          return acc;
        }, {});

        reportData = {
          bySource: leadData,
          summary: {
            totalLeads: (leads.Items || []).length,
            convertedLeads: (leads.Items || []).filter((l: any) => l.status === 'Converted').length,
            averageValue: (leads.Items || [])
              .filter((l: any) => l.status === 'Converted')
              .reduce((sum: number, l: any) => sum + (l.value || 0), 0) / 
              (leads.Items || []).filter((l: any) => l.status === 'Converted').length || 0
          }
        };
        break;
      }

      case 'task-completion': {
        const tasks = await docClient.send(new ScanCommand({
          TableName: TABLES.TASKS,
          FilterExpression: 'tenantId = :tenantId',
          ExpressionAttributeValues: {
            ':tenantId': tenantId
          }
        }));

        const taskData = (tasks.Items || []).reduce((acc: any, task: any) => {
          const type = task.type || 'Other';
          if (!acc[type]) {
            acc[type] = {
              total: 0,
              completed: 0,
              overdue: 0
            };
          }
          acc[type].total++;
          if (task.status === 'Completed') {
            acc[type].completed++;
          }
          if (new Date(task.dueDate) < new Date() && task.status !== 'Completed') {
            acc[type].overdue++;
          }
          return acc;
        }, {});

        reportData = {
          byType: taskData,
          summary: {
            totalTasks: (tasks.Items || []).length,
            completedTasks: (tasks.Items || []).filter((t: any) => t.status === 'Completed').length,
            overdueTasks: (tasks.Items || []).filter((t: any) => 
              new Date(t.dueDate) < new Date() && t.status !== 'Completed'
            ).length
          }
        };
        break;
      }

      case 'contact-engagement': {
        const contacts = await docClient.send(new ScanCommand({
          TableName: TABLES.CONTACTS,
          FilterExpression: 'tenantId = :tenantId',
          ExpressionAttributeValues: {
            ':tenantId': tenantId
          }
        }));

        const tasks = await docClient.send(new ScanCommand({
          TableName: TABLES.TASKS,
          FilterExpression: 'tenantId = :tenantId',
          ExpressionAttributeValues: {
            ':tenantId': tenantId
          }
        }));

        const contactData = (contacts.Items || []).reduce((acc: any, contact: any) => {
          const source = contact.leadSource || 'Other';
          if (!acc[source]) {
            acc[source] = {
              total: 0,
              withTasks: 0,
              taskCount: 0
            };
          }
          acc[source].total++;
          const contactTasks = (tasks.Items || []).filter((t: any) => t.contactId === contact.id);
          if (contactTasks.length > 0) {
            acc[source].withTasks++;
            acc[source].taskCount += contactTasks.length;
          }
          return acc;
        }, {});

        reportData = {
          bySource: contactData,
          summary: {
            totalContacts: (contacts.Items || []).length,
            activeContacts: (contacts.Items || []).filter((c: any) => 
              (tasks.Items || []).some((t: any) => t.contactId === c.id)
            ).length,
            totalInteractions: (tasks.Items || []).filter((t: any) => t.contactId).length
          }
        };
        break;
      }

      default:
        res.status(400).json({ error: 'Invalid report type' });
        return;
    }

    // Create report record
    const report: Report = {
      id: uuidv4(),
      name,
      description,
      reportType,
      data: reportData,
      createdBy: email,
      createdAt: new Date().toISOString(),
      lastRun: new Date().toISOString(),
      runCount: 1,
      isPublic,
      sharedWith: [],
      tenantId
    };

    await docClient.send(new PutCommand({
      TableName: TABLES.REPORTS,
      Item: report
    }));

    res.json({ 
      message: 'Report generated successfully',
      data: report
    });
  } catch (error) {
    console.error('Generate report error:', error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
};

export default router; 