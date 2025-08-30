"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const contacts_1 = require("../services/contacts");
const router = (0, express_1.Router)();
// Validation helpers
const validateRequiredFields = (body, requiredFields) => {
    const missing = requiredFields.filter(field => !body[field] || body[field].trim() === '');
    return missing.length > 0 ? missing : null;
};
const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};
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
// Get all contacts for tenant (RBAC-aware)
const getAllContacts = async (req, res) => {
    const operation = 'getAllContacts_RBAC';
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
        const contacts = await contacts_1.contactsService.getContactsForUser(rbacUser, includeDeleted);
        console.log(`✅ [${operation}] Successfully retrieved ${contacts.length} contacts for user ${rbacUser.email} (${rbacUser.role})`);
        res.json({
            data: contacts,
            total: contacts.length,
            message: `Retrieved ${contacts.length} contacts`,
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
        res.status(500).json({ message: "Internal server error" });
    }
};
// Get contact by ID (RBAC-aware)
const getContactById = async (req, res) => {
    const operation = 'getContactById_RBAC';
    const user = req.user;
    const { id } = req.params;
    console.log(`🔍 [${operation}] Starting RBAC request - User: ${user?.email} (${user?.role}), ContactId: ${id}`);
    try {
        if (!user || !user.tenantId) {
            console.log(`❌ [${operation}] Missing user context or tenant ID`);
            res.status(400).json({ error: "User authentication required" });
            return;
        }
        const rbacUser = convertToRBACUser(user);
        console.log(`🔐 [${operation}] Using RBAC - User: ${rbacUser.email} (${rbacUser.role}), ContactId: ${id}`);
        const contact = await contacts_1.contactsService.getContactByIdForUser(id, rbacUser);
        if (!contact) {
            console.log(`❌ [${operation}] Contact not found or access denied - ContactId: ${id}, User: ${rbacUser.email} (${rbacUser.role})`);
            res.status(404).json({ message: "Contact not found or you don't have permission to access it" });
            return;
        }
        console.log(`✅ [${operation}] Successfully retrieved contact - ContactId: ${id}, User: ${rbacUser.email} (${rbacUser.role})`);
        res.json({
            data: contact,
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
        res.status(500).json({ message: "Internal server error" });
    }
};
// Get contacts by owner (RBAC-aware)
const getContactsByOwner = async (req, res) => {
    const operation = 'getContactsByOwner_RBAC';
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
        const contacts = await contacts_1.contactsService.getContactsByOwnerForUser(owner, rbacUser);
        console.log(`✅ [${operation}] Successfully retrieved ${contacts.length} contacts for owner ${owner}, requested by ${rbacUser.email} (${rbacUser.role})`);
        res.json({
            data: contacts,
            total: contacts.length,
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
// Search contacts (RBAC-aware)
const searchContacts = async (req, res) => {
    const operation = 'searchContacts_RBAC';
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
        const contacts = await contacts_1.contactsService.searchContactsForUser(rbacUser, q);
        console.log(`✅ [${operation}] Successfully found ${contacts.length} contacts for query "${q}", User: ${rbacUser.email} (${rbacUser.role})`);
        res.json({
            data: contacts,
            total: contacts.length,
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
// Create new contact
const createContact = async (req, res) => {
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
        const existingContact = await contacts_1.contactsService.getContactByEmail(req.body.email, tenantId);
        if (existingContact) {
            res.status(409).json({ error: "Contact with this email already exists" });
            return;
        }
        const contactInput = {
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
            relatedQuoteIds: req.body.relatedQuoteIds
        };
        const contact = await contacts_1.contactsService.createContact(contactInput, userId, req.user.email, tenantId);
        res.status(201).json({
            message: "Contact created successfully",
            data: contact
        });
    }
    catch (error) {
        console.error('❌ Error creating contact:', error);
        res.status(500).json({ message: "Internal server error" });
    }
};
// Update contact
const updateContact = async (req, res) => {
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
            const existingContact = await contacts_1.contactsService.getContactByEmail(req.body.email, tenantId);
            if (existingContact && existingContact.id !== id) {
                res.status(409).json({ error: "Contact with this email already exists" });
                return;
            }
        }
        const updateInput = {};
        // Only include fields that are provided in the request
        const updateableFields = [
            'contactOwner', 'firstName', 'lastName', 'companyName', 'email', 'leadSource',
            'phone', 'title', 'department', 'street', 'area', 'city', 'state',
            'country', 'zipCode', 'description', 'status', 'notes', 'relatedProductIds', 'relatedQuoteIds'
        ];
        updateableFields.forEach(field => {
            if (req.body[field] !== undefined) {
                updateInput[field] = req.body[field];
            }
        });
        const updatedContact = await contacts_1.contactsService.updateContact(id, updateInput, userId, req.user.email, tenantId);
        if (!updatedContact) {
            res.status(404).json({ error: "Contact not found or access denied" });
            return;
        }
        res.json({
            message: "Contact updated successfully",
            data: updatedContact
        });
    }
    catch (error) {
        console.error('❌ Error updating contact:', error);
        res.status(500).json({ message: "Internal server error" });
    }
};
// Soft delete contact
const deleteContact = async (req, res) => {
    const { tenantId, userId } = req.user || {};
    const { id } = req.params;
    try {
        if (!tenantId || !userId) {
            res.status(400).json({ error: "User authentication required" });
            return;
        }
        const success = await contacts_1.contactsService.deleteContact(id, userId, req.user.email, tenantId);
        if (!success) {
            res.status(404).json({ error: "Contact not found or already deleted" });
            return;
        }
        res.json({ message: "Contact deleted successfully" });
    }
    catch (error) {
        console.error('❌ Error deleting contact:', error);
        res.status(500).json({ message: "Internal server error" });
    }
};
// Restore soft deleted contact
const restoreContact = async (req, res) => {
    const { tenantId, userId } = req.user || {};
    const { id } = req.params;
    try {
        if (!tenantId || !userId) {
            res.status(400).json({ error: "User authentication required" });
            return;
        }
        const success = await contacts_1.contactsService.restoreContact(id, userId, req.user.email, tenantId);
        if (!success) {
            res.status(404).json({ error: "Contact not found or not deleted" });
            return;
        }
        res.json({ message: "Contact restored successfully" });
    }
    catch (error) {
        console.error('❌ Error restoring contact:', error);
        res.status(500).json({ message: "Internal server error" });
    }
};
// Hard delete contact (permanent)
const hardDeleteContact = async (req, res) => {
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
        const success = await contacts_1.contactsService.hardDeleteContact(id, tenantId);
        if (!success) {
            res.status(404).json({ error: "Contact not found" });
            return;
        }
        res.json({ message: "Contact permanently deleted" });
    }
    catch (error) {
        console.error('❌ Error hard deleting contact:', error);
        res.status(500).json({ message: "Internal server error" });
    }
};
// Get contacts statistics
const getContactsStats = async (req, res) => {
    const { tenantId, userId } = req.user || {};
    try {
        if (!tenantId) {
            res.status(400).json({ error: "Tenant ID required" });
            return;
        }
        const stats = await contacts_1.contactsService.getContactsStats(tenantId, userId);
        res.json({ data: stats });
    }
    catch (error) {
        console.error('❌ Error getting contacts stats:', error);
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
exports.default = router;
