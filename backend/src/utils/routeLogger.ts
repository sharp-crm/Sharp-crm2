/**
 * Utility functions for detailed route logging
 */

/**
 * Log detailed error information including DynamoDB errors
 * @param operation - The operation name
 * @param error - The error object
 * @param additionalContext - Additional context for the error
 */
export const logError = (operation: string, error: any, additionalContext?: any) => {
  console.error(`❌ [${operation}] Error occurred:`);
  console.error(`   - Error message: ${error instanceof Error ? error.message : 'Unknown error'}`);
  console.error(`   - Error stack: ${error instanceof Error ? error.stack : 'No stack trace'}`);
  
  // Log DynamoDB specific errors
  if (error && typeof error === 'object' && 'code' in error) {
    console.error(`   - DynamoDB error code: ${(error as any).code}`);
    console.error(`   - DynamoDB error details: ${JSON.stringify(error, null, 2)}`);
  }
  
  // Log AWS SDK errors
  if (error && typeof error === 'object' && '$metadata' in error) {
    console.error(`   - AWS SDK error metadata: ${JSON.stringify((error as any).$metadata, null, 2)}`);
  }
  
  // Log additional context if provided
  if (additionalContext) {
    console.error(`   - Additional context: ${JSON.stringify(additionalContext, null, 2)}`);
  }
};

/**
 * Log operation start
 * @param operation - The operation name
 * @param context - Context information
 */
export const logOperationStart = (operation: string, context: any) => {
  console.log(`🔍 [${operation}] Starting request - ${JSON.stringify(context)}`);
};

/**
 * Log operation success
 * @param operation - The operation name
 * @param result - Result information
 */
export const logOperationSuccess = (operation: string, result: any) => {
  console.log(`✅ [${operation}] Success - ${JSON.stringify(result)}`);
};

/**
 * Log operation info
 * @param operation - The operation name
 * @param info - Information to log
 */
export const logOperationInfo = (operation: string, info: any) => {
  console.log(`📊 [${operation}] Info - ${JSON.stringify(info)}`);
};

/**
 * Log validation error
 * @param operation - The operation name
 * @param validationError - Validation error details
 */
export const logValidationError = (operation: string, validationError: any) => {
  console.log(`❌ [${operation}] Validation error - ${JSON.stringify(validationError)}`);
};
