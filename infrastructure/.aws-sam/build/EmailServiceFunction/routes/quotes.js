"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const quotes_1 = require("../services/quotes");
const router = (0, express_1.Router)();
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
// Get all quotes (RBAC-aware)
const getAllQuotes = async (req, res) => {
    const operation = 'getAllQuotes_RBAC';
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
        const quotes = await quotes_1.quotesService.getQuotesForUser(rbacUser, includeDeleted);
        console.log(`✅ [${operation}] Successfully retrieved ${quotes.length} quotes for user ${rbacUser.email} (${rbacUser.role})`);
        res.json({
            success: true,
            data: quotes,
            total: quotes.length,
            message: `Retrieved ${quotes.length} quotes`,
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
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};
// Get quote by ID (RBAC-aware)
const getQuoteById = async (req, res) => {
    const operation = 'getQuoteById_RBAC';
    const user = req.user;
    const { id } = req.params;
    console.log(`🔍 [${operation}] Starting RBAC request - User: ${user?.email} (${user?.role}), QuoteId: ${id}`);
    try {
        if (!user || !user.tenantId) {
            console.log(`❌ [${operation}] Missing user context or tenant ID`);
            res.status(400).json({ error: "User authentication required" });
            return;
        }
        const rbacUser = convertToRBACUser(user);
        console.log(`🔐 [${operation}] Using RBAC - User: ${rbacUser.email} (${rbacUser.role}), QuoteId: ${id}`);
        const quote = await quotes_1.quotesService.getQuoteByIdForUser(id, rbacUser);
        if (!quote) {
            console.log(`❌ [${operation}] Quote not found or access denied - QuoteId: ${id}, User: ${rbacUser.email} (${rbacUser.role})`);
            res.status(404).json({
                success: false,
                message: "Quote not found or you don't have permission to access it"
            });
            return;
        }
        console.log(`✅ [${operation}] Successfully retrieved quote - QuoteId: ${id}, User: ${rbacUser.email} (${rbacUser.role})`);
        res.json({
            success: true,
            data: quote,
            message: 'Quote retrieved successfully',
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
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};
// Create new quote
const createQuote = async (req, res) => {
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
        const newQuote = await quotes_1.quotesService.createQuote(quoteData);
        res.status(201).json({
            success: true,
            data: newQuote,
            message: 'Quote created successfully'
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
// Update quote
const updateQuote = async (req, res) => {
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
        const updatedQuote = await quotes_1.quotesService.updateQuote(id, updateData, userId, tenantId);
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
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
// Delete quote
const deleteQuote = async (req, res) => {
    try {
        const { id } = req.params;
        const { userId, tenantId } = req.user || {};
        if (!req.user) {
            res.status(401).json({ success: false, message: 'User not authenticated' });
            return;
        }
        const deleted = await quotes_1.quotesService.deleteQuote(id, userId, tenantId);
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
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
// Get quotes by status (RBAC-aware)
const getQuotesByStatus = async (req, res) => {
    const operation = 'getQuotesByStatus_RBAC';
    const user = req.user;
    const { status } = req.params;
    console.log(`🔍 [${operation}] Starting RBAC request - User: ${user?.email} (${user?.role}), Status: ${status}`);
    try {
        if (!user || !user.tenantId) {
            console.log(`❌ [${operation}] Missing user context or tenant ID`);
            res.status(400).json({ error: "User authentication required" });
            return;
        }
        const rbacUser = convertToRBACUser(user);
        console.log(`🔐 [${operation}] Using RBAC - User: ${rbacUser.email} (${rbacUser.role}), Status: ${status}`);
        const quotes = await quotes_1.quotesService.getQuotesByStatusForUser(status, rbacUser);
        console.log(`✅ [${operation}] Successfully retrieved ${quotes.length} quotes with status ${status} for user ${rbacUser.email} (${rbacUser.role})`);
        res.json({
            success: true,
            data: quotes,
            total: quotes.length,
            message: `Retrieved ${quotes.length} quotes with status ${status}`,
            rbac: {
                userRole: rbacUser.role,
                targetStatus: status,
                appliedFilter: `Role-based access control applied for ${rbacUser.role}`
            }
        });
    }
    catch (error) {
        console.error(`❌ [${operation}] Error occurred:`);
        console.error(`   - Error message: ${error instanceof Error ? error.message : 'Unknown error'}`);
        console.error(`   - Error stack: ${error instanceof Error ? error.stack : 'No stack trace'}`);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};
// Define routes
router.get('/', getAllQuotes);
router.get('/:id', getQuoteById);
router.post('/', createQuote);
router.put('/:id', updateQuote);
router.delete('/:id', deleteQuote);
router.get('/status/:status', getQuotesByStatus);
exports.default = router;
