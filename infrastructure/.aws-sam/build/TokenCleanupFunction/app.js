"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const auth_1 = __importDefault(require("./routes/auth"));
const auth_simple_1 = __importDefault(require("./routes/auth-simple"));
const users_1 = __importDefault(require("./routes/users"));
const deals_1 = __importDefault(require("./routes/deals"));
const leads_1 = __importDefault(require("./routes/leads"));
const contacts_1 = __importDefault(require("./routes/contacts"));
const tasks_1 = __importDefault(require("./routes/tasks"));
const dealers_1 = __importDefault(require("./routes/dealers"));
const subsidiaries_1 = __importDefault(require("./routes/subsidiaries"));
const analytics_1 = __importDefault(require("./routes/analytics"));
const notifications_1 = __importDefault(require("./routes/notifications"));
const reports_1 = __importDefault(require("./routes/reports"));
const chat_1 = __importDefault(require("./routes/chat"));
const products_1 = __importDefault(require("./routes/products"));
const quotes_1 = __importDefault(require("./routes/quotes"));
const email_1 = __importDefault(require("./routes/email"));
const oauth_1 = __importDefault(require("./routes/oauth"));
const authenticate_1 = require("./middlewares/authenticate");
const errorHandler_1 = require("./middlewares/errorHandler");
const requestLogger_1 = require("./middlewares/requestLogger");
const tokenRefreshHeaders_1 = require("./middlewares/tokenRefreshHeaders");
// Load environment variables first (only in non-Lambda environments)
if (!process.env.AWS_LAMBDA_FUNCTION_NAME) {
    dotenv_1.default.config();
}
const app = (0, express_1.default)();
// Custom dynamic CORS middleware
const allowedOrigins = [
    "https://d9xj0evv3ouwa.cloudfront.net",
    "http://localhost:5174",
    "http://localhost:5175"
];
app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin && allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    }
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }
    next();
});
app.use(express_1.default.json({ limit: '50mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '50mb' }));
app.use((0, cookie_parser_1.default)()); // Parse cookies for secure refresh token handling
// Serve static files from uploads directory
app.use('/api/uploads', express_1.default.static(path_1.default.join(__dirname, '../uploads')));
// Request logging middleware
app.use(requestLogger_1.requestLogger);
// Token CORS headers middleware
app.use(tokenRefreshHeaders_1.tokenCorsHeaders);
// Health check endpoint
app.get('/health', async (req, res) => {
    try {
        const { checkDatabaseConnection, checkRequiredTables } = await Promise.resolve().then(() => __importStar(require('./utils/dbHealthCheck')));
        const { lambdaHealthCheck } = await Promise.resolve().then(() => __importStar(require('./utils/coldStartInit')));
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
    }
    catch (error) {
        res.status(503).json({
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            error: 'Health check failed'
        });
    }
});
// Add this simple test route before other routes
app.get('/test', (req, res) => {
    res.json({ message: 'Direct route works' });
});
app.get('/api/test', (req, res) => {
    res.json({ message: 'API prefix route works' });
});
app.get('/api/users/test-unprotected', (req, res) => {
    res.json({ message: 'Users route works without auth!', timestamp: new Date().toISOString() });
});
// Add this at the top, before other routes
app.get('/test-simple', (req, res) => {
    res.json({
        message: 'Simple route works!',
        path: req.path,
        method: req.method,
        timestamp: new Date().toISOString()
    });
});
app.get('/api/test-api', (req, res) => {
    res.json({
        message: 'API route works!',
        path: req.path,
        method: req.method,
        timestamp: new Date().toISOString()
    });
});
// Public routes (only auth routes should be public)
app.use('/api/auth', auth_1.default);
app.use('/api/auth-simple', auth_simple_1.default);
// Protected routes with token refresh headers
app.use("/api/contacts", authenticate_1.authenticate, tokenRefreshHeaders_1.tokenRefreshHeaders, contacts_1.default);
app.use("/api/subsidiaries", authenticate_1.authenticate, tokenRefreshHeaders_1.tokenRefreshHeaders, subsidiaries_1.default);
app.use("/api/dealers", authenticate_1.authenticate, tokenRefreshHeaders_1.tokenRefreshHeaders, dealers_1.default);
app.use("/api/tasks", authenticate_1.authenticate, tokenRefreshHeaders_1.tokenRefreshHeaders, tasks_1.default);
app.use("/api/leads", authenticate_1.authenticate, tokenRefreshHeaders_1.tokenRefreshHeaders, leads_1.default);
app.use("/api/deals", authenticate_1.authenticate, tokenRefreshHeaders_1.tokenRefreshHeaders, deals_1.default);
app.use("/api/users", authenticate_1.authenticate, tokenRefreshHeaders_1.tokenRefreshHeaders, users_1.default);
app.use("/api/notifications", authenticate_1.authenticate, tokenRefreshHeaders_1.tokenRefreshHeaders, notifications_1.default);
app.use("/api/analytics", authenticate_1.authenticate, tokenRefreshHeaders_1.tokenRefreshHeaders, analytics_1.default);
app.use("/api/reports", authenticate_1.authenticate, tokenRefreshHeaders_1.tokenRefreshHeaders, reports_1.default);
app.use("/api/chat", authenticate_1.authenticate, tokenRefreshHeaders_1.tokenRefreshHeaders, chat_1.default);
app.use("/api/products", authenticate_1.authenticate, tokenRefreshHeaders_1.tokenRefreshHeaders, products_1.default);
app.use("/api/quotes", authenticate_1.authenticate, tokenRefreshHeaders_1.tokenRefreshHeaders, quotes_1.default);
app.use("/api/email", authenticate_1.authenticate, tokenRefreshHeaders_1.tokenRefreshHeaders, email_1.default);
// OAuth routes - callbacks don't require auth, others do
app.use("/api/oauth", (req, res, next) => {
    // Skip authentication for OAuth callback routes
    if (req.path.startsWith('/callback/')) {
        return next();
    }
    // Apply authentication for other OAuth routes
    return (0, authenticate_1.authenticate)(req, res, next);
}, tokenRefreshHeaders_1.tokenRefreshHeaders, oauth_1.default);
// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Route not found',
        path: req.originalUrl,
        method: req.method
    });
});
// Error handling middleware (must be last)
app.use(errorHandler_1.errorHandler);
exports.default = app;
