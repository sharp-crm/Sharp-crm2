"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoginVerificationService = void 0;
const smtpService_1 = __importDefault(require("./smtpService"));
class LoginVerificationService {
    constructor() {
        this.smtpService = new smtpService_1.default();
    }
    /**
     * Verify email credentials and configure SMTP
     */
    async verifyAndConfigureSMTP(request) {
        try {
            console.log(`🔐 Attempting to verify email credentials for: ${request.email}`);
            let config;
            // Determine provider and create configuration
            if (request.provider === 'custom') {
                if (!request.customHost || !request.customPort) {
                    throw new Error('Custom SMTP requires host and port');
                }
                config = smtpService_1.default.getCustomConfig(request.customHost, request.customPort, request.email, request.password, request.customSecure);
            }
            else {
                // Auto-detect provider based on email domain
                const provider = this.detectProvider(request.email);
                config = smtpService_1.default.getProviderConfig(provider, request.email, request.password);
            }
            // Test SMTP configuration
            const isConfigured = await this.smtpService.configureSMTP(config);
            if (!isConfigured) {
                throw new Error('Failed to configure SMTP transport');
            }
            // Test connection
            const connectionTest = await this.smtpService.testConnection();
            if (!connectionTest) {
                throw new Error('SMTP connection test failed');
            }
            console.log(`✅ Email verification successful for ${request.email} using ${config.provider}`);
            return {
                success: true,
                message: 'Email credentials verified and SMTP configured successfully',
                provider: config.provider,
                host: config.host,
                port: config.port,
                secure: config.secure,
            };
        }
        catch (error) {
            console.error('❌ Email verification failed:', error);
            return {
                success: false,
                message: 'Email verification failed',
                error: error instanceof Error ? error.message : 'Unknown error occurred',
            };
        }
    }
    /**
     * Auto-detect email provider based on domain
     */
    detectProvider(email) {
        const domain = email.toLowerCase().split('@')[1];
        if (domain === 'gmail.com' || domain === 'googlemail.com') {
            return 'gmail';
        }
        else if (domain === 'outlook.com' || domain === 'hotmail.com' || domain === 'live.com') {
            return 'outlook';
        }
        else {
            // Default to Gmail for unknown domains
            return 'gmail';
        }
    }
    /**
     * Check if SMTP is currently configured
     */
    isSMTPConfigured() {
        return this.smtpService.isConfigured();
    }
    /**
     * Get current SMTP configuration
     */
    getCurrentSMTPConfig() {
        return this.smtpService.getCurrentConfig();
    }
    /**
     * Get the configured SMTP service
     */
    getSMTPService() {
        return this.smtpService;
    }
    /**
     * Test current SMTP connection
     */
    async testCurrentConnection() {
        return this.smtpService.testConnection();
    }
    /**
     * Close SMTP connection
     */
    async closeConnection() {
        await this.smtpService.closeConnection();
    }
}
exports.LoginVerificationService = LoginVerificationService;
exports.default = LoginVerificationService;
