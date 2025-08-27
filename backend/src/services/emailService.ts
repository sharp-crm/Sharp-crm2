import { SecretsManagerClient, GetSecretValueCommand, CreateSecretCommand, UpdateSecretCommand } from '@aws-sdk/client-secrets-manager';
import { AuthenticatedRequest } from '../middlewares/authenticate';
import { EmailHistoryModel, EmailRecord } from '../models/emailHistory';
import nodemailer, { Transporter, SendMailOptions } from 'nodemailer';
import { v4 as uuidv4 } from 'uuid';

export interface EmailData {
  to: string;
  subject: string;
  message: string;
}

export interface EmailResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface SMTPConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  tls?: {
    rejectUnauthorized: boolean;
  };
}

export interface UserEmailConfig {
  userId: string;
  email: string;
  smtpConfig: SMTPConfig;
  verified: boolean;
  verifiedAt?: string;
}

class EmailService {
  private secretsManagerClient: SecretsManagerClient;
  private emailHistoryModel: EmailHistoryModel;
  private region: string;

  constructor() {
    this.region = process.env.AWS_REGION || 'us-east-1';
    this.emailHistoryModel = new EmailHistoryModel();
    
    // Initialize Secrets Manager client
    const secretsConfig: any = {
      region: this.region,
    };
    
    // Only add explicit credentials if running locally (not in Lambda)
    if (!process.env.AWS_LAMBDA_FUNCTION_NAME && process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
      secretsConfig.credentials = {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      };
    }
    
    this.secretsManagerClient = new SecretsManagerClient(secretsConfig);
  }

  /**
   * Store user's email configuration in AWS Secrets Manager
   */
  async storeUserEmailConfig(userId: string, email: string, smtpConfig: SMTPConfig): Promise<boolean> {
    try {
      const secretName = `user-email-config/${userId}`;
      const secretValue: UserEmailConfig = {
        userId,
        email,
        smtpConfig,
        verified: false,
      };

      try {
        // Try to create new secret
        await this.secretsManagerClient.send(new CreateSecretCommand({
          Name: secretName,
          SecretString: JSON.stringify(secretValue),
          Description: `SMTP configuration for user ${userId} (${email})`,
        }));
      } catch (error: any) {
        // If secret already exists, update it
        if (error.name === 'ResourceExistsException') {
          await this.secretsManagerClient.send(new UpdateSecretCommand({
            SecretId: secretName,
            SecretString: JSON.stringify(secretValue),
          }));
        } else {
          throw error;
        }
      }

      console.log(`✅ User email config stored for ${userId}`);
      return true;
    } catch (error) {
      console.error('❌ Failed to store user email config:', error);
      return false;
    }
  }

  /**
   * Retrieve user's email configuration from AWS Secrets Manager
   */
  async getUserEmailConfig(userId: string): Promise<UserEmailConfig | null> {
    try {
      const secretName = `user-email-config/${userId}`;
      const response = await this.secretsManagerClient.send(new GetSecretValueCommand({
        SecretId: secretName,
      }));

      if (response.SecretString) {
        const config: UserEmailConfig = JSON.parse(response.SecretString);
        return config;
      }
      return null;
    } catch (error: any) {
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
  async verifyUserEmailConfig(userId: string, email: string, smtpConfig: SMTPConfig): Promise<boolean> {
    try {
      // Create transporter
      const transporter = nodemailer.createTransport(smtpConfig);
      
      // Verify connection
      await transporter.verify();
      
      // Send test email to user's own email
      const testMailOptions: SendMailOptions = {
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
        const verifiedConfig: UserEmailConfig = {
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
          const updatedConfig: UserEmailConfig = {
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
    } catch (error) {
      console.error('❌ Failed to verify email configuration:', error);
      return false;
    }
  }

  /**
   * Send email using NodeMailer SMTP
   */
  async sendEmail(
    req: AuthenticatedRequest,
    emailData: EmailData
  ): Promise<EmailResponse> {
    let emailId: string | undefined;
    
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
      emailId = uuidv4();

      // Create initial email record with pending status
      const emailRecord: EmailRecord = {
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
      const transporter = nodemailer.createTransport(userConfig.smtpConfig);
      
      // Send email
      const mailOptions: SendMailOptions = {
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
      await this.emailHistoryModel.updateEmailStatus(
        emailId, 
        'sent', 
        result.messageId
      );

      return {
        success: true,
        messageId: result.messageId,
      };
    } catch (error) {
      console.error('❌ Failed to send email:', error);
      
      // Update email record with failed status if we have an emailId
      if (emailId) {
        try {
          await this.emailHistoryModel.updateEmailStatus(
            emailId, 
            'failed', 
            undefined, 
            error instanceof Error ? error.message : 'Unknown error'
          );
        } catch (updateError) {
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
  async testSMTPConnection(smtpConfig: SMTPConfig): Promise<boolean> {
    try {
      const transporter = nodemailer.createTransport(smtpConfig);
      await transporter.verify();
      return true;
    } catch (error) {
      console.error('❌ SMTP connection test failed:', error);
      return false;
    }
  }

  /**
   * Get user's email configuration status
   */
  async getUserEmailStatus(userId: string): Promise<{
    configured: boolean;
    verified: boolean;
    email?: string;
    error?: string;
  }> {
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
    } catch (error) {
      return {
        configured: false,
        verified: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private convertToHtml(text: string): string {
    // Convert plain text to basic HTML
    return text
      .split('\n')
      .map(line => `<p>${line || '&nbsp;'}</p>`)
      .join('');
  }

  // Method to check service configuration (for backward compatibility)
  async checkConfiguration(): Promise<{ configured: boolean; service: string; error?: string }> {
    try {
      // Check if we can access Secrets Manager
      await this.secretsManagerClient.send(new GetSecretValueCommand({
        SecretId: 'test-secret',
      }));
      
      return {
        configured: true,
        service: 'NodeMailer SMTP',
      };
    } catch (error: any) {
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

export default new EmailService();
