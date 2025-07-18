import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { configure as serverlessExpress } from '@vendia/serverless-express';
import dotenv from 'dotenv';
import app from './app';
import { initializeLambda, coldStartInit } from './utils/coldStartInit';

// Load environment variables (only in non-Lambda environments)
if (!process.env.AWS_LAMBDA_FUNCTION_NAME) {
  dotenv.config();
}

// Initialize cold start logic
let isInitialized = false;
let initializationPromise: Promise<void> | null = null;

const ensureInitialized = async (): Promise<void> => {
  if (isInitialized) {
    return;
  }

  if (initializationPromise) {
    return initializationPromise;
  }

  initializationPromise = initializeLambda();
  await initializationPromise;
  isInitialized = true;
};

// Configure serverless express for API Gateway
const serverlessExpressInstance = serverlessExpress({ 
  app
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
export const handler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  
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
    const result = await new Promise<APIGatewayProxyResult>((resolve, reject) => {
      serverlessExpressInstance(event, context, (error: any, result: APIGatewayProxyResult) => {
        if (error) {
          reject(error);
        } else {
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
  } catch (error) {
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

/**
 * Lambda handler for scheduled token cleanup
 */
export const tokenCleanupHandler = async (event: any, context: Context): Promise<void> => {
  context.callbackWaitsForEmptyEventLoop = false;
  
  try {
    console.log('Running scheduled token cleanup...');
    const { cleanupExpiredTokens } = await import('./utils/tokenUtils');
    
    const refreshTokensTable = process.env.REFRESH_TOKENS_TABLE_NAME || process.env.REFRESH_TOKENS_TABLE;
    if (refreshTokensTable) {
      await cleanupExpiredTokens(refreshTokensTable);
      console.log('Token cleanup completed successfully');
    } else {
      console.warn('REFRESH_TOKENS_TABLE_NAME not set, skipping token cleanup');
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('Token cleanup failed:', errorMessage);
    throw error;
  }
};

/**
 * Lambda handler for health checks
 */
export const healthCheckHandler = async (
  event: any,
  context: Context
): Promise<APIGatewayProxyResult> => {
  context.callbackWaitsForEmptyEventLoop = false;
  
  try {
    console.log('🏥 Health check endpoint called');
    const healthStatus = await coldStartInit.healthCheck();
    
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
  } catch (error) {
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
