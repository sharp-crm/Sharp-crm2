"use strict";
/**
 * Utility functions for detailed route logging
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.logValidationError = exports.logOperationInfo = exports.logOperationSuccess = exports.logOperationStart = exports.logError = void 0;
/**
 * Log detailed error information including DynamoDB errors
 * @param operation - The operation name
 * @param error - The error object
 * @param additionalContext - Additional context for the error
 */
const logError = (operation, error, additionalContext) => {
    console.error(`❌ [${operation}] Error occurred:`);
    console.error(`   - Error message: ${error instanceof Error ? error.message : 'Unknown error'}`);
    console.error(`   - Error stack: ${error instanceof Error ? error.stack : 'No stack trace'}`);
    // Log DynamoDB specific errors
    if (error && typeof error === 'object' && 'code' in error) {
        console.error(`   - DynamoDB error code: ${error.code}`);
        console.error(`   - DynamoDB error details: ${JSON.stringify(error, null, 2)}`);
    }
    // Log AWS SDK errors
    if (error && typeof error === 'object' && '$metadata' in error) {
        console.error(`   - AWS SDK error metadata: ${JSON.stringify(error.$metadata, null, 2)}`);
    }
    // Log additional context if provided
    if (additionalContext) {
        console.error(`   - Additional context: ${JSON.stringify(additionalContext, null, 2)}`);
    }
};
exports.logError = logError;
/**
 * Log operation start
 * @param operation - The operation name
 * @param context - Context information
 */
const logOperationStart = (operation, context) => {
    console.log(`🔍 [${operation}] Starting request - ${JSON.stringify(context)}`);
};
exports.logOperationStart = logOperationStart;
/**
 * Log operation success
 * @param operation - The operation name
 * @param result - Result information
 */
const logOperationSuccess = (operation, result) => {
    console.log(`✅ [${operation}] Success - ${JSON.stringify(result)}`);
};
exports.logOperationSuccess = logOperationSuccess;
/**
 * Log operation info
 * @param operation - The operation name
 * @param info - Information to log
 */
const logOperationInfo = (operation, info) => {
    console.log(`📊 [${operation}] Info - ${JSON.stringify(info)}`);
};
exports.logOperationInfo = logOperationInfo;
/**
 * Log validation error
 * @param operation - The operation name
 * @param validationError - Validation error details
 */
const logValidationError = (operation, validationError) => {
    console.log(`❌ [${operation}] Validation error - ${JSON.stringify(validationError)}`);
};
exports.logValidationError = logValidationError;
