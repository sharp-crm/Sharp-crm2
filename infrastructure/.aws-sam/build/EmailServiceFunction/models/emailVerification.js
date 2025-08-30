"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailVerificationModel = void 0;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const uuid_1 = require("uuid");
class EmailVerificationModel {
    constructor() {
        const dynamoClient = new client_dynamodb_1.DynamoDBClient({
            region: process.env.AWS_REGION || 'us-east-1',
        });
        this.client = lib_dynamodb_1.DynamoDBDocumentClient.from(dynamoClient);
        this.tableName = process.env.EMAIL_VERIFICATION_TABLE || 'SharpCRM-EmailVerification-development';
    }
    /**
     * Create a new email verification record
     */
    async createVerificationRecord(record) {
        try {
            const now = new Date().toISOString();
            const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours from now
            const verificationRecord = {
                id: (0, uuid_1.v4)(),
                verificationSentAt: now,
                lastAttemptAt: now,
                expiresAt,
                ...record,
            };
            const command = new lib_dynamodb_1.PutCommand({
                TableName: this.tableName,
                Item: verificationRecord,
                // Prevent overwriting existing records
                ConditionExpression: 'attribute_not_exists(id)',
            });
            await this.client.send(command);
            console.log(`✅ Email verification record created: ${verificationRecord.id} for ${verificationRecord.email}`);
            return verificationRecord;
        }
        catch (error) {
            console.error('❌ Error creating email verification record:', error);
            throw new Error('Failed to create email verification record');
        }
    }
    /**
     * Get verification record by email
     */
    async getVerificationByEmail(email) {
        try {
            const command = new lib_dynamodb_1.ScanCommand({
                TableName: this.tableName,
                FilterExpression: '#email = :email',
                ExpressionAttributeNames: {
                    '#email': 'email',
                },
                ExpressionAttributeValues: {
                    ':email': email,
                },
                Limit: 1,
            });
            const response = await this.client.send(command);
            const items = response.Items || [];
            // Return the most recent record if multiple exist
            if (items.length > 0) {
                return items.sort((a, b) => new Date(b.verificationSentAt).getTime() - new Date(a.verificationSentAt).getTime())[0];
            }
            return null;
        }
        catch (error) {
            console.error('❌ Error getting verification record by email:', error);
            throw new Error('Failed to get verification record');
        }
    }
    /**
     * Get verification record by ID
     */
    async getVerificationById(id) {
        try {
            const command = new lib_dynamodb_1.GetCommand({
                TableName: this.tableName,
                Key: { id },
            });
            const response = await this.client.send(command);
            return response.Item || null;
        }
        catch (error) {
            console.error('❌ Error getting verification record by ID:', error);
            throw new Error('Failed to get verification record');
        }
    }
    /**
     * Update verification status
     */
    async updateVerificationStatus(id, status, sesVerificationStatus) {
        try {
            const now = new Date().toISOString();
            let updateExpression = 'SET #status = :status, lastAttemptAt = :lastAttemptAt';
            const expressionAttributeNames = { '#status': 'status' };
            const expressionAttributeValues = {
                ':status': status,
                ':lastAttemptAt': now,
            };
            // Add verified timestamp if status is verified
            if (status === 'verified') {
                updateExpression += ', verifiedAt = :verifiedAt';
                expressionAttributeValues[':verifiedAt'] = now;
            }
            // Add SES verification status if provided
            if (sesVerificationStatus) {
                updateExpression += ', sesVerificationStatus = :sesVerificationStatus';
                expressionAttributeValues[':sesVerificationStatus'] = sesVerificationStatus;
            }
            const command = new lib_dynamodb_1.UpdateCommand({
                TableName: this.tableName,
                Key: { id },
                UpdateExpression: updateExpression,
                ExpressionAttributeNames: expressionAttributeNames,
                ExpressionAttributeValues: expressionAttributeValues,
            });
            await this.client.send(command);
            console.log(`✅ Verification status updated: ${id} -> ${status}`);
        }
        catch (error) {
            console.error('❌ Error updating verification status:', error);
            throw new Error('Failed to update verification status');
        }
    }
    /**
     * Increment verification attempts
     */
    async incrementAttempts(id) {
        try {
            const command = new lib_dynamodb_1.UpdateCommand({
                TableName: this.tableName,
                Key: { id },
                UpdateExpression: 'ADD attempts :increment SET lastAttemptAt = :lastAttemptAt',
                ExpressionAttributeValues: {
                    ':increment': 1,
                    ':lastAttemptAt': new Date().toISOString(),
                },
            });
            await this.client.send(command);
            console.log(`✅ Verification attempts incremented for: ${id}`);
        }
        catch (error) {
            console.error('❌ Error incrementing verification attempts:', error);
            throw new Error('Failed to increment verification attempts');
        }
    }
    /**
     * Get all verification records for a user
     */
    async getUserVerifications(userId, limit = 50) {
        try {
            const command = new lib_dynamodb_1.ScanCommand({
                TableName: this.tableName,
                FilterExpression: 'requestedBy = :userId',
                ExpressionAttributeValues: {
                    ':userId': userId,
                },
                Limit: limit,
            });
            const response = await this.client.send(command);
            return response.Items || [];
        }
        catch (error) {
            console.error('❌ Error getting user verifications:', error);
            throw new Error('Failed to get user verifications');
        }
    }
    /**
     * Clean up expired verification records
     */
    async cleanupExpiredRecords() {
        try {
            const now = new Date().toISOString();
            const command = new lib_dynamodb_1.ScanCommand({
                TableName: this.tableName,
                FilterExpression: 'expiresAt < :now AND #status <> :verifiedStatus',
                ExpressionAttributeNames: {
                    '#status': 'status',
                },
                ExpressionAttributeValues: {
                    ':now': now,
                    ':verifiedStatus': 'verified',
                },
            });
            const response = await this.client.send(command);
            const expiredRecords = response.Items || [];
            // Update expired records
            for (const record of expiredRecords) {
                await this.updateVerificationStatus(record.id, 'expired');
            }
            console.log(`✅ Cleaned up ${expiredRecords.length} expired verification records`);
            return expiredRecords.length;
        }
        catch (error) {
            console.error('❌ Error cleaning up expired records:', error);
            return 0;
        }
    }
    /**
     * Get verification statistics
     */
    async getVerificationStats(tenantId) {
        try {
            let filterExpression = '';
            let expressionAttributeValues = {};
            if (tenantId) {
                filterExpression = 'tenantId = :tenantId';
                expressionAttributeValues[':tenantId'] = tenantId;
            }
            const command = new lib_dynamodb_1.ScanCommand({
                TableName: this.tableName,
                FilterExpression: filterExpression || undefined,
                ExpressionAttributeValues: Object.keys(expressionAttributeValues).length > 0 ? expressionAttributeValues : undefined,
            });
            const response = await this.client.send(command);
            const records = response.Items || [];
            const stats = {
                total: records.length,
                pending: 0,
                verified: 0,
                failed: 0,
                expired: 0,
            };
            records.forEach(record => {
                stats[record.status]++;
            });
            return stats;
        }
        catch (error) {
            console.error('❌ Error getting verification stats:', error);
            return { total: 0, pending: 0, verified: 0, failed: 0, expired: 0 };
        }
    }
}
exports.EmailVerificationModel = EmailVerificationModel;
exports.default = new EmailVerificationModel();
