"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const deals_1 = require("../services/deals");
const router = (0, express_1.Router)();
// Validation helpers
const validateRequiredFields = (data, fields) => {
    const missing = fields.filter(field => !data[field] || data[field].toString().trim() === '');
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
// Get all deals for tenant (RBAC-aware)
const getAllDeals = async (req, res) => {
    const operation = 'getAllDeals_RBAC';
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
        const deals = await deals_1.dealsService.getDealsForUser(rbacUser, includeDeleted);
        console.log(`✅ [${operation}] Successfully retrieved ${deals.length} deals for user ${rbacUser.email} (${rbacUser.role})`);
        res.json({
            data: deals,
            total: deals.length,
            message: `Retrieved ${deals.length} deals`,
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
// Get deal by ID (RBAC-aware)
const getDealById = async (req, res) => {
    const operation = 'getDealById_RBAC';
    const user = req.user;
    const { id } = req.params;
    console.log(`🔍 [${operation}] Starting RBAC request - User: ${user?.email} (${user?.role}), DealId: ${id}`);
    try {
        if (!user || !user.tenantId) {
            console.log(`❌ [${operation}] Missing user context or tenant ID`);
            res.status(400).json({ error: "User authentication required" });
            return;
        }
        const rbacUser = convertToRBACUser(user);
        console.log(`🔐 [${operation}] Using RBAC - User: ${rbacUser.email} (${rbacUser.role}), DealId: ${id}`);
        const deal = await deals_1.dealsService.getDealByIdForUser(id, rbacUser);
        if (!deal) {
            console.log(`❌ [${operation}] Deal not found or access denied - DealId: ${id}, User: ${rbacUser.email} (${rbacUser.role})`);
            res.status(404).json({ message: "Deal not found or you don't have permission to access it" });
            return;
        }
        console.log(`✅ [${operation}] Successfully retrieved deal - DealId: ${id}, User: ${rbacUser.email} (${rbacUser.role})`);
        res.json({
            data: deal,
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
// Get deals by owner (RBAC-aware)
const getDealsByOwner = async (req, res) => {
    const operation = 'getDealsByOwner_RBAC';
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
        const deals = await deals_1.dealsService.getDealsByOwnerForUser(owner, rbacUser);
        console.log(`✅ [${operation}] Successfully retrieved ${deals.length} deals for owner ${owner}, requested by ${rbacUser.email} (${rbacUser.role})`);
        res.json({
            data: deals,
            total: deals.length,
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
// Get deals by stage (RBAC-aware)
const getDealsByStage = async (req, res) => {
    const operation = 'getDealsByStage_RBAC';
    const user = req.user;
    const { stage } = req.params;
    console.log(`🔍 [${operation}] Starting RBAC request - User: ${user?.email} (${user?.role}), Stage: ${stage}`);
    try {
        if (!user || !user.tenantId) {
            console.log(`❌ [${operation}] Missing user context or tenant ID`);
            res.status(400).json({ error: "User authentication required" });
            return;
        }
        const rbacUser = convertToRBACUser(user);
        console.log(`🔐 [${operation}] Using RBAC - User: ${rbacUser.email} (${rbacUser.role}), Stage: ${stage}`);
        const deals = await deals_1.dealsService.getDealsByStageForUser(stage, rbacUser);
        console.log(`✅ [${operation}] Successfully retrieved ${deals.length} deals for stage ${stage}, User: ${rbacUser.email} (${rbacUser.role})`);
        res.json({
            data: deals,
            total: deals.length,
            rbac: {
                userRole: rbacUser.role,
                targetStage: stage,
                accessGranted: true
            }
        });
    }
    catch (error) {
        console.error(`❌ [${operation}] Error occurred:`, error);
        res.status(500).json({ message: "Internal server error" });
    }
};
// Search deals (RBAC-aware)
const searchDeals = async (req, res) => {
    const operation = 'searchDeals_RBAC';
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
        const deals = await deals_1.dealsService.searchDealsForUser(rbacUser, q);
        console.log(`✅ [${operation}] Successfully found ${deals.length} deals for query "${q}", User: ${rbacUser.email} (${rbacUser.role})`);
        res.json({
            data: deals,
            total: deals.length,
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
// Create new deal
const createDeal = async (req, res) => {
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
        const dealInput = {
            dealOwner: req.body.dealOwner,
            dealName: req.body.dealName,
            leadSource: req.body.leadSource,
            stage: req.body.stage,
            amount: amount,
            phone: req.body.phone,
            email: req.body.email || undefined, // Make email optional
            description: req.body.description,
            notes: req.body.notes || undefined, // Make notes optional
            probability: req.body.probability ? parseFloat(req.body.probability) : undefined,
            closeDate: req.body.closeDate,
            relatedProductIds: req.body.relatedProductIds || [],
            relatedQuoteIds: req.body.relatedQuoteIds || [],
            relatedContactIds: req.body.relatedContactIds || []
        };
        const deal = await deals_1.dealsService.createDeal(dealInput, userId, req.user.email, tenantId);
        console.log('✅ Deal created successfully:', deal.id);
        res.status(201).json({
            message: "Deal created successfully",
            data: deal
        });
    }
    catch (error) {
        console.error('❌ Error creating deal:', error);
        if (error instanceof Error) {
            res.status(400).json({ error: error.message });
        }
        else {
            res.status(500).json({ error: "Internal server error" });
        }
    }
};
// Update deal
const updateDeal = async (req, res) => {
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
        const updateInput = {};
        // Only include fields that are provided in the request
        const updateableFields = [
            'dealOwner', 'dealName', 'leadSource', 'stage', 'amount',
            'phone', 'email', 'description', 'notes', 'probability', 'closeDate', 'visibleTo',
            'relatedProductIds', 'relatedQuoteIds', 'relatedContactIds'
        ];
        console.log('🔍 [updateDeal] Request body:', req.body);
        console.log('🔍 [updateDeal] Updateable fields:', updateableFields);
        updateableFields.forEach(field => {
            if (req.body[field] !== undefined) {
                console.log(`🔍 [updateDeal] Adding field ${field}:`, req.body[field]);
                updateInput[field] = req.body[field];
            }
        });
        console.log('🔍 [updateDeal] Final updateInput:', updateInput);
        const updatedDeal = await deals_1.dealsService.updateDeal(id, updateInput, userId, req.user.email, tenantId);
        if (!updatedDeal) {
            res.status(404).json({ error: "Deal not found or you don't have permission to update it" });
            return;
        }
        res.json({
            message: "Deal updated successfully",
            data: updatedDeal
        });
    }
    catch (error) {
        console.error('❌ Error updating deal:', error);
        if (error instanceof Error) {
            res.status(400).json({ error: error.message });
        }
        else {
            res.status(500).json({ error: "Internal server error" });
        }
    }
};
// Soft delete deal
const deleteDeal = async (req, res) => {
    const { tenantId, userId } = req.user || {};
    const { id } = req.params;
    try {
        if (!tenantId || !userId) {
            res.status(400).json({ error: "User authentication required" });
            return;
        }
        // First check if deal exists and user has access
        const deal = await deals_1.dealsService.getDealById(id, tenantId, userId);
        if (!deal) {
            res.status(404).json({ error: "Deal not found or you don't have permission to delete it" });
            return;
        }
        const success = await deals_1.dealsService.deleteDeal(id, userId, req.user.email, tenantId);
        if (!success) {
            res.status(404).json({ error: "Deal not found or already deleted" });
            return;
        }
        res.json({ message: "Deal deleted successfully" });
    }
    catch (error) {
        console.error('❌ Error deleting deal:', error);
        if (error instanceof Error) {
            res.status(400).json({ error: error.message });
        }
        else {
            res.status(500).json({ error: "Internal server error" });
        }
    }
};
// Restore soft deleted deal
const restoreDeal = async (req, res) => {
    const { tenantId, userId } = req.user || {};
    const { id } = req.params;
    try {
        if (!tenantId || !userId) {
            res.status(400).json({ error: "User authentication required" });
            return;
        }
        const success = await deals_1.dealsService.restoreDeal(id, userId, req.user.email, tenantId);
        if (!success) {
            res.status(404).json({ error: "Deal not found or not deleted" });
            return;
        }
        res.json({ message: "Deal restored successfully" });
    }
    catch (error) {
        console.error('❌ Error restoring deal:', error);
        res.status(500).json({ message: "Internal server error" });
    }
};
// Hard delete deal (permanent)
const hardDeleteDeal = async (req, res) => {
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
        const success = await deals_1.dealsService.hardDeleteDeal(id, tenantId);
        if (!success) {
            res.status(404).json({ error: "Deal not found" });
            return;
        }
        res.json({ message: "Deal permanently deleted" });
    }
    catch (error) {
        console.error('❌ Error hard deleting deal:', error);
        res.status(500).json({ message: "Internal server error" });
    }
};
// Get deals statistics (RBAC-aware)
const getDealsStats = async (req, res) => {
    const operation = 'getDealsStats_RBAC';
    const user = req.user;
    console.log(`🔍 [${operation}] Starting RBAC stats request - User: ${user?.email} (${user?.role})`);
    try {
        if (!user || !user.tenantId) {
            console.log(`❌ [${operation}] Missing user context or tenant ID`);
            res.status(400).json({ error: "User authentication required" });
            return;
        }
        const rbacUser = convertToRBACUser(user);
        console.log(`🔐 [${operation}] Using RBAC - User: ${rbacUser.email} (${rbacUser.role})`);
        const stats = await deals_1.dealsService.getDealsStatsForUser(rbacUser);
        console.log(`✅ [${operation}] Successfully calculated stats for ${stats.total} deals, User: ${rbacUser.email} (${rbacUser.role})`);
        res.json({
            data: stats,
            rbac: {
                userRole: rbacUser.role,
                appliedFilter: `Statistics calculated for ${rbacUser.role} accessible deals`
            }
        });
    }
    catch (error) {
        console.error(`❌ [${operation}] Error occurred:`, error);
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
exports.default = router;
