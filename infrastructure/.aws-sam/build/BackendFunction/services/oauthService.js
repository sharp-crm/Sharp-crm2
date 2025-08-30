"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const google_auth_library_1 = require("google-auth-library");
const googleapis_1 = require("googleapis");
const microsoft_graph_client_1 = require("@microsoft/microsoft-graph-client");
const client_secrets_manager_1 = require("@aws-sdk/client-secrets-manager");
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const util_dynamodb_1 = require("@aws-sdk/util-dynamodb");
class CustomAuthProvider {
    constructor(accessToken) {
        this.accessToken = accessToken;
    }
    async getAccessToken() {
        return this.accessToken;
    }
}
class OAuthEmailService {
    constructor() {
        this.secretsClient = new client_secrets_manager_1.SecretsManagerClient({ region: process.env.AWS_REGION || 'us-east-1' });
        this.dynamoClient = new client_dynamodb_1.DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
    }
    getProviderConfig(provider) {
        const baseRedirectUri = process.env.FRONTEND_URL || 'https://d9xj0evv3ouwa.cloudfront.net';
        if (provider === 'gmail') {
            return {
                clientId: process.env.GMAIL_CLIENT_ID || '',
                clientSecret: process.env.GMAIL_CLIENT_SECRET || '',
                redirectUri: baseRedirectUri,
            };
        }
        else {
            return {
                clientId: process.env.OUTLOOK_CLIENT_ID || '',
                clientSecret: process.env.OUTLOOK_CLIENT_SECRET || '',
                redirectUri: baseRedirectUri,
            };
        }
    }
    encodeState(provider, userId) {
        const stateData = {
            provider,
            userId,
            timestamp: Date.now()
        };
        return Buffer.from(JSON.stringify(stateData)).toString('base64');
    }
    decodeState(encodedState) {
        try {
            const decoded = Buffer.from(encodedState, 'base64').toString('utf-8');
            const stateData = JSON.parse(decoded);
            // Validate state is not too old (30 minutes)
            const thirtyMinutes = 30 * 60 * 1000;
            if (Date.now() - stateData.timestamp > thirtyMinutes) {
                console.log('OAuth state expired');
                return null;
            }
            return stateData;
        }
        catch (error) {
            console.error('Failed to decode OAuth state:', error);
            return null;
        }
    }
    async generateGmailAuthUrl(userId) {
        const config = this.getProviderConfig('gmail');
        if (!config.clientId || !config.clientSecret) {
            throw new Error('Gmail OAuth credentials not configured');
        }
        const oauth2Client = new google_auth_library_1.OAuth2Client(config.clientId, config.clientSecret, config.redirectUri);
        const scopes = [
            'https://www.googleapis.com/auth/gmail.send',
            'https://www.googleapis.com/auth/userinfo.email',
        ];
        const encodedState = this.encodeState('gmail', userId);
        const authUrl = oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: scopes,
            state: encodedState,
            prompt: 'consent',
        });
        return authUrl;
    }
    async generateOutlookAuthUrl(userId) {
        const config = this.getProviderConfig('outlook');
        if (!config.clientId || !config.clientSecret) {
            throw new Error('Outlook OAuth credentials not configured');
        }
        const scopes = 'https://graph.microsoft.com/Mail.Send https://graph.microsoft.com/User.Read';
        const encodedState = this.encodeState('outlook', userId);
        const authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?` +
            `client_id=${config.clientId}&` +
            `response_type=code&` +
            `redirect_uri=${encodeURIComponent(config.redirectUri)}&` +
            `scope=${encodeURIComponent(scopes)}&` +
            `response_mode=query&` +
            `state=${encodedState}`;
        return authUrl;
    }
    async exchangeGmailCode(code, state) {
        const stateData = this.decodeState(state);
        if (!stateData || stateData.provider !== 'gmail') {
            throw new Error('Invalid or expired OAuth state');
        }
        const config = this.getProviderConfig('gmail');
        const oauth2Client = new google_auth_library_1.OAuth2Client(config.clientId, config.clientSecret, config.redirectUri);
        try {
            const { tokens } = await oauth2Client.getToken(code);
            if (!tokens.access_token) {
                throw new Error('No access token received');
            }
            // Get user email
            oauth2Client.setCredentials(tokens);
            const oauth2 = oauth2Client.request({
                url: 'https://www.googleapis.com/oauth2/v2/userinfo'
            });
            const userInfo = await oauth2;
            const email = userInfo.data.email;
            if (!email) {
                throw new Error('Could not retrieve user email');
            }
            // Store tokens in Secrets Manager
            const oauthTokens = {
                accessToken: tokens.access_token,
                refreshToken: tokens.refresh_token || '',
                expiresAt: tokens.expiry_date || Date.now() + 3600000,
                email,
                provider: 'gmail',
                userId: stateData.userId,
            };
            const secretArn = await this.storeTokensInSecretsManager(stateData.userId, oauthTokens);
            // Store OAuth config in DynamoDB
            const oauthConfig = {
                email,
                provider: 'gmail',
                verified: true,
                secretArn,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };
            await this.storeOAuthConfig(stateData.userId, oauthConfig);
            return oauthConfig;
        }
        catch (error) {
            console.error('Error exchanging Gmail code:', error);
            throw new Error(`Failed to exchange Gmail authorization code: ${error}`);
        }
    }
    async exchangeOutlookCode(code, state) {
        const stateData = this.decodeState(state);
        if (!stateData || stateData.provider !== 'outlook') {
            throw new Error('Invalid or expired OAuth state');
        }
        const config = this.getProviderConfig('outlook');
        try {
            const tokenResponse = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    client_id: config.clientId,
                    client_secret: config.clientSecret,
                    code,
                    redirect_uri: config.redirectUri,
                    grant_type: 'authorization_code',
                }),
            });
            if (!tokenResponse.ok) {
                const errorData = await tokenResponse.text();
                throw new Error(`Token exchange failed: ${errorData}`);
            }
            const tokens = await tokenResponse.json();
            if (!tokens.access_token) {
                throw new Error('No access token received');
            }
            // Get user email from Microsoft Graph
            const graphClient = microsoft_graph_client_1.Client.initWithMiddleware({
                authProvider: new CustomAuthProvider(tokens.access_token)
            });
            const user = await graphClient.api('/me').get();
            const email = user.mail || user.userPrincipalName;
            if (!email) {
                throw new Error('Could not retrieve user email');
            }
            // Store tokens in Secrets Manager
            const oauthTokens = {
                accessToken: tokens.access_token,
                refreshToken: tokens.refresh_token || '',
                expiresAt: Date.now() + (tokens.expires_in * 1000),
                email,
                provider: 'outlook',
                userId: stateData.userId,
            };
            const secretArn = await this.storeTokensInSecretsManager(stateData.userId, oauthTokens);
            // Store OAuth config in DynamoDB
            const oauthConfig = {
                email,
                provider: 'outlook',
                verified: true,
                secretArn,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };
            await this.storeOAuthConfig(stateData.userId, oauthConfig);
            return oauthConfig;
        }
        catch (error) {
            console.error('Error exchanging Outlook code:', error);
            throw new Error(`Failed to exchange Outlook authorization code: ${error}`);
        }
    }
    async storeTokensInSecretsManager(userId, tokens) {
        const secretName = `sharp-crm/oauth/${userId}/${tokens.provider}`;
        try {
            // Try to update existing secret
            await this.secretsClient.send(new client_secrets_manager_1.PutSecretValueCommand({
                SecretId: secretName,
                SecretString: JSON.stringify(tokens),
            }));
            return `arn:aws:secretsmanager:${process.env.AWS_REGION || 'us-east-1'}:${process.env.AWS_ACCOUNT_ID}:secret:${secretName}`;
        }
        catch (error) {
            // If secret doesn't exist, create it
            if (error.name === 'ResourceNotFoundException') {
                try {
                    await this.secretsClient.send(new client_secrets_manager_1.CreateSecretCommand({
                        Name: secretName,
                        SecretString: JSON.stringify(tokens),
                        Description: `OAuth tokens for ${tokens.provider} - User: ${userId}`,
                    }));
                    return `arn:aws:secretsmanager:${process.env.AWS_REGION || 'us-east-1'}:${process.env.AWS_ACCOUNT_ID}:secret:${secretName}`;
                }
                catch (createError) {
                    console.error('Error creating secret in Secrets Manager:', createError);
                    throw new Error('Failed to create OAuth secret');
                }
            }
            console.error('Error storing tokens in Secrets Manager:', error);
            throw new Error('Failed to store OAuth tokens securely');
        }
    }
    async storeOAuthConfig(userId, config) {
        const tableName = process.env.OAUTH_TABLE_NAME || `${process.env.DYNAMODB_TABLE_NAME}-OAuth` || 'sharp-crm-production-OAuth';
        try {
            await this.dynamoClient.send(new client_dynamodb_1.PutItemCommand({
                TableName: tableName,
                Item: (0, util_dynamodb_1.marshall)({
                    userId: userId,
                    ...config,
                }),
            }));
        }
        catch (error) {
            console.error('Error storing OAuth config in DynamoDB:', error);
            throw new Error('Failed to store OAuth configuration');
        }
    }
    async getOAuthConfig(userId, provider) {
        const tableName = process.env.OAUTH_TABLE_NAME || `${process.env.DYNAMODB_TABLE_NAME}-OAuth` || 'sharp-crm-production-OAuth';
        try {
            if (provider) {
                const response = await this.dynamoClient.send(new client_dynamodb_1.GetItemCommand({
                    TableName: tableName,
                    Key: (0, util_dynamodb_1.marshall)({
                        userId: userId,
                        provider: provider,
                    }),
                }));
                if (response.Item) {
                    const item = (0, util_dynamodb_1.unmarshall)(response.Item);
                    return {
                        email: item.email,
                        provider: item.provider,
                        verified: item.verified,
                        secretArn: item.secretArn,
                        createdAt: item.createdAt,
                        updatedAt: item.updatedAt,
                    };
                }
            }
            return null;
        }
        catch (error) {
            console.error('Error getting OAuth config:', error);
            return null;
        }
    }
    async getTokensFromSecretsManager(userId, provider) {
        const secretName = `sharp-crm/oauth/${userId}/${provider}`;
        try {
            const response = await this.secretsClient.send(new client_secrets_manager_1.GetSecretValueCommand({
                SecretId: secretName,
            }));
            if (response.SecretString) {
                return JSON.parse(response.SecretString);
            }
            return null;
        }
        catch (error) {
            console.error('Error retrieving tokens from Secrets Manager:', error);
            return null;
        }
    }
    async refreshGmailTokens(tokens) {
        const config = this.getProviderConfig('gmail');
        const oauth2Client = new google_auth_library_1.OAuth2Client(config.clientId, config.clientSecret, config.redirectUri);
        oauth2Client.setCredentials({
            refresh_token: tokens.refreshToken,
        });
        try {
            const { credentials } = await oauth2Client.refreshAccessToken();
            const updatedTokens = {
                ...tokens,
                accessToken: credentials.access_token || tokens.accessToken,
                expiresAt: credentials.expiry_date || Date.now() + 3600000,
            };
            await this.storeTokensInSecretsManager(tokens.userId, updatedTokens);
            return updatedTokens;
        }
        catch (error) {
            console.error('Error refreshing Gmail tokens:', error);
            throw new Error('Failed to refresh Gmail access token');
        }
    }
    async refreshOutlookTokens(tokens) {
        const config = this.getProviderConfig('outlook');
        try {
            const response = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    client_id: config.clientId,
                    client_secret: config.clientSecret,
                    refresh_token: tokens.refreshToken,
                    grant_type: 'refresh_token',
                }),
            });
            if (!response.ok) {
                throw new Error('Token refresh failed');
            }
            const newTokens = await response.json();
            const updatedTokens = {
                ...tokens,
                accessToken: newTokens.access_token,
                refreshToken: newTokens.refresh_token || tokens.refreshToken,
                expiresAt: Date.now() + (newTokens.expires_in * 1000),
            };
            await this.storeTokensInSecretsManager(tokens.userId, updatedTokens);
            return updatedTokens;
        }
        catch (error) {
            console.error('Error refreshing Outlook tokens:', error);
            throw new Error('Failed to refresh Outlook access token');
        }
    }
    async getValidTokens(userId, provider) {
        try {
            let tokens = await this.getTokensFromSecretsManager(userId, provider);
            if (!tokens) {
                return null;
            }
            // Check if token is expired (with 5 minute buffer)
            const fiveMinutes = 5 * 60 * 1000;
            if (tokens.expiresAt - fiveMinutes < Date.now()) {
                console.log(`${provider} token expired, refreshing...`);
                if (provider === 'gmail') {
                    tokens = await this.refreshGmailTokens(tokens);
                }
                else {
                    tokens = await this.refreshOutlookTokens(tokens);
                }
            }
            return tokens;
        }
        catch (error) {
            console.error('Error getting valid tokens:', error);
            return null;
        }
    }
    async disconnectOAuth(userId, provider) {
        const tableName = process.env.OAUTH_TABLE_NAME || `${process.env.DYNAMODB_TABLE_NAME}-OAuth` || 'sharp-crm-production-OAuth';
        try {
            await this.dynamoClient.send(new client_dynamodb_1.UpdateItemCommand({
                TableName: tableName,
                Key: (0, util_dynamodb_1.marshall)({
                    userId: userId,
                    provider: provider,
                }),
                UpdateExpression: 'SET verified = :verified, updatedAt = :updatedAt',
                ExpressionAttributeValues: (0, util_dynamodb_1.marshall)({
                    ':verified': false,
                    ':updatedAt': new Date().toISOString(),
                }),
            }));
        }
        catch (error) {
            console.error('Error disconnecting OAuth:', error);
            throw new Error('Failed to disconnect OAuth provider');
        }
    }
    // Alias methods for backward compatibility
    async getGmailAuthUrl(userId) {
        return this.generateGmailAuthUrl(userId);
    }
    async getOutlookAuthUrl(userId) {
        return this.generateOutlookAuthUrl(userId);
    }
    async getUserOAuthStatus(userId) {
        try {
            // Check Gmail first
            const gmailConfig = await this.getOAuthConfig(userId, 'gmail');
            if (gmailConfig && gmailConfig.verified) {
                return {
                    provider: 'gmail',
                    email: gmailConfig.email,
                    verified: true,
                    connected: true,
                };
            }
            // Check Outlook
            const outlookConfig = await this.getOAuthConfig(userId, 'outlook');
            if (outlookConfig && outlookConfig.verified) {
                return {
                    provider: 'outlook',
                    email: outlookConfig.email,
                    verified: true,
                    connected: true,
                };
            }
            return {
                provider: null,
                email: null,
                verified: false,
                connected: false,
            };
        }
        catch (error) {
            console.error('Error getting user OAuth status:', error);
            return {
                provider: null,
                email: null,
                verified: false,
                connected: false,
            };
        }
    }
    async sendEmailWithOAuth(req, emailData) {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                return { success: false, error: 'User not authenticated' };
            }
            // Get user's OAuth status
            const status = await this.getUserOAuthStatus(userId);
            if (!status.connected || !status.provider) {
                return { success: false, error: 'No OAuth email provider connected' };
            }
            // Verify email matches if user is logged in
            if (req.user?.email && status.email !== req.user.email) {
                return {
                    success: false,
                    error: 'OAuth email does not match your account email. Please authenticate with the correct email.'
                };
            }
            // Get valid tokens
            const tokens = await this.getValidTokens(userId, status.provider);
            if (!tokens) {
                return { success: false, error: 'Failed to get valid OAuth tokens. Please re-authenticate.' };
            }
            // Send email based on provider
            if (status.provider === 'gmail') {
                const messageId = await this.sendGmailEmail(tokens, emailData);
                return { success: true, messageId, provider: 'gmail' };
            }
            else if (status.provider === 'outlook') {
                const messageId = await this.sendOutlookEmail(tokens, emailData);
                return { success: true, messageId, provider: 'outlook' };
            }
            return { success: false, error: 'Unsupported email provider' };
        }
        catch (error) {
            console.error('Error sending email with OAuth:', error);
            return { success: false, error: `Failed to send email: ${error}` };
        }
    }
    async sendGmailEmail(tokens, emailData) {
        const config = this.getProviderConfig('gmail');
        const oauth2Client = new google_auth_library_1.OAuth2Client(config.clientId, config.clientSecret, config.redirectUri);
        oauth2Client.setCredentials({
            access_token: tokens.accessToken,
            refresh_token: tokens.refreshToken,
        });
        // Use Gmail API
        const gmail = googleapis_1.google.gmail({ version: 'v1', auth: oauth2Client });
        // Construct email
        const emailLines = [
            `To: ${emailData.to}`,
            emailData.cc ? `Cc: ${emailData.cc}` : null,
            emailData.bcc ? `Bcc: ${emailData.bcc}` : null,
            `Subject: ${emailData.subject}`,
            '', // Empty line to separate headers from body (RFC 2822)
            emailData.message,
        ].filter(line => line !== null);
        const email = emailLines.join('\n');
        console.log('📧 Gmail email content before encoding:', email);
        const encodedEmail = Buffer.from(email).toString('base64').replace(/\+/g, '-').replace(/\//g, '_');
        const response = await gmail.users.messages.send({
            userId: 'me',
            requestBody: {
                raw: encodedEmail,
            },
        });
        return response.data.id || 'gmail-message-sent';
    }
    async sendOutlookEmail(tokens, emailData) {
        const graphClient = microsoft_graph_client_1.Client.initWithMiddleware({
            authProvider: new CustomAuthProvider(tokens.accessToken)
        });
        const toRecipients = emailData.to.split(',').map(email => ({
            emailAddress: { address: email.trim() }
        }));
        const ccRecipients = emailData.cc ? emailData.cc.split(',').map(email => ({
            emailAddress: { address: email.trim() }
        })) : [];
        const bccRecipients = emailData.bcc ? emailData.bcc.split(',').map(email => ({
            emailAddress: { address: email.trim() }
        })) : [];
        const mail = {
            subject: emailData.subject,
            body: {
                contentType: 'Text',
                content: emailData.message,
            },
            toRecipients,
            ccRecipients: ccRecipients.length > 0 ? ccRecipients : undefined,
            bccRecipients: bccRecipients.length > 0 ? bccRecipients : undefined,
        };
        const response = await graphClient.api('/me/sendMail').post({
            message: mail,
        });
        return 'outlook-message-sent'; // Outlook doesn't return message ID
    }
    async removeUserOAuthConfig(userId) {
        try {
            // Get current OAuth status to know which provider to disconnect
            const status = await this.getUserOAuthStatus(userId);
            if (status.connected && status.provider) {
                await this.disconnectOAuth(userId, status.provider);
                return true;
            }
            return false;
        }
        catch (error) {
            console.error('Error removing user OAuth config:', error);
            return false;
        }
    }
}
exports.default = new OAuthEmailService();
