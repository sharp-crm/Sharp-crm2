"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SMTPAuthService = void 0;
const client_secrets_manager_1 = require("@aws-sdk/client-secrets-manager");
const nodemailer_1 = __importDefault(require("nodemailer"));
const uuid_1 = require("uuid");
class SMTPAuthService {
    constructor() {
        this.region = process.env.AWS_REGION || 'us-east-1';
        this.secretsClient = new client_secrets_manager_1.SecretsManagerClient({ region: this.region });
    }
    /**
     * Get SMTP configuration based on provider
     */
    getSMTPConfig(credentials) {
        let config;
        switch (credentials.provider) {
            case 'gmail':
                config = {
                    host: 'smtp.gmail.com',
                    port: 587,
                    secure: false, // Use STARTTLS
                    auth: {
                        user: credentials.email,
                        pass: credentials.password,
                    },
                };
                break;
            case 'outlook':
                config = {
                    host: 'smtp-mail.outlook.com',
                    port: 587,
                    secure: false, // Use STARTTLS
                    auth: {
                        user: credentials.email,
                        pass: credentials.password,
                    },
                };
                break;
            case 'custom':
                if (!credentials.host || !credentials.port) {
                    throw new Error('Custom SMTP requires host and port');
                }
                config = {
                    host: credentials.host,
                    port: credentials.port,
                    secure: credentials.secure || false,
                    auth: {
                        user: credentials.email,
                        pass: credentials.password,
                    },
                };
                break;
            default:
                throw new Error('Unsupported email provider');
        }
        return config;
    }
    /**
     * Test SMTP connection with given credentials
     */
    async testSMTPConnection(credentials) {
        try {
            const config = this.getSMTPConfig(credentials);
            const transporter = nodemailer_1.default.createTransport(config);
            // Verify connection
            await transporter.verify();
            console.log(`✅ SMTP connection successful for ${credentials.email} via ${credentials.provider}`);
            return {
                success: true,
                provider: credentials.provider,
            };
        }
        catch (error) {
            console.error('❌ SMTP connection failed:', error);
            let errorMessage = 'Authentication failed';
            if (error instanceof Error) {
                if (error.message.includes('Invalid login')) {
                    errorMessage = 'Invalid email or password';
                }
                else if (error.message.includes('authentication failed')) {
                    errorMessage = 'Authentication failed. Check your credentials';
                }
                else if (error.message.includes('ENOTFOUND')) {
                    errorMessage = 'SMTP server not found. Check host settings';
                }
                else if (error.message.includes('ECONNREFUSED')) {
                    errorMessage = 'Connection refused. Check port and security settings';
                }
            }
            return {
                success: false,
                error: errorMessage,
            };
        }
    }
    /**
     * Generate secret name for user's SMTP credentials
     */
    getSecretName(email) {
        // Create a sanitized secret name
        const sanitizedEmail = email.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
        return `smtp-credentials-${sanitizedEmail}`;
    }
    /**
     * Store SMTP credentials in AWS Secrets Manager
     */
    async storeSMTPCredentials(credentials, userId) {
        try {
            // First test the connection
            const testResult = await this.testSMTPConnection(credentials);
            if (!testResult.success) {
                return testResult;
            }
            const secretName = this.getSecretName(credentials.email);
            const sessionId = (0, uuid_1.v4)();
            const secretValue = {
                email: credentials.email,
                password: credentials.password,
                provider: credentials.provider,
                host: credentials.host,
                port: credentials.port,
                secure: credentials.secure,
                userId,
                sessionId,
                createdAt: new Date().toISOString(),
                lastUsed: new Date().toISOString(),
            };
            try {
                // Try to create a new secret
                await this.secretsClient.send(new client_secrets_manager_1.CreateSecretCommand({
                    Name: secretName,
                    SecretString: JSON.stringify(secretValue),
                    Description: `SMTP credentials for ${credentials.email}`,
                    Tags: [
                        { Key: 'Type', Value: 'SMTPCredentials' },
                        { Key: 'Email', Value: credentials.email },
                        { Key: 'Provider', Value: credentials.provider },
                        { Key: 'UserId', Value: userId },
                    ],
                }));
                console.log(`✅ SMTP credentials stored for ${credentials.email}`);
            }
            catch (error) {
                if (error.name === 'ResourceExistsException') {
                    // Secret exists, update it
                    await this.secretsClient.send(new client_secrets_manager_1.UpdateSecretCommand({
                        SecretId: secretName,
                        SecretString: JSON.stringify(secretValue),
                    }));
                    console.log(`✅ SMTP credentials updated for ${credentials.email}`);
                }
                else {
                    throw error;
                }
            }
            return {
                success: true,
                provider: credentials.provider,
                sessionId,
            };
        }
        catch (error) {
            console.error('❌ Error storing SMTP credentials:', error);
            return {
                success: false,
                error: 'Failed to store credentials securely',
            };
        }
    }
    /**
     * Retrieve SMTP credentials from AWS Secrets Manager
     */
    async getSMTPCredentials(email) {
        try {
            const secretName = this.getSecretName(email);
            const response = await this.secretsClient.send(new client_secrets_manager_1.GetSecretValueCommand({
                SecretId: secretName,
            }));
            if (!response.SecretString) {
                return null;
            }
            const secretData = JSON.parse(response.SecretString);
            // Update last used timestamp
            await this.updateLastUsed(email);
            return {
                email: secretData.email,
                password: secretData.password,
                provider: secretData.provider,
                host: secretData.host,
                port: secretData.port,
                secure: secretData.secure,
            };
        }
        catch (error) {
            if (error instanceof client_secrets_manager_1.ResourceNotFoundException || error.name === 'ResourceNotFoundException') {
                console.log(`ℹ️  No SMTP credentials found for ${email}`);
                return null;
            }
            console.error('❌ Error retrieving SMTP credentials:', error);
            throw new Error('Failed to retrieve SMTP credentials');
        }
    }
    /**
     * Update last used timestamp for credentials
     */
    async updateLastUsed(email) {
        try {
            const secretName = this.getSecretName(email);
            const response = await this.secretsClient.send(new client_secrets_manager_1.GetSecretValueCommand({
                SecretId: secretName,
            }));
            if (response.SecretString) {
                const secretData = JSON.parse(response.SecretString);
                secretData.lastUsed = new Date().toISOString();
                await this.secretsClient.send(new client_secrets_manager_1.UpdateSecretCommand({
                    SecretId: secretName,
                    SecretString: JSON.stringify(secretData),
                }));
            }
        }
        catch (error) {
            console.error('⚠️  Warning: Failed to update last used timestamp:', error);
            // Don't throw error for this operation
        }
    }
    /**
     * Test stored SMTP credentials
     */
    async testStoredCredentials(email) {
        try {
            const credentials = await this.getSMTPCredentials(email);
            if (!credentials) {
                return {
                    success: false,
                    error: 'No stored credentials found',
                };
            }
            return await this.testSMTPConnection(credentials);
        }
        catch (error) {
            console.error('❌ Error testing stored credentials:', error);
            return {
                success: false,
                error: 'Failed to test stored credentials',
            };
        }
    }
    /**
     * Revoke (delete) SMTP credentials
     */
    async revokeCredentials(email) {
        try {
            const secretName = this.getSecretName(email);
            await this.secretsClient.send(new client_secrets_manager_1.DeleteSecretCommand({
                SecretId: secretName,
                ForceDeleteWithoutRecovery: true,
            }));
            console.log(`✅ SMTP credentials revoked for ${email}`);
            return {
                success: true,
            };
        }
        catch (error) {
            if (error instanceof client_secrets_manager_1.ResourceNotFoundException || error.name === 'ResourceNotFoundException') {
                // Already deleted or doesn't exist
                return {
                    success: true,
                };
            }
            console.error('❌ Error revoking SMTP credentials:', error);
            return {
                success: false,
                error: 'Failed to revoke credentials',
            };
        }
    }
    /**
     * Create NodeMailer transporter from stored credentials
     */
    async createTransporter(email) {
        try {
            const credentials = await this.getSMTPCredentials(email);
            if (!credentials) {
                console.error(`❌ No credentials found for ${email}`);
                return null;
            }
            const config = this.getSMTPConfig(credentials);
            const transporter = nodemailer_1.default.createTransport(config);
            // Test the connection
            await transporter.verify();
            console.log(`✅ NodeMailer transporter created for ${email}`);
            return transporter;
        }
        catch (error) {
            console.error('❌ Error creating transporter:', error);
            return null;
        }
    }
}
exports.SMTPAuthService = SMTPAuthService;
exports.default = new SMTPAuthService();
