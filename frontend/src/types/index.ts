export interface Role {
  id: string;
  name: string;
  permissions: string[]; // List of permission keys
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: Role;
  department: string;
  userId: string;
  firstName: string;
  lastName: string;
  domain?: string;
  profileImage?: string;
  phoneNumber?: string;
}

export interface Lead {
  id: string;
  // Required fields from AddNewModal
  leadOwner: string;
  firstName: string;
  lastName: string;
  company: string;
  email: string;
  leadSource: string;
  leadStatus: string;
  
  // Optional fields from AddNewModal
  phone?: string;
  title?: string;
  
  // Address fields
  street?: string;
  area?: string;
  city?: string;
  state?: string;
  country?: string;
  zipCode?: string;
  
  // Additional fields
  description?: string;
  value?: number;
  
  // Auditing fields
  createdBy: string;
  createdAt: string;
  updatedBy: string;
  updatedAt: string;
  deletedBy?: string;
  isDeleted: boolean;
  deletedAt?: string;
  userId: string;
  tenantId: string;
}

export interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  companyName: string;
  title?: string;
  status: 'Active' | 'Inactive';
  createdAt: string;
  visibleTo?: string[];
}

export const DEAL_STAGES = [
  'Needs Analysis',
  'Value Proposition',
  'Identify Decision Makers',
  'Negotiation/Review',
  'Closed Won',
  'Closed Lost',
  'Closed Lost to Competition'
] as const;

export const TASK_STATUSES = [
  'Open',
  'Not Started', 
  'Deferred',
  'In Progress',
  'Completed'
] as const;

export type DealStage = typeof DEAL_STAGES[number];
export type TaskStatus = typeof TASK_STATUSES[number];

export interface Deal {
  id: string;
  name?: string;
  dealName: string;
  dealOwner: string;
  owner?: string;
  stage: DealStage;
  amount: number;
  value?: number;
  probability?: number;
  closeDate?: string;
  leadSource: string;
  description?: string;
  phone?: string;
  email?: string;
  visibleTo: string[];
  createdBy: string;
  createdAt: string;
  updatedBy: string;
  updatedAt: string;
  isDeleted: boolean;
  userId: string;
  tenantId: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  priority: 'Low' | 'Normal' | 'High';
  status: TaskStatus;
  dueDate: string;
  assignee: string;
  type: 'Call' | 'Email' | 'Meeting' | 'Follow-up' | 'Demo';
  tenantId: string;
  
  // Audit fields
  createdAt: string;
  createdBy?: string;
  updatedAt?: string;
  updatedBy?: string;
  deletedAt?: string;
  deletedBy?: string;
  isDeleted?: boolean;
  
  // Visibility field
  visibleTo?: string[];
}

export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  cost: number;
  description: string;
  inStock: boolean;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  timestamp: string;
  read: boolean;
}

export interface SidebarItem {
  name: string;
  path: string;
  icon: string;
  children?: SidebarItem[];
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  type: 'meeting' | 'call' | 'task' | 'demo';
  attendees?: string[];
}

export type ViewType = 'list' | 'kanban' | 'grid' | 'timeline' | 'chart';

export interface Dealer {
  id: string;
  name: string;
  type: string;
  email: string;
  phone: string;
  website: string;
  status: 'Active' | 'Inactive';
  description: string;
  createdAt: string;
  visibleTo: string[];
}

export interface Subsidiary {
  id: string;
  name: string;
  type: string;
  email: string;
  phone: string;
  website: string;
  registrationNumber: string;
  status: 'Active' | 'Inactive';
  description: string;
  createdAt: string;
  visibleTo: string[];
}

export interface TenantUser {
  id?: string;
  userId?: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;  // Add role property
  tenantId: string;
}

export interface FormFieldOption {
  value: string;
  label: string;
}

export interface FormField {
  name: string;
  label: string;
  type: string;
  required?: boolean;
  options?: FormFieldOption[];
  group?: string;
  help?: string;  // Add help property for field description
}

export type Report = {
  id: string;
  title: string;
  module: string;
  createdBy: string;
  createdAt: string;
  lastViewed?: string;
  isFavorite?: boolean;
  schedule?: string;
};

export interface Quote {
  id: string;
  
  // Basic Quote Info
  quoteNumber: string;
  quoteName: string;
  quoteOwner: string;
  status: 'Draft' | 'Sent' | 'Accepted' | 'Rejected' | 'Expired';
  validUntil: string;
  activeStatus: boolean;
  
  // Customer Info
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  
  // Line Items
  lineItems: LineItem[];
  
  // Pricing Info
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  adjustment: number;
  totalAmount: number;
  
  // Quote Details
  description: string;
  terms: string;
  notes: string;
  
  // Audit fields
  createdBy: string;
  createdAt: string;
  updatedBy: string;
  updatedAt: string;
  deletedBy?: string;
  isDeleted: boolean;
  deletedAt?: string;
  userId: string;
  tenantId: string;
  visibleTo?: string[];
}

export interface LineItem {
  id: string;
  productName: string;
  productId: string; // Add productId for database relationship
  description: string;
  quantity: number;
  listPrice: number;
  amount: number;
  discount: number;
  tax: number;
}