import { SESClient, SendEmailCommand, SendEmailCommandInput } from '@aws-sdk/client-ses';
import { AuthenticatedRequest } from '../middlewares/authenticate';
import { EmailHistoryModel, EmailRecord } from '../models/emailHistory';
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

class EmailService {
  private sesClient: SESClient;
  private region: string;
  private emailHistoryModel: EmailHistoryModel;

  constructor() {
    this.region = process.env.AWS_REGION || 'us-east-1';
    this.emailHistoryModel = new EmailHistoryModel();
    
    // When running in AWS Lambda, credentials are automatically provided by IAM role
    // When running locally, use environment variables
    const sesConfig: any = {
      region: this.region,
    };
    
    // Only add explicit credentials if running locally (not in Lambda)
    if (!process.env.AWS_LAMBDA_FUNCTION_NAME && process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
      sesConfig.credentials = {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      };
    }
    
    this.sesClient = new SESClient(sesConfig);
  }

  async sendEmail(
    req: AuthenticatedRequest,
    emailData: EmailData
  ): Promise<EmailResponse> {
    let emailId: string | undefined;
    
    try {
      const senderEmail = req.user.email;
      const userId = req.user.userId;
      const tenantId = req.user.tenantId;
      
      // Validate sender email
      if (!senderEmail) {
        throw new Error('Sender email not found in user context');
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
        },
      };

      // Store the email record
      await this.emailHistoryModel.createEmailRecord(emailRecord);

      const params: SendEmailCommandInput = {
        Source: senderEmail,
        Destination: {
          ToAddresses: [emailData.to],
        },
        Message: {
          Subject: {
            Data: emailData.subject,
            Charset: 'UTF-8',
          },
          Body: {
            Text: {
              Data: emailData.message,
              Charset: 'UTF-8',
            },
            Html: {
              Data: this.convertToHtml(emailData.message),
              Charset: 'UTF-8',
            },
          },
        },
        // Add reply-to header for better email handling
        ReplyToAddresses: [senderEmail],
      };

      const command = new SendEmailCommand(params);
      const result = await this.sesClient.send(command);

      console.log(`✅ Email sent successfully. Message ID: ${result.MessageId}`);

      // Update email record with success status and message ID
      await this.emailHistoryModel.updateEmailStatus(
        emailId, 
        'sent', 
        result.MessageId
      );

      return {
        success: true,
        messageId: result.MessageId,
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
      
      // Handle specific AWS SES errors
      if (error instanceof Error) {
        if (error.message.includes('MessageRejected')) {
          return {
            success: false,
            error: 'Email rejected. Please check recipient address and try again.',
          };
        }
        if (error.message.includes('MailFromDomainNotVerified')) {
          return {
            success: false,
            error: 'Sender domain not verified. Please contact administrator.',
          };
        }
        if (error.message.includes('AccountSendingPaused')) {
          return {
            success: false,
            error: 'Email sending is temporarily paused. Please try again later.',
          };
        }
      }

      return {
        success: false,
        error: 'Failed to send email. Please try again later.',
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

  // Method to check SES configuration
  async checkConfiguration(): Promise<{ configured: boolean; region: string; error?: string }> {
    try {
      // In Lambda environment, credentials are provided by IAM role
      if (process.env.AWS_LAMBDA_FUNCTION_NAME) {
        return {
          configured: true,
          region: this.region,
        };
      }
      
      // For local development, check for explicit credentials
      if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
        return {
          configured: false,
          region: this.region,
          error: 'AWS credentials not configured for local development',
        };
      }

      return {
        configured: true,
        region: this.region,
      };
    } catch (error) {
      return {
        configured: false,
        region: this.region,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

export default new EmailService();
