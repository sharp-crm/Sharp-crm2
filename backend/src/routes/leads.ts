import { Router, RequestHandler } from 'express';
import { leadsService, CreateLeadInput, UpdateLeadInput } from '../services/leads';

interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
    tenantId: string;
    role: string;
  };
}

const router = Router();

// Validation helper functions
function validateRequiredFields(data: any, requiredFields: string[]): string[] | null {
  const missingFields = requiredFields.filter(field => !data[field]);
  return missingFields.length > 0 ? missingFields : null;
}

function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Get all leads for tenant
const getAllLeads: RequestHandler = async (req: any, res) => {
  const operation = 'getAllLeads';
  const { tenantId, userId } = req.user || {};
  
  console.log(`🔍 [${operation}] Starting request - TenantId: ${tenantId}, UserId: ${userId}`);
  
  try {
    const includeDeleted = req.query.includeDeleted === 'true';
    
    if (!tenantId) {
      console.log(`❌ [${operation}] Missing tenant ID`);
      res.status(400).json({ error: "Tenant ID required" });
      return;
    }

    console.log(`📊 [${operation}] Fetching leads - TenantId: ${tenantId}, IncludeDeleted: ${includeDeleted}`);
    const leads = await leadsService.getLeadsByTenant(tenantId, userId, includeDeleted);
    
    console.log(`✅ [${operation}] Successfully retrieved ${leads.length} leads`);
    res.json({ 
      data: leads,
      total: leads.length,
      message: `Retrieved ${leads.length} leads`
    });
  } catch (error) {
    console.error(`❌ [${operation}] Error occurred:`);
    console.error(`   - Error message: ${error instanceof Error ? error.message : 'Unknown error'}`);
    console.error(`   - Error stack: ${error instanceof Error ? error.stack : 'No stack trace'}`);
    if (error && typeof error === 'object' && 'code' in error) {
      console.error(`   - DynamoDB error code: ${(error as any).code}`);
      console.error(`   - DynamoDB error details: ${JSON.stringify(error, null, 2)}`);
    }
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get lead by ID
const getLeadById: RequestHandler = async (req: any, res) => {
  const operation = 'getLeadById';
  const { tenantId, userId } = req.user || {};
  const { id } = req.params;
  
  console.log(`🔍 [${operation}] Starting request - TenantId: ${tenantId}, UserId: ${userId}, LeadId: ${id}`);
  
  try {
    if (!tenantId) {
      console.log(`❌ [${operation}] Missing tenant ID`);
      res.status(400).json({ error: "Tenant ID required" });
      return;
    }

    console.log(`📊 [${operation}] Fetching lead by ID - LeadId: ${id}`);
    const lead = await leadsService.getLeadById(id, tenantId, userId);
    
    if (!lead) {
      console.log(`❌ [${operation}] Lead not found - LeadId: ${id}`);
      res.status(404).json({ message: "Lead not found" });
      return;
    }

    console.log(`✅ [${operation}] Successfully retrieved lead - LeadId: ${id}`);
    res.json({ data: lead });
  } catch (error) {
    console.error(`❌ [${operation}] Error occurred:`);
    console.error(`   - Error message: ${error instanceof Error ? error.message : 'Unknown error'}`);
    console.error(`   - Error stack: ${error instanceof Error ? error.stack : 'No stack trace'}`);
    if (error && typeof error === 'object' && 'code' in error) {
      console.error(`   - DynamoDB error code: ${(error as any).code}`);
      console.error(`   - DynamoDB error details: ${JSON.stringify(error, null, 2)}`);
    }
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get leads by owner
const getLeadsByOwner: RequestHandler = async (req: any, res) => {
  try {
    const { tenantId, userId } = req.user;
    const { owner } = req.params;
    
    if (!tenantId) {
      res.status(400).json({ error: "Tenant ID required" });
      return;
    }

    const leads = await leadsService.getLeadsByOwner(owner, tenantId, userId);
    
    res.json({ 
      data: leads,
      total: leads.length 
    });
  } catch (error) {
    console.error('Get leads by owner error:', error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Search leads
const searchLeads: RequestHandler = async (req: any, res) => {
  try {
    const { tenantId, userId } = req.user;
    const { q } = req.query;
    
    if (!tenantId) {
      res.status(400).json({ error: "Tenant ID required" });
      return;
    }

    if (!q || typeof q !== 'string') {
      res.status(400).json({ error: "Search query required" });
      return;
    }

    const leads = await leadsService.searchLeads(tenantId, userId, q);
    
    res.json({ 
      data: leads,
      total: leads.length,
      query: q
    });
  } catch (error) {
    console.error('Search leads error:', error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Create new lead (multiple leads can have the same email/phone)
const createLead: RequestHandler = async (req: any, res) => {
  try {
    const { tenantId, userId } = req.user;
    
    if (!tenantId || !userId) {
      res.status(400).json({ error: "User authentication required" });
      return;
    }

    console.log('🔍 [createLead] Request body:', req.body);
    console.log('🔍 [createLead] relatedProductIds from request:', req.body.relatedProductIds);
    console.log('🔍 [createLead] relatedProductIds type:', typeof req.body.relatedProductIds);
    console.log('🔍 [createLead] relatedProductIds length:', req.body.relatedProductIds?.length);

    // Validate required fields (email is now required, phone is required)
    const requiredFields = ['leadOwner', 'firstName', 'lastName', 'company', 'email', 'phone', 'leadSource', 'leadStatus'];
    const missingFields = validateRequiredFields(req.body, requiredFields);
    
    if (missingFields) {
      res.status(400).json({ 
        error: "Missing required fields", 
        missingFields 
      });
      return;
    }

    // Validate email format if provided
    if (req.body.email && !validateEmail(req.body.email)) {
      res.status(400).json({ error: "Invalid email format" });
      return;
    }

    // Validate phone number is not empty or just whitespace
    if (!req.body.phone || req.body.phone.trim() === '') {
      res.status(400).json({ error: "Phone number is required" });
      return;
    }

    // Validate relatedProductIds array if provided
    if (req.body.relatedProductIds && !Array.isArray(req.body.relatedProductIds)) {
      res.status(400).json({ error: "relatedProductIds must be an array of product IDs" });
      return;
    }

    const leadInput: CreateLeadInput = {
      leadOwner: req.body.leadOwner,
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      company: req.body.company,
      email: req.body.email,
      leadSource: req.body.leadSource,
      leadStatus: req.body.leadStatus,
      phone: req.body.phone,
      title: req.body.title,
      street: req.body.street,
      area: req.body.area,
      city: req.body.city,
      state: req.body.state,
      country: req.body.country,
      zipCode: req.body.zipCode,
      description: req.body.description,
      value: req.body.value,
      notes: req.body.notes,
      relatedProductIds: req.body.relatedProductIds
    };

    console.log('🔍 [createLead] Lead input being sent to service:', leadInput);
    console.log('🔍 [createLead] relatedProductIds in leadInput:', leadInput.relatedProductIds);

    const lead = await leadsService.createLead(leadInput, userId, req.user.email, tenantId);

    console.log('✅ [createLead] Lead created successfully:', lead.id);
    console.log('✅ [createLead] Created lead relatedProductIds:', lead.relatedProductIds);

    res.status(201).json({ 
      message: "Lead created successfully", 
      data: lead 
    });
  } catch (error) {
    console.error('Create lead error:', error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Update lead
const updateLead: RequestHandler = async (req: any, res) => {
  try {
    const { tenantId, userId } = req.user;
    const { id } = req.params;
    
    if (!tenantId || !userId) {
      res.status(400).json({ error: "User authentication required" });
      return;
    }

    // Validate email if provided
    if (req.body.email && !validateEmail(req.body.email)) {
      res.status(400).json({ error: "Invalid email format" });
      return;
    }

    // Validate phone number if provided
    if (req.body.phone && req.body.phone.trim() === '') {
      res.status(400).json({ error: "Phone number cannot be empty" });
      return;
    }

    // Validate relatedProductIds array if provided
    if (req.body.relatedProductIds && !Array.isArray(req.body.relatedProductIds)) {
      res.status(400).json({ error: "relatedProductIds must be an array of product IDs" });
      return;
    }

    const updateInput: UpdateLeadInput = {};
    
    // Only include fields that are provided in the request
    const updateableFields = [
      'leadOwner', 'firstName', 'lastName', 'company', 'email', 'leadSource', 'leadStatus',
      'phone', 'title', 'street', 'area', 'city', 'state', 'country', 'zipCode', 'description', 'value',
      'notes', 'relatedProductIds'
    ];

    console.log('🔍 [updateLead] Request body:', req.body);
    console.log('🔍 [updateLead] Updateable fields:', updateableFields);

    updateableFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updateInput[field as keyof UpdateLeadInput] = req.body[field];
        console.log(`🔍 [updateLead] Adding field ${field}:`, req.body[field]);
      }
    });

    console.log('🔍 [updateLead] Final updateInput:', updateInput);

    const updatedLead = await leadsService.updateLead(id, updateInput, userId, req.user.email, tenantId);
    
    console.log('🔍 [updateLead] Service returned:', updatedLead);
    
    if (!updatedLead) {
      res.status(404).json({ error: "Lead not found" });
      return;
    }

    res.json({ 
      message: "Lead updated successfully", 
      data: updatedLead 
    });
  } catch (error) {
    console.error('Update lead error:', error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Soft delete lead
const deleteLead: RequestHandler = async (req: any, res) => {
  try {
    const { tenantId, userId } = req.user;
    const { id } = req.params;
    
    if (!tenantId || !userId) {
      res.status(400).json({ error: "User authentication required" });
      return;
    }

    const success = await leadsService.deleteLead(id, userId, req.user.email, tenantId);
    
    if (!success) {
      res.status(404).json({ error: "Lead not found or already deleted" });
      return;
    }

    res.json({ message: "Lead deleted successfully" });
  } catch (error) {
    console.error('Delete lead error:', error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Restore soft deleted lead
const restoreLead: RequestHandler = async (req: any, res) => {
  try {
    const { tenantId, userId } = req.user;
    const { id } = req.params;
    
    if (!tenantId || !userId) {
      res.status(400).json({ error: "User authentication required" });
      return;
    }

    const success = await leadsService.restoreLead(id, userId, req.user.email, tenantId);
    
    if (!success) {
      res.status(404).json({ error: "Lead not found or not deleted" });
      return;
    }

    res.json({ message: "Lead restored successfully" });
  } catch (error) {
    console.error('Restore lead error:', error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Hard delete lead (permanent)
const hardDeleteLead: RequestHandler = async (req: any, res) => {
  try {
    const { tenantId, userId, role } = req.user;
    const { id } = req.params;
    
    if (!tenantId || !userId) {
      res.status(400).json({ error: "User authentication required" });
      return;
    }

    // Only admins can perform hard delete
    if (role !== 'admin' && role !== 'superadmin') {
      res.status(403).json({ error: "Insufficient permissions for hard delete" });
      return;
    }

    const success = await leadsService.hardDeleteLead(id, tenantId);
    
    if (!success) {
      res.status(404).json({ error: "Lead not found" });
      return;
    }

    res.json({ message: "Lead permanently deleted" });
  } catch (error) {
    console.error('Hard delete lead error:', error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get leads statistics
const getLeadsStats: RequestHandler = async (req: any, res) => {
  try {
    const { tenantId, userId } = req.user;
    
    if (!tenantId) {
      res.status(400).json({ error: "Tenant ID required" });
      return;
    }

    const stats = await leadsService.getLeadsStats(tenantId, userId);
    res.json({ data: stats });
  } catch (error) {
    console.error('Get leads stats error:', error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Routes
router.get('/', getAllLeads);
router.get('/stats', getLeadsStats);
router.get('/search', searchLeads);
router.get('/owner/:owner', getLeadsByOwner);
router.get('/:id', getLeadById);
router.post('/', createLead);
router.put('/:id', updateLead);
router.delete('/:id', deleteLead);
router.patch('/:id/restore', restoreLead);
router.delete('/:id/hard', hardDeleteLead);

export default router;
