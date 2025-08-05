import { Router, RequestHandler } from 'express';
import { contactsService, CreateContactInput, UpdateContactInput } from '../services/contacts';
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
const validateRequiredFields = (body: any, requiredFields: string[]) => {
  const missing = requiredFields.filter(field => !body[field] || body[field].trim() === '');
  return missing.length > 0 ? missing : null;
};

const validateEmail = (email: string) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Get all contacts for tenant
const getAllContacts: RequestHandler = async (req: any, res) => {
  const { tenantId, userId } = req.user || {};
  const includeDeleted = req.query.includeDeleted === 'true';
  
  try {
    if (!tenantId) {
      res.status(400).json({ error: "Tenant ID required" });
      return;
    }

    const contacts = await contactsService.getContactsByTenant(tenantId, userId, includeDeleted);
    
    res.json({ 
      data: contacts,
      total: contacts.length,
      message: `Retrieved ${contacts.length} contacts`
    });
  } catch (error) {
    logError('getAllContacts', error, { tenantId, userId, includeDeleted });
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get contact by ID
const getContactById: RequestHandler = async (req: any, res) => {
  const { tenantId, userId } = req.user || {};
  const { id } = req.params;
  
  try {
    
    if (!tenantId) {
      res.status(400).json({ error: "Tenant ID required" });
      return;
    }

    const contact = await contactsService.getContactById(id, tenantId, userId);
    
    if (!contact) {
      res.status(404).json({ message: "Contact not found" });
      return;
    }

    res.json({ data: contact });
  } catch (error) {
    logError('getContactById', error, { tenantId, userId, contactId: id });
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get contacts by owner
const getContactsByOwner: RequestHandler = async (req: any, res) => {
  const { tenantId, userId } = req.user || {};
  const { owner } = req.params;
  
  try {
    
    if (!tenantId) {
      res.status(400).json({ error: "Tenant ID required" });
      return;
    }

    const contacts = await contactsService.getContactsByOwner(owner, tenantId, userId);
    
    res.json({ 
      data: contacts,
      total: contacts.length 
    });
  } catch (error) {
    logError('getContactsByOwner', error, { tenantId, userId, owner });
    res.status(500).json({ message: "Internal server error" });
  }
};

// Search contacts
const searchContacts: RequestHandler = async (req: any, res) => {
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

    const contacts = await contactsService.searchContacts(tenantId, userId, q);
    
    res.json({ 
      data: contacts,
      total: contacts.length,
      query: q
    });
  } catch (error) {
    logError('searchContacts', error, { tenantId, userId, query: q });
    res.status(500).json({ message: "Internal server error" });
  }
};

// Create new contact
const createContact: RequestHandler = async (req: any, res) => {
  const { tenantId, userId } = req.user || {};
  
  try {
    
    if (!tenantId || !userId) {
      res.status(400).json({ error: "User authentication required" });
      return;
    }

    // Validate required fields
    const requiredFields = ['contactOwner', 'firstName', 'lastName', 'companyName', 'email', 'leadSource'];
    const missingFields = validateRequiredFields(req.body, requiredFields);
    
    if (missingFields) {
      res.status(400).json({ 
        error: "Missing required fields", 
        missingFields 
      });
      return;
    }

    // Validate email format
    if (!validateEmail(req.body.email)) {
      res.status(400).json({ error: "Invalid email format" });
      return;
    }

    // Check if contact with email already exists
    const existingContact = await contactsService.getContactByEmail(req.body.email, tenantId);
    if (existingContact) {
      res.status(409).json({ error: "Contact with this email already exists" });
      return;
    }

    const contactInput: CreateContactInput = {
      contactOwner: req.body.contactOwner,
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      companyName: req.body.companyName,
      email: req.body.email,
      leadSource: req.body.leadSource,
      phone: req.body.phone,
      title: req.body.title,
      department: req.body.department,
      street: req.body.street,
      area: req.body.area,
      city: req.body.city,
      state: req.body.state,
      country: req.body.country,
      zipCode: req.body.zipCode,
      description: req.body.description,
      status: req.body.status,
      notes: req.body.notes,
      relatedProductIds: req.body.relatedProductIds,
      visibleTo: req.body.visibleTo
    };

    const contact = await contactsService.createContact(contactInput, userId, req.user.email, tenantId);

    res.status(201).json({ 
      message: "Contact created successfully", 
      data: contact 
    });
  } catch (error) {
    logError('createContact', error, { tenantId, userId, email: req.body.email });
    res.status(500).json({ message: "Internal server error" });
  }
};

// Update contact
const updateContact: RequestHandler = async (req: any, res) => {
  const { tenantId, userId } = req.user || {};
  const { id } = req.params;
  
  try {
    
    if (!tenantId || !userId) {
      res.status(400).json({ error: "User authentication required" });
      return;
    }

    // Validate email if provided
    if (req.body.email && !validateEmail(req.body.email)) {
      res.status(400).json({ error: "Invalid email format" });
      return;
    }

    // Check if email is being changed and if new email already exists
    if (req.body.email) {
      const existingContact = await contactsService.getContactByEmail(req.body.email, tenantId);
      if (existingContact && existingContact.id !== id) {
        res.status(409).json({ error: "Contact with this email already exists" });
        return;
      }
    }

    // Validate visibleTo array if provided
    if (req.body.visibleTo !== undefined) {
      if (!Array.isArray(req.body.visibleTo)) {
        res.status(400).json({ error: "visibleTo must be an array of user IDs" });
        return;
      }
    }

    const updateInput: UpdateContactInput = {};
    
    // Only include fields that are provided in the request
    const updateableFields = [
      'contactOwner', 'firstName', 'lastName', 'companyName', 'email', 'leadSource',
      'phone', 'title', 'department', 'street', 'area', 'city', 'state',
      'country', 'zipCode', 'description', 'status', 'notes', 'relatedProductIds', 'relatedQuoteIds', 'visibleTo'
    ];

    updateableFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updateInput[field as keyof UpdateContactInput] = req.body[field];
      }
    });

    const updatedContact = await contactsService.updateContact(id, updateInput, userId, req.user.email, tenantId);
    
    if (!updatedContact) {
      res.status(404).json({ error: "Contact not found or access denied" });
      return;
    }

    res.json({ 
      message: "Contact updated successfully", 
      data: updatedContact 
    });
  } catch (error) {
    logError('updateContact', error, { tenantId, userId, contactId: id });
    if (error instanceof Error && error.message === 'visibleTo must be an array of user IDs') {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ message: "Internal server error" });
    }
  }
};

// Soft delete contact
const deleteContact: RequestHandler = async (req: any, res) => {
  const { tenantId, userId } = req.user || {};
  const { id } = req.params;
  
  try {
    
    if (!tenantId || !userId) {
      res.status(400).json({ error: "User authentication required" });
      return;
    }

    const success = await contactsService.deleteContact(id, userId, req.user.email, tenantId);
    
    if (!success) {
      res.status(404).json({ error: "Contact not found or already deleted" });
      return;
    }

    res.json({ message: "Contact deleted successfully" });
  } catch (error) {
    logError('deleteContact', error, { tenantId, userId, contactId: id });
    res.status(500).json({ message: "Internal server error" });
  }
};

// Restore soft deleted contact
const restoreContact: RequestHandler = async (req: any, res) => {
  const { tenantId, userId } = req.user || {};
  const { id } = req.params;
  
  try {
    
    if (!tenantId || !userId) {
      res.status(400).json({ error: "User authentication required" });
      return;
    }

    const success = await contactsService.restoreContact(id, userId, req.user.email, tenantId);
    
    if (!success) {
      res.status(404).json({ error: "Contact not found or not deleted" });
      return;
    }

    res.json({ message: "Contact restored successfully" });
  } catch (error) {
    logError('restoreContact', error, { tenantId, userId, contactId: id });
    res.status(500).json({ message: "Internal server error" });
  }
};

// Hard delete contact (permanent)
const hardDeleteContact: RequestHandler = async (req: any, res) => {
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

    const success = await contactsService.hardDeleteContact(id, tenantId);
    
    if (!success) {
      res.status(404).json({ error: "Contact not found" });
      return;
    }

    res.json({ message: "Contact permanently deleted" });
  } catch (error) {
    logError('hardDeleteContact', error, { tenantId, userId, contactId: id });
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get contacts statistics
const getContactsStats: RequestHandler = async (req: any, res) => {
  const { tenantId, userId } = req.user || {};
  
  try {
    
    if (!tenantId) {
      res.status(400).json({ error: "Tenant ID required" });
      return;
    }

    const stats = await contactsService.getContactsStats(tenantId, userId);
    
    res.json({ data: stats });
  } catch (error) {
    logError('getContactsStats', error, { tenantId, userId });
    res.status(500).json({ message: "Internal server error" });
  }
};

// Routes
router.get('/', getAllContacts);
router.get('/search', searchContacts);
router.get('/stats', getContactsStats);
router.get('/owner/:owner', getContactsByOwner);
router.get('/:id', getContactById);
router.post('/', createContact);
router.put('/:id', updateContact);
router.delete('/:id', deleteContact);
router.patch('/:id/restore', restoreContact);
router.delete('/:id/hard', hardDeleteContact);

export default router;
