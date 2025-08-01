import { SidebarItem } from '../types';
import { useAuthStore } from '../store/useAuthStore';
import { isSuperAdmin as checkIsSuperAdmin } from '../utils/roleAccess';

// Type assertion to handle the role as string (as it's actually used in the codebase)
type UserWithStringRole = {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  tenantId?: string;
  createdBy?: string;
  phoneNumber?: string;
};

// Base items that all users can see
const baseItems: SidebarItem[] = [
  { name: 'Home', path: '/', icon: 'Home' },
  { name: 'Leads', path: '/leads', icon: 'UserPlus' },
  { name: 'Contacts', path: '/contacts', icon: 'Users' },
  { name: 'Deals', path: '/deals', icon: 'Target' },
  { name: 'Tasks', path: '/tasks', icon: 'CheckSquare' },
  { name: 'Products', path: '/products', icon: 'Package' },
  { name: 'Quotes', path: '/quotes', icon: 'FileText' },
];

// Admin-only items
const adminItems: SidebarItem[] = [
  { name: 'Subsidiaries', path: '/subsidiaries', icon: 'Building' },
  { name: 'Dealers', path: '/dealers', icon: 'Users' },
];

// SuperAdmin-specific items (standalone, not in dropdowns)
const superAdminItems: SidebarItem[] = [
  { name: 'Home', path: '/home', icon: 'Home' },
  { name: 'Organisational Tree', path: '/settings/org-tree', icon: 'Network' },
  { name: 'Access Control', path: '/settings/access-control', icon: 'Users' },
  { name: 'Personal', path: '/settings/personal', icon: 'User' },
  { name: 'Email Integration', path: '/integrations/email', icon: 'Mail' },
  { name: 'Team Chat', path: '/team-chat', icon: 'MessageSquare' },
];

export const getSidebarItems = (): SidebarItem[] => {
  const user = useAuthStore.getState().user;
  // Type assertion to handle role as string (as it's actually used in the codebase)
  const role = (user?.role as any)?.toUpperCase();

  // SuperAdmin gets their own specific items
  if (role === 'SUPER_ADMIN') {
    return superAdminItems;
  }

  // If user is a sales rep, only show base items
  if (role === 'SALES_REP') {
    return baseItems;
  }

  // For admin roles and others, show all items
  return [...baseItems, ...adminItems];
};

export const chatItems: SidebarItem[] = [
  {
    name: 'Team Chat',
    path: '/team-chat',
    icon: 'MessageSquare',
  }
];

export const modulesItem: SidebarItem = {
  name: 'Modules',
  path: '/modules',
  icon: 'LayoutGrid',
  children: getSidebarItems()
};

export const reportsItems: SidebarItem[] = [
  {
    name: 'Reports',
    path: '/reports',
    icon: 'BarChart3',
    children: [
      { name: 'All Reports', path: '/reports/all', icon: 'FileBarChart' },
      { name: 'Favourites', path: '/reports/favourites', icon: 'Star' },
      { name: 'Scheduled Reports', path: '/reports/scheduled', icon: 'Calendar' },
    ]
  }
];

export const analyticsItems: SidebarItem[] = [
  {
    name: 'Analytics',
    path: '/analytics',
    icon: 'PieChart',
    children: [
      { name: 'Org Overview', path: '/analytics/overview', icon: 'Building2' },
      { name: 'Lead Analytics', path: '/analytics/leads', icon: 'UserPlus' },
      { name: 'Deal Insights', path: '/analytics/deals', icon: 'Target' },
      { name: 'Activity Stats', path: '/analytics/activity', icon: 'Activity' }
    ]
  }
];

export const settingsItems: SidebarItem[] = [
  {
    name: 'Settings',
    path: '/settings',
    icon: 'Settings',
    children: [
      { name: 'Personal Settings', path: '/settings/personal', icon: 'User' },
      { name: 'Access Control', path: '/settings/access-control', icon: 'Users' },
      { name: 'Organisation Tree', path: '/settings/org-tree', icon: 'Network' },
    ]
  }
];

// Helper function to check if user is SuperAdmin
export const isSuperAdmin = (): boolean => {
  return checkIsSuperAdmin();
};

// Helper function to get SuperAdmin-specific sidebar items
export const getSuperAdminSidebarItems = (): SidebarItem[] => {
  return superAdminItems;
};




