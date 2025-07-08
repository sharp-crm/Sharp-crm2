import express from "express";
import cors from "cors";
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
// import chatRoutes from './routes/chat';
import { authenticate } from "./middlewares/authenticate";
import { errorHandler } from "./middlewares/errorHandler";
import { requestLogger } from "./middlewares/requestLogger";

dotenv.config();

const app = express();

// CORS configuration
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || "http://localhost:5173",
    "http://localhost:5174"
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static files from uploads directory
app.use('/api/uploads', express.static(path.join(__dirname, '../uploads')));

// Request logging middleware
app.use(requestLogger as express.RequestHandler);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Public routes (no authentication required)
app.use('/api/auth', authRoutes);
app.use('/api/auth-simple', authSimpleRoutes);

// Protected routes (authentication required)
app.use("/api/users", authenticate as express.RequestHandler, usersRoutes);
app.use("/api/deals", authenticate as express.RequestHandler, dealsRoutes);
app.use("/api/leads", authenticate as express.RequestHandler, leadsRoutes);
app.use("/api/contacts", authenticate as express.RequestHandler, contactsRoutes);
app.use("/api/tasks", authenticate as express.RequestHandler, tasksRoutes);
app.use("/api/dealers", authenticate as express.RequestHandler, dealersRoutes);
app.use("/api/subsidiaries", authenticate as express.RequestHandler, subsidiariesRoutes);
app.use("/api/analytics", authenticate as express.RequestHandler, analyticsRoutes);
app.use("/api/notifications", authenticate as express.RequestHandler, notificationsRoutes);
app.use("/api/reports", authenticate as express.RequestHandler, reportsRoutes);
// app.use("/api/chat", authenticate as express.RequestHandler, chatRoutes);

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