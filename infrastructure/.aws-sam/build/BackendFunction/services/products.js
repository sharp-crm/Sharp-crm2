"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.productsService = exports.ProductsService = void 0;
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const uuid_1 = require("uuid");
const dynamoClient_1 = require("./dynamoClient");
const productsRBAC_1 = require("./productsRBAC");
class ProductsService {
    constructor() {
        this.tableName = dynamoClient_1.TABLES.PRODUCTS;
    }
    // Create a new product
    async createProduct(input) {
        const timestamp = new Date().toISOString();
        const productId = (0, uuid_1.v4)();
        const product = {
            id: productId,
            // Product Information
            productOwner: input.productOwner,
            productCode: input.productCode,
            name: input.name,
            activeStatus: input.activeStatus,
            // Price Information
            unitPrice: input.unitPrice,
            taxPercentage: input.taxPercentage,
            commissionRate: input.commissionRate,
            // Stock Information
            usageUnit: input.usageUnit,
            quantityInStock: input.quantityInStock,
            quantityInDemand: input.quantityInDemand,
            reorderLevel: input.reorderLevel,
            quantityOrdered: input.quantityOrdered,
            // Description Information
            description: input.description || '',
            notes: input.notes || '',
            // Related records
            relatedLeadIds: input.relatedLeadIds || [],
            relatedContactIds: input.relatedContactIds || [],
            // Legacy fields for backward compatibility
            category: input.category,
            price: input.price,
            cost: input.cost,
            inStock: input.inStock,
            sku: input.sku,
            manufacturer: input.manufacturer,
            weight: input.weight,
            dimensions: input.dimensions,
            visibleTo: input.visibleTo || [],
            createdBy: input.createdBy,
            createdAt: timestamp,
            updatedBy: input.createdBy,
            updatedAt: timestamp,
            isDeleted: false,
            deletedBy: undefined,
            deletedAt: undefined,
            userId: input.userId,
            tenantId: input.tenantId
        };
        try {
            await dynamoClient_1.docClient.send(new lib_dynamodb_1.PutCommand({
                TableName: this.tableName,
                Item: product
            }));
            console.log(`✅ Product created successfully - ID: ${productId}`);
            return product;
        }
        catch (error) {
            console.error(`❌ Error creating product:`, error);
            throw error;
        }
    }
    // Get product by ID
    async getProductById(id, tenantId, userId) {
        console.log(`🔍 [getProductById] Starting - ID: ${id}, TenantId: ${tenantId}, UserId: ${userId}`);
        console.log(`🔍 [getProductById] TableName: ${this.tableName}`);
        try {
            const getParams = {
                TableName: this.tableName,
                Key: { id }
            };
            console.log(`🔍 [getProductById] GetCommand params:`, JSON.stringify(getParams, null, 2));
            const result = await dynamoClient_1.docClient.send(new lib_dynamodb_1.GetCommand(getParams));
            console.log(`🔍 [getProductById] DynamoDB result:`, JSON.stringify(result, null, 2));
            console.log(`🔍 [getProductById] Result.Item exists:`, !!result.Item);
            if (!result.Item) {
                console.log(`❌ [getProductById] Product not found in DynamoDB - ID: ${id}, TenantId: ${tenantId}`);
                return null;
            }
            const product = result.Item;
            console.log(`🔍 [getProductById] Product found:`, JSON.stringify(product, null, 2));
            // Check if product belongs to the correct tenant
            if (product.tenantId !== tenantId) {
                console.log(`❌ [getProductById] Product ${id} does not belong to tenant ${tenantId}`);
                console.log(`❌ [getProductById] Product tenantId: ${product.tenantId}, Requested tenantId: ${tenantId}`);
                return null;
            }
            // Check if user has access to this product
            if (product.visibleTo && product.visibleTo.length > 0 && !product.visibleTo.includes(userId)) {
                console.log(`❌ [getProductById] User ${userId} does not have access to product ${id}`);
                console.log(`❌ [getProductById] Product visibleTo:`, product.visibleTo);
                return null;
            }
            console.log(`✅ [getProductById] Successfully retrieved product - ID: ${id}`);
            return product;
        }
        catch (error) {
            console.error(`❌ [getProductById] Error occurred:`);
            console.error(`   - Error message: ${error instanceof Error ? error.message : 'Unknown error'}`);
            console.error(`   - Error stack: ${error instanceof Error ? error.stack : 'No stack trace'}`);
            if (error && typeof error === 'object' && 'code' in error) {
                console.error(`   - DynamoDB error code: ${error.code}`);
                console.error(`   - DynamoDB error details: ${JSON.stringify(error, null, 2)}`);
            }
            throw error;
        }
    }
    // Get all products for a tenant
    async getProductsByTenant(tenantId, userId, includeDeleted = false) {
        try {
            const params = {
                TableName: this.tableName,
                IndexName: 'TenantIndex',
                KeyConditionExpression: 'tenantId = :tenantId',
                ExpressionAttributeValues: {
                    ':tenantId': tenantId
                }
            };
            if (!includeDeleted) {
                params.FilterExpression = 'attribute_not_exists(isDeleted) OR isDeleted = :isDeleted';
                params.ExpressionAttributeValues[':isDeleted'] = false;
            }
            const result = await dynamoClient_1.docClient.send(new lib_dynamodb_1.QueryCommand(params));
            const products = result.Items || [];
            // Filter products based on user access
            const accessibleProducts = products.filter(product => {
                if (!product.visibleTo || product.visibleTo.length === 0) {
                    return true; // No visibility restrictions
                }
                return product.visibleTo.includes(userId);
            });
            console.log(`✅ Retrieved ${accessibleProducts.length} products for tenant ${tenantId}`);
            return accessibleProducts;
        }
        catch (error) {
            console.error(`❌ Error getting products by tenant:`, error);
            throw error;
        }
    }
    // RBAC-aware method: Get products for user based on role and permissions
    async getProductsForUser(user, includeDeleted = false) {
        console.log(`🔐 [ProductsService.getProductsForUser] Getting products for user: ${user.email} (${user.role})`);
        return productsRBAC_1.productsRBACService.getProductsForUser(user, includeDeleted);
    }
    // RBAC-aware method: Get product by ID with role-based access control
    async getProductByIdForUser(id, user) {
        console.log(`🔐 [ProductsService.getProductByIdForUser] Getting product ${id} for user: ${user.email} (${user.role})`);
        return productsRBAC_1.productsRBACService.getProductByIdForUser(id, user);
    }
    // Update product
    async updateProduct(id, input, tenantId, userId) {
        try {
            // First, get the existing product to check access
            const existingProduct = await this.getProductById(id, tenantId, userId);
            if (!existingProduct) {
                return null;
            }
            const timestamp = new Date().toISOString();
            const updateExpressions = [];
            const expressionAttributeNames = {};
            const expressionAttributeValues = {};
            // Build update expression dynamically, excluding certain fields that are handled separately
            Object.entries(input).forEach(([key, value]) => {
                if (value !== undefined && key !== 'updatedBy' && key !== 'updatedAt' && key !== 'id') {
                    const attributeName = `#${key}`;
                    const attributeValue = `:${key}`;
                    updateExpressions.push(`${attributeName} = ${attributeValue}`);
                    expressionAttributeNames[attributeName] = key;
                    expressionAttributeValues[attributeValue] = value;
                }
            });
            // Always update the updatedAt timestamp
            updateExpressions.push('#updatedAt = :updatedAt');
            expressionAttributeNames['#updatedAt'] = 'updatedAt';
            expressionAttributeValues[':updatedAt'] = timestamp;
            // Always update the updatedBy field
            updateExpressions.push('#updatedBy = :updatedBy');
            expressionAttributeNames['#updatedBy'] = 'updatedBy';
            expressionAttributeValues[':updatedBy'] = input.updatedBy;
            const updateParams = {
                TableName: this.tableName,
                Key: { id },
                UpdateExpression: `SET ${updateExpressions.join(', ')}`,
                ExpressionAttributeNames: expressionAttributeNames,
                ExpressionAttributeValues: expressionAttributeValues,
                ReturnValues: 'ALL_NEW'
            };
            console.log(`🔍 [updateProduct] Update params:`, JSON.stringify(updateParams, null, 2));
            const result = await dynamoClient_1.docClient.send(new lib_dynamodb_1.UpdateCommand(updateParams));
            const updatedProduct = result.Attributes;
            console.log(`✅ Product updated successfully - ID: ${id}`);
            return updatedProduct;
        }
        catch (error) {
            console.error(`❌ Error updating product:`, error);
            throw error;
        }
    }
    // Delete product (soft delete)
    async deleteProduct(id, tenantId, userId) {
        try {
            // First, get the existing product to check access
            const existingProduct = await this.getProductById(id, tenantId, userId);
            if (!existingProduct) {
                return false;
            }
            const timestamp = new Date().toISOString();
            await dynamoClient_1.docClient.send(new lib_dynamodb_1.UpdateCommand({
                TableName: this.tableName,
                Key: { id, tenantId },
                UpdateExpression: 'SET isDeleted = :isDeleted, deletedAt = :deletedAt, deletedBy = :deletedBy, updatedAt = :updatedAt, updatedBy = :updatedBy',
                ExpressionAttributeValues: {
                    ':isDeleted': true,
                    ':deletedAt': timestamp,
                    ':deletedBy': userId,
                    ':updatedAt': timestamp,
                    ':updatedBy': userId
                }
            }));
            console.log(`✅ Product deleted successfully - ID: ${id}`);
            return true;
        }
        catch (error) {
            console.error(`❌ Error deleting product:`, error);
            throw error;
        }
    }
    // RBAC-aware method: Get products by owner with role-based access control
    async getProductsByOwnerForUser(productOwner, user) {
        console.log(`🔐 [ProductsService.getProductsByOwnerForUser] Getting products for owner ${productOwner} by user: ${user.email} (${user.role})`);
        return productsRBAC_1.productsRBACService.getProductsByOwnerForUser(productOwner, user);
    }
    // RBAC-aware method: Get products by category with role-based access control
    async getProductsByCategoryForUser(category, user) {
        console.log(`🔐 [ProductsService.getProductsByCategoryForUser] Getting products for category ${category} by user: ${user.email} (${user.role})`);
        return productsRBAC_1.productsRBACService.getProductsByCategoryForUser(category, user);
    }
    // RBAC-aware method: Get product by code with role-based access control
    async getProductByCodeForUser(productCode, user) {
        console.log(`🔐 [ProductsService.getProductByCodeForUser] Getting product by code ${productCode} by user: ${user.email} (${user.role})`);
        return productsRBAC_1.productsRBACService.getProductByCodeForUser(productCode, user);
    }
    // RBAC-aware method: Search products with role-based access control
    async searchProductsForUser(user, searchTerm) {
        console.log(`🔐 [ProductsService.searchProductsForUser] Searching products for term "${searchTerm}" by user: ${user.email} (${user.role})`);
        return productsRBAC_1.productsRBACService.searchProductsForUser(user, searchTerm);
    }
    // RBAC-aware method: Get product statistics with role-based access control
    async getProductsStatsForUser(user) {
        console.log(`🔐 [ProductsService.getProductsStatsForUser] Getting product stats for user: ${user.email} (${user.role})`);
        return productsRBAC_1.productsRBACService.getProductsStatsForUser(user);
    }
    // Search products
    async searchProducts(tenantId, userId, searchTerm) {
        try {
            const products = await this.getProductsByTenant(tenantId, userId);
            const searchLower = searchTerm.toLowerCase();
            return products.filter(product => product.name.toLowerCase().includes(searchLower) ||
                (product.category && product.category.toLowerCase().includes(searchLower)) ||
                (product.sku && product.sku.toLowerCase().includes(searchLower)) ||
                (product.manufacturer && product.manufacturer.toLowerCase().includes(searchLower)) ||
                (product.description && product.description.toLowerCase().includes(searchLower)));
        }
        catch (error) {
            console.error(`❌ Error searching products:`, error);
            throw error;
        }
    }
    // Get products by category
    async getProductsByCategory(category, tenantId, userId) {
        try {
            const products = await this.getProductsByTenant(tenantId, userId);
            return products.filter(product => product.category && product.category === category);
        }
        catch (error) {
            console.error(`❌ Error getting products by category:`, error);
            throw error;
        }
    }
    // Get products by stock status
    async getProductsByStockStatus(inStock, tenantId, userId) {
        try {
            const products = await this.getProductsByTenant(tenantId, userId);
            return products.filter(product => product.inStock === inStock);
        }
        catch (error) {
            console.error(`❌ Error getting products by stock status:`, error);
            throw error;
        }
    }
}
exports.ProductsService = ProductsService;
// Export singleton instance
exports.productsService = new ProductsService();
