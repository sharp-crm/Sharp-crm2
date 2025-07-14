import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import path from "path";
import authRoutes from './routes/auth';
import authSimpleRoutes from './routes/auth-simple';
import usersRoutes from './routes/users';
import dealsRoutes from './routes/deals';
import leadsRoutes from './routes/leads';
import contactsRoutes from './routes/contacts';
import tasksRoutes from './routes/tasks';
import dealersRoutes from './routes/dealers';
import subsidiariesRoutes from './routes/subsidiaries';
import analyticsRoutes from './routes/analytics';
import notificationsRoutes from './routes/notifications';
import reportsRoutes from './routes/reports';
import chatRoutes from './routes/chat';
import { authenticate } from "./middlewares/authenticate";
import { errorHandler } from "./middlewares/errorHandler";
import { requestLogger } from "./middlewares/requestLogger";
import { tokenRefreshHeaders, tokenCorsHeaders } from "./middlewares/tokenRefreshHeaders";

dotenv.config();

const app = express();

// CORS configuration
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5175"
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser()); // Parse cookies for secure refresh token handling

// Serve static files from uploads directory
app.use('/api/uploads', express.static(path.join(__dirname, '../uploads')));

// Request logging middleware
app.use(requestLogger as express.RequestHandler);

// Token CORS headers middleware
app.use(tokenCorsHeaders);

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const { checkDatabaseConnection, checkRequiredTables } = await import('./utils/dbHealthCheck');
    const { lambdaHealthCheck } = await import('./utils/coldStartInit');
    
    const dbCheck = await checkDatabaseConnection();
    const tablesCheck = await checkRequiredTables();
    const healthStatus = await lambdaHealthCheck();
    
    const isHealthy = dbCheck.connected && tablesCheck.allExist && healthStatus.status === 'healthy';
    
    res.status(isHealthy ? 200 : 503).json({
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      checks: {
        ...healthStatus.checks,
        database: dbCheck.connected,
        requiredTables: tablesCheck.allExist
      },
      details: {
        database: dbCheck,
        tables: tablesCheck
      }
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed'
    });
  }
});

// Public routes (only auth routes should be public)
app.use('/api/auth', authRoutes);
app.use('/api/auth-simple', authSimpleRoutes);

// Protected routes with token refresh headers
app.use("/api/contacts", authenticate as express.RequestHandler, tokenRefreshHeaders, contactsRoutes);
app.use("/api/subsidiaries", authenticate as express.RequestHandler, tokenRefreshHeaders, subsidiariesRoutes);
app.use("/api/dealers", authenticate as express.RequestHandler, tokenRefreshHeaders, dealersRoutes);
app.use("/api/tasks", authenticate as express.RequestHandler, tokenRefreshHeaders, tasksRoutes);
app.use("/api/leads", authenticate as express.RequestHandler, tokenRefreshHeaders, leadsRoutes);
app.use("/api/deals", authenticate as express.RequestHandler, tokenRefreshHeaders, dealsRoutes);
app.use("/api/users", authenticate as express.RequestHandler, tokenRefreshHeaders, usersRoutes);
app.use("/api/notifications", authenticate as express.RequestHandler, tokenRefreshHeaders, notificationsRoutes);
app.use("/api/analytics", authenticate as express.RequestHandler, tokenRefreshHeaders, analyticsRoutes);
app.use("/api/reports", authenticate as express.RequestHandler, tokenRefreshHeaders, reportsRoutes);
app.use("/api/chat", authenticate as express.RequestHandler, tokenRefreshHeaders, chatRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    path: req.originalUrl,
    method: req.method
  });
});

// Error handling middleware (must be last)
app.use(errorHandler as express.ErrorRequestHandler);

export default app;