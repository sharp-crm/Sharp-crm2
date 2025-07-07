import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import authRoutes from "./routes/auth";
import contactsRoutes from "./routes/contacts";
import subsidiariesRoutes from "./routes/subsidiaries";
import dealersRoutes from "./routes/dealers";
import tasksRoutes from "./routes/tasks";
import leadsRoutes from "./routes/leads";
import dealsRoutes from "./routes/deals";
import usersRoutes from "./routes/users";
import notificationsRoutes from "./routes/notifications";
import analyticsRoutes from "./routes/analytics";
import reportsRoutes from "./routes/reports";
import { authenticate } from "./middlewares/authenticate";
import { errorHandler } from "./middlewares/errorHandler";
import { requestLogger } from "./middlewares/requestLogger";

dotenv.config();

const app = express();

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static files from uploads directory
app.use('/api/uploads', express.static(path.join(__dirname, '../uploads')));

// Request logging middleware
app.use(requestLogger);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Public routes
app.use("/api/auth", authRoutes);
app.use("/api/users/register", authRoutes);

// Protected routes
app.use("/api/contacts", authenticate, contactsRoutes);
app.use("/api/subsidiaries", authenticate, subsidiariesRoutes);
app.use("/api/dealers", authenticate, dealersRoutes);
app.use("/api/tasks", authenticate, tasksRoutes);
app.use("/api/leads", authenticate, leadsRoutes);
app.use("/api/deals", authenticate, dealsRoutes);
app.use("/api/users", authenticate, usersRoutes);
app.use("/api/notifications", authenticate, notificationsRoutes);
app.use("/api/analytics", authenticate, analyticsRoutes);
app.use("/api/reports", authenticate, reportsRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    path: req.originalUrl,
    method: req.method
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

export default app;