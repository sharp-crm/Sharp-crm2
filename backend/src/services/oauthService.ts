import { OAuth2Client } from 'google-auth-library';
import { google } from 'googleapis';
import { Client } from '@microsoft/microsoft-graph-client';
import { AuthenticationProvider } from '@microsoft/microsoft-graph-client';
import { SecretsManagerClient, GetSecretValueCommand, PutSecretValueCommand, CreateSecretCommand } from '@aws-sdk/client-secrets-manager';
import { DynamoDBClient, PutItemCommand, GetItemCommand, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';

interface OAuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  email: string;
  provider: 'gmail' | 'outlook';
  userId: string;
}

interface OAuthConfig {
  email: string;
  provider: 'gmail' | 'outlook';
  verified: boolean;
  secretArn: string;
  createdAt: string;
  updatedAt: string;
}

interface StateData {
  provider: 'gmail' | 'outlook';
  userId: string;
  timestamp: number;
}

class CustomAuthProvider implements AuthenticationProvider {
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  async getAccessToken(): Promise<string> {
    return this.accessToken;
  }
}

class OAuthEmailService {
  private secretsClient: SecretsManagerClient;
  private dynamoClient: DynamoDBClient;

  constructor() {
    this.secretsClient = new SecretsManagerClient({ region: process.env.AWS_REGION || 'us-east-1' });
    this.dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
  }

  private getProviderConfig(provider: 'gmail' | 'outlook'): {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
  } {
    const baseRedirectUri = process.env.FRONTEND_URL || 'https://d9xj0evv3ouwa.cloudfront.net';
    
    if (provider === 'gmail') {
      return {
        clientId: process.env.GMAIL_CLIENT_ID || '',
        clientSecret: process.env.GMAIL_CLIENT_SECRET || '',
        redirectUri: baseRedirectUri,
      };
    } else {
      return {
        clientId: process.env.OUTLOOK_CLIENT_ID || '',
        clientSecret: process.env.OUTLOOK_CLIENT_SECRET || '',
        redirectUri: baseRedirectUri,
      };
    }
  }

  private encodeState(provider: 'gmail' | 'outlook', userId: string): string {
    const stateData: StateData = {
      provider,
      userId,
      timestamp: Date.now()
    };
    return Buffer.from(JSON.stringify(stateData)).toString('base64');
  }

  private decodeState(encodedState: string): StateData | null {
    try {
      const decoded = Buffer.from(encodedState, 'base64').toString('utf-8');
      const stateData = JSON.parse(decoded) as StateData;
      
      // Validate state is not too old (30 minutes)
      const thirtyMinutes = 30 * 60 * 1000;
      if (Date.now() - stateData.timestamp > thirtyMinutes) {
        console.log('OAuth state expired');
        return null;
      }
      
      return stateData;
    } catch (error) {
      console.error('Failed to decode OAuth state:', error);
      return null;
    }
  }

  async generateGmailAuthUrl(userId: string): Promise<string> {
    const config = this.getProviderConfig('gmail');
    
    if (!config.clientId || !config.clientSecret) {
      throw new Error('Gmail OAuth credentials not configured');
    }

    const oauth2Client = new OAuth2Client(
      config.clientId,
      config.clientSecret,
      config.redirectUri
    );

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

  async generateOutlookAuthUrl(userId: string): Promise<string> {
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

  async exchangeGmailCode(code: string, state: string): Promise<OAuthConfig> {
    const stateData = this.decodeState(state);
    if (!stateData || stateData.provider !== 'gmail') {
      throw new Error('Invalid or expired OAuth state');
    }

    const config = this.getProviderConfig('gmail');
    const oauth2Client = new OAuth2Client(
      config.clientId,
      config.clientSecret,
      config.redirectUri
    );

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
      const email = (userInfo.data as any).email;

      if (!email) {
        throw new Error('Could not retrieve user email');
      }

      // Store tokens in Secrets Manager
      const oauthTokens: OAuthTokens = {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token || '',
        expiresAt: tokens.expiry_date || Date.now() + 3600000,
        email,
        provider: 'gmail',
        userId: stateData.userId,
      };

      const secretArn = await this.storeTokensInSecretsManager(stateData.userId, oauthTokens);

      // Store OAuth config in DynamoDB
      const oauthConfig: OAuthConfig = {
        email,
        provider: 'gmail',
        verified: true,
        secretArn,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await this.storeOAuthConfig(stateData.userId, oauthConfig);

      return oauthConfig;
    } catch (error) {
      console.error('Error exchanging Gmail code:', error);
      throw new Error(`Failed to exchange Gmail authorization code: ${error}`);
    }
  }

  async exchangeOutlookCode(code: string, state: string): Promise<OAuthConfig> {
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
      const graphClient = Client.initWithMiddleware({
        authProvider: new CustomAuthProvider(tokens.access_token)
      });

      const user = await graphClient.api('/me').get();
      const email = user.mail || user.userPrincipalName;

      if (!email) {
        throw new Error('Could not retrieve user email');
      }

      // Store tokens in Secrets Manager
      const oauthTokens: OAuthTokens = {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token || '',
        expiresAt: Date.now() + (tokens.expires_in * 1000),
        email,
        provider: 'outlook',
        userId: stateData.userId,
      };

      const secretArn = await this.storeTokensInSecretsManager(stateData.userId, oauthTokens);

      // Store OAuth config in DynamoDB
      const oauthConfig: OAuthConfig = {
        email,
        provider: 'outlook',
        verified: true,
        secretArn,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await this.storeOAuthConfig(stateData.userId, oauthConfig);

      return oauthConfig;
    } catch (error) {
      console.error('Error exchanging Outlook code:', error);
      throw new Error(`Failed to exchange Outlook authorization code: ${error}`);
    }
  }

  private async storeTokensInSecretsManager(userId: string, tokens: OAuthTokens): Promise<string> {
    const secretName = `sharp-crm/oauth/${userId}/${tokens.provider}`;
    
    try {
      // Try to update existing secret
      await this.secretsClient.send(new PutSecretValueCommand({
        SecretId: secretName,
        SecretString: JSON.stringify(tokens),
      }));

      return `arn:aws:secretsmanager:${process.env.AWS_REGION || 'us-east-1'}:${process.env.AWS_ACCOUNT_ID}:secret:${secretName}`;
    } catch (error: any) {
      // If secret doesn't exist, create it
      if (error.name === 'ResourceNotFoundException') {
        try {
          await this.secretsClient.send(new CreateSecretCommand({
            Name: secretName,
            SecretString: JSON.stringify(tokens),
            Description: `OAuth tokens for ${tokens.provider} - User: ${userId}`,
          }));

          return `arn:aws:secretsmanager:${process.env.AWS_REGION || 'us-east-1'}:${process.env.AWS_ACCOUNT_ID}:secret:${secretName}`;
        } catch (createError) {
          console.error('Error creating secret in Secrets Manager:', createError);
          throw new Error('Failed to create OAuth secret');
        }
      }
      
      console.error('Error storing tokens in Secrets Manager:', error);
      throw new Error('Failed to store OAuth tokens securely');
    }
  }

  private async storeOAuthConfig(userId: string, config: OAuthConfig): Promise<void> {
    const tableName = process.env.OAUTH_TABLE_NAME || `${process.env.DYNAMODB_TABLE_NAME}-OAuth` || 'sharp-crm-production-OAuth';
    
    try {
      await this.dynamoClient.send(new PutItemCommand({
        TableName: tableName,
        Item: marshall({
          userId: userId,
          ...config,
        }),
      }));
    } catch (error) {
      console.error('Error storing OAuth config in DynamoDB:', error);
      throw new Error('Failed to store OAuth configuration');
    }
  }

  async getOAuthConfig(userId: string, provider?: 'gmail' | 'outlook'): Promise<OAuthConfig | null> {
    const tableName = process.env.OAUTH_TABLE_NAME || `${process.env.DYNAMODB_TABLE_NAME}-OAuth` || 'sharp-crm-production-OAuth';
    
    try {
      if (provider) {
        const response = await this.dynamoClient.send(new GetItemCommand({
          TableName: tableName,
          Key: marshall({
            userId: userId,
            provider: provider,
          }),
        }));

        if (response.Item) {
          const item = unmarshall(response.Item);
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
    } catch (error) {
      console.error('Error getting OAuth config:', error);
      return null;
    }
  }

  async getTokensFromSecretsManager(userId: string, provider: 'gmail' | 'outlook'): Promise<OAuthTokens | null> {
    const secretName = `sharp-crm/oauth/${userId}/${provider}`;
    
    try {
      const response = await this.secretsClient.send(new GetSecretValueCommand({
        SecretId: secretName,
      }));

      if (response.SecretString) {
        return JSON.parse(response.SecretString) as OAuthTokens;
      }

      return null;
    } catch (error) {
      console.error('Error retrieving tokens from Secrets Manager:', error);
      return null;
    }
  }

  async refreshGmailTokens(tokens: OAuthTokens): Promise<OAuthTokens> {
    const config = this.getProviderConfig('gmail');
    const oauth2Client = new OAuth2Client(
      config.clientId,
      config.clientSecret,
      config.redirectUri
    );

    oauth2Client.setCredentials({
      refresh_token: tokens.refreshToken,
    });

    try {
      const { credentials } = await oauth2Client.refreshAccessToken();
      
      const updatedTokens: OAuthTokens = {
        ...tokens,
        accessToken: credentials.access_token || tokens.accessToken,
        expiresAt: credentials.expiry_date || Date.now() + 3600000,
      };

      await this.storeTokensInSecretsManager(tokens.userId, updatedTokens);

      return updatedTokens;
    } catch (error) {
      console.error('Error refreshing Gmail tokens:', error);
      throw new Error('Failed to refresh Gmail access token');
    }
  }

  async refreshOutlookTokens(tokens: OAuthTokens): Promise<OAuthTokens> {
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

      const updatedTokens: OAuthTokens = {
        ...tokens,
        accessToken: newTokens.access_token,
        refreshToken: newTokens.refresh_token || tokens.refreshToken,
        expiresAt: Date.now() + (newTokens.expires_in * 1000),
      };

      await this.storeTokensInSecretsManager(tokens.userId, updatedTokens);

      return updatedTokens;
    } catch (error) {
      console.error('Error refreshing Outlook tokens:', error);
      throw new Error('Failed to refresh Outlook access token');
    }
  }

  async getValidTokens(userId: string, provider: 'gmail' | 'outlook'): Promise<OAuthTokens | null> {
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
        } else {
          tokens = await this.refreshOutlookTokens(tokens);
        }
      }

      return tokens;
    } catch (error) {
      console.error('Error getting valid tokens:', error);
      return null;
    }
  }

  async disconnectOAuth(userId: string, provider: 'gmail' | 'outlook'): Promise<void> {
    const tableName = process.env.OAUTH_TABLE_NAME || `${process.env.DYNAMODB_TABLE_NAME}-OAuth` || 'sharp-crm-production-OAuth';
    
    try {
      await this.dynamoClient.send(new UpdateItemCommand({
        TableName: tableName,
        Key: marshall({
          userId: userId,
          provider: provider,
        }),
        UpdateExpression: 'SET verified = :verified, updatedAt = :updatedAt',
        ExpressionAttributeValues: marshall({
          ':verified': false,
          ':updatedAt': new Date().toISOString(),
        }),
      }));
    } catch (error) {
      console.error('Error disconnecting OAuth:', error);
      throw new Error('Failed to disconnect OAuth provider');
    }
  }

  // Alias methods for backward compatibility
  async getGmailAuthUrl(userId: string): Promise<string> {
    return this.generateGmailAuthUrl(userId);
  }

  async getOutlookAuthUrl(userId: string): Promise<string> {
    return this.generateOutlookAuthUrl(userId);
  }

  async getUserOAuthStatus(userId: string): Promise<{
    provider: 'gmail' | 'outlook' | null;
    email: string | null;
    verified: boolean;
    connected: boolean;
  }> {
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
    } catch (error) {
      console.error('Error getting user OAuth status:', error);
      return {
        provider: null,
        email: null,
        verified: false,
        connected: false,
      };
    }
  }

  async sendEmailWithOAuth(req: any, emailData: {
    to: string;
    cc?: string;
    bcc?: string;
    subject: string;
    message: string;
  }): Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
    provider?: string;
  }> {
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
      } else if (status.provider === 'outlook') {
        const messageId = await this.sendOutlookEmail(tokens, emailData);
        return { success: true, messageId, provider: 'outlook' };
      }

      return { success: false, error: 'Unsupported email provider' };
    } catch (error) {
      console.error('Error sending email with OAuth:', error);
      return { success: false, error: `Failed to send email: ${error}` };
    }
  }

  private async sendGmailEmail(tokens: OAuthTokens, emailData: {
    to: string;
    cc?: string;
    bcc?: string;
    subject: string;
    message: string;
  }): Promise<string> {
    const config = this.getProviderConfig('gmail');
    const oauth2Client = new OAuth2Client(
      config.clientId,
      config.clientSecret,
      config.redirectUri
    );

    oauth2Client.setCredentials({
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
    });

    // Use Gmail API
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

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

  private async sendOutlookEmail(tokens: OAuthTokens, emailData: {
    to: string;
    cc?: string;
    bcc?: string;
    subject: string;
    message: string;
  }): Promise<string> {
    const graphClient = Client.initWithMiddleware({
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

  async removeUserOAuthConfig(userId: string): Promise<boolean> {
    try {
      // Get current OAuth status to know which provider to disconnect
      const status = await this.getUserOAuthStatus(userId);
      if (status.connected && status.provider) {
        await this.disconnectOAuth(userId, status.provider);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error removing user OAuth config:', error);
      return false;
    }
  }
}

export default new OAuthEmailService();
