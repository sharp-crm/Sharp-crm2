import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

// Environment configuration
const isProduction = process.env.NODE_ENV === 'production';
const isLocal = process.env.DYNAMODB_LOCAL === 'true';

/**
 * DynamoDB Client Configuration based on environment
 */
const getClientConfig = () => {
  if (isLocal) {
    // Local Development Configuration (Docker)
    console.log(`🐳 Using local DynamoDB at http://localhost:8000`);
    return {
      region: "us-east-1",
      // endpoint: "http://localhost:8000",
      // endpoint: "http://127.0.0.1:8000",
      endpoint: "http://host.docker.internal:8000",
      credentials: {
        accessKeyId: "fakeMyKeyId",
        secretAccessKey: "fakeSecretAccessKey"
      }
    };
  } else if (process.env.AWS_LAMBDA_FUNCTION_NAME) {
    // Lambda environment - AWS provides credentials automatically via IAM role
    console.log(`🚀 Running in Lambda - using IAM role credentials`);
    return {
      region: process.env.AWS_REGION || "us-east-1"
      // No explicit credentials needed - Lambda provides them automatically
    };
  } else if (isProduction) {
    // Production AWS Configuration (non-Lambda)
    return {
      region: process.env.AWS_REGION || "us-east-1",
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
      }
    };
  } else {
    // Development with real AWS
    console.log(`🔧 Using AWS DynamoDB in development`);
    return {
      region: process.env.AWS_REGION || "us-east-1",
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
      }
    };
  }
};

// Initialize DynamoDB client with configuration
const clientConfig = getClientConfig();

// Uncomment below for forced local development (and comment out the line above)
// const clientConfig = {
//   region: "us-east-1",
//   endpoint: "http://localhost:8000",
//   credentials: {
//     accessKeyId: "fakeMyKeyId",
//     secretAccessKey: "fakeSecretAccessKey"
//   }
// };

console.log('DynamoDB Client Config:', clientConfig);
const client = new DynamoDBClient(clientConfig);

// Create DocumentClient with options
export const docClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: {
    convertEmptyValues: false,
    removeUndefinedValues: true,
    convertClassInstanceToMap: false,
  },
  unmarshallOptions: {
    wrapNumbers: false,
  },
});

// Table names for easy reference - using environment variables with fallbacks
export const TABLES = {
  USERS: process.env.USERS_TABLE_NAME || process.env.USERS_TABLE || 'SharpCRM-Users-development',
  CONTACTS: process.env.CONTACTS_TABLE_NAME || process.env.CONTACTS_TABLE || 'SharpCRM-Contacts-development',
  LEADS: process.env.LEADS_TABLE_NAME || process.env.LEADS_TABLE || 'SharpCRM-Leads-development',
  DEALS: process.env.DEALS_TABLE_NAME || process.env.DEALS_TABLE || 'SharpCRM-Deals-development',
  TASKS: process.env.TASKS_TABLE_NAME || process.env.TASKS_TABLE || 'SharpCRM-Tasks-development',
  PRODUCTS: process.env.PRODUCTS_TABLE_NAME || process.env.PRODUCTS_TABLE || 'SharpCRM-Products-development',
  SUBSIDIARIES: process.env.SUBSIDIARIES_TABLE_NAME || process.env.SUBSIDIARIES_TABLE || 'SharpCRM-Subsidiaries-development',
  DEALERS: process.env.DEALERS_TABLE_NAME || process.env.DEALERS_TABLE || 'SharpCRM-Dealers-development',
  NOTIFICATIONS: process.env.NOTIFICATIONS_TABLE_NAME || process.env.NOTIFICATIONS_TABLE || 'SharpCRM-Notifications-development',
  REPORTS: process.env.REPORTS_TABLE_NAME || process.env.REPORTS_TABLE || 'SharpCRM-Reports-development',
  REFRESH_TOKENS: process.env.REFRESH_TOKENS_TABLE_NAME || process.env.REFRESH_TOKENS_TABLE || 'SharpCRM-RefreshTokens-development',
  QUOTES: process.env.QUOTES_TABLE_NAME || process.env.QUOTES_TABLE || 'SharpCRM-Quotes-development'
} as const;

// Debug table names (same pattern as auth routes)
console.log("=== DYNAMODB CLIENT TABLE NAMES DEBUG ===");
console.log("Environment variables:");
console.log("- USERS_TABLE_NAME:", process.env.USERS_TABLE_NAME);
console.log("- CONTACTS_TABLE_NAME:", process.env.CONTACTS_TABLE_NAME);
console.log("- LEADS_TABLE_NAME:", process.env.LEADS_TABLE_NAME);
console.log("- DEALS_TABLE_NAME:", process.env.DEALS_TABLE_NAME);
console.log("- TASKS_TABLE_NAME:", process.env.TASKS_TABLE_NAME);
console.log("- QUOTES_TABLE_NAME:", process.env.QUOTES_TABLE_NAME);
console.log("Resolved table names:");
console.log("- USERS:", TABLES.USERS);
console.log("- CONTACTS:", TABLES.CONTACTS);
console.log("- LEADS:", TABLES.LEADS);
console.log("- DEALS:", TABLES.DEALS);
console.log("- TASKS:", TABLES.TASKS);
console.log("- QUOTES:", TABLES.QUOTES);
console.log("============================================");

// Error types for better error handling
export type DynamoDBErrorType = 
  | 'ConditionalCheckFailedException'
  | 'ValidationException'
  | 'ResourceNotFoundException'
  | 'ProvisionedThroughputExceededException'
  | 'Generic';

// Error messages mapping
const ERROR_MESSAGES: Record<DynamoDBErrorType, string> = {
  ConditionalCheckFailedException: 'Record has been modified by another user',
  ValidationException: 'Invalid data provided',
  ResourceNotFoundException: 'Table or item not found',
  ProvisionedThroughputExceededException: 'Database is temporarily overloaded, please try again',
  Generic: 'Database operation failed'
};

/**
 * Helper function to handle DynamoDB errors
 * @param error The error object from DynamoDB
 * @param operation Optional string describing the operation that failed
 * @throws Error with appropriate message based on error type
 */
export const handleDynamoError = (error: any, operation: string = "operation") => {
  console.error(`DynamoDB ${operation} error:`, error);
  
  // Log additional details in development
  if (!isProduction) {
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      code: error.code,
      statusCode: error.statusCode,
      requestId: error.$metadata?.requestId
    });
  }
  
  // Get error type and throw appropriate error
  const errorType = (error.name as DynamoDBErrorType) || 'Generic';
  const errorMessage = ERROR_MESSAGES[errorType];
  
  throw new Error(`${errorMessage} (${operation})`);
};

/**
 * Helper function to check if DynamoDB is accessible
 * @returns Promise<boolean>
 */
export const checkDynamoDBConnection = async (): Promise<boolean> => {
  try {
    // Try to describe the Users table
    await client.send({
      TableName: TABLES.USERS
    } as any);
    return true;
  } catch (error) {
    console.error('DynamoDB connection check failed:', error);
    return false;
  }
};

// Export the client for direct access if needed
export { client };

// Export configuration for reference
export const config = {
  isProduction,
  isLocal,
  region: getClientConfig().region
};