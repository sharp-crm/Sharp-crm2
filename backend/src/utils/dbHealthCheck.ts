import { ListTablesCommand, DescribeTableCommand } from '@aws-sdk/client-dynamodb';
import { client } from '../services/dynamoClient';

/**
 * Check if DynamoDB is accessible
 */
export const checkDatabaseConnection = async (): Promise<{
  connected: boolean;
  error?: string;
  tables?: string[];
}> => {
  try {
    const response = await client.send(new ListTablesCommand({}));
    return {
      connected: true,
      tables: response.TableNames || []
    };
  } catch (error) {
    console.error('Database connection check failed:', error);
    return {
      connected: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

/**
 * Check if a specific table exists and is active
 */
export const checkTableStatus = async (tableName: string): Promise<{
  exists: boolean;
  status?: string;
  error?: string;
}> => {
  try {
    const response = await client.send(new DescribeTableCommand({ TableName: tableName }));
    return {
      exists: true,
      status: response.Table?.TableStatus || 'UNKNOWN'
    };
  } catch (error) {
    if (error instanceof Error && error.name === 'ResourceNotFoundException') {
      return {
        exists: false,
        error: 'Table not found'
      };
    }
    
    console.error(`Error checking table ${tableName}:`, error);
    return {
      exists: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

/**
 * Wait for database to be ready
 */
export const waitForDatabaseReady = async (maxRetries: number = 10, delayMs: number = 2000): Promise<boolean> => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    console.log(`Database connectivity check attempt ${attempt}/${maxRetries}`);
    
    const dbCheck = await checkDatabaseConnection();
    if (dbCheck.connected) {
      console.log('✅ Database connection established');
      return true;
    }
    
    if (attempt < maxRetries) {
      console.log(`⏳ Waiting ${delayMs}ms before retry...`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  
  console.error('❌ Database connection failed after all retries');
  return false;
};

/**
 * Check if required tables exist
 */
export const checkRequiredTables = async (): Promise<{
  allExist: boolean;
  missing: string[];
  existing: string[];
}> => {
  const requiredTables = ['Users', 'RefreshTokens'];
  const missing: string[] = [];
  const existing: string[] = [];
  
  for (const tableName of requiredTables) {
    const tableCheck = await checkTableStatus(tableName);
    if (tableCheck.exists && tableCheck.status === 'ACTIVE') {
      existing.push(tableName);
    } else {
      missing.push(tableName);
    }
  }
  
  return {
    allExist: missing.length === 0,
    missing,
    existing
  };
};
