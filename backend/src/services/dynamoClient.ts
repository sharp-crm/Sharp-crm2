import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

// Environment configuration
const isProduction = process.env.NODE_ENV === 'production';
const isLocal = process.env.DYNAMODB_LOCAL === 'true';

/**
 * DynamoDB Client Configuration based on environment
 */
const getClientConfig = () => {
  if (isProduction) {
    // Production AWS Configuration
    return {
      region: process.env.AWS_REGION || "us-east-1",
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
      }
    };
  } else if (isLocal) {
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
// Force local configuration for now
const clientConfig = {
  region: "us-east-1",
  endpoint: "http://localhost:8000",
  credentials: {
    accessKeyId: "fakeMyKeyId",
    secretAccessKey: "fakeSecretAccessKey"
  }
};
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

// Table names for easy reference
export const TABLES = {
  USERS: "Users",
  CONTACTS: "Contacts",
  LEADS: "Leads",
  DEALS: "Deals",
  TASKS: "Tasks",
  SUBSIDIARIES: "Subsidiaries",
  DEALERS: "Dealers",
  NOTIFICATIONS: "Notifications",
  REPORTS: "Reports"
} as const;

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