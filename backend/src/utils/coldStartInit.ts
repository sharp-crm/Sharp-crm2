import { DescribeTableCommand, ListTablesCommand, CreateTableCommand } from '@aws-sdk/client-dynamodb';
import { PutCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { client, docClient } from '../services/dynamoClient';
import { cleanupExpiredTokens } from './tokenUtils';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

/**
 * Cold start initialization for Lambda
 * This runs once when the Lambda container initializes
 */
class ColdStartInitializer {
  private static instance: ColdStartInitializer;
  private initialized = false;
  private initializationPromise: Promise<void> | null = null;

  static getInstance(): ColdStartInitializer {
    if (!ColdStartInitializer.instance) {
      ColdStartInitializer.instance = new ColdStartInitializer();
    }
    return ColdStartInitializer.instance;
  }

  /**
   * Initialize the application on cold start
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this.performInitialization();
    return this.initializationPromise;
  }

  private async performInitialization(): Promise<void> {
    console.log('🚀 Lambda Cold Start - Initializing...');
    
    try {
      // Check DynamoDB connectivity and tables with retry
      await this.checkDynamoDBTablesWithRetry();
      
      // Create default super admin user if needed
      await this.createDefaultUser();
      
      // Clean up expired tokens
      await this.cleanupExpiredTokens();
      
      // Mark as initialized
      this.initialized = true;
      console.log('✅ Cold Start initialization completed successfully');
    } catch (error) {
      console.error('❌ Cold Start initialization failed:', error);
      // Don't throw here - let the Lambda continue but log the error
    }
  }

  /**
   * Check if required DynamoDB tables exist with retry logic
   */
  private async checkDynamoDBTablesWithRetry(): Promise<void> {
    const maxRetries = 3;
    const retryDelay = 2000; // 2 seconds
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await this.checkDynamoDBTables();
        return; // Success, exit retry loop
      } catch (error) {
        console.warn(`DynamoDB check attempt ${attempt}/${maxRetries} failed:`, error);
        
        if (attempt === maxRetries) {
          console.error('All DynamoDB connection attempts failed');
          throw error;
        }
        
        console.log(`Retrying in ${retryDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
  }

  /**
   * Check if required DynamoDB tables exist and create them if missing
   */
  private async checkDynamoDBTables(): Promise<void> {
    const usersTableName = process.env.USERS_TABLE_NAME || 'Users';
    const refreshTokensTableName = process.env.REFRESH_TOKENS_TABLE_NAME || 'RefreshTokens';
    const requiredTables = [usersTableName, refreshTokensTableName];
    
    try {
      console.log('🔍 Checking DynamoDB tables...');
      
      // List all tables
      const listTablesResponse = await client.send(new ListTablesCommand({}));
      const existingTables = listTablesResponse.TableNames || [];
      
      console.log('📋 Existing DynamoDB tables:', existingTables);
      let allTablesExist = true;
      
      // Check each required table
      for (const tableName of requiredTables) {
        if (existingTables.includes(tableName)) {
          console.log(`✅ Table '${tableName}' exists`);
        } else {
          allTablesExist = false;
          console.error(`❌ Table '${tableName}' is missing`);
        }
      }
      
      if (!allTablesExist) {
        throw new Error('Missing required DynamoDB tables');
      }
      
      // Special focus on AuthUsers table (if it exists)
      if (existingTables.includes('AuthUsers')) {
        console.log('✅ AuthUsers table exists');
      } else {
        console.log('ℹ️  AuthUsers table not found - using Users table instead');
      }
      
    } catch (error) {
      console.error('❌ Error checking DynamoDB tables:', error);
      throw error;
    }
  }

  /**
   * Create default super admin user if it doesn't exist
   */
  private async createDefaultUser(): Promise<void> {
    try {
      const email = "rootuser@sharp.com";
      const usersTableName = process.env.USERS_TABLE_NAME || 'Users';
      
      // Check if super admin already exists
      const existingUser = await docClient.send(
        new GetCommand({
          TableName: usersTableName,
          Key: { email }
        })
      );

      if (existingUser.Item) {
        console.log("✅ Super admin user already exists");
        return;
      }

      // Create super admin user
      const hashedPassword = await bcrypt.hash("User@123", 10);
      const userId = uuidv4();
      const timestamp = new Date().toISOString();

      const superAdmin = {
        userId,
        email,
        password: hashedPassword,
        firstName: "Root",
        lastName: "User",
        role: "SUPER_ADMIN",
        tenantId: "SUPER_ADMIN_TENANT",
        createdBy: "SYSTEM",
        createdAt: timestamp,
        updatedAt: timestamp,
        isDeleted: false
      };

      await docClient.send(
        new PutCommand({
          TableName: usersTableName,
          Item: superAdmin
        })
      );

      console.log("✅ Super admin user created successfully");
      console.log("📝 Login credentials: rootuser@sharp.com / User@123");
    } catch (error) {
      console.warn("⚠️  Failed to create super admin user:", error);
      // Don't throw - this is not critical for startup
    }
  }

  /**
   * Clean up expired refresh tokens
   */
  private async cleanupExpiredTokens(): Promise<void> {
    try {
      console.log('🧹 Cleaning up expired refresh tokens...');
      const listTablesResponse = await client.send(new ListTablesCommand({}));
      const existingTables = listTablesResponse.TableNames || [];

      if (existingTables.includes('RefreshTokens')) {
        const refreshTokensTable = process.env.REFRESH_TOKENS_TABLE_NAME || process.env.REFRESH_TOKENS_TABLE;
        if (refreshTokensTable) {
          await cleanupExpiredTokens(refreshTokensTable);
          console.log('✅ Token cleanup completed');
        } else {
          console.warn('⚠️  REFRESH_TOKENS_TABLE_NAME not set, skipping token cleanup');
        }
      } else {
        console.log('ℹ️  RefreshTokens table not found, skipping token cleanup');
      }
    } catch (error) {
      console.warn('⚠️  Token cleanup failed:', error);
    }
  }

  /**
   * Health check for post-initialization
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    checks: {
      dynamodb: boolean;
      usersTable: boolean;
      refreshTokensTable: boolean;
    };
    missingTables?: string[];
    debug?: {
      usersTableName: string;
      refreshTokensTableName: string;
      existingTables: string[];
      initialization: boolean;
    };
  }> {
    console.log('🔍 Starting health check...');
    
    const checks = {
      dynamodb: false,
      usersTable: false,
      refreshTokensTable: false
    };

    const missingTables: string[] = [];
    const usersTableName = process.env.USERS_TABLE_NAME || 'Users';
    const refreshTokensTableName = process.env.REFRESH_TOKENS_TABLE_NAME || 'RefreshTokens';
    
    console.log('📋 Health check configuration:', {
      usersTableName,
      refreshTokensTableName,
      initialization: this.initialized
    });

    let existingTables: string[] = [];

    try {
      console.log('🔍 Testing DynamoDB connectivity...');
      
      // Test DynamoDB connectivity and get table list
      const listTablesResponse = await client.send(new ListTablesCommand({}));
      existingTables = listTablesResponse.TableNames || [];
      
      checks.dynamodb = true;
      console.log('✅ DynamoDB connectivity successful');
      console.log('📋 Available tables:', existingTables);
      
      // Check if Users table exists
      if (existingTables.includes(usersTableName)) {
        checks.usersTable = true;
        console.log(`✅ Health check: Users table '${usersTableName}' exists`);
      } else {
        missingTables.push(usersTableName);
        console.error(`❌ Health check: Users table '${usersTableName}' is missing`);
        console.error('Available tables:', existingTables);
      }
      
      // Check if RefreshTokens table exists
      if (existingTables.includes(refreshTokensTableName)) {
        checks.refreshTokensTable = true;
        console.log(`✅ Health check: RefreshTokens table '${refreshTokensTableName}' exists`);
      } else {
        missingTables.push(refreshTokensTableName);
        console.error(`❌ Health check: RefreshTokens table '${refreshTokensTableName}' is missing`);
        console.error('Available tables:', existingTables);
      }
      
    } catch (error) {
      console.error('❌ DynamoDB health check failed:', error);
    }

    // Health is considered good if:
    // 1. DynamoDB is reachable
    // 2. Both required tables exist
    // Note: Initialization status is NOT required for health - it's just a startup optimization
    const isHealthy = checks.dynamodb && checks.usersTable && checks.refreshTokensTable;
    const status = isHealthy ? 'healthy' : 'unhealthy';
    const statusCode = isHealthy ? 200 : 503;
    
    console.log('🔍 Health check details:', {
      checks,
      statusCode,
      isHealthy,
      missingTables: missingTables.length > 0 ? missingTables : 'none'
    });
    
    const result: any = { status, checks };
    
    if (missingTables.length > 0) {
      result.missingTables = missingTables;
    }
    
    // Add debug info in development
    if (process.env.NODE_ENV === 'development') {
      result.debug = {
        usersTableName,
        refreshTokensTableName,
        existingTables,
        initialization: this.initialized
      };
    }
    
    return result;
  }

  /**
   * Get initialization status
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Create a table based on the table name
   */
  private async createTable(tableName: string): Promise<void> {
    const tableConfigs = {
      Users: {
        TableName: "Users",
        KeySchema: [
          { AttributeName: "email", KeyType: "HASH" as const }
        ],
        AttributeDefinitions: [
          { AttributeName: "email", AttributeType: "S" as const },
          { AttributeName: "userId", AttributeType: "S" as const }
        ],
        GlobalSecondaryIndexes: [
          {
            IndexName: "UserIdIndex",
            KeySchema: [
              { AttributeName: "userId", KeyType: "HASH" as const }
            ],
            Projection: {
              ProjectionType: "ALL" as const
            }
          }
        ],
        BillingMode: "PAY_PER_REQUEST" as const
      },
      RefreshTokens: {
        TableName: "RefreshTokens",
        KeySchema: [
          { AttributeName: "jti", KeyType: "HASH" as const }
        ],
        AttributeDefinitions: [
          { AttributeName: "jti", AttributeType: "S" as const },
          { AttributeName: "userId", AttributeType: "S" as const }
        ],
        GlobalSecondaryIndexes: [
          {
            IndexName: "UserTokensIndex",
            KeySchema: [
              { AttributeName: "userId", KeyType: "HASH" as const }
            ],
            Projection: {
              ProjectionType: "ALL" as const
            }
          }
        ],
        BillingMode: "PAY_PER_REQUEST" as const
      }
    };

    const tableConfig = tableConfigs[tableName as keyof typeof tableConfigs];
    if (!tableConfig) {
      throw new Error(`Unknown table: ${tableName}`);
    }

    try {
      await client.send(new CreateTableCommand(tableConfig));
      console.log(`✅ Table ${tableName} creation initiated`);
    } catch (error) {
      if (error instanceof Error && error.name === 'ResourceInUseException') {
        console.log(`✅ Table ${tableName} already exists`);
      } else {
        console.error(`❌ Failed to create table ${tableName}:`, error);
        throw error;
      }
    }
  }

  /**
   * Wait for table to become active
   */
  private async waitForTableActive(tableName: string): Promise<void> {
    console.log(`⏳ Waiting for table ${tableName} to become active...`);
    let tableActive = false;
    let attempts = 0;
    const maxAttempts = 30; // 30 seconds max wait
    
    while (!tableActive && attempts < maxAttempts) {
      try {
        const result = await client.send(new DescribeTableCommand({ TableName: tableName }));
        if (result.Table?.TableStatus === 'ACTIVE') {
          tableActive = true;
          console.log(`✅ Table ${tableName} is now ACTIVE`);
        } else {
          await new Promise(resolve => setTimeout(resolve, 1000));
          attempts++;
        }
      } catch (error) {
        console.error(`Error checking table status: ${error}`);
        attempts++;
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    if (!tableActive) {
      throw new Error(`Table ${tableName} did not become active within ${maxAttempts} seconds`);
    }
  }
}

// Export singleton instance
export const coldStartInit = ColdStartInitializer.getInstance();

// Export for manual initialization
export const initializeLambda = () => coldStartInit.initialize();

// Export health check
export const lambdaHealthCheck = () => coldStartInit.healthCheck();
