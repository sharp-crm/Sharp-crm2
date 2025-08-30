"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SMTPService = void 0;
const nodemailer_1 = require("nodemailer");
class SMTPService {
    constructor() {
        this.transporter = null;
        this.currentConfig = null;
    }
    /**
     * Configure SMTP transport based on email provider
     */
    async configureSMTP(config) {
        try {
            // Validate configuration
            if (!config.host || !config.username || !config.password) {
                throw new Error('Invalid SMTP configuration: missing host, username, or password');
            }
            // Test the connection before setting as current
            const testTransporter = this.createTransporter(config);
            await testTransporter.verify();
            // If verification succeeds, set as current
            this.transporter = testTransporter;
            this.currentConfig = config;
            console.log(`✅ SMTP configured successfully for ${config.provider} (${config.host}:${config.port})`);
            return true;
        }
        catch (error) {
            console.error('❌ SMTP configuration failed:', error);
            throw new Error(`SMTP configuration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Create nodemailer transporter with the given configuration
     */
    createTransporter(config) {
        const smtpConfig = {
            host: config.host,
            port: config.port,
            secure: config.secure,
            auth: {
                user: config.username,
                pass: config.password,
            },
            tls: {
                rejectUnauthorized: config.tlsRejectUnauthorized ?? true,
            },
        };
        return (0, nodemailer_1.createTransport)(smtpConfig);
    }
    /**
     * Get predefined configuration for common email providers
     */
    static getProviderConfig(provider, username, password) {
        switch (provider) {
            case 'gmail':
                return {
                    provider: 'gmail',
                    host: 'smtp.gmail.com',
                    port: 587,
                    secure: false, // Gmail uses STARTTLS on port 587
                    username,
                    password,
                    tlsRejectUnauthorized: false, // Gmail sometimes has certificate issues
                };
            case 'outlook':
                return {
                    provider: 'outlook',
                    host: 'smtp-mail.outlook.com',
                    port: 587,
                    secure: false, // Outlook uses STARTTLS on port 587
                    username,
                    password,
                    tlsRejectUnauthorized: false,
                };
            default:
                throw new Error(`Unsupported provider: ${provider}`);
        }
    }
    /**
     * Get custom SMTP configuration
     */
    static getCustomConfig(host, port, username, password, secure = false) {
        return {
            provider: 'custom',
            host,
            port,
            secure,
            username,
            password,
            tlsRejectUnauthorized: false,
        };
    }
    /**
     * Check if SMTP is configured
     */
    isConfigured() {
        return this.transporter !== null;
    }
    /**
     * Get current configuration
     */
    getCurrentConfig() {
        return this.currentConfig;
    }
    /**
     * Get the configured transporter
     */
    getTransporter() {
        if (!this.transporter) {
            throw new Error('SMTP not configured. Call configureSMTP() first.');
        }
        return this.transporter;
    }
    /**
     * Test SMTP connection
     */
    async testConnection() {
        try {
            if (!this.transporter) {
                throw new Error('SMTP not configured');
            }
            await this.transporter.verify();
            return true;
        }
        catch (error) {
            console.error('❌ SMTP connection test failed:', error);
            return false;
        }
    }
    /**
     * Close SMTP connection
     */
    async closeConnection() {
        if (this.transporter) {
            await this.transporter.close();
            this.transporter = null;
            this.currentConfig = null;
            console.log('✅ SMTP connection closed');
        }
    }
}
exports.SMTPService = SMTPService;
exports.default = SMTPService;
