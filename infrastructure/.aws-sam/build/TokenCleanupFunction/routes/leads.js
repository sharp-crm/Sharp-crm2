"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const leads_1 = require("../services/leads");
const router = (0, express_1.Router)();
// Validation helper functions
function validateRequiredFields(data, requiredFields) {
    const missingFields = requiredFields.filter(field => !data[field]);
    return missingFields.length > 0 ? missingFields : null;
}
function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}
// Helper function to convert authenticated request user to RBACUser format
function convertToRBACUser(user) {
    return {
        userId: user.userId,
        email: user.email,
        role: normalizeRole(user.role),
        tenantId: user.tenantId,
        reportingTo: user.reportingTo
    };
}
// Helper function to normalize role string
function normalizeRole(role) {
    const normalized = role.toUpperCase();
    if (normalized === 'ADMIN' || normalized === 'SUPER_ADMIN')
        return 'ADMIN';
    if (normalized === 'SALES_MANAGER' || normalized === 'MANAGER')
        return 'SALES_MANAGER';
    if (normalized === 'SALES_REP' || normalized === 'REP')
        return 'SALES_REP';
    return 'SALES_REP'; // Default to SALES_REP
}
// Get all leads for tenant (RBAC-aware)
const getAllLeads = async (req, res) => {
    const operation = 'getAllLeads_RBAC';
    const user = req.user;
    console.log(`🔍 [${operation}] Starting RBAC request - User: ${user?.email} (${user?.role}), TenantId: ${user?.tenantId}`);
    try {
        const includeDeleted = req.query.includeDeleted === 'true';
        if (!user || !user.tenantId) {
            console.log(`❌ [${operation}] Missing user context or tenant ID`);
            res.status(400).json({ error: "User authentication required" });
            return;
        }
        const rbacUser = convertToRBACUser(user);
        console.log(`🔐 [${operation}] Using RBAC - User: ${rbacUser.email} (${rbacUser.role}), TenantId: ${rbacUser.tenantId}`);
        const leads = await leads_1.leadsService.getLeadsForUser(rbacUser, includeDeleted);
        console.log(`✅ [${operation}] Successfully retrieved ${leads.length} leads for user ${rbacUser.email} (${rbacUser.role})`);
        res.json({
            data: leads,
            total: leads.length,
            message: `Retrieved ${leads.length} leads`,
            rbac: {
                userRole: rbacUser.role,
                appliedFilter: `Role-based access control applied for ${rbacUser.role}`
            }
        });
    }
    catch (error) {
        console.error(`❌ [${operation}] Error occurred:`);
        console.error(`   - Error message: ${error instanceof Error ? error.message : 'Unknown error'}`);
        console.error(`   - Error stack: ${error instanceof Error ? error.stack : 'No stack trace'}`);
        if (error && typeof error === 'object' && 'code' in error) {
            console.error(`   - DynamoDB error code: ${error.code}`);
            console.error(`   - DynamoDB error details: ${JSON.stringify(error, null, 2)}`);
        }
        res.status(500).json({ message: "Internal server error" });
    }
};
// Get lead by ID (RBAC-aware)
const getLeadById = async (req, res) => {
    const operation = 'getLeadById_RBAC';
    const user = req.user;
    const { id } = req.params;
    console.log(`🔍 [${operation}] Starting RBAC request - User: ${user?.email} (${user?.role}), LeadId: ${id}`);
    try {
        if (!user || !user.tenantId) {
            console.log(`❌ [${operation}] Missing user context or tenant ID`);
            res.status(400).json({ error: "User authentication required" });
            return;
        }
        const rbacUser = convertToRBACUser(user);
        console.log(`🔐 [${operation}] Using RBAC - User: ${rbacUser.email} (${rbacUser.role}), LeadId: ${id}`);
        const lead = await leads_1.leadsService.getLeadByIdForUser(id, rbacUser);
        if (!lead) {
            console.log(`❌ [${operation}] Lead not found or access denied - LeadId: ${id}, User: ${rbacUser.email} (${rbacUser.role})`);
            res.status(404).json({ message: "Lead not found or you don't have permission to access it" });
            return;
        }
        console.log(`✅ [${operation}] Successfully retrieved lead - LeadId: ${id}, User: ${rbacUser.email} (${rbacUser.role})`);
        res.json({
            data: lead,
            rbac: {
                userRole: rbacUser.role,
                accessGranted: true
            }
        });
    }
    catch (error) {
        console.error(`❌ [${operation}] Error occurred:`);
        console.error(`   - Error message: ${error instanceof Error ? error.message : 'Unknown error'}`);
        console.error(`   - Error stack: ${error instanceof Error ? error.stack : 'No stack trace'}`);
        if (error && typeof error === 'object' && 'code' in error) {
            console.error(`   - DynamoDB error code: ${error.code}`);
            console.error(`   - DynamoDB error details: ${JSON.stringify(error, null, 2)}`);
        }
        res.status(500).json({ message: "Internal server error" });
    }
};
// Get leads by owner (RBAC-aware)
const getLeadsByOwner = async (req, res) => {
    const operation = 'getLeadsByOwner_RBAC';
    const user = req.user;
    const { owner } = req.params;
    console.log(`🔍 [${operation}] Starting RBAC request - User: ${user?.email} (${user?.role}), TargetOwner: ${owner}`);
    try {
        if (!user || !user.tenantId) {
            console.log(`❌ [${operation}] Missing user context or tenant ID`);
            res.status(400).json({ error: "User authentication required" });
            return;
        }
        const rbacUser = convertToRBACUser(user);
        console.log(`🔐 [${operation}] Using RBAC - User: ${rbacUser.email} (${rbacUser.role}), TargetOwner: ${owner}`);
        const leads = await leads_1.leadsService.getLeadsByOwnerForUser(owner, rbacUser);
        console.log(`✅ [${operation}] Successfully retrieved ${leads.length} leads for owner ${owner}, requested by ${rbacUser.email} (${rbacUser.role})`);
        res.json({
            data: leads,
            total: leads.length,
            rbac: {
                userRole: rbacUser.role,
                targetOwner: owner,
                accessGranted: true
            }
        });
    }
    catch (error) {
        console.error(`❌ [${operation}] Error occurred:`, error);
        res.status(500).json({ message: "Internal server error" });
    }
};
// Search leads (RBAC-aware)
const searchLeads = async (req, res) => {
    const operation = 'searchLeads_RBAC';
    const user = req.user;
    const { q } = req.query;
    console.log(`🔍 [${operation}] Starting RBAC search - User: ${user?.email} (${user?.role}), Query: "${q}"`);
    try {
        if (!user || !user.tenantId) {
            console.log(`❌ [${operation}] Missing user context or tenant ID`);
            res.status(400).json({ error: "User authentication required" });
            return;
        }
        if (!q || typeof q !== 'string') {
            console.log(`❌ [${operation}] Missing or invalid search query`);
            res.status(400).json({ error: "Search query required" });
            return;
        }
        const rbacUser = convertToRBACUser(user);
        console.log(`🔐 [${operation}] Using RBAC - User: ${rbacUser.email} (${rbacUser.role}), Query: "${q}"`);
        const leads = await leads_1.leadsService.searchLeadsForUser(rbacUser, q);
        console.log(`✅ [${operation}] Successfully found ${leads.length} leads for query "${q}", User: ${rbacUser.email} (${rbacUser.role})`);
        res.json({
            data: leads,
            total: leads.length,
            query: q,
            rbac: {
                userRole: rbacUser.role,
                appliedFilter: `Search results filtered for ${rbacUser.role}`
            }
        });
    }
    catch (error) {
        console.error(`❌ [${operation}] Error occurred:`, error);
        res.status(500).json({ message: "Internal server error" });
    }
};
// Create new lead (multiple leads can have the same email/phone)
const createLead = async (req, res) => {
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
        const leadInput = {
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
        const lead = await leads_1.leadsService.createLead(leadInput, userId, req.user.email, tenantId);
        console.log('✅ [createLead] Lead created successfully:', lead.id);
        console.log('✅ [createLead] Created lead relatedProductIds:', lead.relatedProductIds);
        res.status(201).json({
            message: "Lead created successfully",
            data: lead
        });
    }
    catch (error) {
        console.error('Create lead error:', error);
        res.status(500).json({ message: "Internal server error" });
    }
};
// Update lead
const updateLead = async (req, res) => {
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
        const updateInput = {};
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
                updateInput[field] = req.body[field];
                console.log(`🔍 [updateLead] Adding field ${field}:`, req.body[field]);
            }
        });
        console.log('🔍 [updateLead] Final updateInput:', updateInput);
        const updatedLead = await leads_1.leadsService.updateLead(id, updateInput, userId, req.user.email, tenantId);
        console.log('🔍 [updateLead] Service returned:', updatedLead);
        if (!updatedLead) {
            res.status(404).json({ error: "Lead not found" });
            return;
        }
        res.json({
            message: "Lead updated successfully",
            data: updatedLead
        });
    }
    catch (error) {
        console.error('Update lead error:', error);
        res.status(500).json({ message: "Internal server error" });
    }
};
// Soft delete lead
const deleteLead = async (req, res) => {
    try {
        const { tenantId, userId } = req.user;
        const { id } = req.params;
        if (!tenantId || !userId) {
            res.status(400).json({ error: "User authentication required" });
            return;
        }
        const success = await leads_1.leadsService.deleteLead(id, userId, req.user.email, tenantId);
        if (!success) {
            res.status(404).json({ error: "Lead not found or already deleted" });
            return;
        }
        res.json({ message: "Lead deleted successfully" });
    }
    catch (error) {
        console.error('Delete lead error:', error);
        res.status(500).json({ message: "Internal server error" });
    }
};
// Restore soft deleted lead
const restoreLead = async (req, res) => {
    try {
        const { tenantId, userId } = req.user;
        const { id } = req.params;
        if (!tenantId || !userId) {
            res.status(400).json({ error: "User authentication required" });
            return;
        }
        const success = await leads_1.leadsService.restoreLead(id, userId, req.user.email, tenantId);
        if (!success) {
            res.status(404).json({ error: "Lead not found or not deleted" });
            return;
        }
        res.json({ message: "Lead restored successfully" });
    }
    catch (error) {
        console.error('Restore lead error:', error);
        res.status(500).json({ message: "Internal server error" });
    }
};
// Hard delete lead (permanent)
const hardDeleteLead = async (req, res) => {
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
        const success = await leads_1.leadsService.hardDeleteLead(id, tenantId);
        if (!success) {
            res.status(404).json({ error: "Lead not found" });
            return;
        }
        res.json({ message: "Lead permanently deleted" });
    }
    catch (error) {
        console.error('Hard delete lead error:', error);
        res.status(500).json({ message: "Internal server error" });
    }
};
// Get leads statistics
const getLeadsStats = async (req, res) => {
    try {
        const { tenantId, userId } = req.user;
        if (!tenantId) {
            res.status(400).json({ error: "Tenant ID required" });
            return;
        }
        const stats = await leads_1.leadsService.getLeadsStats(tenantId, userId);
        res.json({ data: stats });
    }
    catch (error) {
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
exports.default = router;
