import API from './client';
import { Deal as DealType } from '../types';

// Types for API responses
export interface Lead {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  company: string;
  title?: string;
  leadOwner: string;
  leadSource: string;
  leadStatus: string;
  value?: number;
  description?: string;
  source: string;
  status: string;
  // Address fields
  street?: string;
  area?: string;
  city?: string;
  state?: string;
  country?: string;
  zipCode?: string;
  // Auditing fields
  createdBy: string;
  createdAt: string;
  updatedBy?: string;
  updatedAt?: string;
  isDeleted?: boolean;
  userId: string;
  tenantId: string;
  visibleTo?: string[];
}

export interface Contact {
  id: string;
  // Required fields from AddNewModal
  contactOwner: string;
  firstName: string;
  companyName: string;
  email: string;
  leadSource: string;
  
  // Optional fields from AddNewModal
  phone?: string;
  title?: string;
  department?: string;
  
  // Address fields
  street?: string;
  area?: string;
  city?: string;
  state?: string;
  country?: string;
  zipCode?: string;
  
  // Additional field
  description?: string;
  status?: string;
  
  // Visibility field
  visibleTo?: string[];
  
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

export interface Deal extends Omit<DealType, 'stage'> {
  stage: DealType['stage'];
  // Required fields from AddNewModal
  dealOwner: string;
  dealName: string;
  leadSource: string;
  amount: number;
  
  // Optional fields from AddNewModal  
  description?: string;
  
  // Additional fields for deal functionality
  value?: number; // same as amount for backward compatibility
  probability?: number;
  closeDate?: string;
  
  // Visibility field
  visibleTo: string[]; // Making this required but can be empty array
  
  // Backward compatibility fields
  name?: string; // maps to dealName
  owner?: string; // maps to dealOwner
  
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

import { TaskStatus } from '../types';

export interface Task {
  id: string;
  title: string;
  description: string;
  priority: 'Low' | 'Medium' | 'High';
  status: TaskStatus;
  dueDate: string;
  assignee: string;
  type: 'Call' | 'Email' | 'Meeting' | 'Follow-up' | 'Demo';
  tenantId: string;
  createdAt: string;
  visibleTo?: string[];
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

// Helper function to handle API errors
const handleApiError = (error: any) => {
  if (error.response) {
    // Server responded with error status
    console.error('API Error:', error.response.data);
    throw new Error(error.response.data.error || error.response.data.message || 'Server error');
  } else if (error.request) {
    // Request made but no response received
    console.error('Network Error:', error.request);
    throw new Error('Network error - please check your connection');
  } else {
    // Something else happened
    console.error('Error:', error.message);
    throw new Error(error.message || 'An unexpected error occurred');
  }
};

// Leads API
export const leadsApi = {
  getAll: async (): Promise<Lead[]> => {
    try {
      const response = await API.get<ApiResponse<Lead[]>>('/leads');
      return response.data.data || [];
    } catch (error) {
      handleApiError(error);
      return [];
    }
  },

  getById: async (id: string): Promise<Lead | null> => {
    try {
      const response = await API.get<ApiResponse<Lead>>(`/leads/${id}`);
      return response.data.data;
    } catch (error) {
      handleApiError(error);
      return null;
    }
  },

  create: async (lead: Omit<Lead, 'id' | 'tenantId' | 'createdAt' | 'createdBy' | 'updatedBy' | 'updatedAt' | 'isDeleted' | 'userId'>): Promise<Lead> => {
    try {
      const response = await API.post<ApiResponse<Lead>>('/leads', lead);
      return response.data.data;
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },

  update: async (id: string, updates: Partial<Lead>): Promise<Lead> => {
    try {
      const response = await API.put<ApiResponse<Lead>>(`/leads/${id}`, updates);
      return response.data.data;
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },

  delete: async (id: string): Promise<void> => {
    try {
      await API.delete(`/leads/${id}`);
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  }
};

// Contacts API
export const contactsApi = {
  getAll: async (): Promise<Contact[]> => {
    try {
      const response = await API.get<ApiResponse<Contact[]>>('/contacts');
      return response.data.data || [];
    } catch (error) {
      handleApiError(error);
      return [];
    }
  },

  getById: async (id: string): Promise<Contact | null> => {
    try {
      const response = await API.get<ApiResponse<Contact>>(`/contacts/${id}`);
      return response.data.data;
    } catch (error) {
      handleApiError(error);
      return null;
    }
  },

  create: async (contact: Omit<Contact, 'id' | 'tenantId' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy' | 'isDeleted' | 'userId'>): Promise<Contact> => {
    try {
      const response = await API.post<ApiResponse<Contact>>('/contacts', contact);
      return response.data.data;
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },

  update: async (id: string, updates: Partial<Contact>): Promise<Contact> => {
    try {
      const response = await API.put<ApiResponse<Contact>>(`/contacts/${id}`, updates);
      return response.data.data;
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },

  delete: async (id: string): Promise<void> => {
    try {
      await API.delete(`/contacts/${id}`);
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  }
};

// Deals API
export const dealsApi = {
  getAll: async (): Promise<Deal[]> => {
    try {
      const response = await API.get<ApiResponse<Deal[]>>('/deals');
      return response.data.data || [];
    } catch (error) {
      handleApiError(error);
      return [];
    }
  },

  getById: async (id: string): Promise<Deal | null> => {
    try {
      const response = await API.get<ApiResponse<Deal>>(`/deals/${id}`);
      return response.data.data;
    } catch (error) {
      handleApiError(error);
      return null;
    }
  },

  create: async (deal: {
    dealOwner: string;
    dealName: string;
    leadSource: string;
    stage: string;
    amount: number;
    description?: string;
    probability?: number;
    closeDate?: string;
    visibleTo: string[];
  }): Promise<Deal> => {
    try {
      const response = await API.post<ApiResponse<Deal>>('/deals', deal);
      return response.data.data;
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },

  update: async (id: string, updates: Partial<Deal>): Promise<Deal> => {
    try {
      const response = await API.put<ApiResponse<Deal>>(`/deals/${id}`, updates);
      return response.data.data;
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },

  delete: async (id: string): Promise<void> => {
    try {
      await API.delete(`/deals/${id}`);
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },

  getByOwner: async (owner: string): Promise<Deal[]> => {
    try {
      const response = await API.get<ApiResponse<Deal[]>>(`/deals/owner/${owner}`);
      return response.data.data || [];
    } catch (error) {
      handleApiError(error);
      return [];
    }
  },

  getByStage: async (stage: string): Promise<Deal[]> => {
    try {
      const response = await API.get<ApiResponse<Deal[]>>(`/deals/stage/${stage}`);
      return response.data.data || [];
    } catch (error) {
      handleApiError(error);
      return [];
    }
  },

  search: async (query: string): Promise<Deal[]> => {
    try {
      const response = await API.get<ApiResponse<Deal[]>>(`/deals/search?q=${encodeURIComponent(query)}`);
      return response.data.data || [];
    } catch (error) {
      handleApiError(error);
      return [];
    }
  },

  getStats: async (): Promise<{
    total: number;
    totalValue: number;
    byStage: Record<string, number>;
  }> => {
    try {
      const response = await API.get<ApiResponse<{
        total: number;
        totalValue: number;
        byStage: Record<string, number>;
      }>>('/deals/stats');
      return response.data.data;
    } catch (error) {
      handleApiError(error);
      return {
        total: 0,
        totalValue: 0,
        byStage: {}
      };
    }
  },

  restore: async (id: string): Promise<void> => {
    try {
      await API.post(`/deals/${id}/restore`);
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },

  hardDelete: async (id: string): Promise<void> => {
    try {
      await API.delete(`/deals/${id}/hard`);
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  }
};

// Tasks API
export const tasksApi = {
  getAll: async (): Promise<Task[]> => {
    try {
      const response = await API.get<ApiResponse<Task[]>>('/tasks');
      return response.data.data || [];
    } catch (error) {
      handleApiError(error);
      return [];
    }
  },

  getById: async (id: string): Promise<Task | null> => {
    try {
      const response = await API.get<ApiResponse<Task>>(`/tasks/${id}`);
      return response.data.data;
    } catch (error) {
      handleApiError(error);
      return null;
    }
  },

  create: async (task: Omit<Task, 'id' | 'createdAt'>): Promise<Task> => {
    try {
      const response = await API.post<ApiResponse<Task>>('/tasks', task);
      return response.data.data;
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },

  update: async (id: string, updates: Partial<Task>): Promise<Task> => {
    try {
      const response = await API.put<ApiResponse<Task>>(`/tasks/${id}`, updates);
      return response.data.data;
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },

  delete: async (id: string): Promise<void> => {
    try {
      await API.delete(`/tasks/${id}`);
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  }
};

// Subsidiaries API
export interface Subsidiary {
  id: string;
  name: string;
  email: string;
  contact: string;
  address: string;
  totalEmployees: number;
  visibleTo?: string[];
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

export const subsidiariesApi = {
  getAll: async (): Promise<Subsidiary[]> => {
    try {
      const response = await API.get<ApiResponse<Subsidiary[]>>('/subsidiaries');
      return response.data.data || [];
    } catch (error) {
      handleApiError(error);
      return [];
    }
  },

  getById: async (id: string): Promise<Subsidiary | null> => {
    try {
      const response = await API.get<ApiResponse<Subsidiary>>(`/subsidiaries/${id}`);
      return response.data.data;
    } catch (error) {
      handleApiError(error);
      return null;
    }
  },

  create: async (subsidiary: Omit<Subsidiary, 'id' | 'createdBy' | 'createdAt' | 'updatedBy' | 'updatedAt' | 'deletedBy' | 'isDeleted' | 'deletedAt' | 'userId' | 'tenantId'>): Promise<Subsidiary> => {
    try {
      const response = await API.post<ApiResponse<Subsidiary>>('/subsidiaries', subsidiary);
      return response.data.data;
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },

  update: async (id: string, updates: Partial<Subsidiary>): Promise<Subsidiary> => {
    try {
      const response = await API.put<ApiResponse<Subsidiary>>(`/subsidiaries/${id}`, updates);
      return response.data.data;
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },

  delete: async (id: string): Promise<void> => {
    try {
      await API.delete(`/subsidiaries/${id}`);
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },

  restore: async (id: string): Promise<void> => {
    try {
      await API.patch(`/subsidiaries/${id}/restore`);
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },

  hardDelete: async (id: string): Promise<void> => {
    try {
      await API.delete(`/subsidiaries/${id}/hard`);
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },

  search: async (searchTerm: string, limit?: number): Promise<Subsidiary[]> => {
    try {
      const params = new URLSearchParams({ q: searchTerm });
      if (limit) params.append('limit', limit.toString());
      
      const response = await API.get<ApiResponse<Subsidiary[]>>(`/subsidiaries/search?${params}`);
      return response.data.data || [];
    } catch (error) {
      handleApiError(error);
      return [];
    }
  },

  getStats: async (): Promise<any> => {
    try {
      const response = await API.get<ApiResponse<any>>('/subsidiaries/stats');
      return response.data.data;
    } catch (error) {
      handleApiError(error);
      return null;
    }
  }
};

// Dealers API
export interface Dealer {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  status: string;
  territory: string;
  location: string;
  visibleTo?: string[];
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

export const dealersApi = {
  getAll: async (): Promise<Dealer[]> => {
    try {
      const response = await API.get<ApiResponse<Dealer[]>>('/dealers');
      return response.data.data || [];
    } catch (error) {
      handleApiError(error);
      return [];
    }
  },

  getById: async (id: string): Promise<Dealer | null> => {
    try {
      const response = await API.get<ApiResponse<Dealer>>(`/dealers/${id}`);
      return response.data.data;
    } catch (error) {
      handleApiError(error);
      return null;
    }
  },

  create: async (dealer: Omit<Dealer, 'id' | 'createdBy' | 'createdAt' | 'updatedBy' | 'updatedAt' | 'deletedBy' | 'isDeleted' | 'deletedAt' | 'userId' | 'tenantId'>): Promise<Dealer> => {
    try {
      const response = await API.post<ApiResponse<Dealer>>('/dealers', dealer);
      return response.data.data;
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },

  update: async (id: string, updates: Partial<Dealer>): Promise<Dealer> => {
    try {
      const response = await API.put<ApiResponse<Dealer>>(`/dealers/${id}`, updates);
      return response.data.data;
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },

  delete: async (id: string): Promise<void> => {
    try {
      await API.delete(`/dealers/${id}`);
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },

  restore: async (id: string): Promise<void> => {
    try {
      await API.patch(`/dealers/${id}/restore`);
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },

  hardDelete: async (id: string): Promise<void> => {
    try {
      await API.delete(`/dealers/${id}/hard`);
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },

  search: async (searchTerm: string, limit?: number): Promise<Dealer[]> => {
    try {
      const params = new URLSearchParams({ q: searchTerm });
      if (limit) params.append('limit', limit.toString());
      
      const response = await API.get<ApiResponse<Dealer[]>>(`/dealers/search?${params}`);
      return response.data.data || [];
    } catch (error) {
      handleApiError(error);
      return [];
    }
  },

  getStats: async (): Promise<any> => {
    try {
      const response = await API.get<ApiResponse<any>>('/dealers/stats');
      return response.data.data;
    } catch (error) {
      handleApiError(error);
      return null;
    }
  },

  getByTerritory: async (territory: string): Promise<Dealer[]> => {
    try {
      const response = await API.get<ApiResponse<Dealer[]>>(`/dealers/territory/${encodeURIComponent(territory)}`);
      return response.data.data || [];
    } catch (error) {
      handleApiError(error);
      return [];
    }
  }
};

// Reports API
export interface Report {
  id: string;
  name: string;
  description?: string;
  reportType: string;
  filters?: any;
  columns?: string[];
  chartType?: string;
  schedule?: string;
  isPublic: boolean;
  isFavorite: boolean;
  status: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  lastRun?: string;
  runCount: number;
  sharedWith: string[];
  data?: any;
  tenantId: string;
}

export const reportsApi = {
  getAll: async (): Promise<Report[]> => {
    try {
      const response = await API.get<ApiResponse<Report[]>>('/reports');
      return response.data.data || [];
    } catch (error) {
      handleApiError(error);
      return [];
    }
  },

  generate: async (data: {
    reportType: string;
    name: string;
    description: string;
    isPublic: boolean;
  }): Promise<Report> => {
    try {
      // First create the report
      const createResponse = await API.post<ApiResponse<Report>>('/reports', {
        ...data,
        filters: {},
        columns: [],
        chartType: 'table',
        schedule: null,
        isFavorite: false,
        status: 'active'
      });
      
      const report = createResponse.data.data;
      
      // Then run the report to generate data
      const runResponse = await API.post<ApiResponse<any>>(`/reports/${report.id}/run`);
      
      // The run response contains the report data, but we need to return the updated report
      // So we fetch the report again to get the updated version with data
      const updatedReport = await reportsApi.getById(report.id);
      return updatedReport || report;
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },

  getById: async (id: string): Promise<Report | null> => {
    try {
      const response = await API.get<ApiResponse<Report>>(`/reports/${id}`);
      return response.data.data;
    } catch (error) {
      handleApiError(error);
      return null;
    }
  },

  create: async (report: Omit<Report, 'id' | 'createdBy' | 'createdAt' | 'updatedAt' | 'lastRun' | 'runCount' | 'sharedWith'>): Promise<Report> => {
    try {
      const response = await API.post<ApiResponse<Report>>('/reports', report);
      return response.data.data;
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },

  update: async (id: string, updates: Partial<Report>): Promise<Report> => {
    try {
      const response = await API.put<ApiResponse<Report>>(`/reports/${id}`, updates);
      return response.data.data;
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },

  delete: async (id: string): Promise<void> => {
    try {
      await API.delete(`/reports/${id}`);
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },

  getFavorites: async (): Promise<Report[]> => {
    try {
      const allReports = await reportsApi.getAll();
      return allReports.filter(report => report.isFavorite);
    } catch (error) {
      handleApiError(error);
      return [];
    }
  },

  getScheduled: async (): Promise<Report[]> => {
    try {
      const response = await API.get<ApiResponse<Report[]>>('/reports/scheduled/list');
      return response.data.data || [];
    } catch (error) {
      handleApiError(error);
      return [];
    }
  },

  toggleFavorite: async (id: string, isFavorite: boolean): Promise<Report> => {
    try {
      const response = await API.patch<ApiResponse<Report>>(`/reports/${id}/favorite`, { isFavorite });
      return response.data.data;
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  }
};

// Analytics API
export const analyticsApi = {
  getOverview: async () => {
    try {
      // Get real data from our existing APIs
      const [leads, contacts, deals, tasks] = await Promise.all([
        leadsApi.getAll(),
        contactsApi.getAll(),
        dealsApi.getAll(),
        tasksApi.getAll()
      ]);

      // Calculate analytics based on real data
      const totalDeals = deals.length;
      const activeDeals = deals.filter(d => d.stage !== 'Closed Won' && d.stage !== 'Closed Lost').length;
      const wonDeals = deals.filter(d => d.stage === 'Closed Won').length;
      const lostDeals = deals.filter(d => d.stage === 'Closed Lost').length;
      
      const totalRevenue = deals
        .filter(d => d.stage === 'Closed Won')
        .reduce((sum, deal) => sum + (deal.value || 0), 0);

      const conversionRate = totalDeals > 0 ? ((wonDeals / totalDeals) * 100) : 0;

      // Calculate pipeline value
      const pipelineValue = deals
        .filter(d => d.stage !== 'Closed Won' && d.stage !== 'Closed Lost')
        .reduce((sum, deal) => sum + (deal.value || 0), 0);

      return {
        totalRevenue,
        activeDeals,
        conversionRate: parseFloat(conversionRate.toFixed(1)),
        teamPerformance: 94, // This would need user performance data
        totalLeads: leads.length,
        totalContacts: contacts.length,
        totalTasks: tasks.length,
        pipelineValue,
        deals: {
          total: totalDeals,
          active: activeDeals,
          won: wonDeals,
          lost: lostDeals
        }
      };
    } catch (error) {
      console.error('Analytics overview error:', error);
      // Fallback to default values if APIs fail
      return {
        totalRevenue: 0,
        activeDeals: 0,
        conversionRate: 0,
        teamPerformance: 0,
        totalLeads: 0,
        totalContacts: 0,
        totalTasks: 0,
        pipelineValue: 0,
        deals: { total: 0, active: 0, won: 0, lost: 0 }
      };
    }
  },

  getLeadAnalytics: async () => {
    try {
      const leads = await leadsApi.getAll();

      // Calculate lead sources (check both leadSource and source fields)
      const sourceMap = new Map();
      leads.forEach(lead => {
        // Use leadSource first, fallback to source field, then 'Unknown'
        let source = lead.leadSource || lead.source;
        
        // Clean up the source value
        if (!source || source.trim() === '' || source === 'undefined' || source === 'null') {
          source = 'Unknown';
        }
        
        sourceMap.set(source, (sourceMap.get(source) || 0) + 1);
      });

      const leadSources = Array.from(sourceMap.entries()).map(([name, value]) => ({
        name,
        value
      }));

      // Calculate lead status distribution (try both leadStatus and status fields)
      const statusMap = new Map();
      leads.forEach(lead => {
        let status = lead.leadStatus || lead.status;
        
        // Clean up the status value
        if (!status || status.trim() === '' || status === 'undefined' || status === 'null') {
          status = 'New';
        }
        
        statusMap.set(status, (statusMap.get(status) || 0) + 1);
      });

      const leadStatusData = Array.from(statusMap.entries()).map(([status, count]) => ({
        status,
        count
      }));

      // Calculate conversion rate (use both status fields)
      const qualifiedLeads = leads.filter(l => {
        const status = l.leadStatus || l.status || '';
        return status.toLowerCase().includes('qualified');
      }).length;
      const conversionRate = leads.length > 0 ? ((qualifiedLeads / leads.length) * 100) : 0;

      return {
        totalLeads: leads.length,
        qualifiedLeads,
        conversionRate: parseFloat(conversionRate.toFixed(1)),
        averageValue: 1250, // This would need deal conversion tracking
        leadSources,
        leadStatusData
      };
    } catch (error) {
      console.error('Lead analytics error:', error);
      return {
        totalLeads: 0,
        qualifiedLeads: 0,
        conversionRate: 0,
        averageValue: 0,
        leadSources: [],
        leadStatusData: []
      };
    }
  },

  getDealInsights: async () => {
    try {
      const deals = await dealsApi.getAll();

      // Calculate deal stages
      const stageMap = new Map();
      deals.forEach(deal => {
        const stage = deal.stage || 'Prospecting';
        stageMap.set(stage, (stageMap.get(stage) || 0) + 1);
      });

      const dealStages = Array.from(stageMap.entries()).map(([stage, count]) => ({
        stage,
        count
      }));

      // Calculate win rate
      const closedDeals = deals.filter(d => d.stage === 'Closed Won' || d.stage === 'Closed Lost');
      const wonDeals = deals.filter(d => d.stage === 'Closed Won');
      const winRate = closedDeals.length > 0 ? ((wonDeals.length / closedDeals.length) * 100) : 0;

      // Calculate average deal size
      const avgDealSize = wonDeals.length > 0 
        ? wonDeals.reduce((sum, deal) => sum + (deal.value || 0), 0) / wonDeals.length
        : 0;

      return {
        totalDeals: deals.length,
        winRate: parseFloat(winRate.toFixed(1)),
        avgDealSize: Math.round(avgDealSize),
        totalValue: deals.reduce((sum, deal) => sum + (deal.value || 0), 0),
        dealStages
      };
    } catch (error) {
      console.error('Deal insights error:', error);
      return {
        totalDeals: 0,
        winRate: 0,
        avgDealSize: 0,
        totalValue: 0,
        dealStages: []
      };
    }
  },

  getActivityStats: async () => {
    try {
      const [leads, contacts, deals, tasks] = await Promise.all([
        leadsApi.getAll(),
        contactsApi.getAll(),
        dealsApi.getAll(),
        tasksApi.getAll()
      ]);

      const completedTasks = tasks.filter(t => t.status === 'Completed').length;
      const pendingTasks = tasks.filter(t => t.status === 'In Progress' || t.status === 'Open').length;

      return {
        totalActivities: tasks.length + leads.length + contacts.length,
        completedTasks,
        pendingTasks,
        leadsGenerated: leads.length,
        contactsAdded: contacts.length,
        dealsCreated: deals.length
      };
    } catch (error) {
      console.error('Activity stats error:', error);
      return {
        totalActivities: 0,
        completedTasks: 0,
        pendingTasks: 0,
        leadsGenerated: 0,
        contactsAdded: 0,
        dealsCreated: 0
      };
    }
  },

  getChartData: async () => {
    try {
      const deals = await dealsApi.getAll();
      
      // Generate chart data for the last 6 months
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
      return months.map(month => ({
        month,
        revenue: Math.floor(Math.random() * 50000) + 30000, // Placeholder until we have date-based filtering
        deals: Math.floor(Math.random() * 20) + 10
      }));
    } catch (error) {
      console.error('Chart data error:', error);
      return [];
    }
  }
};

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  tenantId: string;
  firstName?: string;
  lastName?: string;
  reportingTo?: string;
  permissions?: string[];
  isDeleted?: boolean;
  createdAt?: string;
  phoneNumber?: string;
}

export const usersApi = {
  getAll: async (): Promise<User[]> => {
    const response = await API.get('/users/tenant-users');
    return response.data.data;
  },

  getById: async (id: string): Promise<User> => {
    const response = await API.get(`/users/${id}`);
    return response.data.data;
  },

  create: async (data: Partial<User>): Promise<User> => {
    const response = await API.post('/users', data);
    return response.data.data;
  },

  update: async (id: string, data: Partial<User>): Promise<User> => {
    const response = await API.put(`/users/${id}`, data);
    return response.data.data;
  },

  delete: async (id: string): Promise<void> => {
    await API.delete(`/users/${id}`);
  }
}; 