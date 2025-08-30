"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_secrets_manager_1 = require("@aws-sdk/client-secrets-manager");
const emailHistory_1 = require("../models/emailHistory");
const nodemailer_1 = __importDefault(require("nodemailer"));
const uuid_1 = require("uuid");
class EmailService {
    constructor() {
        this.region = process.env.AWS_REGION || 'us-east-1';
        this.emailHistoryModel = new emailHistory_1.EmailHistoryModel();
        // Initialize Secrets Manager client
        const secretsConfig = {
            region: this.region,
        };
        // Only add explicit credentials if running locally (not in Lambda)
        if (!process.env.AWS_LAMBDA_FUNCTION_NAME && process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
            secretsConfig.credentials = {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            };
        }
        this.secretsManagerClient = new client_secrets_manager_1.SecretsManagerClient(secretsConfig);
    }
    /**
     * Store user's email configuration in AWS Secrets Manager
     */
    async storeUserEmailConfig(userId, email, smtpConfig) {
        try {
            const secretName = `user-email-config/${userId}`;
            const secretValue = {
                userId,
                email,
                smtpConfig,
                verified: false,
            };
            try {
                // Try to create new secret
                await this.secretsManagerClient.send(new client_secrets_manager_1.CreateSecretCommand({
                    Name: secretName,
                    SecretString: JSON.stringify(secretValue),
                    Description: `SMTP configuration for user ${userId} (${email})`,
                }));
            }
            catch (error) {
                // If secret already exists, update it
                if (error.name === 'ResourceExistsException') {
                    await this.secretsManagerClient.send(new client_secrets_manager_1.UpdateSecretCommand({
                        SecretId: secretName,
                        SecretString: JSON.stringify(secretValue),
                    }));
                }
                else {
                    throw error;
                }
            }
            console.log(`✅ User email config stored for ${userId}`);
            return true;
        }
        catch (error) {
            console.error('❌ Failed to store user email config:', error);
            return false;
        }
    }
    /**
     * Retrieve user's email configuration from AWS Secrets Manager
     */
    async getUserEmailConfig(userId) {
        try {
            const secretName = `user-email-config/${userId}`;
            const response = await this.secretsManagerClient.send(new client_secrets_manager_1.GetSecretValueCommand({
                SecretId: secretName,
            }));
            if (response.SecretString) {
                const config = JSON.parse(response.SecretString);
                return config;
            }
            return null;
        }
        catch (error) {
            if (error.name === 'ResourceNotFoundException') {
                return null;
            }
            console.error('❌ Failed to retrieve user email config:', error);
            return null;
        }
    }
    /**
     * Verify user's email configuration by sending a test email
     */
    async verifyUserEmailConfig(userId, email, smtpConfig) {
        try {
            // Create transporter
            const transporter = nodemailer_1.default.createTransport(smtpConfig);
            // Verify connection
            await transporter.verify();
            // Send test email to user's own email
            const testMailOptions = {
                from: smtpConfig.auth.user,
                to: email,
                subject: 'Email Configuration Verification - SharpCRM',
                text: 'Your email configuration has been verified successfully. You can now send emails through SharpCRM.',
                html: `
          <h2>Email Configuration Verified</h2>
          <p>Your email configuration has been verified successfully.</p>
          <p>You can now send emails through SharpCRM using your configured SMTP settings.</p>
          <br>
          <p><strong>SMTP Server:</strong> ${smtpConfig.host}:${smtpConfig.port}</p>
          <p><strong>Email:</strong> ${email}</p>
          <br>
          <p>Best regards,<br>SharpCRM Team</p>
        `,
            };
            const result = await transporter.sendMail(testMailOptions);
            if (result.messageId) {
                // Update the stored config to mark as verified
                const verifiedConfig = {
                    userId,
                    email,
                    smtpConfig,
                    verified: true,
                    verifiedAt: new Date().toISOString(),
                };
                // Store the verified configuration
                await this.storeUserEmailConfig(userId, email, smtpConfig);
                // Also update the verification status in the stored config
                const existingConfig = await this.getUserEmailConfig(userId);
                if (existingConfig) {
                    const updatedConfig = {
                        ...existingConfig,
                        verified: true,
                        verifiedAt: new Date().toISOString(),
                    };
                    await this.storeUserEmailConfig(userId, email, updatedConfig.smtpConfig);
                }
                console.log(`✅ Email configuration verified for ${userId}`);
                return true;
            }
            return false;
        }
        catch (error) {
            console.error('❌ Failed to verify email configuration:', error);
            return false;
        }
    }
    /**
     * Send email using NodeMailer SMTP
     */
    async sendEmail(req, emailData) {
        let emailId;
        try {
            const userId = req.user.userId;
            const tenantId = req.user.tenantId;
            // Get user's email configuration
            const userConfig = await this.getUserEmailConfig(userId);
            if (!userConfig || !userConfig.verified) {
                throw new Error('Email configuration not found or not verified. Please configure your email settings first.');
            }
            // Validate recipient email
            if (!this.isValidEmail(emailData.to)) {
                throw new Error('Invalid recipient email address');
            }
            // Validate subject and message
            if (!emailData.subject.trim()) {
                throw new Error('Email subject is required');
            }
            if (!emailData.message.trim()) {
                throw new Error('Email message is required');
            }
            // Create email record ID
            emailId = (0, uuid_1.v4)();
            // Create initial email record with pending status
            const emailRecord = {
                id: emailId,
                senderEmail: userConfig.email,
                recipientEmail: emailData.to,
                subject: emailData.subject,
                message: emailData.message,
                status: 'pending',
                sentAt: new Date().toISOString(),
                userId,
                tenantId,
                metadata: {
                    ipAddress: req.ip,
                    userAgent: req.get('User-Agent'),
                },
            };
            // Store the email record
            await this.emailHistoryModel.createEmailRecord(emailRecord);
            // Create transporter with user's SMTP config
            const transporter = nodemailer_1.default.createTransport(userConfig.smtpConfig);
            // Send email
            const mailOptions = {
                from: userConfig.email,
                to: emailData.to,
                subject: emailData.subject,
                text: emailData.message,
                html: this.convertToHtml(emailData.message),
                replyTo: userConfig.email,
            };
            const result = await transporter.sendMail(mailOptions);
            console.log(`✅ Email sent successfully. Message ID: ${result.messageId}`);
            // Update email record with success status and message ID
            await this.emailHistoryModel.updateEmailStatus(emailId, 'sent', result.messageId);
            return {
                success: true,
                messageId: result.messageId,
            };
        }
        catch (error) {
            console.error('❌ Failed to send email:', error);
            // Update email record with failed status if we have an emailId
            if (emailId) {
                try {
                    await this.emailHistoryModel.updateEmailStatus(emailId, 'failed', undefined, error instanceof Error ? error.message : 'Unknown error');
                }
                catch (updateError) {
                    console.error('❌ Failed to update email status:', updateError);
                }
            }
            // Handle specific SMTP errors
            if (error instanceof Error) {
                if (error.message.includes('Invalid login')) {
                    return {
                        success: false,
                        error: 'Invalid email credentials. Please check your SMTP settings.',
                    };
                }
                if (error.message.includes('Connection timeout')) {
                    return {
                        success: false,
                        error: 'Connection timeout. Please check your SMTP server settings.',
                    };
                }
                if (error.message.includes('Authentication failed')) {
                    return {
                        success: false,
                        error: 'Authentication failed. Please verify your email and password.',
                    };
                }
            }
            return {
                success: false,
                error: 'Failed to send email. Please try again later.',
            };
        }
    }
    /**
     * Test SMTP connection without sending email
     */
    async testSMTPConnection(smtpConfig) {
        try {
            const transporter = nodemailer_1.default.createTransport(smtpConfig);
            await transporter.verify();
            return true;
        }
        catch (error) {
            console.error('❌ SMTP connection test failed:', error);
            return false;
        }
    }
    /**
     * Get user's email configuration status
     */
    async getUserEmailStatus(userId) {
        try {
            const config = await this.getUserEmailConfig(userId);
            if (!config) {
                return {
                    configured: false,
                    verified: false,
                    error: 'No email configuration found',
                };
            }
            return {
                configured: true,
                verified: config.verified,
                email: config.email,
            };
        }
        catch (error) {
            return {
                configured: false,
                verified: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    convertToHtml(text) {
        // Convert plain text to basic HTML
        return text
            .split('\n')
            .map(line => `<p>${line || '&nbsp;'}</p>`)
            .join('');
    }
    // Method to check service configuration (for backward compatibility)
    async checkConfiguration() {
        try {
            // Check if we can access Secrets Manager
            await this.secretsManagerClient.send(new client_secrets_manager_1.GetSecretValueCommand({
                SecretId: 'test-secret',
            }));
            return {
                configured: true,
                service: 'NodeMailer SMTP',
            };
        }
        catch (error) {
            if (error.name === 'ResourceNotFoundException') {
                // This is expected for a test secret, means Secrets Manager is accessible
                return {
                    configured: true,
                    service: 'NodeMailer SMTP',
                };
            }
            return {
                configured: false,
                service: 'NodeMailer SMTP',
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }
}
exports.default = new EmailService();
