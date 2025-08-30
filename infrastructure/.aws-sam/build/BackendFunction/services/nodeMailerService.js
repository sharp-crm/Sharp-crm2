"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const emailHistory_1 = require("../models/emailHistory");
const smtpAuthService_1 = require("./smtpAuthService");
const uuid_1 = require("uuid");
class NodeMailerService {
    constructor() {
        this.emailHistoryModel = new emailHistory_1.EmailHistoryModel();
        this.smtpAuthService = new smtpAuthService_1.SMTPAuthService();
    }
    /**
     * Send email using NodeMailer with dynamic SMTP configuration
     */
    async sendEmail(req, emailData) {
        let emailId;
        try {
            const senderEmail = req.user.email;
            const userId = req.user.userId;
            const tenantId = req.user.tenantId;
            // Validate sender email
            if (!senderEmail) {
                throw new Error('Sender email not found in user context');
            }
            // Validate recipient email(s)
            if (!this.isValidEmail(emailData.to)) {
                throw new Error('Invalid recipient email address');
            }
            // Validate CC emails if provided
            if (emailData.cc && emailData.cc.length > 0) {
                for (const ccEmail of emailData.cc) {
                    if (!this.isValidEmail(ccEmail)) {
                        throw new Error(`Invalid CC email address: ${ccEmail}`);
                    }
                }
            }
            // Validate BCC emails if provided
            if (emailData.bcc && emailData.bcc.length > 0) {
                for (const bccEmail of emailData.bcc) {
                    if (!this.isValidEmail(bccEmail)) {
                        throw new Error(`Invalid BCC email address: ${bccEmail}`);
                    }
                }
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
                senderEmail,
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
                    ccEmails: emailData.cc,
                    bccEmails: emailData.bcc,
                    attachmentCount: emailData.attachments?.length || 0,
                },
            };
            // Store the email record
            await this.emailHistoryModel.createEmailRecord(emailRecord);
            // Get transporter for the user's email
            const transporter = await this.smtpAuthService.createTransporter(senderEmail);
            if (!transporter) {
                throw new Error('No authenticated SMTP credentials found. Please authenticate your email first.');
            }
            // Prepare email options
            const mailOptions = {
                from: senderEmail,
                to: emailData.to,
                cc: emailData.cc,
                bcc: emailData.bcc,
                subject: emailData.subject,
                text: emailData.message,
                html: this.convertToHtml(emailData.message),
                attachments: emailData.attachments?.map(att => ({
                    filename: att.filename,
                    content: att.content,
                    contentType: att.contentType,
                })),
            };
            // Send email using NodeMailer
            const result = await transporter.sendMail(mailOptions);
            console.log(`✅ Email sent successfully via NodeMailer. Message ID: ${result.messageId}`);
            // Update email record with success status and message ID
            await this.emailHistoryModel.updateEmailStatus(emailId, 'sent', result.messageId);
            return {
                success: true,
                messageId: result.messageId,
            };
        }
        catch (error) {
            console.error('❌ Failed to send email via NodeMailer:', error);
            // Update email record with failed status if we have an emailId
            if (emailId) {
                try {
                    await this.emailHistoryModel.updateEmailStatus(emailId, 'failed', undefined, error instanceof Error ? error.message : 'Unknown error');
                }
                catch (updateError) {
                    console.error('❌ Failed to update email status:', updateError);
                }
            }
            // Handle specific errors
            if (error instanceof Error) {
                // Authentication/connection errors
                if (error.message.includes('Invalid login') ||
                    error.message.includes('authentication failed')) {
                    return {
                        success: false,
                        error: 'Email authentication failed. Please re-authenticate your email.',
                    };
                }
                // Connection errors
                if (error.message.includes('ENOTFOUND') ||
                    error.message.includes('ECONNREFUSED')) {
                    return {
                        success: false,
                        error: 'Unable to connect to email server. Please check your connection.',
                    };
                }
                // Rate limiting
                if (error.message.includes('rate limit') ||
                    error.message.includes('too many')) {
                    return {
                        success: false,
                        error: 'Email rate limit exceeded. Please try again later.',
                    };
                }
                // Invalid recipient
                if (error.message.includes('invalid recipient') ||
                    error.message.includes('recipient rejected')) {
                    return {
                        success: false,
                        error: 'Invalid recipient email address.',
                    };
                }
                // No SMTP credentials
                if (error.message.includes('No authenticated SMTP credentials')) {
                    return {
                        success: false,
                        error: error.message,
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
     * Test SMTP connection for the user
     */
    async testConnection(userEmail) {
        try {
            const testResult = await this.smtpAuthService.testStoredCredentials(userEmail);
            if (testResult.success) {
                return {
                    configured: true,
                    provider: testResult.provider,
                    senderEmail: userEmail,
                };
            }
            else {
                return {
                    configured: false,
                    error: testResult.error || 'SMTP connection test failed',
                };
            }
        }
        catch (error) {
            console.error('❌ Error testing SMTP connection:', error);
            return {
                configured: false,
                error: 'Failed to test SMTP connection',
            };
        }
    }
    /**
     * Check email service configuration for a user
     */
    async checkConfiguration(userEmail) {
        try {
            const credentials = await this.smtpAuthService.getSMTPCredentials(userEmail);
            if (!credentials) {
                return {
                    configured: false,
                    error: 'No SMTP credentials configured',
                };
            }
            return {
                configured: true,
                provider: credentials.provider,
                senderEmail: credentials.email,
            };
        }
        catch (error) {
            console.error('❌ Error checking email configuration:', error);
            return {
                configured: false,
                error: 'Failed to check email configuration',
            };
        }
    }
    /**
     * Validate email address format
     */
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    /**
     * Convert plain text to HTML
     */
    convertToHtml(text) {
        // Convert plain text to basic HTML with better formatting
        return text
            .split('\n')
            .map(line => {
            if (line.trim() === '') {
                return '<br/>';
            }
            // Escape HTML special characters
            const escaped = line
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#x27;');
            return `<p style="margin: 0 0 10px 0;">${escaped}</p>`;
        })
            .join('');
    }
    /**
     * Create a test transporter for the user (used for testing)
     */
    async createTestTransporter(userEmail) {
        try {
            return await this.smtpAuthService.createTransporter(userEmail);
        }
        catch (error) {
            console.error('❌ Error creating test transporter:', error);
            return null;
        }
    }
}
exports.default = new NodeMailerService();
