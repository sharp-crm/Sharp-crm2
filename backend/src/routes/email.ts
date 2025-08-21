import express, { Request, Response } from 'express';
import { EmailData } from '../services/emailService';
import emailService from '../services/emailService';
import { AuthenticatedRequest } from '../middlewares/authenticate';
import { EmailHistoryModel } from '../models/emailHistory';

const router = express.Router();
const emailHistoryModel = new EmailHistoryModel();

// Route to check email configuration
router.get('/config', async (req: Request, res: Response) => {
  try {
    const config = await emailService.checkConfiguration();
    res.json(config);
  } catch (error) {
    console.error('❌ Error checking email configuration:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check email configuration',
    });
  }
});

// Route to send email
router.post('/send', async (req: Request, res: Response) => {
  try {
    const { to, subject, message }: EmailData = req.body;

    // Validate required fields
    if (!to || !subject || !message) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: to, subject, and message are required',
      });
      return;
    }

    // Use the email service directly
    const result = await emailService.sendEmail(req as AuthenticatedRequest, { to, subject, message });

    if (result.success) {
      res.json({
        success: true,
        messageId: result.messageId,
        message: 'Email sent successfully',
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error || 'Failed to send email',
      });
    }
  } catch (error) {
    console.error('❌ Error sending email:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error while sending email',
    });
  }
});

// Route to test email connection (without sending actual email)
router.post('/test-connection', async (req: Request, res: Response) => {
  try {
    // Test the email service configuration
    const config = await emailService.checkConfiguration();
    
    if (config.configured) {
      res.json({
        success: true,
        message: 'Email service connection test successful',
      });
    } else {
      res.status(400).json({
        success: false,
        error: config.error || 'Connection test failed',
      });
    }
  } catch (error) {
    console.error('❌ Error testing email connection:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to test email connection',
    });
  }
});

// Route to get email history
router.get('/history', async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthenticatedRequest).user.userId;
    if (!userId) {
      res.status(400).json({
        success: false,
        error: 'User ID not found in user context',
      });
      return;
    }

    const { limit = '50', status, startDate, endDate } = req.query;
    
    // Parse query parameters
    const queryLimit = parseInt(limit as string) || 50;
    const queryStatus = status as string;
    const queryStartDate = startDate as string;
    const queryEndDate = endDate as string;
    
    // Query email history using the model
    const result = await emailHistoryModel.queryEmailHistory({
      userId,
      status: queryStatus,
      startDate: queryStartDate,
      endDate: queryEndDate,
      limit: queryLimit,
    });
    
    res.json({
      success: true,
      emails: result.emails,
      nextToken: result.nextToken,
      total: result.emails.length,
      message: 'Email history retrieved successfully',
    });
  } catch (error) {
    console.error('❌ Error getting email history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get email history',
    });
  }
});

// Route to get specific email record
router.get('/history/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as AuthenticatedRequest).user.userId;
    
    if (!userId) {
      res.status(400).json({
        success: false,
        error: 'User ID not found in user context',
      });
      return;
    }

    // Get the specific email record
    const emailRecord = await emailHistoryModel.getEmailRecord(id);
    
    if (!emailRecord) {
      res.status(404).json({
        success: false,
        error: 'Email record not found',
      });
      return;
    }
    
    // Check if user has access to this email record
    if (emailRecord.userId !== userId) {
      res.status(403).json({
        success: false,
        error: 'Access denied to this email record',
      });
      return;
    }
    
    res.json({
      success: true,
      email: emailRecord,
      message: 'Email record retrieved successfully',
    });
  } catch (error) {
    console.error('❌ Error getting email record:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get email record',
    });
  }
});

export default router;
