"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const subsidiaries_1 = require("../services/subsidiaries");
const router = (0, express_1.Router)();
// Get all subsidiaries for the current tenant
const getAllSubsidiaries = async (req, res) => {
    try {
        const { tenantId, userId, role } = req.user;
        if (!tenantId) {
            res.status(400).json({ error: "Tenant ID required" });
            return;
        }
        const subsidiaries = await subsidiaries_1.subsidiariesService.getSubsidiariesByTenant(tenantId, userId, role);
        res.json({
            data: subsidiaries,
            total: subsidiaries.length
        });
    }
    catch (error) {
        console.error('Get subsidiaries error:', error);
        res.status(500).json({ message: "Internal server error" });
    }
};
// Get subsidiary by ID
const getSubsidiaryById = async (req, res) => {
    try {
        const { tenantId } = req.user;
        const { id } = req.params;
        const subsidiary = await subsidiaries_1.subsidiariesService.getSubsidiaryById(id, tenantId);
        if (!subsidiary) {
            res.status(404).json({ error: "Subsidiary not found" });
            return;
        }
        res.json({ data: subsidiary });
    }
    catch (error) {
        console.error('Get subsidiary error:', error);
        res.status(500).json({ message: "Internal server error" });
    }
};
// Get all subsidiaries for a tenant
const getSubsidiaries = async (req, res) => {
    try {
        const { tenantId, userId, role } = req.user;
        const subsidiaries = await subsidiaries_1.subsidiariesService.getSubsidiariesByTenant(tenantId, userId, role);
        res.json({ data: subsidiaries });
    }
    catch (error) {
        console.error('Error fetching subsidiaries:', error);
        res.status(500).json({ error: 'Failed to fetch subsidiaries' });
    }
};
// Create new subsidiary
const createSubsidiary = async (req, res) => {
    try {
        const { userId, tenantId, role } = req.user;
        // Check if user has permission to create subsidiary
        if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
            res.status(403).json({ error: "You don't have permission to create subsidiaries" });
            return;
        }
        const subsidiaryData = req.body;
        // Validate required fields
        if (!subsidiaryData.name || !subsidiaryData.email || !subsidiaryData.address || !subsidiaryData.contact) {
            res.status(400).json({ error: "Name, email, address, and contact are required" });
            return;
        }
        const subsidiary = await subsidiaries_1.subsidiariesService.createSubsidiary(subsidiaryData, userId, tenantId);
        res.status(201).json({ data: subsidiary });
    }
    catch (error) {
        console.error('Error creating subsidiary:', error);
        res.status(500).json({ error: 'Failed to create subsidiary' });
    }
};
// Update subsidiary
const updateSubsidiary = async (req, res) => {
    try {
        const { userId, tenantId, role } = req.user;
        // Check if user has permission to update subsidiary
        if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
            res.status(403).json({ error: "You don't have permission to update subsidiaries" });
            return;
        }
        const { id } = req.params;
        const updateData = req.body;
        const updatedSubsidiary = await subsidiaries_1.subsidiariesService.updateSubsidiary(id, updateData, userId, tenantId);
        if (!updatedSubsidiary) {
            res.status(404).json({ error: "Subsidiary not found" });
            return;
        }
        res.json({ data: updatedSubsidiary });
    }
    catch (error) {
        console.error('Update subsidiary error:', error);
        res.status(500).json({ message: "Internal server error" });
    }
};
// Delete subsidiary (soft delete)
const deleteSubsidiary = async (req, res) => {
    try {
        const { userId, tenantId, role } = req.user;
        // Check if user has permission to delete subsidiary
        if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
            res.status(403).json({ error: "You don't have permission to delete subsidiaries" });
            return;
        }
        const { id } = req.params;
        const success = await subsidiaries_1.subsidiariesService.deleteSubsidiary(id, userId, tenantId);
        if (!success) {
            res.status(404).json({ error: "Subsidiary not found" });
            return;
        }
        res.json({ message: "Subsidiary deleted successfully" });
    }
    catch (error) {
        console.error('Delete subsidiary error:', error);
        res.status(500).json({ message: "Internal server error" });
    }
};
// Restore subsidiary
const restoreSubsidiary = async (req, res) => {
    try {
        const { userId, tenantId } = req.user;
        const { id } = req.params;
        const success = await subsidiaries_1.subsidiariesService.restoreSubsidiary(id, userId, tenantId);
        if (!success) {
            res.status(404).json({ error: "Subsidiary not found" });
            return;
        }
        res.json({ message: "Subsidiary restored successfully" });
    }
    catch (error) {
        console.error('Restore subsidiary error:', error);
        res.status(500).json({ message: "Internal server error" });
    }
};
// Hard delete subsidiary (admin only)
const hardDeleteSubsidiary = async (req, res) => {
    try {
        const { tenantId, role } = req.user;
        const { id } = req.params;
        if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
            res.status(403).json({ error: "Admin access required" });
            return;
        }
        const success = await subsidiaries_1.subsidiariesService.hardDeleteSubsidiary(id, tenantId);
        if (!success) {
            res.status(404).json({ error: "Subsidiary not found" });
            return;
        }
        res.json({ message: "Subsidiary permanently deleted" });
    }
    catch (error) {
        console.error('Hard delete subsidiary error:', error);
        res.status(500).json({ message: "Internal server error" });
    }
};
// Search subsidiaries
const searchSubsidiaries = async (req, res) => {
    try {
        const { tenantId } = req.user;
        const { q: searchTerm, limit = 50 } = req.query;
        if (!searchTerm) {
            res.status(400).json({ error: "Search term is required" });
            return;
        }
        const subsidiaries = await subsidiaries_1.subsidiariesService.searchSubsidiaries(searchTerm, tenantId, parseInt(limit));
        res.json({
            data: subsidiaries,
            total: subsidiaries.length
        });
    }
    catch (error) {
        console.error('Search subsidiaries error:', error);
        res.status(500).json({ message: "Internal server error" });
    }
};
// Get subsidiaries statistics
const getSubsidiariesStats = async (req, res) => {
    try {
        const { tenantId } = req.user;
        const stats = await subsidiaries_1.subsidiariesService.getSubsidiariesStats(tenantId);
        res.json({ data: stats });
    }
    catch (error) {
        console.error('Get subsidiaries stats error:', error);
        res.status(500).json({ message: "Internal server error" });
    }
};
// Route definitions
router.get("/", getAllSubsidiaries);
router.get("/search", searchSubsidiaries);
router.get("/stats", getSubsidiariesStats);
router.get("/:id", getSubsidiaryById);
router.post("/", createSubsidiary);
router.put("/:id", updateSubsidiary);
router.delete("/:id", deleteSubsidiary);
router.patch("/:id/restore", restoreSubsidiary);
router.delete("/:id/hard", hardDeleteSubsidiary);
exports.default = router;
