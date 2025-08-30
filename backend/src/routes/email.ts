import express, { Request, Response } from 'express';
import { EmailData, SMTPConfig } from '../services/emailService';
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

// Route to get user's email configuration status (Legacy SMTP)
// This endpoint is kept for backward compatibility but OAuth is recommended
router.get('/user-config', async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthenticatedRequest).user.userId;
    if (!userId) {
      res.status(400).json({
        success: false,
        error: 'User ID not found in user context',
      });
      return;
    }

    // Always return that SMTP is deprecated
    res.json({
      success: true,
      configured: false,
      verified: false,
      error: 'SMTP configuration is deprecated. Please use OAuth 2.0 authentication instead.',
      recommendedEndpoint: '/oauth/status'
    });
  } catch (error) {
    console.error('❌ Error getting user email config:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user email configuration',
    });
  }
});

// SMTP configuration has been replaced with OAuth2.0
// This endpoint is deprecated - use OAuth endpoints instead
router.post('/configure-smtp', async (req: Request, res: Response) => {
  res.status(410).json({
    success: false,
    error: 'SMTP configuration is deprecated. Please use OAuth 2.0 authentication instead.',
    redirectTo: '/oauth'
  });
});

// Email verification has been replaced with OAuth2.0
// This endpoint is deprecated - OAuth handles verification automatically
router.post('/verify-email', async (req: Request, res: Response) => {
  res.status(410).json({
    success: false,
    error: 'Email verification is deprecated. OAuth 2.0 handles verification automatically.',
    redirectTo: '/oauth'
  });
});

// SMTP testing has been replaced with OAuth2.0
// This endpoint is deprecated - OAuth handles connection testing automatically
router.post('/test-smtp', async (req: Request, res: Response) => {
  res.status(410).json({
    success: false,
    error: 'SMTP testing is deprecated. OAuth 2.0 handles connection testing automatically.',
    redirectTo: '/oauth'
  });
});

// SMTP email sending has been replaced with OAuth2.0
// This endpoint is deprecated - use OAuth endpoints instead
router.post('/send', async (req: Request, res: Response) => {
  res.status(410).json({
    success: false,
    error: 'SMTP email sending is deprecated. Please use OAuth 2.0 email sending instead.',
    redirectTo: '/oauth/send-email'
  });
});

// SMTP connection testing has been replaced with OAuth2.0
// This endpoint is deprecated - OAuth handles connection testing automatically
router.post('/test-connection', async (req: Request, res: Response) => {
  res.status(410).json({
    success: false,
    error: 'SMTP connection testing is deprecated. OAuth 2.0 handles connection testing automatically.',
    redirectTo: '/oauth/status'
  });
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
