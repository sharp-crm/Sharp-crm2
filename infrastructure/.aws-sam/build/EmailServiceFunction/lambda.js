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
exports.healthCheckHandler = exports.tokenCleanupHandler = exports.handler = void 0;
const serverless_express_1 = require("@vendia/serverless-express");
const dotenv_1 = __importDefault(require("dotenv"));
const app_1 = __importDefault(require("./app"));
const coldStartInit_1 = require("./utils/coldStartInit");
// Load environment variables (only in non-Lambda environments)
if (!process.env.AWS_LAMBDA_FUNCTION_NAME) {
    dotenv_1.default.config();
}
// Initialize cold start logic
let isInitialized = false;
let initializationPromise = null;
const ensureInitialized = async () => {
    if (isInitialized) {
        return;
    }
    if (initializationPromise) {
        return initializationPromise;
    }
    initializationPromise = (0, coldStartInit_1.initializeLambda)();
    await initializationPromise;
    isInitialized = true;
};
// Configure serverless express for API Gateway
const serverlessExpressInstance = (0, serverless_express_1.configure)({
    app: app_1.default
});
/**
 * Get CORS headers for CloudFront domain
 */
const getCorsHeaders = () => {
    return {
        'Access-Control-Allow-Origin': 'https://d9xj0evv3ouwa.cloudfront.net',
        'Access-Control-Allow-Credentials': 'true'
    };
};
/**
 * Get CORS headers for OPTIONS preflight requests
 */
const getPreflightCorsHeaders = () => {
    return {
        'Access-Control-Allow-Origin': 'https://d9xj0evv3ouwa.cloudfront.net',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Credentials': 'true'
    };
};
/**
 * Lambda handler for API Gateway proxy integration
 */
const handler = async (event, context) => {
    console.log('🔍 API Gateway Event:', {
        httpMethod: event.httpMethod,
        path: event.path,
        resource: event.resource,
        stage: event.requestContext.stage,
        headers: event.headers
    });
    try {
        // Ensure cold start initialization is complete
        await ensureInitialized();
        // Set context to not wait for empty event loop
        context.callbackWaitsForEmptyEventLoop = false;
        // Handle preflight OPTIONS requests
        if (event.httpMethod === 'OPTIONS') {
            return {
                statusCode: 200,
                headers: getPreflightCorsHeaders(),
                body: ''
            };
        }
        // Process the request through Express with proper Promise handling
        const result = await new Promise((resolve, reject) => {
            serverlessExpressInstance(event, context, (error, result) => {
                if (error) {
                    reject(error);
                }
                else {
                    resolve(result);
                }
            });
        });
        // Ensure CORS headers are added to all responses
        // Initialize headers if undefined
        if (!result.headers) {
            result.headers = {};
        }
        // Always merge CORS headers
        const corsHeaders = getCorsHeaders();
        Object.assign(result.headers, corsHeaders);
        // Log confirmation that CORS headers were injected
        console.log('✅ CORS headers injected:', {
            'Access-Control-Allow-Origin': result.headers['Access-Control-Allow-Origin'],
            'Access-Control-Allow-Credentials': result.headers['Access-Control-Allow-Credentials'],
            statusCode: result.statusCode,
            path: event.path
        });
        return result;
    }
    catch (error) {
        console.error('Lambda handler error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                ...getCorsHeaders()
            },
            body: JSON.stringify({
                message: 'Internal server error',
                error: process.env.NODE_ENV === 'development' ? errorMessage : undefined
            })
        };
    }
};
exports.handler = handler;
/**
 * Lambda handler for scheduled token cleanup
 */
const tokenCleanupHandler = async (event, context) => {
    context.callbackWaitsForEmptyEventLoop = false;
    try {
        console.log('Running scheduled token cleanup...');
        const { cleanupExpiredTokens } = await Promise.resolve().then(() => __importStar(require('./utils/tokenUtils')));
        const refreshTokensTable = process.env.REFRESH_TOKENS_TABLE_NAME || process.env.REFRESH_TOKENS_TABLE;
        if (refreshTokensTable) {
            await cleanupExpiredTokens(refreshTokensTable);
            console.log('Token cleanup completed successfully');
        }
        else {
            console.warn('REFRESH_TOKENS_TABLE_NAME not set, skipping token cleanup');
        }
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        console.error('Token cleanup failed:', errorMessage);
        throw error;
    }
};
exports.tokenCleanupHandler = tokenCleanupHandler;
/**
 * Lambda handler for health checks
 */
const healthCheckHandler = async (event, context) => {
    context.callbackWaitsForEmptyEventLoop = false;
    try {
        console.log('🏥 Health check endpoint called');
        const healthStatus = await coldStartInit_1.coldStartInit.healthCheck();
        const statusCode = healthStatus.status === 'healthy' ? 200 : 503;
        console.log('Health check details', {
            checks: healthStatus.checks,
            statusCode,
            status: healthStatus.status,
            missingTables: healthStatus.missingTables || 'none'
        });
        const responseBody = {
            status: healthStatus.status,
            timestamp: new Date().toISOString(),
            checks: healthStatus.checks,
            environment: process.env.NODE_ENV || 'development',
            ...(healthStatus.missingTables && { missingTables: healthStatus.missingTables }),
            ...(healthStatus.debug && { debug: healthStatus.debug })
        };
        return {
            statusCode,
            headers: {
                'Content-Type': 'application/json',
                ...getCorsHeaders()
            },
            body: JSON.stringify(responseBody)
        };
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        console.error('❌ Health check failed:', errorMessage);
        console.log('Health check details', {
            checks: { error: true },
            statusCode: 503,
            status: 'unhealthy',
            errorMessage
        });
        return {
            statusCode: 503,
            headers: {
                'Content-Type': 'application/json',
                ...getCorsHeaders()
            },
            body: JSON.stringify({
                status: 'unhealthy',
                timestamp: new Date().toISOString(),
                error: 'Health check failed',
                details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
            })
        };
    }
};
exports.healthCheckHandler = healthCheckHandler;
