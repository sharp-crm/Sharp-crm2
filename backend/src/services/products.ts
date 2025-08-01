import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand, QueryCommand, DeleteCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { docClient, TABLES } from './dynamoClient';

// Product interface
export interface Product {
  id: string;
  // Product Information
  productOwner: string;
  productCode: string;
  name: string;
  activeStatus?: boolean;
  
  // Price Information
  unitPrice: number;
  taxPercentage: number;
  commissionRate?: number;
  
  // Stock Information
  usageUnit: string;
  quantityInStock?: number;
  quantityInDemand?: number;
  reorderLevel?: number;
  quantityOrdered?: number;
  
  // Description Information
  description: string;
  notes?: string;
  
  // Legacy fields for backward compatibility
  category?: string;
  price?: number;
  cost?: number;
  inStock?: boolean;
  sku?: string;
  manufacturer?: string;
  weight?: number;
  dimensions?: string;
  
  visibleTo?: string[]; // Array of user IDs who can view this product
  
  // Auditing fields
  createdBy: string;
  createdAt: string;
  updatedBy?: string;
  updatedAt?: string;
  deletedBy?: string;
  isDeleted: boolean;
  deletedAt?: string;
  userId: string;
  tenantId: string;
}

export interface CreateProductInput {
  // Product Information
  productOwner: string;
  productCode: string;
  name: string;
  activeStatus?: boolean;
  
  // Price Information
  unitPrice: number;
  taxPercentage: number;
  commissionRate?: number;
  
  // Stock Information
  usageUnit: string;
  quantityInStock?: number;
  quantityInDemand?: number;
  reorderLevel?: number;
  quantityOrdered?: number;
  
  // Description Information
  description?: string;
  notes?: string;
  
  // Legacy fields for backward compatibility
  category?: string;
  price?: number;
  cost?: number;
  inStock?: boolean;
  sku?: string;
  manufacturer?: string;
  weight?: number;
  dimensions?: string;
  
  visibleTo?: string[]; // Array of user IDs who can view this product
}

export interface UpdateProductInput {
  // Product Information
  productOwner?: string;
  productCode?: string;
  name?: string;
  activeStatus?: boolean;
  
  // Price Information
  unitPrice?: number;
  taxPercentage?: number;
  commissionRate?: number;
  
  // Stock Information
  usageUnit?: string;
  quantityInStock?: number;
  quantityInDemand?: number;
  reorderLevel?: number;
  quantityOrdered?: number;
  
  // Description Information
  description?: string;
  notes?: string;
  
  // Legacy fields for backward compatibility
  category?: string;
  price?: number;
  cost?: number;
  inStock?: boolean;
  sku?: string;
  manufacturer?: string;
  weight?: number;
  dimensions?: string;
  
  visibleTo?: string[]; // Array of user IDs who can view this product
}

export class ProductsService {
  private tableName = TABLES.PRODUCTS;

  // Create a new product
  async createProduct(input: CreateProductInput & { tenantId: string; createdBy: string; userId: string }): Promise<Product> {
    const timestamp = new Date().toISOString();
    const productId = uuidv4();

    const product: Product = {
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
      await docClient.send(new PutCommand({
        TableName: this.tableName,
        Item: product
      }));

      console.log(`✅ Product created successfully - ID: ${productId}`);
      return product;
    } catch (error) {
      console.error(`❌ Error creating product:`, error);
      throw error;
    }
  }

  // Get product by ID
  async getProductById(id: string, tenantId: string, userId: string): Promise<Product | null> {
    console.log(`🔍 [getProductById] Starting - ID: ${id}, TenantId: ${tenantId}, UserId: ${userId}`);
    console.log(`🔍 [getProductById] TableName: ${this.tableName}`);
    
    try {
      const getParams = {
        TableName: this.tableName,
        Key: { id }
      };
      
      console.log(`🔍 [getProductById] GetCommand params:`, JSON.stringify(getParams, null, 2));
      
      const result = await docClient.send(new GetCommand(getParams));
      
      console.log(`🔍 [getProductById] DynamoDB result:`, JSON.stringify(result, null, 2));
      console.log(`🔍 [getProductById] Result.Item exists:`, !!result.Item);

      if (!result.Item) {
        console.log(`❌ [getProductById] Product not found in DynamoDB - ID: ${id}, TenantId: ${tenantId}`);
        return null;
      }

      const product = result.Item as Product;
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
    } catch (error) {
      console.error(`❌ [getProductById] Error occurred:`);
      console.error(`   - Error message: ${error instanceof Error ? error.message : 'Unknown error'}`);
      console.error(`   - Error stack: ${error instanceof Error ? error.stack : 'No stack trace'}`);
      if (error && typeof error === 'object' && 'code' in error) {
        console.error(`   - DynamoDB error code: ${(error as any).code}`);
        console.error(`   - DynamoDB error details: ${JSON.stringify(error, null, 2)}`);
      }
      throw error;
    }
  }

  // Get all products for a tenant
  async getProductsByTenant(tenantId: string, userId: string, includeDeleted = false): Promise<Product[]> {
    try {
      const params: any = {
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

      const result = await docClient.send(new QueryCommand(params));
      const products = result.Items as Product[] || [];

      // Filter products based on user access
      const accessibleProducts = products.filter(product => {
        if (!product.visibleTo || product.visibleTo.length === 0) {
          return true; // No visibility restrictions
        }
        return product.visibleTo.includes(userId);
      });

      console.log(`✅ Retrieved ${accessibleProducts.length} products for tenant ${tenantId}`);
      return accessibleProducts;
    } catch (error) {
      console.error(`❌ Error getting products by tenant:`, error);
      throw error;
    }
  }

  // Update product
  async updateProduct(id: string, input: UpdateProductInput & { updatedBy: string }, tenantId: string, userId: string): Promise<Product | null> {
    try {
      // First, get the existing product to check access
      const existingProduct = await this.getProductById(id, tenantId, userId);
      if (!existingProduct) {
        return null;
      }

      const timestamp = new Date().toISOString();
      const updateExpressions: string[] = [];
      const expressionAttributeNames: Record<string, string> = {};
      const expressionAttributeValues: Record<string, any> = {};

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
        ReturnValues: 'ALL_NEW' as const
      };

      console.log(`🔍 [updateProduct] Update params:`, JSON.stringify(updateParams, null, 2));

      const result = await docClient.send(new UpdateCommand(updateParams));
      const updatedProduct = result.Attributes as Product;

      console.log(`✅ Product updated successfully - ID: ${id}`);
      return updatedProduct;
    } catch (error) {
      console.error(`❌ Error updating product:`, error);
      throw error;
    }
  }

  // Delete product (soft delete)
  async deleteProduct(id: string, tenantId: string, userId: string): Promise<boolean> {
    try {
      // First, get the existing product to check access
      const existingProduct = await this.getProductById(id, tenantId, userId);
      if (!existingProduct) {
        return false;
      }

      const timestamp = new Date().toISOString();
      
      await docClient.send(new UpdateCommand({
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
    } catch (error) {
      console.error(`❌ Error deleting product:`, error);
      throw error;
    }
  }

  // Search products
  async searchProducts(tenantId: string, userId: string, searchTerm: string): Promise<Product[]> {
    try {
      const products = await this.getProductsByTenant(tenantId, userId);
      
      const searchLower = searchTerm.toLowerCase();
      return products.filter(product => 
        product.name.toLowerCase().includes(searchLower) ||
        (product.category && product.category.toLowerCase().includes(searchLower)) ||
        (product.sku && product.sku.toLowerCase().includes(searchLower)) ||
        (product.manufacturer && product.manufacturer.toLowerCase().includes(searchLower)) ||
        (product.description && product.description.toLowerCase().includes(searchLower))
      );
    } catch (error) {
      console.error(`❌ Error searching products:`, error);
      throw error;
    }
  }

  // Get products by category
  async getProductsByCategory(category: string, tenantId: string, userId: string): Promise<Product[]> {
    try {
      const products = await this.getProductsByTenant(tenantId, userId);
      return products.filter(product => product.category && product.category === category);
    } catch (error) {
      console.error(`❌ Error getting products by category:`, error);
      throw error;
    }
  }

  // Get products by stock status
  async getProductsByStockStatus(inStock: boolean, tenantId: string, userId: string): Promise<Product[]> {
    try {
      const products = await this.getProductsByTenant(tenantId, userId);
      return products.filter(product => product.inStock === inStock);
    } catch (error) {
      console.error(`❌ Error getting products by stock status:`, error);
      throw error;
    }
  }
}

// Export singleton instance
export const productsService = new ProductsService(); 