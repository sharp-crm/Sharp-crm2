"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SMTPEmailService = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const smtpAuthService_1 = require("./smtpAuthService");
const emailHistory_1 = require("../models/emailHistory");
const uuid_1 = require("uuid");
class SMTPEmailService {
    constructor() {
        this.authService = new smtpAuthService_1.SMTPAuthService();
        this.emailHistoryModel = new emailHistory_1.EmailHistoryModel();
    }
    /**
     * Send email using SMTP with stored credentials
     */
    async sendEmail(emailData) {
        const emailRecordId = (0, uuid_1.v4)();
        try {
            // Validate inputs
            if (!this.isValidEmail(emailData.senderEmail)) {
                throw new Error('Invalid sender email');
            }
            if (!this.isValidEmail(emailData.to)) {
                throw new Error('Invalid recipient email');
            }
            if (!emailData.subject?.trim()) {
                throw new Error('Email subject is required');
            }
            if (!emailData.message?.trim()) {
                throw new Error('Email message is required');
            }
            if (!emailData.userId) {
                throw new Error('User ID is required for email tracking');
            }
            // Create initial email record with pending status
            const emailRecord = {
                id: emailRecordId,
                senderEmail: emailData.senderEmail,
                recipientEmail: emailData.to,
                subject: emailData.subject,
                message: emailData.message,
                status: 'pending',
                sentAt: new Date().toISOString(),
                userId: emailData.userId,
                tenantId: emailData.tenantId,
                metadata: emailData.metadata,
            };
            // Store email record in database
            try {
                await this.emailHistoryModel.createEmailRecord(emailRecord);
                console.log(`✅ Email record created with ID: ${emailRecordId}`);
            }
            catch (dbError) {
                console.error('⚠️ Warning: Failed to store email record:', dbError);
                // Continue with email sending even if history storage fails
            }
            // Get stored SMTP credentials
            const credentials = await this.authService.getStoredCredentials(emailData.senderEmail);
            if (!credentials) {
                throw new Error('SMTP credentials not found. Please authenticate your email first.');
            }
            // Build SMTP configuration
            const smtpConfig = this.buildSMTPConfig(credentials);
            // Create transporter and send email
            const transporter = nodemailer_1.default.createTransporter(smtpConfig);
            const mailOptions = {
                from: emailData.senderEmail,
                to: emailData.to,
                subject: emailData.subject,
                text: emailData.message,
                html: this.convertToHtml(emailData.message),
                replyTo: emailData.senderEmail,
            };
            const result = await transporter.sendMail(mailOptions);
            // Close the transporter
            transporter.close();
            console.log(`✅ Email sent successfully. Message ID: ${result.messageId}`);
            // Update email record status to sent
            try {
                await this.emailHistoryModel.updateEmailStatus(emailRecordId, 'sent', result.messageId);
                console.log(`✅ Email record status updated to sent: ${emailRecordId}`);
            }
            catch (dbError) {
                console.error('⚠️ Warning: Failed to update email record status:', dbError);
            }
            return {
                success: true,
                messageId: result.messageId,
            };
        }
        catch (error) {
            console.error('❌ Failed to send email:', error);
            // Update email record status to failed
            try {
                await this.emailHistoryModel.updateEmailStatus(emailRecordId, 'failed', undefined, error instanceof Error ? error.message : 'Unknown error occurred');
                console.log(`✅ Email record status updated to failed: ${emailRecordId}`);
            }
            catch (dbError) {
                console.error('⚠️ Warning: Failed to update email record status:', dbError);
            }
            return {
                success: false,
                error: this.formatEmailError(error),
            };
        }
    }
    /**
     * Test SMTP connection for a specific email
     */
    async testConnection(senderEmail) {
        try {
            const credentials = await this.authService.getStoredCredentials(senderEmail);
            if (!credentials) {
                return {
                    success: false,
                    error: 'No stored SMTP credentials found. Please authenticate first.'
                };
            }
            const smtpConfig = this.buildSMTPConfig(credentials);
            const transporter = nodemailer_1.default.createTransporter(smtpConfig);
            return new Promise((resolve) => {
                const timeout = setTimeout(() => {
                    transporter.close();
                    resolve({ success: false, error: 'Connection timeout' });
                }, 10000);
                transporter.verify((error) => {
                    clearTimeout(timeout);
                    transporter.close();
                    if (error) {
                        resolve({
                            success: false,
                            error: this.formatSMTPError(error)
                        });
                    }
                    else {
                        resolve({
                            success: true,
                            provider: credentials.provider
                        });
                    }
                });
            });
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            };
        }
    }
    /**
     * Build SMTP configuration from credentials
     */
    buildSMTPConfig(credentials) {
        const baseConfig = {
            auth: {
                user: credentials.email,
                pass: credentials.password
            }
        };
        switch (credentials.provider) {
            case 'gmail':
                return {
                    ...baseConfig,
                    host: 'smtp.gmail.com',
                    port: 587,
                    secure: false,
                    tls: {
                        rejectUnauthorized: false
                    }
                };
            case 'outlook':
                return {
                    ...baseConfig,
                    host: 'smtp-mail.outlook.com',
                    port: 587,
                    secure: false,
                    tls: {
                        rejectUnauthorized: false
                    }
                };
            case 'custom':
                if (!credentials.host || !credentials.port) {
                    throw new Error('Custom SMTP requires host and port configuration');
                }
                return {
                    ...baseConfig,
                    host: credentials.host,
                    port: credentials.port,
                    secure: credentials.secure ?? true,
                    tls: {
                        rejectUnauthorized: false
                    }
                };
            default:
                throw new Error(`Unsupported SMTP provider: ${credentials.provider}`);
        }
    }
    /**
     * Convert plain text to HTML
     */
    convertToHtml(text) {
        return text
            .split('\n')
            .map(line => `<p>${line || '&nbsp;'}</p>`)
            .join('');
    }
    /**
     * Validate email format
     */
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    /**
     * Format email errors for user-friendly messages
     */
    formatEmailError(error) {
        if (error.message?.includes('SMTP credentials not found')) {
            return 'Email not authenticated. Please authenticate your email first.';
        }
        if (error.message?.includes('Invalid sender email')) {
            return 'Invalid sender email address.';
        }
        if (error.message?.includes('Invalid recipient email')) {
            return 'Invalid recipient email address.';
        }
        if (error.message?.includes('Email subject is required')) {
            return 'Email subject is required.';
        }
        if (error.message?.includes('Email message is required')) {
            return 'Email message is required.';
        }
        if (error.message?.includes('User ID is required')) {
            return 'User ID is required for email tracking.';
        }
        return 'Failed to send email. Please try again later.';
    }
    /**
     * Format SMTP errors for user-friendly messages
     */
    formatSMTPError(error) {
        if (error.code === 'EAUTH') {
            return 'Invalid email or password. Please check your credentials.';
        }
        if (error.code === 'ECONNECTION') {
            return 'Unable to connect to email server. Please check your internet connection.';
        }
        if (error.code === 'ETIMEDOUT') {
            return 'Connection timed out. Please try again.';
        }
        if (error.message?.includes('Invalid login')) {
            return 'Invalid email or password. Please check your credentials.';
        }
        if (error.message?.includes('Username and Password not accepted')) {
            return 'Invalid email or password. Please check your credentials.';
        }
        if (error.message?.includes('Authentication failed')) {
            return 'Authentication failed. Please check your credentials.';
        }
        return 'SMTP connection failed. Please check your email settings.';
    }
}
exports.SMTPEmailService = SMTPEmailService;
