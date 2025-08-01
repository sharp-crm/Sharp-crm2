import { Router, RequestHandler } from 'express';
import { dealsService, CreateDealInput, UpdateDealInput } from '../services/deals';
import { logError, logOperationStart, logOperationSuccess, logOperationInfo, logValidationError } from '../utils/routeLogger';

interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
    tenantId: string;
    role: string;
  };
}

const router = Router();

// Validation helpers
const validateRequiredFields = (data: any, fields: string[]): string[] | null => {
  const missing = fields.filter(field => !data[field] || data[field].toString().trim() === '');
  return missing.length > 0 ? missing : null;
};

const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Get all deals for tenant
const getAllDeals: RequestHandler = async (req: any, res) => {
  const operation = 'getAllDeals';
  const { tenantId, userId } = req.user || {};
  
  logOperationStart(operation, { tenantId, userId });
  
  try {
    const includeDeleted = req.query.includeDeleted === 'true';
    
    if (!tenantId) {
      logValidationError(operation, 'Missing tenant ID');
      res.status(400).json({ error: "Tenant ID required" });
      return;
    }

    logOperationInfo(operation, { tenantId, includeDeleted });
    const deals = await dealsService.getDealsByTenant(tenantId, userId, includeDeleted);

    logOperationSuccess(operation, { count: deals.length });
    res.json({ 
      data: deals,
      total: deals.length,
      message: `Retrieved ${deals.length} deals`
    });
  } catch (error) {
    logError(operation, error, { tenantId, userId });
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get deal by ID
const getDealById: RequestHandler = async (req: any, res) => {
  const { tenantId, userId } = req.user || {};
  const { id } = req.params;
  
  try {
    
    if (!tenantId) {
      res.status(400).json({ error: "Tenant ID required" });
      return;
    }
    
    const deal = await dealsService.getDealById(id, tenantId, userId);
    
    if (!deal) {
      res.status(404).json({ message: "Deal not found" });
      return;
    }

    res.json({ data: deal });
  } catch (error) {
    logError('getDealById', error, { tenantId, userId, dealId: id });
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get deals by owner
const getDealsByOwner: RequestHandler = async (req: any, res) => {
  const { tenantId, userId } = req.user || {};
  const { owner } = req.params;
  
  try {
    
    if (!tenantId) {
      res.status(400).json({ error: "Tenant ID required" });
      return;
    }

    const deals = await dealsService.getDealsByOwner(owner, tenantId, userId);
    
    res.json({ 
      data: deals,
      total: deals.length 
    });
  } catch (error) {
    logError('getDealsByOwner', error, { tenantId, userId, owner });
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get deals by stage
const getDealsByStage: RequestHandler = async (req: any, res) => {
  const { tenantId, userId } = req.user || {};
  const { stage } = req.params;
  
  try {
    
    if (!tenantId) {
      res.status(400).json({ error: "Tenant ID required" });
      return;
    }

    const deals = await dealsService.getDealsByStage(stage, tenantId, userId);
    
    res.json({ 
      data: deals,
      total: deals.length 
    });
  } catch (error) {
    logError('getDealsByStage', error, { tenantId, userId, stage });
    res.status(500).json({ message: "Internal server error" });
  }
};

// Search deals
const searchDeals: RequestHandler = async (req: any, res) => {
  const { tenantId, userId } = req.user || {};
  const { q } = req.query;
  
  try {
    
    if (!tenantId) {
      res.status(400).json({ error: "Tenant ID required" });
      return;
    }

    if (!q || typeof q !== 'string') {
      res.status(400).json({ error: "Search query required" });
      return;
    }

    const deals = await dealsService.searchDeals(tenantId, userId, q);
    
    res.json({ 
      data: deals,
      total: deals.length,
      query: q
    });
  } catch (error) {
    logError('searchDeals', error, { tenantId, userId, query: q });
    res.status(500).json({ message: "Internal server error" });
  }
};

// Create new deal
const createDeal: RequestHandler = async (req: any, res) => {
  const { tenantId, userId } = req.user || {};
  
  try {
    
    if (!tenantId || !userId) {
      res.status(400).json({ error: "User authentication required" });
      return;
    }

    // Validate required fields (phone is now required)
    const requiredFields = ['dealOwner', 'dealName', 'leadSource', 'stage', 'amount', 'phone'];
    const missingFields = validateRequiredFields(req.body, requiredFields);
    
    if (missingFields) {
      res.status(400).json({ 
        error: "Missing required fields", 
        missingFields 
      });
      return;
    }

    // Validate amount is a valid number
    const amount = parseFloat(req.body.amount);
    if (isNaN(amount) || amount < 0) {
      res.status(400).json({ error: "Amount must be a valid positive number" });
      return;
    }

    // Validate probability if provided
    if (req.body.probability !== undefined) {
      const probability = parseFloat(req.body.probability);
      if (isNaN(probability) || probability < 0 || probability > 100) {
        res.status(400).json({ error: "Probability must be a number between 0 and 100" });
        return;
      }
    }

    // Validate phone number is not empty or just whitespace
    if (!req.body.phone || req.body.phone.trim() === '') {
      res.status(400).json({ error: "Phone number is required" });
      return;
    }

    // Validate email format if provided
    if (req.body.email && !validateEmail(req.body.email)) {
      res.status(400).json({ error: "Invalid email format" });
      return;
    }

    // Validate visibleTo array if provided
    if (req.body.visibleTo && !Array.isArray(req.body.visibleTo)) {
      res.status(400).json({ error: "visibleTo must be an array of user IDs" });
      return;
    }

    console.log('🔍 Creating deal with body:', req.body);

    const dealInput: CreateDealInput = {
      dealOwner: req.body.dealOwner,
      dealName: req.body.dealName,
      leadSource: req.body.leadSource,
      stage: req.body.stage,
      amount: amount,
      phone: req.body.phone,
      email: req.body.email || undefined, // Make email optional
      description: req.body.description,
      probability: req.body.probability ? parseFloat(req.body.probability) : undefined,
      closeDate: req.body.closeDate,
      visibleTo: req.body.visibleTo || []
    };

    const deal = await dealsService.createDeal(dealInput, userId, req.user.email, tenantId);

    console.log('✅ Deal created successfully:', deal.id);

    res.status(201).json({ 
      message: "Deal created successfully", 
      data: deal 
    });
  } catch (error) {
    logError('createDeal', error, { tenantId, userId, dealName: req.body.dealName });
    if (error instanceof Error) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: "Internal server error" });
    }
  }
};

// Update deal
const updateDeal: RequestHandler = async (req: any, res) => {
  const { tenantId, userId } = req.user || {};
  const { id } = req.params;
  
  try {
    
    if (!tenantId || !userId) {
      res.status(400).json({ error: "User authentication required" });
      return;
    }

    // Validate amount if provided
    if (req.body.amount !== undefined) {
      const amount = Number(req.body.amount);
      if (isNaN(amount) || amount < 0) {
        res.status(400).json({ error: "Amount must be a valid positive number" });
        return;
      }
      req.body.amount = amount;
    }
    
    // Validate probability if provided
    if (req.body.probability !== undefined) {
      const probability = Number(req.body.probability);
      if (isNaN(probability) || probability < 0 || probability > 100) {
        res.status(400).json({ error: "Probability must be a number between 0 and 100" });
        return;
      }
      req.body.probability = probability;
    }

    // Validate phone number if provided
    if (req.body.phone && req.body.phone.trim() === '') {
      res.status(400).json({ error: "Phone number cannot be empty" });
      return;
    }

    // Validate email format if provided
    if (req.body.email && !validateEmail(req.body.email)) {
      res.status(400).json({ error: "Invalid email format" });
      return;
    }

    // Validate visibleTo if provided
    if (req.body.visibleTo !== undefined && !Array.isArray(req.body.visibleTo)) {
      res.status(400).json({ error: "visibleTo must be an array of user IDs" });
      return;
    }

    const updateInput: UpdateDealInput = {};
    
    // Only include fields that are provided in the request
    const updateableFields = [
      'dealOwner', 'dealName', 'leadSource', 'stage', 'amount', 
      'phone', 'email', 'description', 'probability', 'closeDate', 'visibleTo'
    ];

    updateableFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updateInput[field as keyof UpdateDealInput] = req.body[field];
      }
    });

    const updatedDeal = await dealsService.updateDeal(id, updateInput, userId, req.user.email, tenantId);
    
    if (!updatedDeal) {
      res.status(404).json({ error: "Deal not found or you don't have permission to update it" });
      return;
    }

    res.json({ 
      message: "Deal updated successfully", 
      data: updatedDeal 
    });
  } catch (error) {
    logError('updateDeal', error, { tenantId, userId, dealId: id });
    if (error instanceof Error) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: "Internal server error" });
    }
  }
};

// Soft delete deal
const deleteDeal: RequestHandler = async (req: any, res) => {
  const { tenantId, userId } = req.user || {};
  const { id } = req.params;
  
  try {
    
    if (!tenantId || !userId) {
      res.status(400).json({ error: "User authentication required" });
      return;
    }

    // First check if deal exists and user has access
    const deal = await dealsService.getDealById(id, tenantId, userId);
    if (!deal) {
      res.status(404).json({ error: "Deal not found or you don't have permission to delete it" });
      return;
    }

    const success = await dealsService.deleteDeal(id, userId, req.user.email, tenantId);
    
    if (!success) {
      res.status(404).json({ error: "Deal not found or already deleted" });
      return;
    }

    res.json({ message: "Deal deleted successfully" });
  } catch (error) {
    logError('deleteDeal', error, { tenantId, userId, dealId: id });
    if (error instanceof Error) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: "Internal server error" });
    }
  }
};

// Restore soft deleted deal
const restoreDeal: RequestHandler = async (req: any, res) => {
  const { tenantId, userId } = req.user || {};
  const { id } = req.params;
  
  try {
    
    if (!tenantId || !userId) {
      res.status(400).json({ error: "User authentication required" });
      return;
    }

    const success = await dealsService.restoreDeal(id, userId, req.user.email, tenantId);
    
    if (!success) {
      res.status(404).json({ error: "Deal not found or not deleted" });
      return;
    }

    res.json({ message: "Deal restored successfully" });
  } catch (error) {
    logError('restoreDeal', error, { tenantId, userId, dealId: id });
    res.status(500).json({ message: "Internal server error" });
  }
};

// Hard delete deal (permanent)
const hardDeleteDeal: RequestHandler = async (req: any, res) => {
  const { tenantId, userId, role } = req.user || {};
  const { id } = req.params;
  
  try {
    
    if (!tenantId || !userId) {
      res.status(400).json({ error: "User authentication required" });
      return;
    }

    // Only admins can perform hard delete
    if (role !== 'admin' && role !== 'superadmin') {
      res.status(403).json({ error: "Insufficient permissions for hard delete" });
      return;
    }

    const success = await dealsService.hardDeleteDeal(id, tenantId);
    
    if (!success) {
      res.status(404).json({ error: "Deal not found" });
      return;
    }

    res.json({ message: "Deal permanently deleted" });
  } catch (error) {
    logError('hardDeleteDeal', error, { tenantId, userId, dealId: id });
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get deals statistics
const getDealsStats: RequestHandler = async (req: any, res) => {
  const { tenantId, userId } = req.user || {};
  
  try {
    
    if (!tenantId) {
      res.status(400).json({ error: "Tenant ID required" });
      return;
    }

    const stats = await dealsService.getDealsStats(tenantId, userId);
    
    res.json({ data: stats });
  } catch (error) {
    logError('getDealsStats', error, { tenantId, userId });
    res.status(500).json({ message: "Internal server error" });
  }
};

// Routes
router.get('/', getAllDeals);
router.get('/stats', getDealsStats);
router.get('/search', searchDeals);
router.get('/owner/:owner', getDealsByOwner);
router.get('/stage/:stage', getDealsByStage);
router.get('/:id', getDealById);
router.post('/', createDeal);
router.put('/:id', updateDeal);
router.delete('/:id', deleteDeal);
router.post('/:id/restore', restoreDeal);
router.delete('/:id/hard', hardDeleteDeal);

export default router;
