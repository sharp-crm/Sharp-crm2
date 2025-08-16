import { SESClient, SendEmailCommand, SendEmailCommandInput } from '@aws-sdk/client-ses';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { EmailHistoryModel, EmailRecord } from './models/emailHistory';
import { v4 as uuidv4 } from 'uuid';

// Initialize SES client
const sesClient = new SESClient({
  region: process.env.AWS_REGION || 'us-east-1',
});

export interface EmailRequest {
  to: string;
  subject: string;
  message: string;
  senderEmail: string; // Passed from main lambda
  userId: string; // User ID for tracking
  tenantId?: string; // Optional tenant ID
  metadata?: {
    ipAddress?: string;
    userAgent?: string;
    campaignId?: string;
    dealId?: string;
    contactId?: string;
  };
}

export interface EmailResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

// Helper function to validate email
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Helper function to convert text to HTML
function convertToHtml(text: string): string {
  return text
    .split('\n')
    .map(line => `<p>${line || '&nbsp;'}</p>`)
    .join('');
}

// Main email sending function
async function sendEmail(emailData: EmailRequest): Promise<EmailResponse> {
  // Initialize email history model
  const emailHistoryModel = new EmailHistoryModel();
  
  // Create email record ID
  const emailRecordId = uuidv4();
  
  try {
    // Validate inputs
    if (!emailData.senderEmail || !isValidEmail(emailData.senderEmail)) {
      throw new Error('Invalid sender email');
    }

    if (!emailData.to || !isValidEmail(emailData.to)) {
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
    const emailRecord: EmailRecord = {
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
      await emailHistoryModel.createEmailRecord(emailRecord);
      console.log(`✅ Email record created with ID: ${emailRecordId}`);
    } catch (dbError) {
      console.error('⚠️ Warning: Failed to store email record:', dbError);
      // Continue with email sending even if history storage fails
    }

    const params: SendEmailCommandInput = {
      Source: emailData.senderEmail,
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
            Data: convertToHtml(emailData.message),
            Charset: 'UTF-8',
          },
        },
      },
      ReplyToAddresses: [emailData.senderEmail],
    };

    const command = new SendEmailCommand(params);
    const result = await sesClient.send(command);

    console.log(`✅ Email sent successfully. Message ID: ${result.MessageId}`);

    // Update email record status to sent
    try {
      await emailHistoryModel.updateEmailStatus(emailRecordId, 'sent', result.MessageId);
      console.log(`✅ Email record status updated to sent: ${emailRecordId}`);
    } catch (dbError) {
      console.error('⚠️ Warning: Failed to update email record status:', dbError);
    }

    return {
      success: true,
      messageId: result.MessageId,
    };
  } catch (error) {
    console.error('❌ Failed to send email:', error);
    
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
      if (error.message.includes('EmailAddressNotVerified')) {
        return {
          success: false,
          error: 'Sender email not verified in SES. Please contact administrator.',
        };
      }
    }

    // Update email record status to failed
    try {
      await emailHistoryModel.updateEmailStatus(emailRecordId, 'failed', undefined, 'Failed to send email. Please try again later.');
      console.log(`✅ Email record status updated to failed: ${emailRecordId}`);
    } catch (dbError) {
      console.error('⚠️ Warning: Failed to update email record status:', dbError);
    }

    return {
      success: false,
      error: 'Failed to send email. Please try again later.',
    };
  }
}

// Lambda handler for email operations
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    // Parse the request
    const body = JSON.parse(event.body || '{}');
    const { action, ...data } = body;

    switch (action) {
      case 'send':
        const result = await sendEmail(data as EmailRequest);
        return {
          statusCode: result.success ? 200 : 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
          },
          body: JSON.stringify(result),
        };

      case 'test':
        // Test connection without sending actual email
        return {
          statusCode: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
          },
          body: JSON.stringify({
            success: true,
            message: 'Email service connection test successful',
          }),
        };

      default:
        return {
          statusCode: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
          body: JSON.stringify({
            success: false,
            error: 'Invalid action. Supported actions: send, test',
          }),
        };
    }
  } catch (error) {
    console.error('❌ Lambda execution error:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: false,
        error: 'Internal server error',
      }),
    };
  }
};
