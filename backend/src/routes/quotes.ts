import { Router, RequestHandler } from 'express';
import { quotesService } from '../services/quotes';

interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
    tenantId: string;
    role: string;
  };
}

const router = Router();

// Get all quotes
const getAllQuotes: RequestHandler = async (req: any, res) => {
  try {
    const { userId, tenantId } = req.user || {};
    
    if (!req.user) {
      res.status(401).json({ success: false, message: 'User not authenticated' });
      return;
    }
    
    const quotes = await quotesService.getAllQuotes(userId, tenantId);
    res.json({
      success: true,
      data: quotes,
      message: 'Quotes retrieved successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Get quote by ID
const getQuoteById: RequestHandler = async (req: any, res) => {
  try {
    const { id } = req.params;
    const { userId, tenantId } = req.user || {};
    
    if (!req.user) {
      res.status(401).json({ success: false, message: 'User not authenticated' });
      return;
    }
    
    const quote = await quotesService.getQuoteById(id, userId, tenantId);
    
    if (!quote) {
      res.status(404).json({
        success: false,
        message: 'Quote not found'
      });
      return;
    }
    
    res.json({
      success: true,
      data: quote,
      message: 'Quote retrieved successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Create new quote
const createQuote: RequestHandler = async (req: any, res) => {
  try {
    const { userId, tenantId } = req.user || {};
    
    if (!req.user) {
      res.status(401).json({ success: false, message: 'User not authenticated' });
      return;
    }
    
    const quoteData = {
      ...req.body,
      createdBy: userId,
      userId,
      tenantId,
      createdAt: new Date().toISOString(),
      updatedBy: userId,
      updatedAt: new Date().toISOString(),
      isDeleted: false
    };
    
    const newQuote = await quotesService.createQuote(quoteData);
    
    res.status(201).json({
      success: true,
      data: newQuote,
      message: 'Quote created successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Update quote
const updateQuote: RequestHandler = async (req: any, res) => {
  try {
    const { id } = req.params;
    const { userId, tenantId } = req.user || {};
    
    if (!req.user) {
      res.status(401).json({ success: false, message: 'User not authenticated' });
      return;
    }
    
    const updateData = {
      ...req.body,
      updatedBy: userId,
      updatedAt: new Date().toISOString()
    };
    
    const updatedQuote = await quotesService.updateQuote(id, updateData, userId, tenantId);
    
    if (!updatedQuote) {
      res.status(404).json({
        success: false,
        message: 'Quote not found'
      });
      return;
    }
    
    res.json({
      success: true,
      data: updatedQuote,
      message: 'Quote updated successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Delete quote
const deleteQuote: RequestHandler = async (req: any, res) => {
  try {
    const { id } = req.params;
    const { userId, tenantId } = req.user || {};
    
    if (!req.user) {
      res.status(401).json({ success: false, message: 'User not authenticated' });
      return;
    }
    
    const deleted = await quotesService.deleteQuote(id, userId, tenantId);
    
    if (!deleted) {
      res.status(404).json({
        success: false,
        message: 'Quote not found'
      });
      return;
    }
    
    res.json({
      success: true,
      message: 'Quote deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Get quotes by customer
const getQuotesByCustomer: RequestHandler = async (req: any, res) => {
  try {
    const { customerId } = req.params;
    const { userId, tenantId } = req.user || {};
    
    if (!req.user) {
      res.status(401).json({ success: false, message: 'User not authenticated' });
      return;
    }
    
    const quotes = await quotesService.getQuotesByCustomer(customerId, userId, tenantId);
    
    res.json({
      success: true,
      data: quotes,
      message: 'Customer quotes retrieved successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Get quotes by status
const getQuotesByStatus: RequestHandler = async (req: any, res) => {
  try {
    const { status } = req.params;
    const { userId, tenantId } = req.user || {};
    
    if (!req.user) {
      res.status(401).json({ success: false, message: 'User not authenticated' });
      return;
    }
    
    const quotes = await quotesService.getQuotesByStatus(status, userId, tenantId);
    
    res.json({
      success: true,
      data: quotes,
      message: `Quotes with status ${status} retrieved successfully`
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Define routes
router.get('/', getAllQuotes);
router.get('/:id', getQuoteById);
router.post('/', createQuote);
router.put('/:id', updateQuote);
router.delete('/:id', deleteQuote);
router.get('/customer/:customerId', getQuotesByCustomer);
router.get('/status/:status', getQuotesByStatus);

export default router; 