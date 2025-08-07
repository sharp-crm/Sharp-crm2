import { useAuthStore } from '../store/useAuthStore';

export type Action = 'view' | 'edit' | 'delete' | 'create';
export type ResourceType = 'lead' | 'contact' | 'deal' | 'product' | 'quote' | 'task' | 'subsidiary' | 'dealer' | 'user';

interface User {
  id: string;
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'manager' | 'rep';
  tenantId: string;
  reportingTo?: string;
  createdBy?: string;
  isDeleted?: boolean;
}

interface Resource {
  id: string;
  createdBy: string;
  tenantId: string;
  [key: string]: any;
}

// Permission matrix - defines what each role can do
const PERMISSIONS = {
  admin: {
    lead: ['view', 'edit', 'delete', 'create'],
    contact: ['view', 'edit', 'delete', 'create'],
    deal: ['view', 'edit', 'delete', 'create'],
    product: ['view', 'edit', 'delete', 'create'],
    quote: ['view', 'edit', 'delete', 'create'],
    task: ['view', 'edit', 'delete', 'create'],
    subsidiary: ['view', 'edit', 'delete', 'create'],
    dealer: ['view', 'edit', 'delete', 'create'],
    user: ['view', 'edit', 'delete', 'create']
  },
  manager: {
    lead: ['view', 'edit', 'delete', 'create'],
    contact: ['view', 'edit', 'delete', 'create'],
    deal: ['view', 'edit', 'delete', 'create'],
    product: ['view', 'edit', 'delete', 'create'],
    quote: ['view', 'edit', 'delete', 'create'],
    task: ['view', 'edit', 'delete', 'create'],
    subsidiary: ['view'], // Can only view subsidiaries
    dealer: ['view'], // Can only view dealers
    user: [] // Cannot manage users
  },
  rep: {
    lead: ['view', 'edit', 'delete', 'create'],
    contact: ['view', 'edit', 'delete', 'create'],
    deal: ['view', 'edit', 'delete', 'create'],
    product: ['view', 'edit', 'delete', 'create'],
    quote: ['view', 'edit', 'delete', 'create'],
    task: ['view', 'edit', 'delete', 'create'],
    subsidiary: [], // Cannot access subsidiaries
    dealer: [], // Cannot access dealers
    user: [] // Cannot manage users
  }
};

/**
 * React hook for checking permissions
 */
export function usePermission() {
  const user = useAuthStore((s) => s.user);

  /**
   * Check if user has permission to perform an action on a resource type
   */
  const can = (action: Action, resourceType: ResourceType): boolean => {
    if (!user) return false;
    
    const userRole = normalizeRole(user.role);
    return PERMISSIONS[userRole]?.[resourceType]?.includes(action) || false;
  };

  /**
   * Check if user can view a specific resource type
   */
  const canView = (resourceType: ResourceType): boolean => can('view', resourceType);

  /**
   * Check if user can edit a specific resource type
   */
  const canEdit = (resourceType: ResourceType): boolean => can('edit', resourceType);

  /**
   * Check if user can delete a specific resource type
   */
  const canDelete = (resourceType: ResourceType): boolean => can('delete', resourceType);

  /**
   * Check if user can create a specific resource type
   */
  const canCreate = (resourceType: ResourceType): boolean => can('create', resourceType);

  /**
   * Check if user can access a specific resource (ownership check)
   */
  const canAccessResource = (resource: Resource, action: Action, resourceType: ResourceType): boolean => {
    if (!user) return false;
    
    const userRole = normalizeRole(user.role);
    
    // Check if user has permission for this resource type and action
    if (!PERMISSIONS[userRole]?.[resourceType]?.includes(action)) {
      return false;
    }

    // Admin has full access to all resources in their tenant
    if (userRole === 'admin') {
      return resource.tenantId === user.tenantId;
    }

    // Manager can access their own resources and resources created by their reporting reps
    if (userRole === 'manager') {
      // Own resources
      if (resource.createdBy === user.userId) {
        return true;
      }
      
      // For now, we'll assume managers can access all resources in their tenant
      // In a real implementation, you'd check the reporting hierarchy
      return resource.tenantId === user.tenantId;
    }

    // Rep can only access their own resources
    if (userRole === 'rep') {
      return resource.createdBy === user.userId;
    }

    return false;
  };

  /**
   * Get all permissions for the current user
   */
  const getUserPermissions = (): Record<ResourceType, Action[]> => {
    if (!user) return {} as Record<ResourceType, Action[]>;
    
    const userRole = normalizeRole(user.role);
    return PERMISSIONS[userRole] || {} as Record<ResourceType, Action[]>;
  };

  return {
    can,
    canView,
    canEdit,
    canDelete,
    canCreate,
    canAccessResource,
    getUserPermissions,
    user
  };
}

/**
 * Normalize role string to our internal format
 */
function normalizeRole(role: string): 'admin' | 'manager' | 'rep' {
  const normalized = role.toLowerCase();
  if (normalized === 'admin' || normalized === 'super_admin') return 'admin';
  if (normalized === 'manager' || normalized === 'sales_manager') return 'manager';
  if (normalized === 'rep' || normalized === 'sales_rep') return 'rep';
  return 'rep'; // Default to rep
} 