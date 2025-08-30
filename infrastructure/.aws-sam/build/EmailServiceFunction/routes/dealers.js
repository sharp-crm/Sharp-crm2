"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const dealers_1 = require("../services/dealers");
const router = (0, express_1.Router)();
// Get all dealers for the current tenant
const getAllDealers = async (req, res) => {
    try {
        const { tenantId, userId, role } = req.user;
        if (!tenantId) {
            res.status(400).json({ error: "Tenant ID required" });
            return;
        }
        const dealers = await dealers_1.dealersService.getDealersByTenant(tenantId, userId, role);
        res.json({
            data: dealers,
            total: dealers.length
        });
    }
    catch (error) {
        console.error('Get dealers error:', error);
        res.status(500).json({ message: "Internal server error" });
    }
};
// Get dealer by ID
const getDealerById = async (req, res) => {
    try {
        const { tenantId } = req.user;
        const { id } = req.params;
        const dealer = await dealers_1.dealersService.getDealerById(id, tenantId);
        if (!dealer) {
            res.status(404).json({ error: "Dealer not found" });
            return;
        }
        res.json({ data: dealer });
    }
    catch (error) {
        console.error('Get dealer error:', error);
        res.status(500).json({ message: "Internal server error" });
    }
};
// Get all dealers for a tenant
const getDealers = async (req, res) => {
    try {
        const { tenantId, userId, role } = req.user;
        const dealers = await dealers_1.dealersService.getDealersByTenant(tenantId, userId, role);
        res.json({ data: dealers });
    }
    catch (error) {
        console.error('Error fetching dealers:', error);
        res.status(500).json({ error: 'Failed to fetch dealers' });
    }
};
// Create new dealer
const createDealer = async (req, res) => {
    try {
        const { userId, tenantId, role } = req.user;
        // Check if user has permission to create dealer
        if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
            res.status(403).json({ error: "You don't have permission to create dealers" });
            return;
        }
        const dealerData = req.body;
        // Validate required fields
        if (!dealerData.name || !dealerData.email || !dealerData.phone || !dealerData.company) {
            res.status(400).json({ error: "Name, email, phone, and company are required" });
            return;
        }
        const dealer = await dealers_1.dealersService.createDealer(dealerData, userId, tenantId);
        res.status(201).json({ data: dealer });
    }
    catch (error) {
        console.error('Error creating dealer:', error);
        res.status(500).json({ error: 'Failed to create dealer' });
    }
};
// Update dealer
const updateDealer = async (req, res) => {
    try {
        const { userId, tenantId, role } = req.user;
        // Check if user has permission to update dealer
        if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
            res.status(403).json({ error: "You don't have permission to update dealers" });
            return;
        }
        const { id } = req.params;
        const updateData = req.body;
        const updatedDealer = await dealers_1.dealersService.updateDealer(id, updateData, userId, tenantId);
        if (!updatedDealer) {
            res.status(404).json({ error: "Dealer not found" });
            return;
        }
        res.json({ data: updatedDealer });
    }
    catch (error) {
        console.error('Update dealer error:', error);
        res.status(500).json({ message: "Internal server error" });
    }
};
// Delete dealer (soft delete)
const deleteDealer = async (req, res) => {
    try {
        const { userId, tenantId, role } = req.user;
        // Check if user has permission to delete dealer
        if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
            res.status(403).json({ error: "You don't have permission to delete dealers" });
            return;
        }
        const { id } = req.params;
        const success = await dealers_1.dealersService.deleteDealer(id, userId, tenantId);
        if (!success) {
            res.status(404).json({ error: "Dealer not found" });
            return;
        }
        res.json({ message: "Dealer deleted successfully" });
    }
    catch (error) {
        console.error('Delete dealer error:', error);
        res.status(500).json({ message: "Internal server error" });
    }
};
// Restore dealer
const restoreDealer = async (req, res) => {
    try {
        const { userId, tenantId } = req.user;
        const { id } = req.params;
        const success = await dealers_1.dealersService.restoreDealer(id, userId, tenantId);
        if (!success) {
            res.status(404).json({ error: "Dealer not found" });
            return;
        }
        res.json({ message: "Dealer restored successfully" });
    }
    catch (error) {
        console.error('Restore dealer error:', error);
        res.status(500).json({ message: "Internal server error" });
    }
};
// Hard delete dealer (admin only)
const hardDeleteDealer = async (req, res) => {
    try {
        const { tenantId, role } = req.user;
        const { id } = req.params;
        if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
            res.status(403).json({ error: "Admin access required" });
            return;
        }
        const success = await dealers_1.dealersService.hardDeleteDealer(id, tenantId);
        if (!success) {
            res.status(404).json({ error: "Dealer not found" });
            return;
        }
        res.json({ message: "Dealer permanently deleted" });
    }
    catch (error) {
        console.error('Hard delete dealer error:', error);
        res.status(500).json({ message: "Internal server error" });
    }
};
// Search dealers
const searchDealers = async (req, res) => {
    try {
        const { tenantId } = req.user;
        const { q: searchTerm, limit = 50 } = req.query;
        if (!searchTerm) {
            res.status(400).json({ error: "Search term is required" });
            return;
        }
        const dealers = await dealers_1.dealersService.searchDealers(searchTerm, tenantId, parseInt(limit));
        res.json({
            data: dealers,
            total: dealers.length
        });
    }
    catch (error) {
        console.error('Search dealers error:', error);
        res.status(500).json({ message: "Internal server error" });
    }
};
// Get dealers by territory
const getDealersByTerritory = async (req, res) => {
    try {
        const { tenantId } = req.user;
        const { territory } = req.params;
        if (!territory) {
            res.status(400).json({ error: "Territory is required" });
            return;
        }
        const dealers = await dealers_1.dealersService.getDealersByTerritory(territory, tenantId);
        res.json({
            data: dealers,
            total: dealers.length
        });
    }
    catch (error) {
        console.error('Get dealers by territory error:', error);
        res.status(500).json({ message: "Internal server error" });
    }
};
// Get dealers statistics
const getDealersStats = async (req, res) => {
    try {
        const { tenantId } = req.user;
        const stats = await dealers_1.dealersService.getDealersStats(tenantId);
        res.json({ data: stats });
    }
    catch (error) {
        console.error('Get dealers stats error:', error);
        res.status(500).json({ message: "Internal server error" });
    }
};
// Route definitions
router.get("/", getAllDealers);
router.get("/search", searchDealers);
router.get("/stats", getDealersStats);
router.get("/territory/:territory", getDealersByTerritory);
router.get("/:id", getDealerById);
router.post("/", createDealer);
router.put("/:id", updateDealer);
router.delete("/:id", deleteDealer);
router.patch("/:id/restore", restoreDealer);
router.delete("/:id/hard", hardDeleteDealer);
exports.default = router;
