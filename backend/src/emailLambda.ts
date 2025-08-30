import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { EmailHistoryModel } from './models/emailHistory';
import emailService from './services/emailService';
import oauthEmailService from './services/oauthService';

export const handler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  console.log('📧 Email Lambda invoked');
  console.log('Event:', JSON.stringify(event, null, 2));

  try {
    // Parse the request body
    const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    
    if (!body) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
        },
        body: JSON.stringify({
          success: false,
          error: 'Request body is required',
        }),
      };
    }

    const { action, ...payload } = body;

    let result: any;
    switch (action) {
      case 'send':
        result = await handleSendEmail(payload);
        break;
      
      case 'sendOAuth':
        result = await handleSendOAuthEmail(payload);
        break;
      
      case 'getHistory':
        result = await handleGetEmailHistory(payload);
        break;
      
      case 'getStatus':
        result = await handleGetEmailStatus(payload);
        break;
      
      case 'getOAuthStatus':
        result = await handleGetOAuthStatus(payload);
        break;
      
      case 'test':
        result = {
          statusCode: 200,
          body: JSON.stringify({
            success: true,
            message: 'Email service connection test successful',
          }),
        };
        break;
      
      default:
        result = {
          statusCode: 400,
          body: JSON.stringify({
            success: false,
            error: `Unknown action: ${action}. Supported actions: send, sendOAuth, getHistory, getStatus, getOAuthStatus, test`,
          }),
        };
    }

    return {
      ...result,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        ...result.headers,
      },
    };
  } catch (error) {
    console.error('❌ Email Lambda error:', error);
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

async function handleSendEmail(payload: any): Promise<APIGatewayProxyResult> {
  try {
    const { userId, tenantId, to, subject, message, userEmail } = payload;

    if (!userId || !tenantId || !to || !subject || !message || !userEmail) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          error: 'Missing required fields: userId, tenantId, to, subject, message, userEmail',
        }),
      };
    }

    // Create mock authenticated request object
    const mockReq = {
      user: {
        userId,
        tenantId,
        email: userEmail,
      },
      ip: '0.0.0.0', // Lambda doesn't have real IP
      get: () => 'Email-Lambda/1.0',
    } as any;

    const result = await emailService.sendEmail(mockReq, { to, subject, message });

    return {
      statusCode: result.success ? 200 : 400,
      body: JSON.stringify(result),
    };
  } catch (error) {
    console.error('❌ Send email error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: 'Failed to send email',
      }),
    };
  }
}

async function handleSendOAuthEmail(payload: any): Promise<APIGatewayProxyResult> {
  try {
    const { userId, tenantId, to, subject, message, userEmail, cc, bcc } = payload;

    if (!userId || !tenantId || !to || !subject || !message || !userEmail) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          error: 'Missing required fields: userId, tenantId, to, subject, message, userEmail',
        }),
      };
    }

    // Create mock authenticated request object
    const mockReq = {
      user: {
        userId,
        tenantId,
        email: userEmail,
      },
      ip: '0.0.0.0', // Lambda doesn't have real IP
      get: () => 'Email-Lambda-OAuth/1.0',
    } as any;

    const emailData = {
      to,
      subject,
      message,
      cc,
      bcc,
    };

    const result = await oauthEmailService.sendEmailWithOAuth(mockReq, emailData);

    return {
      statusCode: result.success ? 200 : 400,
      body: JSON.stringify(result),
    };
  } catch (error) {
    console.error('❌ Send OAuth email error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: 'Failed to send OAuth email',
      }),
    };
  }
}

async function handleGetEmailHistory(payload: any): Promise<APIGatewayProxyResult> {
  try {
    const { userId, limit = 50, status, startDate, endDate } = payload;

    if (!userId) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          error: 'Missing required field: userId',
        }),
      };
    }

    const emailHistoryModel = new EmailHistoryModel();
    const result = await emailHistoryModel.queryEmailHistory({
      userId,
      status,
      startDate,
      endDate,
      limit: parseInt(limit),
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        emails: result.emails,
        nextToken: result.nextToken,
        total: result.emails.length,
      }),
    };
  } catch (error) {
    console.error('❌ Get email history error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: 'Failed to get email history',
      }),
    };
  }
}

async function handleGetEmailStatus(payload: any): Promise<APIGatewayProxyResult> {
  try {
    const { userId } = payload;

    if (!userId) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          error: 'Missing required field: userId',
        }),
      };
    }

    const status = await emailService.getUserEmailStatus(userId);

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        ...status,
      }),
    };
  } catch (error) {
    console.error('❌ Get email status error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: 'Failed to get email status',
      }),
    };
  }
}

async function handleGetOAuthStatus(payload: any): Promise<APIGatewayProxyResult> {
  try {
    const { userId } = payload;

    if (!userId) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          error: 'Missing required field: userId',
        }),
      };
    }

    const status = await oauthEmailService.getUserOAuthStatus(userId);

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        ...status,
      }),
    };
  } catch (error) {
    console.error('❌ Get OAuth status error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: 'Failed to get OAuth status',
      }),
    };
  }
}