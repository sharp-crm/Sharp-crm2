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
const dotenv_1 = __importDefault(require("dotenv"));
// Load environment variables first (only in non-Lambda environments)
if (!process.env.AWS_LAMBDA_FUNCTION_NAME) {
    dotenv_1.default.config();
}
const http_1 = __importDefault(require("http"));
const app_1 = __importDefault(require("./app"));
const coldStartInit_1 = require("./utils/coldStartInit");
const socketService_1 = __importDefault(require("./services/socketService"));
const server = http_1.default.createServer(app_1.default);
// Initialize Lambda-specific cold start logic
(0, coldStartInit_1.initializeLambda)();
// Initialize Socket.IO
new socketService_1.default(server);
const PORT = parseInt(process.env.PORT || '3000', 10);
// Start server with database readiness check
startServer();
async function startServer() {
    try {
        console.log('🚀 Starting server...');
        // Check database connectivity
        const { waitForDatabaseReady } = await Promise.resolve().then(() => __importStar(require('./utils/dbHealthCheck')));
        const isDatabaseReady = await waitForDatabaseReady(5, 3000); // 5 retries, 3 seconds apart
        if (!isDatabaseReady) {
            console.warn('⚠️  Database not ready, but starting server anyway...');
            console.log('💡 Make sure to run: npm run init-db');
            console.log('💡 Or start DynamoDB with: docker-compose up -d');
        }
        server.listen(PORT, () => {
            console.log(`✅ Server is running on port ${PORT}`);
            console.log(`🏥 Health check: http://localhost:${PORT}/health`);
        });
    }
    catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}
