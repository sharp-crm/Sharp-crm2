import { SidebarItem } from '../types';
import { useAuthStore } from '../store/useAuthStore';

// Base items that all users can see
const baseItems: SidebarItem[] = [
  { name: 'Home', path: '/', icon: 'Home' },
  { name: 'Contacts', path: '/contacts', icon: 'Users' },
  { name: 'Leads', path: '/leads', icon: 'UserPlus' },
  { name: 'Deals', path: '/deals', icon: 'Target' },
  { name: 'Tasks', path: '/tasks', icon: 'CheckSquare' },
];

// Admin-only items
const adminItems: SidebarItem[] = [
  { name: 'Subsidiaries', path: '/subsidiaries', icon: 'Building' },
  { name: 'Dealers', path: '/dealers', icon: 'Users' },
];

export const getSidebarItems = (): SidebarItem[] => {
  const user = useAuthStore.getState().user;
  const role = user?.role?.toUpperCase();

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
    ]
  }
];




