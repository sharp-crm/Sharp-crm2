import express, { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/authenticate';
import oauthEmailService from '../services/oauthService';

const router = express.Router();

// Route to get OAuth authorization URL for Gmail
router.get('/gmail/auth-url', async (req: Request, res: Response) => {
  try {
    console.log('🔍 Gmail auth URL request - User object:', (req as AuthenticatedRequest).user);
    
    const userId = (req as AuthenticatedRequest).user?.userId;
    if (!userId) {
      console.error('❌ User ID not found in request context');
      res.status(400).json({
        success: false,
        error: 'User ID not found in user context',
      });
      return;
    }

    console.log('🔍 Generating Gmail auth URL for userId:', userId);

    try {
      const authUrl = await oauthEmailService.getGmailAuthUrl(userId);
      console.log('✅ Gmail auth URL generated successfully:', authUrl);
      
      res.json({
        success: true,
        authUrl,
        provider: 'gmail',
      });
    } catch (error: any) {
      console.error('❌ Error generating Gmail auth URL:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to generate Gmail authorization URL',
      });
    }
  } catch (error) {
    console.error('❌ Error in Gmail auth URL route:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate Gmail authorization URL',
    });
  }
});

// Route to get OAuth authorization URL for Outlook
router.get('/outlook/auth-url', async (req: Request, res: Response) => {
  try {
    console.log('🔍 Outlook auth URL request - User object:', (req as AuthenticatedRequest).user);
    
    const userId = (req as AuthenticatedRequest).user?.userId;
    if (!userId) {
      console.error('❌ User ID not found in request context');
      res.status(400).json({
        success: false,
        error: 'User ID not found in user context',
      });
      return;
    }

    console.log('🔍 Generating Outlook auth URL for userId:', userId);

    try {
      const authUrl = await oauthEmailService.getOutlookAuthUrl(userId);
      console.log('✅ Outlook auth URL generated successfully:', authUrl);
      
      res.json({
        success: true,
        authUrl,
        provider: 'outlook',
      });
    } catch (error: any) {
      console.error('❌ Error generating Outlook auth URL:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to generate Outlook authorization URL',
      });
    }
  } catch (error) {
    console.error('❌ Error in Outlook auth URL route:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate Outlook authorization URL',
    });
  }
});

// Route to handle OAuth callback for Gmail (GET request from OAuth provider)
router.get('/callback/gmail', async (req: Request, res: Response) => {
  const { code, state } = req.query; // GET params from OAuth redirect
  
  if (!code || !state || typeof code !== 'string' || typeof state !== 'string') {
    res.status(400).json({
      success: false,
      error: 'Missing authorization code or state parameter',
    });
    return;
  }

  try {
    const oauthConfig = await oauthEmailService.exchangeGmailCode(code, state);
    
    if (!oauthConfig) {
      res.status(400).json({
        success: false,
        error: 'Failed to exchange authorization code for tokens',
      });
      return;
    }

    res.json({
      success: true,
      message: 'Gmail OAuth authentication successful',
      email: oauthConfig.email,
      provider: oauthConfig.provider,
      verified: oauthConfig.verified,
    });
  } catch (error) {
    console.error('❌ Error in Gmail OAuth callback:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process Gmail OAuth callback',
    });
  }
});

// Route to handle OAuth callback for Gmail (POST request from frontend)
router.post('/gmail/callback', async (req: Request, res: Response) => {
  try {
    const { code, state } = req.body;
    
    if (!code || !state) {
      res.status(400).json({
        success: false,
        error: 'Missing authorization code or state parameter',
      });
      return;
    }

    const oauthConfig = await oauthEmailService.exchangeGmailCode(code, state);
    
    if (!oauthConfig) {
      res.status(400).json({
        success: false,
        error: 'Failed to exchange authorization code for tokens',
      });
      return;
    }

    res.json({
      success: true,
      message: 'Gmail OAuth authentication successful',
      email: oauthConfig.email,
      provider: oauthConfig.provider,
      verified: oauthConfig.verified,
    });
  } catch (error) {
    console.error('❌ Error in Gmail OAuth callback:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process Gmail OAuth callback',
    });
  }
});

// Route to handle OAuth callback for Outlook (GET request from OAuth provider)
router.get('/callback/outlook', async (req: Request, res: Response) => {
  const { code, state } = req.query; // GET params from OAuth redirect
  
  if (!code || !state || typeof code !== 'string' || typeof state !== 'string') {
    res.status(400).json({
      success: false,
      error: 'Missing authorization code or state parameter',
    });
    return;
  }

  try {
    const oauthConfig = await oauthEmailService.exchangeOutlookCode(code, state);
    
    if (!oauthConfig) {
      res.status(400).json({
        success: false,
        error: 'Failed to exchange authorization code for tokens',
      });
      return;
    }

    res.json({
      success: true,
      message: 'Outlook OAuth authentication successful',
      email: oauthConfig.email,
      provider: oauthConfig.provider,
      verified: oauthConfig.verified,
    });
  } catch (error) {
    console.error('❌ Error in Outlook OAuth callback:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process Outlook OAuth callback',
    });
  }
});

// Route to handle OAuth callback for Outlook (POST request from frontend)
router.post('/outlook/callback', async (req: Request, res: Response) => {
  try {
    const { code, state } = req.body;
    
    if (!code || !state) {
      res.status(400).json({
        success: false,
        error: 'Missing authorization code or state parameter',
      });
      return;
    }

    const oauthConfig = await oauthEmailService.exchangeOutlookCode(code, state);
    
    if (!oauthConfig) {
      res.status(400).json({
        success: false,
        error: 'Failed to exchange authorization code for tokens',
      });
      return;
    }

    res.json({
      success: true,
      message: 'Outlook OAuth authentication successful',
      email: oauthConfig.email,
      provider: oauthConfig.provider,
      verified: oauthConfig.verified,
    });
  } catch (error) {
    console.error('❌ Error in Outlook OAuth callback:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process Outlook OAuth callback',
    });
  }
});

// Route to get user's OAuth status
router.get('/status', async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthenticatedRequest).user.userId;
    if (!userId) {
      res.status(400).json({
        success: false,
        error: 'User ID not found in user context',
      });
      return;
    }

    const status = await oauthEmailService.getUserOAuthStatus(userId);
    res.json({
      success: true,
      ...status,
    });
  } catch (error) {
    console.error('❌ Error getting OAuth status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get OAuth status',
    });
  }
});

// Route to send email using OAuth
router.post('/send-email', async (req: Request, res: Response) => {
  try {
    console.log('📧 OAuth send-email request body:', req.body);
    console.log('📧 OAuth send-email user:', (req as AuthenticatedRequest).user);
    
    const { to, subject, message, cc, bcc } = req.body;

    // Validate required fields
    if (!to || !subject || !message) {
      console.error('❌ Missing required fields - to:', to, 'subject:', subject, 'message:', message);
      res.status(400).json({
        success: false,
        error: 'Missing required fields: to, subject, and message are required',
      });
      return;
    }

    const emailData = {
      to,
      subject,
      message,
      cc,
      bcc,
    };

    // Use the OAuth email service directly
    const result = await oauthEmailService.sendEmailWithOAuth(req as AuthenticatedRequest, emailData);

    if (result.success) {
      res.json({
        success: true,
        messageId: result.messageId,
        message: 'Email sent successfully using OAuth',
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error || 'Failed to send email',
      });
    }
  } catch (error) {
    console.error('❌ Error sending OAuth email:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error while sending email',
    });
  }
});

// Route to remove OAuth configuration
router.delete('/disconnect', async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthenticatedRequest).user.userId;
    if (!userId) {
      res.status(400).json({
        success: false,
        error: 'User ID not found in user context',
      });
      return;
    }

    const removed = await oauthEmailService.removeUserOAuthConfig(userId);
    
    if (removed) {
      res.json({
        success: true,
        message: 'OAuth email configuration removed successfully',
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to remove OAuth configuration',
      });
    }
  } catch (error) {
    console.error('❌ Error removing OAuth configuration:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to remove OAuth configuration',
    });
  }
});

export default router;
