"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const products_1 = require("../services/products");
const router = (0, express_1.Router)();
// Validation helper functions
function validateRequiredFields(data, requiredFields) {
    const missingFields = requiredFields.filter(field => !data[field]);
    return missingFields.length > 0 ? missingFields : null;
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
// Get all products for tenant (RBAC-aware)
const getAllProducts = async (req, res) => {
    const operation = 'getAllProducts_RBAC';
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
        const products = await products_1.productsService.getProductsForUser(rbacUser, includeDeleted);
        console.log(`✅ [${operation}] Successfully retrieved ${products.length} products for user ${rbacUser.email} (${rbacUser.role})`);
        res.json({
            data: products,
            total: products.length,
            message: `Retrieved ${products.length} products`,
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
// Get product by ID (RBAC-aware)
const getProductById = async (req, res) => {
    const operation = 'getProductById_RBAC';
    const user = req.user;
    const { id } = req.params;
    console.log(`🔍 [${operation}] Starting RBAC request - User: ${user?.email} (${user?.role}), ProductId: ${id}`);
    try {
        if (!user || !user.tenantId) {
            console.log(`❌ [${operation}] Missing user context or tenant ID`);
            res.status(400).json({ error: "User authentication required" });
            return;
        }
        const rbacUser = convertToRBACUser(user);
        console.log(`🔐 [${operation}] Using RBAC - User: ${rbacUser.email} (${rbacUser.role}), ProductId: ${id}`);
        const product = await products_1.productsService.getProductByIdForUser(id, rbacUser);
        if (!product) {
            console.log(`❌ [${operation}] Product not found or access denied - ProductId: ${id}, User: ${rbacUser.email} (${rbacUser.role})`);
            res.status(404).json({ message: "Product not found or you don't have permission to access it" });
            return;
        }
        console.log(`✅ [${operation}] Successfully retrieved product - ProductId: ${id}, User: ${rbacUser.email} (${rbacUser.role})`);
        res.json({
            data: product,
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
// Create new product
const createProduct = async (req, res) => {
    const operation = 'createProduct';
    const { tenantId, userId } = req.user || {};
    const productData = req.body;
    console.log(`🔍 [${operation}] Starting request - TenantId: ${tenantId}, UserId: ${userId}`);
    console.log(`📝 [${operation}] Product data:`, productData);
    try {
        if (!tenantId) {
            console.log(`❌ [${operation}] Missing tenant ID`);
            res.status(400).json({ error: "Tenant ID required" });
            return;
        }
        // Validate required fields
        const requiredFields = ['productOwner', 'productCode', 'name', 'unitPrice', 'taxPercentage', 'usageUnit'];
        const missingFields = validateRequiredFields(productData, requiredFields);
        if (missingFields) {
            console.log(`❌ [${operation}] Missing required fields: ${missingFields.join(', ')}`);
            res.status(400).json({
                error: "Missing required fields",
                missingFields
            });
            return;
        }
        // Validate numeric fields
        if (isNaN(Number(productData.unitPrice)) || Number(productData.unitPrice) < 0) {
            console.log(`❌ [${operation}] Invalid unit price: ${productData.unitPrice}`);
            res.status(400).json({ error: "Unit price must be a valid positive number" });
            return;
        }
        if (isNaN(Number(productData.taxPercentage)) || Number(productData.taxPercentage) < 0) {
            console.log(`❌ [${operation}] Invalid tax percentage: ${productData.taxPercentage}`);
            res.status(400).json({ error: "Tax percentage must be a valid positive number" });
            return;
        }
        if (productData.commissionRate && (isNaN(Number(productData.commissionRate)) || Number(productData.commissionRate) < 0)) {
            console.log(`❌ [${operation}] Invalid commission rate: ${productData.commissionRate}`);
            res.status(400).json({ error: "Commission rate must be a valid positive number" });
            return;
        }
        console.log(`📊 [${operation}] Creating product - TenantId: ${tenantId}`);
        const newProduct = await products_1.productsService.createProduct({
            ...productData,
            tenantId,
            createdBy: userId,
            userId
        });
        console.log(`✅ [${operation}] Successfully created product - ProductId: ${newProduct.id}`);
        res.status(201).json({
            data: newProduct,
            message: "Product created successfully"
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
// Update product
const updateProduct = async (req, res) => {
    const operation = 'updateProduct';
    const { tenantId, userId } = req.user || {};
    const { id } = req.params;
    const updateData = req.body;
    console.log(`🔍 [${operation}] Starting request - TenantId: ${tenantId}, UserId: ${userId}, ProductId: ${id}`);
    console.log(`📝 [${operation}] Update data:`, updateData);
    try {
        if (!tenantId) {
            console.log(`❌ [${operation}] Missing tenant ID`);
            res.status(400).json({ error: "Tenant ID required" });
            return;
        }
        // Validate numeric fields if provided
        if (updateData.unitPrice !== undefined && (isNaN(Number(updateData.unitPrice)) || Number(updateData.unitPrice) < 0)) {
            console.log(`❌ [${operation}] Invalid unit price: ${updateData.unitPrice}`);
            res.status(400).json({ error: "Unit price must be a valid positive number" });
            return;
        }
        if (updateData.taxPercentage !== undefined && (isNaN(Number(updateData.taxPercentage)) || Number(updateData.taxPercentage) < 0)) {
            console.log(`❌ [${operation}] Invalid tax percentage: ${updateData.taxPercentage}`);
            res.status(400).json({ error: "Tax percentage must be a valid positive number" });
            return;
        }
        if (updateData.commissionRate !== undefined && (isNaN(Number(updateData.commissionRate)) || Number(updateData.commissionRate) < 0)) {
            console.log(`❌ [${operation}] Invalid commission rate: ${updateData.commissionRate}`);
            res.status(400).json({ error: "Commission rate must be a valid positive number" });
            return;
        }
        // Validate relatedLeadIds array if provided
        if (updateData.relatedLeadIds && !Array.isArray(updateData.relatedLeadIds)) {
            console.log(`❌ [${operation}] Invalid relatedLeadIds: ${updateData.relatedLeadIds}`);
            res.status(400).json({ error: "relatedLeadIds must be an array of lead IDs" });
            return;
        }
        console.log(`📊 [${operation}] Updating product - ProductId: ${id}`);
        const updatedProduct = await products_1.productsService.updateProduct(id, {
            ...updateData,
            updatedBy: userId
        }, tenantId, userId);
        if (!updatedProduct) {
            console.log(`❌ [${operation}] Product not found - ProductId: ${id}`);
            res.status(404).json({ message: "Product not found" });
            return;
        }
        console.log(`✅ [${operation}] Successfully updated product - ProductId: ${id}`);
        res.json({
            data: updatedProduct,
            message: "Product updated successfully"
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
// Delete product
const deleteProduct = async (req, res) => {
    const operation = 'deleteProduct';
    const { tenantId, userId } = req.user || {};
    const { id } = req.params;
    console.log(`🔍 [${operation}] Starting request - TenantId: ${tenantId}, UserId: ${userId}, ProductId: ${id}`);
    try {
        if (!tenantId) {
            console.log(`❌ [${operation}] Missing tenant ID`);
            res.status(400).json({ error: "Tenant ID required" });
            return;
        }
        console.log(`📊 [${operation}] Deleting product - ProductId: ${id}`);
        const deleted = await products_1.productsService.deleteProduct(id, tenantId, userId);
        if (!deleted) {
            console.log(`❌ [${operation}] Product not found - ProductId: ${id}`);
            res.status(404).json({ message: "Product not found" });
            return;
        }
        console.log(`✅ [${operation}] Successfully deleted product - ProductId: ${id}`);
        res.json({ message: "Product deleted successfully" });
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
// Routes
router.get('/', getAllProducts);
router.get('/:id', getProductById);
router.post('/', createProduct);
router.put('/:id', updateProduct);
router.delete('/:id', deleteProduct);
exports.default = router;
