import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, TABLES } from './dynamoClient';
import { Product } from './products';

export interface RBACUser {
  userId: string;
  email: string;
  role: 'ADMIN' | 'SALES_MANAGER' | 'SALES_REP';
  tenantId: string;
  reportingTo?: string;
}

export interface ProductAccessFilter {
  filterExpression: string;
  expressionAttributeValues: Record<string, any>;
  expressionAttributeNames?: Record<string, string>;
}

export class ProductsRBACService {
  private tableName = TABLES.PRODUCTS;

  /**
   * Get all products accessible by a user based on their role and tenant
   */
  async getProductsForUser(user: RBACUser, includeDeleted = false): Promise<Product[]> {
    console.log(`🔐 [ProductsRBACService] Getting products for user: ${user.email} (${user.role}) in tenant: ${user.tenantId}`);
    
    try {
      // First ensure tenant-based segregation
      const tenantFilter = this.buildTenantFilter(user.tenantId, includeDeleted);
      
      // Then build role-based access filter
      const roleFilter = await this.buildRoleBasedFilter(user);
      
      // Combine filters
      const combinedFilter = this.combineFilters(tenantFilter, roleFilter);
      
      console.log(`🔐 [ProductsRBACService] Filter expression: ${combinedFilter.filterExpression}`);
      console.log(`🔐 [ProductsRBACService] Expression values:`, combinedFilter.expressionAttributeValues);
      console.log(`🔐 [ProductsRBACService] Expression names:`, combinedFilter.expressionAttributeNames);
      
      // Use QueryCommand with TenantIndex for better performance
      const queryParams: any = {
        TableName: this.tableName,
        IndexName: 'TenantIndex',
        KeyConditionExpression: 'tenantId = :tenantId',
        ExpressionAttributeValues: {
          ':tenantId': user.tenantId,
          ...combinedFilter.expressionAttributeValues
        }
      };

      // Add filter expression if we have role-based filtering
      if (roleFilter.filterExpression) {
        queryParams.FilterExpression = roleFilter.filterExpression;
        if (!includeDeleted) {
          queryParams.FilterExpression = `(attribute_not_exists(isDeleted) OR isDeleted = :isDeleted) AND (${roleFilter.filterExpression})`;
          queryParams.ExpressionAttributeValues[':isDeleted'] = false;
        }
      } else if (!includeDeleted) {
        queryParams.FilterExpression = 'attribute_not_exists(isDeleted) OR isDeleted = :isDeleted';
        queryParams.ExpressionAttributeValues[':isDeleted'] = false;
      }
      
      // Only add ExpressionAttributeNames if it exists and has properties
      if (combinedFilter.expressionAttributeNames && Object.keys(combinedFilter.expressionAttributeNames).length > 0) {
        queryParams.ExpressionAttributeNames = combinedFilter.expressionAttributeNames;
      }
      
      const result = await docClient.send(new QueryCommand(queryParams));

      const products = (result.Items || []) as Product[];
      console.log(`🔐 [ProductsRBACService] Retrieved ${products.length} products for user ${user.email}`);
      
      return products;
    } catch (error) {
      console.error(`🔐 [ProductsRBACService] Error getting products for user ${user.email}:`, error);
      throw error;
    }
  }

  /**
   * Get a specific product by ID if the user has access to it
   */
  async getProductByIdForUser(productId: string, user: RBACUser): Promise<Product | null> {
    console.log(`🔐 [ProductsRBACService] Getting product ${productId} for user: ${user.email} (${user.role})`);
    
    // First get the product
    const result = await docClient.send(new QueryCommand({
      TableName: this.tableName,
      KeyConditionExpression: 'id = :id',
      ExpressionAttributeValues: {
        ':id': productId
      }
    }));

    if (!result.Items || result.Items.length === 0) {
      console.log(`🔐 [ProductsRBACService] Product ${productId} not found`);
      return null;
    }

    const product = result.Items[0] as Product;
    
    // Check if user has access to this product
    const hasAccess = await this.canUserAccessProduct(product, user);
    
    if (!hasAccess) {
      console.log(`🔐 [ProductsRBACService] User ${user.email} does not have access to product ${productId}`);
      return null;
    }

    console.log(`🔐 [ProductsRBACService] User ${user.email} has access to product ${productId}`);
    return product;
  }

  /**
   * Get products by owner with RBAC filtering
   */
  async getProductsByOwnerForUser(productOwner: string, user: RBACUser): Promise<Product[]> {
    console.log(`🔐 [ProductsRBACService] Getting products for owner ${productOwner}, requested by user: ${user.email} (${user.role})`);
    
    // Check if user can access products owned by the specified owner
    const canAccessOwner = await this.canUserAccessProductsFromOwner(productOwner, user);
    
    if (!canAccessOwner) {
      console.log(`🔐 [ProductsRBACService] User ${user.email} cannot access products from owner ${productOwner}`);
      return [];
    }

    // Get all products first and filter by owner and RBAC
    const accessibleProducts = await this.getProductsForUser(user, false);
    const ownerProducts = accessibleProducts.filter(product => product.productOwner === productOwner);

    console.log(`🔐 [ProductsRBACService] Retrieved ${ownerProducts.length} products for owner ${productOwner}`);
    return ownerProducts;
  }

  /**
   * Get products by category with RBAC filtering
   */
  async getProductsByCategoryForUser(category: string, user: RBACUser): Promise<Product[]> {
    console.log(`🔐 [ProductsRBACService] Getting products for category ${category}, requested by user: ${user.email} (${user.role})`);
    
    // Get all accessible products first, then filter by category
    const accessibleProducts = await this.getProductsForUser(user, false);
    
    // Filter by category
    const categoryProducts = accessibleProducts.filter(product => product.category === category);

    console.log(`🔐 [ProductsRBACService] Retrieved ${categoryProducts.length} accessible products for category ${category}`);
    return categoryProducts;
  }

  /**
   * Get products by product code with RBAC filtering
   */
  async getProductByCodeForUser(productCode: string, user: RBACUser): Promise<Product | null> {
    console.log(`🔐 [ProductsRBACService] Getting product by code ${productCode}, requested by user: ${user.email} (${user.role})`);
    
    // Query by productCode using the GSI, then filter by RBAC
    const result = await docClient.send(new QueryCommand({
      TableName: this.tableName,
      IndexName: 'ProductCodeIndex',
      KeyConditionExpression: 'productCode = :productCode',
      FilterExpression: 'tenantId = :tenantId AND (attribute_not_exists(isDeleted) OR isDeleted = :isDeleted)',
      ExpressionAttributeValues: {
        ':productCode': productCode,
        ':tenantId': user.tenantId,
        ':isDeleted': false
      }
    }));

    const products = (result.Items || []) as Product[];
    
    // Apply RBAC filtering to the results
    for (const product of products) {
      const hasAccess = await this.canUserAccessProduct(product, user);
      if (hasAccess) {
        console.log(`🔐 [ProductsRBACService] Found accessible product with code ${productCode}`);
        return product;
      }
    }

    console.log(`🔐 [ProductsRBACService] No accessible product found with code ${productCode}`);
    return null;
  }

  /**
   * Search products with RBAC filtering
   */
  async searchProductsForUser(user: RBACUser, searchTerm: string): Promise<Product[]> {
    console.log(`🔐 [ProductsRBACService] Searching products for term "${searchTerm}" by user: ${user.email} (${user.role})`);
    
    // Get all accessible products first
    const accessibleProducts = await this.getProductsForUser(user, false);
    
    // Filter by search term (search in name, productCode, description, notes, category)
    const searchResults = accessibleProducts.filter(product => {
      const searchLower = searchTerm.toLowerCase();
      return (
        product.name?.toLowerCase().includes(searchLower) ||
        product.productCode?.toLowerCase().includes(searchLower) ||
        product.description?.toLowerCase().includes(searchLower) ||
        product.notes?.toLowerCase().includes(searchLower) ||
        product.category?.toLowerCase().includes(searchLower) ||
        product.sku?.toLowerCase().includes(searchLower)
      );
    });

    console.log(`🔐 [ProductsRBACService] Found ${searchResults.length} products matching search term "${searchTerm}"`);
    return searchResults;
  }

  /**
   * Get product statistics with RBAC filtering
   */
  async getProductsStatsForUser(user: RBACUser): Promise<{
    total: number;
    byCategory: Record<string, number>;
    byStatus: Record<string, number>;
    totalValue: number;
    avgPrice: number;
    inStock: number;
    outOfStock: number;
    lowStock: number;
  }> {
    console.log(`🔐 [ProductsRBACService] Getting product stats for user: ${user.email} (${user.role})`);
    
    // Get all accessible products
    const products = await this.getProductsForUser(user, false);
    
    // Calculate statistics
    const byCategory: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    let totalValue = 0;
    let inStock = 0;
    let outOfStock = 0;
    let lowStock = 0;

    products.forEach(product => {
      // Count by category
      const category = product.category || 'Uncategorized';
      byCategory[category] = (byCategory[category] || 0) + 1;
      
      // Count by active status
      const status = product.activeStatus ? 'Active' : 'Inactive';
      byStatus[status] = (byStatus[status] || 0) + 1;
      
      // Sum total value (using unitPrice)
      totalValue += product.unitPrice || 0;
      
      // Count stock status
      const quantity = product.quantityInStock || 0;
      const reorderLevel = product.reorderLevel || 0;
      
      if (quantity === 0) {
        outOfStock++;
      } else if (quantity <= reorderLevel && reorderLevel > 0) {
        lowStock++;
      } else {
        inStock++;
      }
    });

    const stats = {
      total: products.length,
      byCategory,
      byStatus,
      totalValue,
      avgPrice: products.length > 0 ? totalValue / products.length : 0,
      inStock,
      outOfStock,
      lowStock
    };

    console.log(`🔐 [ProductsRBACService] Calculated stats for ${products.length} products`);
    return stats;
  }

  /**
   * Check if user can access a specific product
   */
  private async canUserAccessProduct(product: Product, user: RBACUser): Promise<boolean> {
    // Tenant segregation - first and most important check
    if (product.tenantId !== user.tenantId) {
      console.log(`🔐 [ProductsRBACService] Tenant mismatch: product.tenantId=${product.tenantId}, user.tenantId=${user.tenantId}`);
      return false;
    }

    // Soft delete check
    if (product.isDeleted) {
      console.log(`🔐 [ProductsRBACService] Product ${product.id} is soft deleted`);
      return false;
    }

    switch (user.role) {
      case 'ADMIN':
        // Admin can see all products in their tenant
        return true;

      case 'SALES_MANAGER':
        // Manager can see their own products + products from subordinates
        if (product.productOwner === user.userId) {
          return true;
        }
        
        // Check if product owner is a subordinate
        const subordinates = await this.getSubordinates(user.userId, user.tenantId);
        return subordinates.includes(product.productOwner);

      case 'SALES_REP':
        // Rep can only see products they own
        return product.productOwner === user.userId;

      default:
        return false;
    }
  }

  /**
   * Check if user can access products from a specific owner
   */
  private async canUserAccessProductsFromOwner(ownerId: string, user: RBACUser): Promise<boolean> {
    switch (user.role) {
      case 'ADMIN':
        // Admin can access products from any owner in their tenant
        return true;

      case 'SALES_MANAGER':
        // Manager can access their own products + products from subordinates
        if (ownerId === user.userId) {
          return true;
        }
        
        const subordinates = await this.getSubordinates(user.userId, user.tenantId);
        return subordinates.includes(ownerId);

      case 'SALES_REP':
        // Rep can only access their own products
        return ownerId === user.userId;

      default:
        return false;
    }
  }

  /**
   * Get all subordinates (sales reps) that report to a manager
   */
  private async getSubordinates(managerId: string, tenantId: string): Promise<string[]> {
    try {
      const result = await docClient.send(new ScanCommand({
        TableName: TABLES.USERS,
        FilterExpression: 'reportingTo = :managerId AND #role = :role AND tenantId = :tenantId AND (attribute_not_exists(isDeleted) OR isDeleted = :isDeleted)',
        ExpressionAttributeNames: {
          '#role': 'role'
        },
        ExpressionAttributeValues: {
          ':managerId': managerId,
          ':role': 'SALES_REP',
          ':tenantId': tenantId,
          ':isDeleted': false
        }
      }));

      const subordinateIds = (result.Items || []).map(user => user.userId);
      console.log(`🔐 [ProductsRBACService] Manager ${managerId} has ${subordinateIds.length} subordinates: ${subordinateIds.join(', ')}`);
      
      return subordinateIds;
    } catch (error) {
      console.error(`🔐 [ProductsRBACService] Error getting subordinates for manager ${managerId}:`, error);
      return [];
    }
  }

  /**
   * Build tenant-based filter (always applied first)
   */
  private buildTenantFilter(tenantId: string, includeDeleted: boolean): ProductAccessFilter {
    return {
      filterExpression: includeDeleted 
        ? ''  // No filter needed for tenant as we use KeyConditionExpression
        : '(attribute_not_exists(isDeleted) OR isDeleted = :isDeleted)',
      expressionAttributeValues: {
        ...(includeDeleted ? {} : { ':isDeleted': false })
      }
    };
  }

  /**
   * Build role-based access filter
   */
  private async buildRoleBasedFilter(user: RBACUser): Promise<ProductAccessFilter> {
    switch (user.role) {
      case 'ADMIN':
        // Admin can see all products in tenant (no additional filter needed)
        return {
          filterExpression: '',
          expressionAttributeValues: {}
        };

      case 'SALES_MANAGER':
        // Manager can see their own products + subordinates' products
        const subordinates = await this.getSubordinates(user.userId, user.tenantId);
        const allAccessibleOwners = [user.userId, ...subordinates];
        
        if (allAccessibleOwners.length === 1) {
          return {
            filterExpression: 'productOwner = :userId',
            expressionAttributeValues: {
              ':userId': user.userId
            }
          };
        } else {
          const placeholders = allAccessibleOwners.map((_, index) => `:owner${index}`).join(', ');
          const expressionAttributeValues: Record<string, any> = {};
          
          allAccessibleOwners.forEach((ownerId, index) => {
            expressionAttributeValues[`:owner${index}`] = ownerId;
          });
          
          return {
            filterExpression: `productOwner IN (${placeholders})`,
            expressionAttributeValues
          };
        }

      case 'SALES_REP':
        // Rep can only see their own products
        return {
          filterExpression: 'productOwner = :userId',
          expressionAttributeValues: {
            ':userId': user.userId
          }
        };

      default:
        // No access
        return {
          filterExpression: 'productOwner = :noAccess',
          expressionAttributeValues: {
            ':noAccess': 'NO_ACCESS'
          }
        };
    }
  }

  /**
   * Combine tenant filter and role filter
   */
  private combineFilters(tenantFilter: ProductAccessFilter, roleFilter: ProductAccessFilter): ProductAccessFilter {
    const filters: string[] = [];
    
    if (tenantFilter.filterExpression) {
      filters.push(tenantFilter.filterExpression);
    }
    
    if (roleFilter.filterExpression) {
      filters.push(roleFilter.filterExpression);
    }

    return {
      filterExpression: filters.join(' AND '),
      expressionAttributeValues: {
        ...tenantFilter.expressionAttributeValues,
        ...roleFilter.expressionAttributeValues
      },
      expressionAttributeNames: {
        ...tenantFilter.expressionAttributeNames,
        ...roleFilter.expressionAttributeNames
      }
    };
  }
}

// Export singleton instance
export const productsRBACService = new ProductsRBACService();
