import express from "express";
import { ScanCommand } from "@aws-sdk/lib-dynamodb";
import { docClient } from "../services/dynamoClient";
import { createError } from "../middlewares/errorHandler";

const router = express.Router();

// Get overview dashboard metrics
router.get("/overview", async (req, res, next) => {
  try {
    const { period = '30' } = req.query; // days
    const periodDays = Number(period);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - periodDays);

    // Fetch data from all relevant tables
    const [dealsResult, leadsResult, tasksResult, contactsResult] = await Promise.all([
      docClient.send(new ScanCommand({ TableName: "Deals" })),
      docClient.send(new ScanCommand({ TableName: "Leads" })),
      docClient.send(new ScanCommand({ TableName: "Tasks" })),
      docClient.send(new ScanCommand({ TableName: "Contacts" }))
    ]);

    const deals = dealsResult.Items || [];
    const leads = leadsResult.Items || [];
    const tasks = tasksResult.Items || [];
    const contacts = contactsResult.Items || [];

    // Calculate metrics
    const totalRevenue = deals
      .filter(deal => deal.stage === 'Closed Won')
      .reduce((sum, deal) => sum + (deal.value || 0), 0);

    const activeDeals = deals.filter(deal => 
      deal.stage !== 'Closed Won' && deal.stage !== 'Closed Lost'
    );

    const pipelineValue = activeDeals.reduce((sum, deal) => sum + (deal.value || 0), 0);

    const closedWonDeals = deals.filter(deal => deal.stage === 'Closed Won').length;
    const closedLostDeals = deals.filter(deal => deal.stage === 'Closed Lost').length;
    const totalClosedDeals = closedWonDeals + closedLostDeals;
    const conversionRate = totalClosedDeals > 0 ? (closedWonDeals / totalClosedDeals) * 100 : 0;

    // Calculate monthly growth (simplified)
    const thisMonth = new Date();
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);

    const thisMonthRevenue = deals
      .filter(deal => {
        const closeDate = new Date(deal.closeDate || deal.createdAt);
        return closeDate.getMonth() === thisMonth.getMonth() && 
               closeDate.getFullYear() === thisMonth.getFullYear() &&
               deal.stage === 'Closed Won';
      })
      .reduce((sum, deal) => sum + (deal.value || 0), 0);

    const lastMonthRevenue = deals
      .filter(deal => {
        const closeDate = new Date(deal.closeDate || deal.createdAt);
        return closeDate.getMonth() === lastMonth.getMonth() && 
               closeDate.getFullYear() === lastMonth.getFullYear() &&
               deal.stage === 'Closed Won';
      })
      .reduce((sum, deal) => sum + (deal.value || 0), 0);

    const monthlyGrowth = lastMonthRevenue > 0 
      ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 
      : 0;

    const avgDealSize = closedWonDeals > 0 ? totalRevenue / closedWonDeals : 0;

    // Deal status distribution
    const dealStatusDistribution = {
      'Closed Won': deals.filter(d => d.stage === 'Closed Won').length,
      'In Progress': activeDeals.length,
      'Closed Lost': deals.filter(d => d.stage === 'Closed Lost').length
    };

    // Recent activity counts
    const activityData = {
      calls: tasks.filter(t => t.type === 'Call').length,
      emails: tasks.filter(t => t.type === 'Email').length,
      meetings: tasks.filter(t => t.type === 'Meeting').length,
      tasks: tasks.length
    };

    // Revenue trend (last 6 months)
    const revenueTrend = [];
    for (let i = 5; i >= 0; i--) {
      const month = new Date();
      month.setMonth(month.getMonth() - i);
      
      const monthRevenue = deals
        .filter(deal => {
          const closeDate = new Date(deal.closeDate || deal.createdAt);
          return closeDate.getMonth() === month.getMonth() && 
                 closeDate.getFullYear() === month.getFullYear() &&
                 deal.stage === 'Closed Won';
        })
        .reduce((sum, deal) => sum + (deal.value || 0), 0);

      const monthDeals = deals
        .filter(deal => {
          const closeDate = new Date(deal.closeDate || deal.createdAt);
          return closeDate.getMonth() === month.getMonth() && 
                 closeDate.getFullYear() === month.getFullYear() &&
                 deal.stage === 'Closed Won';
        }).length;

      revenueTrend.push({
        month: month.toLocaleString('default', { month: 'short' }),
        revenue: monthRevenue,
        deals: monthDeals
      });
    }

    const response = {
      kpis: {
        totalRevenue,
        monthlyGrowth,
        activeDeals: activeDeals.length,
        pipelineValue,
        conversionRate,
        avgDealSize,
        totalContacts: contacts.length,
        totalLeads: leads.length
      },
      dealStatusDistribution,
      activityData,
      revenueTrend,
      summary: {
        dealsWon: closedWonDeals,
        dealsLost: closedLostDeals,
        totalDeals: deals.length,
        activeTasks: tasks.filter(t => t.status === 'Open' || t.status === 'In Progress').length,
        completedTasks: tasks.filter(t => t.status === 'Completed').length
      }
    };

    res.json({ data: response });
  } catch (error) {
    next(error);
  }
});

// Get lead analytics
router.get("/leads", async (req, res, next) => {
  try {
    const result = await docClient.send(new ScanCommand({ TableName: "Leads" }));
    const leads = result.Items || [];

    // Lead status distribution
    const statusDistribution = leads.reduce((acc, lead) => {
      acc[lead.status] = (acc[lead.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Lead source analysis
    const sourceAnalysis = leads.reduce((acc, lead) => {
      acc[lead.source] = (acc[lead.source] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Lead value distribution
    const totalLeadValue = leads.reduce((sum, lead) => sum + (lead.value || 0), 0);
    const avgLeadValue = leads.length > 0 ? totalLeadValue / leads.length : 0;

    // Monthly lead creation trend
    const monthlyTrend = [];
    for (let i = 5; i >= 0; i--) {
      const month = new Date();
      month.setMonth(month.getMonth() - i);
      
      const monthLeads = leads.filter(lead => {
        const createdDate = new Date(lead.createdAt);
        return createdDate.getMonth() === month.getMonth() && 
               createdDate.getFullYear() === month.getFullYear();
      }).length;

      monthlyTrend.push({
        month: month.toLocaleString('default', { month: 'short' }),
        leads: monthLeads
      });
    }

    res.json({
      data: {
        totalLeads: leads.length,
        statusDistribution,
        sourceAnalysis,
        totalLeadValue,
        avgLeadValue,
        monthlyTrend
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get deal insights
router.get("/deals", async (req, res, next) => {
  try {
    const result = await docClient.send(new ScanCommand({ TableName: "Deals" }));
    const deals = result.Items || [];

    // Stage distribution
    const stageDistribution = deals.reduce((acc, deal) => {
      acc[deal.stage] = (acc[deal.stage] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Average deal size by stage
    const dealSizeByStage = deals.reduce((acc, deal) => {
      if (!acc[deal.stage]) {
        acc[deal.stage] = { total: 0, count: 0 };
      }
      acc[deal.stage].total += deal.value || 0;
      acc[deal.stage].count += 1;
      return acc;
    }, {} as Record<string, { total: number; count: number }>);

    const avgDealSizeByStage = Object.entries(dealSizeByStage).reduce((acc, [stage, data]) => {
      acc[stage] = data.count > 0 ? data.total / data.count : 0;
      return acc;
    }, {} as Record<string, number>);

    // Win rate analysis
    const closedDeals = deals.filter(d => d.stage === 'Closed Won' || d.stage === 'Closed Lost');
    const wonDeals = deals.filter(d => d.stage === 'Closed Won');
    const winRate = closedDeals.length > 0 ? (wonDeals.length / closedDeals.length) * 100 : 0;

    // Sales cycle analysis (simplified)
    const avgSalesCycle = wonDeals.length > 0 
      ? wonDeals.reduce((sum, deal) => {
          const created = new Date(deal.createdAt);
          const closed = new Date(deal.closeDate || deal.createdAt);
          return sum + (closed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
        }, 0) / wonDeals.length
      : 0;

    res.json({
      data: {
        totalDeals: deals.length,
        stageDistribution,
        avgDealSizeByStage,
        winRate,
        avgSalesCycle: Math.round(avgSalesCycle),
        totalPipelineValue: deals
          .filter(d => d.stage !== 'Closed Won' && d.stage !== 'Closed Lost')
          .reduce((sum, deal) => sum + (deal.value || 0), 0)
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get activity statistics
router.get("/activity", async (req, res, next) => {
  try {
    const [tasksResult, dealsResult, leadsResult] = await Promise.all([
      docClient.send(new ScanCommand({ TableName: "Tasks" })),
      docClient.send(new ScanCommand({ TableName: "Deals" })),
      docClient.send(new ScanCommand({ TableName: "Leads" }))
    ]);

    const tasks = tasksResult.Items || [];
    const deals = dealsResult.Items || [];
    const leads = leadsResult.Items || [];

    // Task statistics
    const taskStats = {
      total: tasks.length,
      completed: tasks.filter(t => t.status === 'Completed').length,
      overdue: tasks.filter(t => {
        const dueDate = new Date(t.dueDate);
        return dueDate < new Date() && t.status !== 'Completed';
      }).length,
      byPriority: tasks.reduce((acc, task) => {
        acc[task.priority] = (acc[task.priority] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      byType: tasks.reduce((acc, task) => {
        acc[task.type] = (acc[task.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    };

    // Recent activity (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentActivity = {
      newLeads: leads.filter(l => new Date(l.createdAt) > thirtyDaysAgo).length,
      newDeals: deals.filter(d => new Date(d.createdAt) > thirtyDaysAgo).length,
      completedTasks: tasks.filter(t => 
        t.status === 'Completed' && 
        new Date(t.createdAt) > thirtyDaysAgo
      ).length
    };

    res.json({
      data: {
        taskStats,
        recentActivity,
        productivity: {
          taskCompletionRate: taskStats.total > 0 ? (taskStats.completed / taskStats.total) * 100 : 0,
          avgTasksPerDay: tasks.length / 30, // simplified
          overdueRate: taskStats.total > 0 ? (taskStats.overdue / taskStats.total) * 100 : 0
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get team performance
router.get("/team", async (req, res, next) => {
  try {
    const [dealsResult, tasksResult, usersResult] = await Promise.all([
      docClient.send(new ScanCommand({ TableName: "Deals" })),
      docClient.send(new ScanCommand({ TableName: "Tasks" })),
      docClient.send(new ScanCommand({ TableName: "Users" }))
    ]);

    const deals = dealsResult.Items || [];
    const tasks = tasksResult.Items || [];
    const users = usersResult.Items || [];

    // Performance by user
    const userPerformance = users.map(user => {
      const userDeals = deals.filter(d => d.owner === user.email);
      const userTasks = tasks.filter(t => t.assignee === user.email);
      const completedTasks = userTasks.filter(t => t.status === 'Completed');
      const wonDeals = userDeals.filter(d => d.stage === 'Closed Won');
      
      return {
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
        email: user.email,
        role: user.role,
        deals: userDeals.length,
        revenue: wonDeals.reduce((sum, deal) => sum + (deal.value || 0), 0),
        tasks: userTasks.length,
        completedTasks: completedTasks.length,
        taskCompletionRate: userTasks.length > 0 ? (completedTasks.length / userTasks.length) * 100 : 0
      };
    });

    // Sort by revenue
    userPerformance.sort((a, b) => b.revenue - a.revenue);

    res.json({ data: userPerformance });
  } catch (error) {
    next(error);
  }
});

export default router; 