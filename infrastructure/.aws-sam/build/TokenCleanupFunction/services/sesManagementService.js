"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_ses_1 = require("@aws-sdk/client-ses");
class SESManagementService {
    constructor() {
        this.region = process.env.AWS_REGION || 'us-east-1';
        // Configure SES client (same pattern as emailService)
        const sesConfig = {
            region: this.region,
        };
        // Only add explicit credentials if running locally (not in Lambda)
        if (!process.env.AWS_LAMBDA_FUNCTION_NAME && process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
            sesConfig.credentials = {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            };
        }
        this.sesClient = new client_ses_1.SESClient(sesConfig);
    }
    /**
     * Check if an email address is verified in SES
     */
    async checkIdentityVerification(email) {
        try {
            const command = new client_ses_1.GetIdentityVerificationAttributesCommand({
                Identities: [email],
            });
            const response = await this.sesClient.send(command);
            const attributes = response.VerificationAttributes?.[email];
            if (!attributes) {
                return {
                    email,
                    verified: false,
                    verificationStatus: 'NotStarted',
                };
            }
            return {
                email,
                verified: attributes.VerificationStatus === 'Success',
                verificationStatus: attributes.VerificationStatus,
                verificationToken: attributes.VerificationToken,
            };
        }
        catch (error) {
            console.error('❌ Error checking identity verification:', error);
            return {
                email,
                verified: false,
                verificationStatus: 'Failed',
            };
        }
    }
    /**
     * Add an email identity to SES and trigger verification
     */
    async addAndVerifyIdentity(email) {
        try {
            // First check if already verified
            const currentStatus = await this.checkIdentityVerification(email);
            if (currentStatus.verified) {
                return {
                    success: true,
                    alreadyVerified: true,
                    verificationSent: false,
                    identityStatus: currentStatus,
                };
            }
            // Add the identity to SES (this automatically sends verification email)
            const command = new client_ses_1.VerifyEmailIdentityCommand({
                EmailAddress: email,
            });
            await this.sesClient.send(command);
            console.log(`✅ Identity added to SES and verification email sent to: ${email}`);
            // Get updated status
            const newStatus = await this.checkIdentityVerification(email);
            return {
                success: true,
                alreadyVerified: false,
                verificationSent: true,
                identityStatus: newStatus,
            };
        }
        catch (error) {
            console.error('❌ Error adding identity to SES:', error);
            // Handle specific errors
            if (error instanceof Error) {
                if (error.message.includes('AlreadyExists')) {
                    // Identity already exists, just check status
                    const status = await this.checkIdentityVerification(email);
                    return {
                        success: true,
                        alreadyVerified: status.verified,
                        verificationSent: !status.verified,
                        identityStatus: status,
                    };
                }
            }
            return {
                success: false,
                alreadyVerified: false,
                verificationSent: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }
    /**
     * Get all verified identities
     */
    async getVerifiedIdentities() {
        try {
            const command = new client_ses_1.ListIdentitiesCommand({
                IdentityType: 'EmailAddress',
                MaxItems: 1000,
            });
            const response = await this.sesClient.send(command);
            // Filter to only verified identities
            const allIdentities = response.Identities || [];
            const verifiedIdentities = [];
            // Check verification status for each identity
            for (const identity of allIdentities) {
                const status = await this.checkIdentityVerification(identity);
                if (status.verified) {
                    verifiedIdentities.push(identity);
                }
            }
            return verifiedIdentities;
        }
        catch (error) {
            console.error('❌ Error getting verified identities:', error);
            return [];
        }
    }
    /**
     * Check if we're in SES sandbox mode
     */
    async isInSandboxMode() {
        try {
            // In sandbox mode, you can only send to verified addresses
            // This is a simple check - in production, you could call GetSendQuota
            // For now, we'll assume sandbox mode unless explicitly configured otherwise
            return process.env.SES_PRODUCTION_MODE !== 'true';
        }
        catch (error) {
            console.error('❌ Error checking SES mode:', error);
            return true; // Default to sandbox mode for safety
        }
    }
    /**
     * Validate email format
     */
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    /**
     * Remove an identity from SES (cleanup utility)
     */
    async removeIdentity(email) {
        try {
            const command = new client_ses_1.DeleteIdentityCommand({
                Identity: email,
            });
            await this.sesClient.send(command);
            console.log(`✅ Identity removed from SES: ${email}`);
            return true;
        }
        catch (error) {
            console.error('❌ Error removing identity from SES:', error);
            return false;
        }
    }
}
exports.default = new SESManagementService();
