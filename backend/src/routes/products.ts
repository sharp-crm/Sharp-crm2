import { Router, RequestHandler } from 'express';
import { productsService } from '../services/products';

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

// Get all products for tenant
const getAllProducts: RequestHandler = async (req: any, res) => {
  const operation = 'getAllProducts';
  const { tenantId, userId } = req.user || {};
  
  console.log(`🔍 [${operation}] Starting request - TenantId: ${tenantId}, UserId: ${userId}`);
  
  try {
    const includeDeleted = req.query.includeDeleted === 'true';
    
    if (!tenantId) {
      console.log(`❌ [${operation}] Missing tenant ID`);
      res.status(400).json({ error: "Tenant ID required" });
      return;
    }

    console.log(`📊 [${operation}] Fetching products - TenantId: ${tenantId}, IncludeDeleted: ${includeDeleted}`);
    const products = await productsService.getProductsByTenant(tenantId, userId, includeDeleted);
    
    console.log(`✅ [${operation}] Successfully retrieved ${products.length} products`);
    res.json({ 
      data: products,
      total: products.length,
      message: `Retrieved ${products.length} products`
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

// Get product by ID
const getProductById: RequestHandler = async (req: any, res) => {
  const operation = 'getProductById';
  const { tenantId, userId } = req.user || {};
  const { id } = req.params;
  
  console.log(`🔍 [${operation}] Starting request - TenantId: ${tenantId}, UserId: ${userId}, ProductId: ${id}`);
  console.log(`🔍 [${operation}] Request params:`, req.params);
  console.log(`🔍 [${operation}] Request user:`, req.user);
  console.log(`🔍 [${operation}] Request headers:`, req.headers);
  
  try {
    if (!tenantId) {
      console.log(`❌ [${operation}] Missing tenant ID`);
      res.status(400).json({ error: "Tenant ID required" });
      return;
    }

    if (!userId) {
      console.log(`❌ [${operation}] Missing user ID`);
      res.status(400).json({ error: "User ID required" });
      return;
    }

    if (!id) {
      console.log(`❌ [${operation}] Missing product ID`);
      res.status(400).json({ error: "Product ID required" });
      return;
    }

    console.log(`📊 [${operation}] Calling productsService.getProductById - ProductId: ${id}, TenantId: ${tenantId}, UserId: ${userId}`);
    const product = await productsService.getProductById(id, tenantId, userId);
    
    console.log(`📊 [${operation}] productsService.getProductById result:`, product ? 'Product found' : 'Product not found');
    
    if (!product) {
      console.log(`❌ [${operation}] Product not found - ProductId: ${id}`);
      res.status(404).json({ message: "Product not found" });
      return;
    }

    console.log(`✅ [${operation}] Successfully retrieved product - ProductId: ${id}`);
    console.log(`✅ [${operation}] Product data:`, JSON.stringify(product, null, 2));
    res.json({ data: product });
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

// Create new product
const createProduct: RequestHandler = async (req: any, res) => {
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
    const newProduct = await productsService.createProduct({
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

// Update product
const updateProduct: RequestHandler = async (req: any, res) => {
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

    console.log(`📊 [${operation}] Updating product - ProductId: ${id}`);
    const updatedProduct = await productsService.updateProduct(id, {
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

// Delete product
const deleteProduct: RequestHandler = async (req: any, res) => {
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
    const deleted = await productsService.deleteProduct(id, tenantId, userId);
    
    if (!deleted) {
      console.log(`❌ [${operation}] Product not found - ProductId: ${id}`);
      res.status(404).json({ message: "Product not found" });
      return;
    }

    console.log(`✅ [${operation}] Successfully deleted product - ProductId: ${id}`);
    res.json({ message: "Product deleted successfully" });
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

// Routes
router.get('/', getAllProducts);
router.get('/:id', getProductById);
router.post('/', createProduct);
router.put('/:id', updateProduct);
router.delete('/:id', deleteProduct);

export default router; 