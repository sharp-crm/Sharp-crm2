import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { configure as serverlessExpress } from '@vendia/serverless-express';
import dotenv from 'dotenv';
import app from './app';
import { initializeLambda, coldStartInit } from './utils/coldStartInit';

// Load environment variables
dotenv.config();

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

// Configure serverless express
const serverlessExpressInstance = serverlessExpress({ app });

/**
 * Lambda handler for all API requests
 */
export const handler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  // Ensure cold start initialization is complete
  await ensureInitialized();

  // Set context to not wait for empty event loop
  context.callbackWaitsForEmptyEventLoop = false;

  try {
    // Handle the request through serverless express
    // Use Promise wrapper for serverless-express
    return new Promise((resolve, reject) => {
      serverlessExpressInstance(event, context, (err: any, result: APIGatewayProxyResult) => {
        if (err) {
          reject(err);
        } else {
          resolve(result);
        }
      });
    });
  } catch (error) {
    console.error('Lambda handler error:', error);
    
    // Type-safe error handling
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
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
    await cleanupExpiredTokens();
    console.log('Token cleanup completed successfully');
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
    const healthStatus = await coldStartInit.healthCheck();
    
    return {
      statusCode: healthStatus.status === 'healthy' ? 200 : 503,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        status: healthStatus.status,
        timestamp: new Date().toISOString(),
        checks: healthStatus.checks,
        environment: process.env.NODE_ENV || 'development'
      })
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('Health check failed:', errorMessage);
    
    return {
      statusCode: 503,
      headers: {
        'Content-Type': 'application/json'
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

export default handler;
