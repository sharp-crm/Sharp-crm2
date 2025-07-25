import { useAuthStore } from '../store/useAuthStore';

// Helper function to get user role as string
export const getUserRole = (): string => {
  const user = useAuthStore.getState().user;
  return (user?.role as any)?.toUpperCase() || '';
};

// Check if user is SuperAdmin
export const isSuperAdmin = (): boolean => {
  return getUserRole() === 'SUPER_ADMIN';
};

// Check if user is Admin
export const isAdmin = (): boolean => {
  const role = getUserRole();
  return role === 'ADMIN' || role === 'SUPER_ADMIN';
};

// Check if user is Sales Manager
export const isSalesManager = (): boolean => {
  const role = getUserRole();
  return role === 'SALES_MANAGER' || role === 'ADMIN' || role === 'SUPER_ADMIN';
};

// Check if user is Sales Rep
export const isSalesRep = (): boolean => {
  const role = getUserRole();
  return role === 'SALES_REP' || role === 'SALES_MANAGER' || role === 'ADMIN' || role === 'SUPER_ADMIN';
};

// Get allowed routes for different roles
export const getAllowedRoutes = (): string[] => {
  const role = getUserRole();
  
  switch (role) {
    case 'SUPER_ADMIN':
      return [
        '/',
        '/home',
        '/settings/org-tree',
        '/settings/access-control',
        '/settings/personal',
        '/integrations/email',
        '/team-chat',
        '/profile',
        '/notifications'
      ];
    case 'ADMIN':
      return [
        '/',
        '/leads',
        '/contacts',
        '/deals',
        '/tasks',
        '/subsidiaries',
        '/dealers',
        '/notifications',
        '/profile',
        '/settings/personal',
        '/settings/access-control',
        '/settings/org-tree',
        '/integrations/email',
        '/team-chat',
        '/reports/all',
        '/reports/favourites',
        '/reports/scheduled',
        '/analytics/overview',
        '/analytics/leads',
        '/analytics/deals',
        '/analytics/activity'
      ];
    case 'SALES_MANAGER':
      return [
        '/',
        '/leads',
        '/contacts',
        '/deals',
        '/tasks',
        '/notifications',
        '/profile',
        '/settings/personal',
        '/integrations/email',
        '/team-chat',
        '/reports/all',
        '/reports/favourites',
        '/reports/scheduled',
        '/analytics/overview',
        '/analytics/leads',
        '/analytics/deals',
        '/analytics/activity'
      ];
    case 'SALES_REP':
      return [
        '/',
        '/leads',
        '/contacts',
        '/deals',
        '/tasks',
        '/notifications',
        '/profile',
        '/settings/personal',
        '/integrations/email',
        '/team-chat'
      ];
    default:
      return ['/'];
  }
};

// Check if user has access to a specific route
export const hasRouteAccess = (route: string): boolean => {
  const allowedRoutes = getAllowedRoutes();
  return allowedRoutes.includes(route) || allowedRoutes.some(allowedRoute => 
    route.startsWith(allowedRoute + '/')
  );
};

// Get role display name
export const getRoleDisplayName = (): string => {
  const role = getUserRole();
  switch (role) {
    case 'SUPER_ADMIN':
      return 'Super Admin';
    case 'ADMIN':
      return 'Admin';
    case 'SALES_MANAGER':
      return 'Sales Manager';
    case 'SALES_REP':
      return 'Sales Representative';
    default:
      return 'User';
  }
}; 