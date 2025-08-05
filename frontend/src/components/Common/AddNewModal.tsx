import React, { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import * as Icons from 'lucide-react';
import { createPortal } from 'react-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { useNotificationStore } from '../../store/useNotificationStore';
import { useToastStore } from '../../store/useToastStore';
import { contactsApi, leadsApi, dealsApi, dealersApi, subsidiariesApi, tasksApi, productsApi, quotesApi, Task } from '../../api/services';
import PhoneNumberInput from './PhoneNumberInput';
import LineItemsInput from './LineItemsInput';
import API from '../../api/client';
import { DEAL_STAGES, TASK_STATUSES } from '../../types';
import { useRef } from 'react';

interface AddNewModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultType?: string;
  onSuccess?: () => void;
  prefillData?: Record<string, any>;
}

interface TenantUser {
  userId?: string;
  id?: string;
  firstName: string;
  lastName: string;
  email: string;
  role?: string;
}

interface FormFieldOption {
  value: string;
  label: string;
}

interface FormField {
  name: string;
  label: string;
  type: 'text' | 'tel' | 'email' | 'select' | 'multiselect' | 'textarea' | 'date' | 'number' | 'lineItems';
  required?: boolean;
  group?: string;
  options?: FormFieldOption[];
}

const AddNewModal: React.FC<AddNewModalProps> = ({ isOpen, onClose, defaultType, onSuccess, prefillData }): JSX.Element => {
  const [selectedType, setSelectedType] = useState<string>();
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [tenantUsers, setTenantUsers] = useState<TenantUser[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [contacts, setContacts] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [deals, setDeals] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [quotes, setQuotes] = useState<any[]>([]);
  const [selectedContactLeadType, setSelectedContactLeadType] = useState<string>('');
  const [selectedRelatedRecordType, setSelectedRelatedRecordType] = useState<string>('');
  const [showContactLeadSearch, setShowContactLeadSearch] = useState(false);
  const [showRelatedRecordSearch, setShowRelatedRecordSearch] = useState(false);
  const { user } = useAuthStore();
  const { addNotification } = useNotificationStore();
  const { addToast } = useToastStore();
  const overlayRef = useRef<HTMLDivElement>(null);

  // Define task options at component level
  const taskStatusOptions: FormFieldOption[] = TASK_STATUSES.map(status => ({ value: status, label: status }));
  const taskPriorityOptions: FormFieldOption[] = [
    'High', 'Normal', 'Low'
  ].map(priority => ({ value: priority, label: priority }));

  // Get filtered record types based on user role
  const getFilteredRecordTypes = () => {
    const isAdmin = (user?.role as any) === 'ADMIN';

    // Base record types available to all roles
    const baseTypes = [
      { id: 'lead', name: 'Lead', icon: 'UserPlus', description: 'A potential customer' },
      { id: 'contact', name: 'Contact', icon: 'User', description: 'A person you do business with' },
      { id: 'deal', name: 'Deal', icon: 'Target', description: 'A sales opportunity' },
      { id: 'task', name: 'Task', icon: 'CheckSquare', description: 'A to-do item' },
      { id: 'product', name: 'Product', icon: 'Package', description: 'A product in your catalog' },
      { id: 'quote', name: 'Quote', icon: 'FileText', description: 'A sales quote for customers' },
    ];

    // Only admins can create subsidiaries and dealers
    if (isAdmin) {
      return [
        ...baseTypes,
        { id: 'dealer', name: 'Dealer', icon: 'Handshake', description: 'A distributor or vendor partner' },
        { id: 'subsidiary', name: 'Subsidiary', icon: 'Building', description: 'A regional branch of the company' },
      ];
    }

    return baseTypes;
  };

  // Fetch tenant users when modal opens
  useEffect(() => {
    if (isOpen && (selectedType === 'lead' || selectedType === 'contact' || selectedType === 'task' || selectedType === 'deal' || selectedType === 'dealer' || selectedType === 'subsidiary' || selectedType === 'product' || selectedType === 'quote')) {
      const fetchTenantUsers = async () => {
        try {
          const response = await API.get('/users/tenant-users');
          const users = response.data?.data || [];
          setTenantUsers(users);

          // Pre-select current user in visibleTo field
          if (user?.userId) {
            const currentUserSelected = [user.userId];
            setFormData(prev => ({ ...prev, visibleTo: currentUserSelected }));
          }
        } catch (error) {
          console.error('Failed to fetch tenant users:', error);
        }
      };
      fetchTenantUsers();
    }
  }, [isOpen, selectedType, user]);

  // Fetch related data for task form
  useEffect(() => {
    console.log('🔍 DEBUG: Task data useEffect - isOpen:', isOpen, 'selectedType:', selectedType);
    if (isOpen && selectedType === 'task') {
      console.log('🔍 DEBUG: Fetching task related data triggered');
      const fetchTaskRelatedData = async () => {
        try {
          console.log('🔍 DEBUG: Fetching task related data...');
          // Fetch contacts, leads, deals, products, and quotes for dropdowns
          const [contactsRes, leadsRes, dealsRes, productsRes, quotesRes] = await Promise.all([
            contactsApi.getAll(),
            leadsApi.getAll(),
            dealsApi.getAll(),
            productsApi.getAll(),
            quotesApi.getAll()
          ]);
          
          console.log('🔍 DEBUG: Fetched leads:', leadsRes);
          console.log('🔍 DEBUG: Fetched contacts:', contactsRes);
          
          setContacts(contactsRes);
          setLeads(leadsRes);
          setDeals(dealsRes);
          setProducts(productsRes);
          setQuotes(quotesRes);
        } catch (error) {
          console.error('Failed to fetch task related data:', error);
        }
      };
      fetchTaskRelatedData();
    }
  }, [isOpen, selectedType]);

  // Force re-render of dropdowns when form data changes
  useEffect(() => {
    // This effect ensures dropdowns update when records are selected
  }, [formData.contactLeadId, formData.relatedRecordId]);

  // Debug logging for search overlay
  useEffect(() => {
    if (showContactLeadSearch) {
      console.log('🔍 DEBUG: Search overlay opened');
      console.log('🔍 DEBUG: contactLeadType:', formData.contactLeadType);
      console.log('🔍 DEBUG: contacts count:', contacts.length);
      console.log('🔍 DEBUG: leads count:', leads.length);
      console.log('🔍 DEBUG: Will show contacts:', formData.contactLeadType === 'contact');
    }
  }, [showContactLeadSearch, formData.contactLeadType, contacts.length, leads.length]);

  // Debug logging for formData changes
  useEffect(() => {
    console.log('🔍 DEBUG: FormData changed:', formData);
  }, [formData]);

  // Get current user's full name for default owner value
  const getCurrentUserName = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    return user?.email || 'Current User';
  };

  // Get filtered record types
  const recordTypes = getFilteredRecordTypes();

  useEffect(() => {
    if (isOpen && defaultType) {
      // Check if user has permission to access this type
      const isAdmin = (user?.role as any) === 'ADMIN';
      if ((defaultType === 'dealer' || defaultType === 'subsidiary') && !isAdmin) {
        addToast({
          type: 'error',
          title: 'Access Denied',
          message: 'You do not have permission to create this type of record.'
        });
        onClose();
        return;
      }

      console.log('🔍 DEBUG: Setting selectedType to:', defaultType);
      setSelectedType(defaultType);
      if (defaultType !== 'user') {
        // Pre-populate owner field with current user's name for default type
        const currentUserName = getCurrentUserName();
        const ownerField = getOwnerFieldName(defaultType);
        if (ownerField) {
          setFormData({ [ownerField]: currentUserName });
        }
      }

      // Handle prefillData if provided
      if (prefillData) {
        console.log('🔍 DEBUG: Setting prefillData:', prefillData);
        setFormData(prev => {
          const newData = { ...prev, ...prefillData };
          console.log('🔍 DEBUG: Updated formData:', newData);
          return newData;
        });
        
        // Set the selected types for dropdowns if provided
        if (prefillData.relatedRecordType) {
          console.log('🔍 DEBUG: Setting selectedRelatedRecordType to:', prefillData.relatedRecordType);
          setSelectedRelatedRecordType(prefillData.relatedRecordType);
        }
        if (prefillData.contactLeadType) {
          console.log('🔍 DEBUG: Setting selectedContactLeadType to:', prefillData.contactLeadType);
          setSelectedContactLeadType(prefillData.contactLeadType);
        }
        
        // If we have currentLead data, add it to the leads array
        if (prefillData.currentLead) {
          console.log('🔍 DEBUG: Adding currentLead to leads array:', prefillData.currentLead);
          setLeads(prev => {
            const existingLead = prev.find(l => l.id === prefillData.currentLead.id);
            if (!existingLead) {
              return [...prev, prefillData.currentLead];
            }
            return prev;
          });
        }
      } else {
        // Set default values for task form
        if (defaultType === 'task') {
          console.log('🔍 DEBUG: Setting default values for task form');
          setFormData(prev => ({ 
            ...prev, 
            contactLeadType: 'contact',
            relatedRecordType: 'deal'
          }));
          setSelectedContactLeadType('contact');
          setSelectedRelatedRecordType('deal');
          console.log('🔍 DEBUG: Default values set - contactLeadType: contact, relatedRecordType: deal');
        }
      }
    }
  }, [isOpen, defaultType, (user?.role as any), prefillData]);

  const handleTypeSelection = (typeId: string) => {
    // Check if user has permission to access this type
    const isAdmin = (user?.role as any) === 'ADMIN';
    if ((typeId === 'dealer' || typeId === 'subsidiary') && !isAdmin) {
      addToast({
        type: 'error',
        title: 'Access Denied',
        message: 'You do not have permission to create this type of record.'
      });
      return;
    }

    setSelectedType(typeId);
    
    // Pre-populate owner field with current user's name
    const currentUserName = getCurrentUserName();
    const ownerField = getOwnerFieldName(typeId);
    if (ownerField) {
      setFormData({ [ownerField]: currentUserName });
    }
  };

  // Helper function to get the owner field name for each type
  const getOwnerFieldName = (typeId: string): string | null => {
    switch (typeId) {
      case 'lead':
        return 'leadOwner';
      case 'contact':
        return 'contactOwner';
      case 'deal':
        return 'dealOwner';
      case 'task':
        return 'taskOwner';
      default:
        return null;
    }
  };

  const handleBackToSelection = () => {
    setSelectedType('');
    setFormData({});
  };

  const handleMainModalClose = () => {
    // Reset everything and close
    setSelectedType('');
    setFormData({});
    setError(null);
    setLoading(false);
    setContacts([]);
    setLeads([]);
    setDeals([]);
    setProducts([]);
    setQuotes([]);
    setSelectedContactLeadType('');
    setSelectedRelatedRecordType('');
    setShowContactLeadSearch(false);
    setShowRelatedRecordSearch(false);
    onClose();
  };

  // Helper function to safely get user ID
  const getUserId = (user: TenantUser) => user.userId || user.id || '';

  // Update the multiselect options mapping
  const getUserOptions = (users: TenantUser[]) => users.map(u => ({
    value: getUserId(u),
    label: `${u.firstName} ${u.lastName}${getUserId(u) === user?.userId ? ' (You)' : ''}`
  })).filter((opt): opt is FormFieldOption => Boolean(opt.value));

  // Get dynamic options for contact/lead dropdown
  const getContactLeadOptions = (type: string): FormFieldOption[] => {
    if (type === 'contact') {
      return contacts.map(c => ({
        value: c.id,
        label: `${c.firstName} ${c.lastName}`
      }));
    } else if (type === 'lead') {
      console.log('🔍 DEBUG: Getting lead options. Available leads:', leads);
      console.log('🔍 DEBUG: Current contactLeadId:', formData.contactLeadId);
      const options = leads.map(l => ({
        value: l.id,
        label: `${l.firstName} ${l.lastName}`
      }));
      console.log('🔍 DEBUG: Generated lead options:', options);
      return options;
    }
    return [];
  };

  // Get display name for selected contact/lead
  const getSelectedContactLeadName = () => {
    if (!formData.contactLeadId) return '';
    const type = formData.contactLeadType || 'contact';
    const records = type === 'contact' ? contacts : leads;
    console.log('🔍 DEBUG: getSelectedContactLeadName - contactLeadId:', formData.contactLeadId);
    console.log('🔍 DEBUG: getSelectedContactLeadName - type:', type);
    console.log('🔍 DEBUG: getSelectedContactLeadName - available records:', records);
    const record = records.find(r => r.id === formData.contactLeadId);
    console.log('🔍 DEBUG: getSelectedContactLeadName - found record:', record);
    return record ? `${record.firstName} ${record.lastName}` : '';
  };

  // Get dynamic options for related record dropdown
  const getRelatedRecordOptions = (type: string): FormFieldOption[] => {
    if (type === 'deal') {
      return deals.map(d => ({
        value: d.id,
        label: d.dealName
      }));
    } else if (type === 'product') {
      return products.map(p => ({
        value: p.id,
        label: p.name
      }));
    } else if (type === 'quote') {
      return quotes.map(q => ({
        value: q.id,
        label: q.quoteName
      }));
    } else if (type === 'lead') {
      return leads.map(l => ({
        value: l.id,
        label: `${l.firstName} ${l.lastName}`
      }));
    }
    return [];
  };

  // Get display name for selected related record
  const getSelectedRelatedRecordName = () => {
    if (!formData.relatedRecordId) return '';
    const type = formData.relatedRecordType || 'deal';
    let records;
    if (type === 'deal') records = deals;
    else if (type === 'product') records = products;
    else if (type === 'quote') records = quotes;
    else if (type === 'lead') records = leads;
    else return '';
    
    const record = records.find(r => r.id === formData.relatedRecordId);
    return record ? (record.dealName || record.name || record.quoteName || `${record.firstName} ${record.lastName}`) : '';
  };

  const getFormFields = (): FormField[] => {
    const leadSourceOptions: FormFieldOption[] = [
      'Advertisement', 'Cold Call', 'Employee Referral', 'External Referral', 'Online Store',
      'X (Twitter)', 'Facebook', 'Partner', 'Public Relations', 'Sales Email Alias',
      'Seminar Partner', 'Internal Seminar', 'Trade Show', 'Web Download', 'Web Research', 'Chat'
    ].map(source => ({ value: source, label: source }));

    const leadStatusOptions: FormFieldOption[] = [
      'New', 'Attempted to Contact', 'Contact in Future', 'Contacted', 'Junk Lead',
      'Lost Lead', 'Not Contacted', 'Pre-Qualified', 'Not Qualified'
    ].map(status => ({ value: status, label: status }));

    const dealStageOptions: FormFieldOption[] = DEAL_STAGES.map(stage => ({ value: stage, label: stage }));

    const dealerTypeOptions: FormFieldOption[] = [
      'Authorized', 'Distributor', 'Partner', 'Reseller', 'Retailer'
    ].map(type => ({ value: type, label: type }));

    const subsidiaryTypeOptions: FormFieldOption[] = [
      'Branch', 'Division', 'Franchise', 'Joint Venture', 'Wholly Owned'
    ].map(type => ({ value: type, label: type }));

    // Get admin users for dealer and subsidiary visibility
    const adminUsers = tenantUsers.filter(u => 
      u.role === 'ADMIN' || u.role === 'SUPER_ADMIN' || u.role === 'Admin' || u.role === 'SuperAdmin'
    );

    // Get admin and manager users for dealer and subsidiary visibility
    const adminAndManagerUsers = tenantUsers.filter(u => 
      u.role === 'ADMIN' || u.role === 'SUPER_ADMIN' || u.role === 'Admin' || u.role === 'SuperAdmin' ||
      u.role === 'SALES_MANAGER'
    );

    switch (selectedType) {
      case 'lead':
        return [
          { name: 'leadOwner', label: 'Lead Owner', type: 'text', required: true },
          { name: 'firstName', label: 'First Name', type: 'text', required: true },
          { name: 'lastName', label: 'Last Name', type: 'text', required: true },
          { name: 'company', label: 'Company', type: 'text', required: true },
          { name: 'title', label: 'Title', type: 'text', required: false },
          { name: 'phone', label: 'Phone', type: 'tel', required: true },
          { name: 'email', label: 'Email', type: 'email', required: true },
          { name: 'leadSource', label: 'Lead Source', type: 'select', options: leadSourceOptions, required: true },
          { name: 'leadStatus', label: 'Lead Status', type: 'select', options: leadStatusOptions, required: true },
          { name: 'value', label: 'Lead Value', type: 'number', required: true },
          { name: 'visibleTo', label: 'Visible To', type: 'multiselect', options: getUserOptions(tenantUsers), required: false },
          { name: 'street', label: 'Street', type: 'text', required: false, group: 'address' },
          { name: 'area', label: 'Area', type: 'text', required: false, group: 'address' },
          { name: 'city', label: 'City', type: 'text', required: false, group: 'address' },
          { name: 'state', label: 'State', type: 'text', required: false, group: 'address' },
          { name: 'country', label: 'Country', type: 'text', required: false, group: 'address' },
          { name: 'zipCode', label: 'ZIP Code', type: 'text', required: false, group: 'address' },
          { name: 'description', label: 'Description', type: 'textarea', required: false }
        ];
      case 'contact':
        return [
          { name: 'contactOwner', label: 'Contact Owner', type: 'text', required: true },
          { name: 'firstName', label: 'First Name', type: 'text', required: true },
          { name: 'lastName', label: 'Last Name', type: 'text', required: true },
          { name: 'companyName', label: 'Company', type: 'text', required: true },
          { name: 'email', label: 'Email', type: 'email', required: true },
          { name: 'phone', label: 'Phone', type: 'tel', required: true },
          { name: 'title', label: 'Title', type: 'text', required: false },
          { name: 'leadSource', label: 'Source', type: 'select', options: leadSourceOptions, required: true },
          { name: 'visibleTo', label: 'Visible To', type: 'multiselect', options: getUserOptions(tenantUsers), required: false },
          { name: 'street', label: 'Street', type: 'text', required: false, group: 'address' },
          { name: 'city', label: 'City', type: 'text', required: false, group: 'address' },
          { name: 'state', label: 'State', type: 'text', required: false, group: 'address' },
          { name: 'country', label: 'Country', type: 'text', required: false, group: 'address' },
          { name: 'zipCode', label: 'ZIP Code', type: 'text', required: false, group: 'address' }
        ];
      case 'task':
        return [
          // Task Information Section
          { name: 'taskOwner', label: 'Task Owner', type: 'select', options: getUserOptions(tenantUsers), required: true, group: 'task' },
          { name: 'subject', label: 'Subject', type: 'text', required: true, group: 'task' },
          { name: 'dueDate', label: 'Due Date', type: 'date', required: true, group: 'task' },
          { name: 'status', label: 'Status', type: 'select', options: taskStatusOptions, required: true, group: 'task' },
          { name: 'priority', label: 'Priority', type: 'select', options: taskPriorityOptions, required: true, group: 'task' },
          
          // Description Information Section
          { name: 'description', label: 'Description', type: 'textarea', required: false, group: 'description' }
        ];
      case 'deal':
        return [
          // Deal Information Section
          { name: 'dealOwner', label: 'Deal Owner', type: 'text', required: true, group: 'deal' },
          { name: 'dealName', label: 'Deal Name', type: 'text', required: true, group: 'deal' },
          { name: 'amount', label: 'Amount', type: 'number', required: true, group: 'deal' },
          { name: 'leadSource', label: 'Lead Source', type: 'select', options: leadSourceOptions, required: true, group: 'deal' },
          { name: 'stage', label: 'Stage', type: 'select', options: dealStageOptions, required: true, group: 'deal' },
          { name: 'closeDate', label: 'Expected Close Date', type: 'date', required: true, group: 'deal' },
          { name: 'probability', label: 'Probability (%)', type: 'number', required: false, group: 'deal' },
          
          // Contact Information Section
          { name: 'phone', label: 'Contact Phone', type: 'tel', required: true, group: 'contact' },
          { name: 'email', label: 'Contact Email', type: 'email', required: false, group: 'contact' },
          
          // Additional Information Section
          { name: 'description', label: 'Description', type: 'textarea', required: false, group: 'additional' },
          { name: 'visibleTo', label: 'Visible To', type: 'multiselect', options: getUserOptions(tenantUsers), required: false, group: 'additional' }
        ];
      case 'dealer':
        return [
          { name: 'name', label: 'Name', type: 'text', required: true },
          { name: 'email', label: 'Email', type: 'email', required: true },
          { name: 'phone', label: 'Phone', type: 'tel', required: true },
          { name: 'company', label: 'Company', type: 'text', required: true },
          { name: 'location', label: 'Location', type: 'text', required: false },
          { name: 'territory', label: 'Territory', type: 'text', required: false },
          { name: 'status', label: 'Status', type: 'select', options: [
            { value: 'Active', label: 'Active' },
            { value: 'Inactive', label: 'Inactive' }
          ], required: true },
          { name: 'visibleTo', label: 'Visible To', type: 'multiselect', options: getUserOptions(tenantUsers) }
        ];
      case 'subsidiary':
        return [
          { name: 'name', label: 'Name', type: 'text', required: true },
          { name: 'email', label: 'Email', type: 'email', required: true },
          { name: 'contact', label: 'Contact Number', type: 'tel', required: true },
          { name: 'address', label: 'Address', type: 'textarea', required: true },
          { name: 'totalEmployees', label: 'Total Employees', type: 'number', required: true },
          { name: 'visibleTo', label: 'Visible To', type: 'multiselect', options: getUserOptions(tenantUsers) }
        ];
      case 'product':
        return [
          // Product Information Section
          { name: 'productOwner', label: 'Product Owner', type: 'select', options: getUserOptions(tenantUsers), required: true, group: 'product' },
          { name: 'productCode', label: 'Product Code', type: 'text', required: true, group: 'product' },
          { name: 'name', label: 'Product Name', type: 'text', required: true, group: 'product' },
          { name: 'activeStatus', label: 'Active Status', type: 'select', options: [
            { value: 'true', label: 'Active' },
            { value: 'false', label: 'Inactive' }
          ], required: false, group: 'product' },
          
          // Price Information Section
          { name: 'unitPrice', label: 'Unit Price', type: 'number', required: true, group: 'price' },
          { name: 'taxPercentage', label: 'Tax %', type: 'number', required: true, group: 'price' },
          { name: 'commissionRate', label: 'Commission Rate', type: 'number', required: false, group: 'price' },
          
          // Stock Information Section
          { name: 'usageUnit', label: 'Usage Unit', type: 'select', options: [
            { value: 'Pieces', label: 'Pieces' },
            { value: 'Kilograms', label: 'Kilograms' },
            { value: 'Meters', label: 'Meters' },
            { value: 'Liters', label: 'Liters' },
            { value: 'Units', label: 'Units' },
            { value: 'Boxes', label: 'Boxes' },
            { value: 'Cartons', label: 'Cartons' },
            { value: 'Bottles', label: 'Bottles' },
            { value: 'Bags', label: 'Bags' },
            { value: 'Rolls', label: 'Rolls' }
          ], required: true, group: 'stock' },
          { name: 'quantityInStock', label: 'Quantity in Stock', type: 'number', required: false, group: 'stock' },
          { name: 'quantityInDemand', label: 'Quantity in Demand', type: 'number', required: false, group: 'stock' },
          { name: 'reorderLevel', label: 'Reorder Level', type: 'number', required: false, group: 'stock' },
          { name: 'quantityOrdered', label: 'Quantity Ordered', type: 'number', required: false, group: 'stock' },
          
          // Description Information Section
          { name: 'description', label: 'Description', type: 'textarea', required: false, group: 'description' },
          { name: 'notes', label: 'Notes', type: 'textarea', required: false, group: 'description' },
          
          // Visibility Section
          { name: 'visibleTo', label: 'Visible To', type: 'multiselect', options: getUserOptions(tenantUsers), required: false, group: 'visibility' }
        ];
      case 'quote':
        return [
          // Quote Information Section
          { name: 'quoteOwner', label: 'Quote Owner', type: 'select', options: getUserOptions(tenantUsers), required: true, group: 'quote' },
          { name: 'quoteName', label: 'Quote Name', type: 'text', required: true, group: 'quote' },
          { name: 'status', label: 'Status', type: 'select', options: [
            { value: 'Draft', label: 'Draft' },
            { value: 'Sent', label: 'Sent' },
            { value: 'Accepted', label: 'Accepted' },
            { value: 'Rejected', label: 'Rejected' },
            { value: 'Expired', label: 'Expired' }
          ], required: true, group: 'quote' },
          { name: 'validUntil', label: 'Valid Until', type: 'date', required: true, group: 'quote' },
          
          // Line Items Section
          { name: 'lineItems', label: 'Quote Items', type: 'lineItems', required: true, group: 'lineItems' },
          
          // Quote Details Section
          { name: 'description', label: 'Description', type: 'textarea', required: false, group: 'details' },
          { name: 'terms', label: 'Terms and Conditions', type: 'textarea', required: false, group: 'details' },
          
          // Visibility Section
          { name: 'visibleTo', label: 'Visible To', type: 'multiselect', options: getUserOptions(tenantUsers), required: false, group: 'visibility' }
        ];
      default:
        return [];
    }
  };

  const handleInputChange = (name: string, value: any) => {
    if (name === 'value') {
      // Ensure value is a valid non-negative number
      const numValue = Number(value);
      if (isNaN(numValue) || numValue < 0) {
        return; // Don't update if invalid
      }
      setFormData(prev => ({ ...prev, [name]: numValue }));
    } else if (name === 'contactLeadType') {
      // Reset contact/lead ID when type changes
      setSelectedContactLeadType(value);
      setFormData(prev => {
        const newData: Record<string, any> = { 
          ...prev, 
          [name]: value,
          contactLeadId: '' // Reset the ID when type changes
        };
        
        // If contact/lead type is 'lead', automatically set related record type to 'lead' and use the same ID
        if (value === 'lead') {
          newData.relatedRecordType = 'lead';
          newData.relatedRecordId = ''; // Will be set when contactLeadId is selected
        }
        
        return newData;
      });
    } else if (name === 'relatedRecordType') {
      // Reset related record ID when type changes
      setSelectedRelatedRecordType(value);
      setFormData(prev => ({ 
        ...prev, 
        [name]: value,
        relatedRecordId: '' // Reset the ID when type changes
      }));
    } else if (name === 'contactLeadId' && formData.contactLeadType === 'lead') {
      // When a lead is selected as contact/lead and the type is 'lead', 
      // automatically set the related record to the same lead
      setFormData(prev => ({ 
        ...prev, 
        [name]: value,
        relatedRecordId: value,
        relatedRecordType: 'lead'
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clear any previous errors
    setError(null);
    setLoading(true);
    
    // Validate required fields
    const formFields = getFormFields();
    const missingFields = formFields
      .filter(field => field.required && !formData[field.name])
      .map(field => field.label);
    
    if (missingFields.length > 0) {
      setError(`Please fill in all required fields: ${missingFields.join(', ')}`);
      setLoading(false);
      return;
    }
    
    // Debug: Log the form data to see what's being submitted
    console.log('Form data being submitted:', formData);
    console.log('visibleTo field:', formData.visibleTo);
    console.log('🔍 DEBUG: Current selectedRelatedRecordType:', selectedRelatedRecordType);
    console.log('🔍 DEBUG: Current selectedContactLeadType:', selectedContactLeadType);
    console.log('🔍 DEBUG: Form data relatedRecordType:', formData.relatedRecordType);
    console.log('🔍 DEBUG: Form data relatedRecordId:', formData.relatedRecordId);
    console.log('🔍 DEBUG: Form data contactLeadType:', formData.contactLeadType);
    console.log('🔍 DEBUG: Form data contactLeadId:', formData.contactLeadId);
    
    const baseRecord = {
      id: Date.now().toString(),
      createdAt: new Date().toISOString().split('T')[0]
    };

    try {
      switch (selectedType) {
        case 'lead':
          console.log('🚀 Starting lead creation process...');
          console.log('📋 Form data:', formData);
          console.log('📋 Prefill data:', prefillData);
          
          // Create the lead with relatedProductIds
          const leadData = {
            leadOwner: formData.leadOwner,
            firstName: formData.firstName,
            lastName: formData.lastName,
            company: formData.company,
            email: formData.email || '',
            phone: formData.phone || '', // Ensure phone is provided
            title: formData.title,
            street: formData.street,
            area: formData.area,
            city: formData.city,
            state: formData.state,
            country: formData.country,
            zipCode: formData.zipCode,
            description: formData.description,
            value: Number(formData.value) || 0,
            leadStatus: formData.leadStatus,
            leadSource: formData.leadSource,
            source: formData.leadSource, // Backward compatibility
            status: formData.leadStatus, // Backward compatibility
            relatedProductIds: formData.relatedProductIds || prefillData?.relatedProductIds || [],
            visibleTo: formData.visibleTo || []
          };

          console.log('📤 Creating lead with data:', leadData);
          console.log('📤 relatedProductIds being sent:', leadData.relatedProductIds);
          console.log('📤 relatedProductIds type:', typeof leadData.relatedProductIds);
          console.log('📤 relatedProductIds length:', leadData.relatedProductIds?.length);

          try {
            const newLead = await leadsApi.create(leadData);
            console.log('✅ Lead created successfully:', newLead.id);
            console.log('🔗 Lead relatedProductIds:', newLead.relatedProductIds);
            console.log('🔗 Lead relatedProductIds type:', typeof newLead.relatedProductIds);
            console.log('🔗 Lead relatedProductIds length:', newLead.relatedProductIds?.length);

            // Update products with the new lead (bidirectional relationship)
            if (newLead.relatedProductIds && newLead.relatedProductIds.length > 0) {
              console.log('🔄 Updating products with new lead...');
              console.log('🔄 Number of products to update:', newLead.relatedProductIds.length);
              
              for (const productId of newLead.relatedProductIds) {
                try {
                  console.log(`📦 Processing product ${productId}...`);
                  console.log(`📦 Fetching product ${productId} from database...`);
                  
                  const product = await productsApi.getById(productId);
                  console.log(`📦 Product ${productId} fetched:`, product ? 'Found' : 'Not found');
                  
                  if (product) {
                    const currentLeadIds = product.relatedLeadIds || [];
                    console.log(`📦 Product ${productId} current leads:`, currentLeadIds);
                    console.log(`📦 Product ${productId} current leads length:`, currentLeadIds.length);
                    
                    const updatedLeadIds = [...currentLeadIds, newLead.id];
                    console.log(`📦 Product ${productId} updated leads:`, updatedLeadIds);
                    console.log(`📦 Product ${productId} updated leads length:`, updatedLeadIds.length);
                    
                    console.log(`📦 Updating product ${productId} with new lead ${newLead.id}...`);
                    const updatedProduct = await productsApi.update(productId, { 
                      relatedLeadIds: updatedLeadIds 
                    });
                    console.log(`✅ Product ${productId} updated successfully with lead ${newLead.id}`);
                    console.log(`✅ Updated product relatedLeadIds:`, updatedProduct?.relatedLeadIds);
                  } else {
                    console.error(`❌ Product ${productId} not found in database`);
                  }
                } catch (error) {
                  console.error(`❌ Failed to update product ${productId} with new lead:`, error);
                  console.error(`❌ Error details:`, error instanceof Error ? error.message : 'Unknown error');
                  // Don't throw here, as the lead was created successfully
                  // Just log the error for debugging
                }
              }
            } else {
              console.log('ℹ️ No relatedProductIds found, skipping product updates');
              console.log('ℹ️ This might indicate the prefillData is not being passed correctly');
            }
          } catch (error) {
            console.error('❌ Failed to create lead:', error);
            console.error('❌ Error details:', error instanceof Error ? error.message : 'Unknown error');
            throw error;
          }

          addNotification({
            type: 'success',
            title: 'Lead Created',
            message: `Successfully created new lead: ${formData.firstName} ${formData.lastName}`,
            timestamp: new Date().toISOString(),
            read: false
          });
          addToast({
            type: 'success',
            title: 'Lead Created',
            message: `Successfully created new lead: ${formData.firstName} ${formData.lastName}`
          });
          break;
        case 'contact':
          await contactsApi.create({
            contactOwner: formData.contactOwner,
            firstName: formData.firstName,
            lastName: formData.lastName,
            companyName: formData.companyName,
            email: formData.email || '',
            leadSource: formData.leadSource,
            phone: formData.phone || '', // Ensure phone is provided
            title: formData.title,
            department: formData.department,
            street: formData.street,
            area: formData.area,
            city: formData.city,
            state: formData.state,
            country: formData.country,
            zipCode: formData.zipCode,
            description: formData.description,
            status: 'Active',
            visibleTo: formData.visibleTo || []
          });
          addNotification({
            type: 'success',
            title: 'Contact Created',
            message: `Successfully created new contact: ${formData.firstName} ${formData.lastName}`,
            timestamp: new Date().toISOString(),
            read: false
          });
          addToast({
            type: 'success',
            title: 'Contact Created',
            message: `Successfully created new contact: ${formData.firstName} ${formData.lastName}`
          });
          break;
      case 'deal':
          await dealsApi.create({
            dealOwner: formData.dealOwner,
            dealName: formData.dealName,
            phone: formData.phone || '', // Required phone field
            email: formData.email || undefined, // Optional email field
            leadSource: formData.leadSource,
            stage: formData.stage,
            amount: parseFloat(formData.amount) || 0,
            description: formData.description,
            probability: parseFloat(formData.probability) || 0,
            closeDate: formData.closeDate,
            visibleTo: formData.visibleTo || []
          });
          addNotification({
            type: 'success',
            title: 'Deal Created',
            message: `Successfully created new deal: ${formData.dealName}`,
            timestamp: new Date().toISOString(),
            read: false
          });
          addToast({
            type: 'success',
            title: 'Deal Created',
            message: `Successfully created new deal: ${formData.dealName}`
        });
        break;
      case 'task':
          const taskData: Omit<Task, 'id' | 'createdAt'> = {
            title: formData.subject,
            description: formData.description || '',
            priority: formData.priority || 'Normal',
            status: formData.status || 'Open',
            dueDate: formData.dueDate,
            assignee: formData.taskOwner || user?.userId || '',
            type: 'Follow-up' as const,
            tenantId: '',
            contactLeadId: formData.contactLeadId || undefined,
            contactLeadType: formData.contactLeadType || undefined,
            // Only set related record fields if contactLeadType is not 'lead'
            ...(formData.contactLeadType !== 'lead' && {
              relatedRecordId: formData.relatedRecordId || undefined,
              relatedRecordType: formData.relatedRecordType || undefined,
            }),
            visibleTo: formData.visibleTo || []
          };
          
          console.log('Creating task with data:', taskData);
          
          await tasksApi.create(taskData);
          addNotification({
            type: 'success',
            title: 'Task Created',
            message: `Successfully created new task: ${formData.subject}`,
            timestamp: new Date().toISOString(),
            read: false
          });
          addToast({
            type: 'success',
            title: 'Task Created',
            message: `Successfully created new task: ${formData.subject}`
          });
          break;
        case 'subsidiary':
          await subsidiariesApi.create({
            name: formData.name || '',
            email: formData.email || '',
            contact: formData.contact || '',
            address: formData.address || '',
            totalEmployees: parseInt(formData.totalEmployees) || 0,
            visibleTo: formData.visibleTo || []
          });
          addNotification({
            type: 'success',
            title: 'Subsidiary Created',
            message: `Successfully created new subsidiary: ${formData.name}`,
            timestamp: new Date().toISOString(),
            read: false
          });
          addToast({
            type: 'success',
            title: 'Subsidiary Created',
            message: `Successfully created new subsidiary: ${formData.name}`
        });
        break;
      case 'dealer':
        await dealersApi.create({
            name: formData.name || '',
            email: formData.email || '',
            phone: formData.phone || '',
            company: formData.company || '',
            location: formData.location || '',
            territory: formData.territory || '',
            status: formData.status || 'Active',
            visibleTo: formData.visibleTo || []
          });
          addNotification({
            type: 'success',
            title: 'Dealer Created',
            message: `Successfully created new dealer: ${formData.name}`,
            timestamp: new Date().toISOString(),
            read: false
          });
          addToast({
            type: 'success',
            title: 'Dealer Created',
            message: `Successfully created new dealer: ${formData.name}`
        });
        break;
      case 'product':
        await productsApi.create({
          // Product Information
          productOwner: formData.productOwner || '',
          productCode: formData.productCode || '',
          name: formData.name || '',
          activeStatus: formData.activeStatus === 'true' || formData.activeStatus === true,
          
          // Price Information
          unitPrice: parseFloat(formData.unitPrice) || 0,
          taxPercentage: parseFloat(formData.taxPercentage) || 0,
          commissionRate: formData.commissionRate ? parseFloat(formData.commissionRate) : undefined,
          
          // Stock Information
          usageUnit: formData.usageUnit || 'Pieces',
          quantityInStock: formData.quantityInStock ? parseFloat(formData.quantityInStock) : 0,
          quantityInDemand: formData.quantityInDemand ? parseFloat(formData.quantityInDemand) : 0,
          reorderLevel: formData.reorderLevel ? parseFloat(formData.reorderLevel) : undefined,
          quantityOrdered: formData.quantityOrdered ? parseFloat(formData.quantityOrdered) : 0,
          
          // Description Information
          description: formData.description || '',
          
          // Backward compatibility
          price: parseFloat(formData.unitPrice) || 0,
          cost: 0,
          
          visibleTo: formData.visibleTo || [],
          tenantId: '',
          createdBy: user?.userId || '',
          userId: user?.userId || ''
        });
        addNotification({
          type: 'success',
          title: 'Product Created',
          message: `Successfully created new product: ${formData.name}`,
          timestamp: new Date().toISOString(),
          read: false
        });
        addToast({
          type: 'success',
          title: 'Product Created',
          message: `Successfully created new product: ${formData.name}`
        });
        break;
      case 'quote':
        // Calculate totals from line items
        const lineItems = formData.lineItems || [];
        const subtotal = lineItems.reduce((sum: number, item: any) => sum + (item.amount || 0), 0);
        const totalDiscount = lineItems.reduce((sum: number, item: any) => {
          // Calculate discount amount from percentage
          const discountAmount = ((item.amount || 0) * (item.discount || 0)) / 100;
          return sum + discountAmount;
        }, 0);
        const totalTax = lineItems.reduce((sum: number, item: any) => sum + (item.tax || 0), 0);
        const grandTotal = subtotal - totalDiscount + totalTax;

        await quotesApi.create({
          // Basic Quote Info
          quoteNumber: `QT-${Date.now()}`, // Auto-generated
          quoteName: formData.quoteName || '',
          quoteOwner: formData.quoteOwner || '',
          status: formData.status || 'Draft',
          validUntil: formData.validUntil || '',
          activeStatus: true,
          
          // Customer Info (default values)
          customerName: 'Customer Name',
          customerEmail: 'customer@example.com',
          customerPhone: '+1234567890',
          
          // Line Items
          lineItems: lineItems,
          
          // Pricing Info (auto-calculated)
          subtotal: subtotal,
          discountAmount: totalDiscount,
          taxAmount: totalTax,
          adjustment: 0,
          totalAmount: grandTotal,
          
          // Quote Details
          description: formData.description || '',
          terms: formData.terms || '',
          notes: '',
          
          visibleTo: formData.visibleTo || []
        });
        addNotification({
          type: 'success',
          title: 'Quote Created',
          message: `Successfully created new quote: ${formData.quoteName}`,
          timestamp: new Date().toISOString(),
          read: false
        });
        addToast({
          type: 'success',
          title: 'Quote Created',
          message: `Successfully created new quote: ${formData.quoteName}`
        });
        break;
      }

      // Call onSuccess callback to refresh the UI
      if (onSuccess) {
        onSuccess();
      }
      
      setFormData({});
      setSelectedType('');
      setError(null);
      setContacts([]);
      setLeads([]);
      setDeals([]);
      setProducts([]);
      setQuotes([]);
      setSelectedContactLeadType('');
      setSelectedRelatedRecordType('');
      handleMainModalClose();
    } catch (error) {
      console.error('Error creating record:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create record. Please try again.';
      setError(errorMessage);
      addToast({
        type: 'error',
        title: 'Error',
        message: errorMessage
      });
    } finally {
      setLoading(false);
    }
  };

  const formFields = getFormFields();

  // Group fields by their 'group' property
  const groupedFields = formFields.reduce((acc, field) => {
    const group = field.group || 'default';
    if (!acc[group]) acc[group] = [];
    acc[group].push(field);
    return acc;
  }, {} as Record<string, typeof formFields>);

  const renderField = (field: FormField) => {
    switch (field.type) {
      case 'multiselect':
        return (
          <div key={field.name} className={`${field.group ? 'col-span-2' : ''} col-span-full`}>
            <div className="border border-gray-300 rounded-lg p-4 max-h-60 overflow-y-auto bg-white">
              <div className="space-y-2">
                {field.options?.map(option => (
                  <label key={option.value} className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={(formData[field.name] || []).includes(option.value)}
                      onChange={(e) => {
                        const currentSelected = formData[field.name] || [];
                        const newSelected = e.target.checked
                          ? [...currentSelected, option.value]
                          : currentSelected.filter((id: string) => id !== option.value);
                        handleInputChange(field.name, newSelected);
                      }}
                      className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">{option.label}</span>
                  </label>
                ))}
              </div>
            </div>
            <p className="mt-1 text-sm text-gray-500">Select users who can view this {selectedType}</p>
          </div>
        );
      case 'select':
        return (
          <div key={field.name} className={field.group ? 'col-span-2' : ''}>
            {/* Hide dependent dropdowns when no type is selected */}
            {(field.name === 'contactLeadId' && !formData.contactLeadType) ? null : 
             (field.name === 'relatedRecordId' && !formData.relatedRecordType) ? null : (
              <>
                <select
                  value={formData[field.name] || ''}
                  onChange={(e) => handleInputChange(field.name, e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                  required={field.required}
                >
                  <option value="">Select {field.label}</option>
                  {field.options?.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
                {/* Show helper text for dependent dropdowns */}
                {(field.name === 'contactLeadType' && !formData.contactLeadType) && (
                  <p className="mt-1 text-sm text-gray-500">Select a type to see available options</p>
                )}
                {(field.name === 'relatedRecordType' && !formData.relatedRecordType) && (
                  <p className="mt-1 text-sm text-gray-500">Select a type to see available options</p>
                )}
              </>
            )}
          </div>
        );
      case 'lineItems':
        return (
          <div key={field.name} className="col-span-full">
            <LineItemsInput
              value={formData[field.name] || []}
              onChange={(items) => handleInputChange(field.name, items)}
              className="w-full"
            />
          </div>
        );
      default:
        return (
          <div key={field.name} className={field.type === 'textarea' ? 'col-span-full' : ''}>
            {field.type === 'tel' ? (
              <PhoneNumberInput
                value={formData[field.name] || ''}
                onChange={(phoneNumber) => handleInputChange(field.name, phoneNumber)}
                placeholder={`Enter ${field.label.toLowerCase()}...`}
                className="w-full"
                defaultCountryCode="+91"
              />
            ) : field.type === 'textarea' ? (
              <textarea
                value={formData[field.name] || ''}
                onChange={(e) => handleInputChange(field.name, e.target.value)}
                required={field.required}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                placeholder={`Enter ${field.label.toLowerCase()}...`}
              />
            ) : (
              <input
                type={field.type}
                value={formData[field.name] || ''}
                onChange={(e) => handleInputChange(field.name, field.type === 'number' ? Number(e.target.value) : e.target.value)}
                required={field.required}
                className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  field.group === 'stock' && field.name === 'quantityInStock' ? 'border-green-300 focus:border-green-500 focus:ring-green-500' :
                  field.group === 'stock' && field.name === 'quantityInDemand' ? 'border-orange-300 focus:border-orange-500 focus:ring-orange-500' :
                  field.group === 'stock' && field.name === 'reorderLevel' ? 'border-red-300 focus:border-red-500 focus:ring-red-500' :
                  field.group === 'stock' && field.name === 'quantityOrdered' ? 'border-blue-300 focus:border-blue-500 focus:ring-blue-500' :
                  ''
                }`}
                placeholder={`Enter ${field.label.toLowerCase()}...`}
                {...(field.type === 'date' && {
                  min: new Date(new Date().getFullYear() - 25, 0, 1).toISOString().split('T')[0],
                  max: new Date(new Date().getFullYear() + 50, 11, 31).toISOString().split('T')[0]
                })}
              />
            )}
          </div>
        );
    }
  };

  return (
      <Dialog open={isOpen} onClose={handleMainModalClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel 
          className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" 
          onClick={(e) => {
            console.log('🔍 DEBUG: Main modal Dialog.Panel clicked');
            e.stopPropagation();
          }}
        >
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center space-x-4">
              <Dialog.Title className="text-xl font-semibold text-gray-900">
                {selectedType ? `Create ${selectedType.charAt(0).toUpperCase() + selectedType.slice(1)}` : 'Create New Record'}
              </Dialog.Title>
              
            </div>
            <button
              onClick={() => {
                console.log('🔍 DEBUG: Main modal close button clicked');
                handleMainModalClose();
              }}
              className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Icons.X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
          
          <div className="p-6">
            {!selectedType ? (
              <div>
                <p className="text-sm text-gray-600 mb-6">
                  Select the type of record you want to create.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {recordTypes.map((type) => {
                    const Icon = Icons[type.icon as keyof typeof Icons] as any;
                    return (
                      <button
                        key={type.id}
                        onClick={() => handleTypeSelection(type.id)}
                        className="flex items-start p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left"
                      >
                        <Icon className="w-6 h-6 text-blue-600 mt-1 mr-3 shrink-0" />
                        <div>
                          <h3 className="font-medium text-gray-900">{type.name}</h3>
                          <p className="text-sm text-gray-500">{type.description}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div className="mb-6 flex items-center">
                  <button
                    type="button"
                    onClick={handleBackToSelection}
                    className="text-gray-600 hover:text-gray-900 flex items-center"
                  >
                    <Icons.ArrowLeft className="w-4 h-4 mr-1" />
                    Back to selection
                  </button>
                </div>

                {/* Error Display */}
                {error && (
                  <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex">
                      <Icons.AlertCircle className="w-5 h-5 text-red-600 mr-2 mt-0.5" />
                      <div>
                        <h3 className="text-sm font-medium text-red-800">Error</h3>
                        <p className="text-sm text-red-700 mt-1">{error}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Product Association Indicator */}
                {selectedType === 'lead' && prefillData?.relatedProductIds && prefillData.relatedProductIds.length > 0 && (
                  <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center">
                      <Icons.Package className="w-5 h-5 text-blue-600 mr-2" />
                      <div>
                        <h3 className="text-sm font-medium text-blue-800">Product Association</h3>
                        <p className="text-sm text-blue-700 mt-1">
                          This lead will be automatically associated with{' '}
                          <span className="font-medium">
                            {prefillData.productName || 'the current product'}
                          </span>
                          {prefillData.productCode && (
                            <span className="text-blue-600"> ({prefillData.productCode})</span>
                          )}
                          .
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Form Fields - Clean Layout */}
                <div className="space-y-6">
                  {/* Task Information Section */}
                  {selectedType === 'task' && (
                    <>
                      <div onClick={(e) => e.stopPropagation()}>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Task Information</h3>
                        <div className="space-y-4">
                          {/* Task Owner */}
                          <div className="border-b border-gray-200 pb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Task Owner
                            </label>
                            <div className="flex items-center">
                              <select
                                value={formData.taskOwner || ''}
                                onChange={(e) => handleInputChange('taskOwner', e.target.value)}
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                                required
                              >
                                <option value="">Select Task Owner</option>
                                {getUserOptions(tenantUsers).map(option => (
                                  <option key={option.value} value={option.value}>{option.label}</option>
                                ))}
                              </select>
                              <Icons.ChevronDown className="w-4 h-4 text-gray-400 ml-2" />
                              <Icons.User className="w-4 h-4 text-gray-400 ml-2" />
                            </div>
                          </div>

                          {/* Subject */}
                          <div className="border-b border-gray-200 pb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Subject
                            </label>
                            <input
                              type="text"
                              value={formData.subject || ''}
                              onChange={(e) => handleInputChange('subject', e.target.value)}
                              required
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder="Enter subject"
                            />
                          </div>

                          {/* Due Date */}
                          <div className="border-b border-gray-200 pb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Due Date
                            </label>
                            <input
                              type="date"
                              value={formData.dueDate || ''}
                              onChange={(e) => handleInputChange('dueDate', e.target.value)}
                              required
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder="DD/MM/YYYY"
                            />
                          </div>

                          {/* Contact/Lead Type and Contact/Lead in two columns */}
                          <div className="grid grid-cols-3 gap-4 border-b border-gray-200 pb-4">
                            <div>
                              <div className="flex items-center">
                                <select
                                  value={formData.contactLeadType || 'contact'}
                                  onChange={(e) => handleInputChange('contactLeadType', e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                                >
                                  <option value="contact">Contact</option>
                                  <option value="lead">Lead</option>
                                </select>
                              </div>
                            </div>
                            <div className="col-span-2">
                              <div className="flex items-center" onClick={(e) => e.stopPropagation()}>
                                <select
                                  key={`contact-lead-${formData.contactLeadId || 'empty'}`}
                                  value={formData.contactLeadId || ''}
                                  onChange={(e) => handleInputChange('contactLeadId', e.target.value)}
                                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                                >
                                  <option value="">Select {formData.contactLeadType || 'contact'}</option>
                                  {getContactLeadOptions(formData.contactLeadType || 'contact').map(option => (
                                    <option key={option.value} value={option.value}>
                                      {option.label}
                                    </option>
                                  ))}
                                  {/* Show selected record if it's not in the options */}
                                  {formData.contactLeadId && !getContactLeadOptions(formData.contactLeadType || 'contact').find(opt => opt.value === formData.contactLeadId) && (
                                    <option value={formData.contactLeadId}>
                                      {getSelectedContactLeadName()}
                                    </option>
                                  )}
                                </select>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    console.log('🔍 DEBUG: Search button clicked for Contact/Lead');
                                    e.preventDefault();
                                    e.stopPropagation();
                                    console.log('🔍 DEBUG: Setting showContactLeadSearch to true');
                                    // Ensure contactLeadType is set to 'contact' by default
                                    if (!formData.contactLeadType) {
                                      setFormData(prev => ({
                                        ...prev,
                                        contactLeadType: 'contact'
                                      }));
                                    }
                                    setShowContactLeadSearch(true);
                                  }}
                                  className="ml-2 p-2 text-gray-400 hover:text-gray-600 transition-colors"
                                  title={`Search ${formData.contactLeadType || 'contact'}s`}
                                >
                                  <Icons.Search className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Related Record Type and Related Record in two columns */}
                          <div className="grid grid-cols-3 gap-4 border-b border-gray-200 pb-4">
                            <div>
                              <div className="flex items-center">
                                <select
                                  value={formData.relatedRecordType || 'deal'}
                                  onChange={(e) => handleInputChange('relatedRecordType', e.target.value)}
                                  disabled={formData.contactLeadType === 'lead'}
                                  className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                                    formData.contactLeadType === 'lead' 
                                      ? 'bg-gray-100 text-gray-500 cursor-not-allowed' 
                                      : 'bg-white'
                                  }`}
                                >
                                  <option value="deal">Deal</option>
                                  <option value="product">Product</option>
                                  <option value="quote">Quote</option>
                                  <option value="lead">Lead</option>
                                </select>
                              </div>
                            </div>
                            <div className="col-span-2">
                              <div className="flex items-center" onClick={(e) => e.stopPropagation()}>
                                <select
                                  key={`related-record-${formData.relatedRecordId || 'empty'}`}
                                  value={formData.relatedRecordId || ''}
                                  onChange={(e) => handleInputChange('relatedRecordId', e.target.value)}
                                  disabled={formData.contactLeadType === 'lead'}
                                  className={`flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                                    formData.contactLeadType === 'lead' 
                                      ? 'bg-gray-100 text-gray-500 cursor-not-allowed' 
                                      : 'bg-white'
                                  }`}
                                >
                                  <option value="">
                                    {formData.contactLeadType === 'lead' 
                                      ? 'Same as Contact/Lead' 
                                      : `Select ${formData.relatedRecordType || 'deal'}`
                                    }
                                  </option>
                                  {formData.contactLeadType !== 'lead' && getRelatedRecordOptions(formData.relatedRecordType || 'deal').map(option => (
                                    <option key={option.value} value={option.value}>
                                      {option.label}
                                    </option>
                                  ))}
                                  {/* Show selected record if it's not in the options */}
                                  {formData.relatedRecordId && !getRelatedRecordOptions(formData.relatedRecordType || 'deal').find(opt => opt.value === formData.relatedRecordId) && (
                                    <option value={formData.relatedRecordId}>
                                      {getSelectedRelatedRecordName()}
                                    </option>
                                  )}
                                </select>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    console.log('🔍 DEBUG: Search button clicked for Related Record');
                                    e.preventDefault();
                                    e.stopPropagation();
                                    console.log('🔍 DEBUG: Setting showRelatedRecordSearch to true');
                                    // Ensure relatedRecordType is set to 'deal' by default
                                    if (!formData.relatedRecordType) {
                                      setFormData(prev => ({
                                        ...prev,
                                        relatedRecordType: 'deal'
                                      }));
                                    }
                                    setShowRelatedRecordSearch(true);
                                  }}
                                  disabled={formData.contactLeadType === 'lead'}
                                  className={`ml-2 p-2 transition-colors ${
                                    formData.contactLeadType === 'lead'
                                      ? 'text-gray-300 cursor-not-allowed'
                                      : 'text-gray-400 hover:text-gray-600'
                                  }`}
                                  title={formData.contactLeadType === 'lead' 
                                    ? 'Not available when Contact/Lead is Lead' 
                                    : `Search ${formData.relatedRecordType || 'deal'}s`
                                  }
                                >
                                  <Icons.Search className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                          {formData.contactLeadType === 'lead' && (
                            <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                              <p className="text-sm text-blue-700">
                                <Icons.Info className="w-4 h-4 inline mr-1" />
                                Related record automatically set to the same lead
                              </p>
                            </div>
                          )}

                          {/* Status */}
                          <div className="border-b border-gray-200 pb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Status
                            </label>
                            <div className="flex items-center">
                              <select
                                value={formData.status || ''}
                                onChange={(e) => handleInputChange('status', e.target.value)}
                                required
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                              >
                                <option value="">Select Status</option>
                                {taskStatusOptions.map(option => (
                                  <option key={option.value} value={option.value}>{option.label}</option>
                                ))}
                              </select>
                              <Icons.ChevronDown className="w-4 h-4 text-gray-400 ml-2" />
                            </div>
                          </div>

                          {/* Priority */}
                          <div className="border-b border-gray-200 pb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Priority
                            </label>
                            <div className="flex items-center">
                              <select
                                value={formData.priority || ''}
                                onChange={(e) => handleInputChange('priority', e.target.value)}
                                required
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                              >
                                <option value="">Select Priority</option>
                                {taskPriorityOptions.map(option => (
                                  <option key={option.value} value={option.value}>{option.label}</option>
                                ))}
                              </select>
                              <Icons.ChevronDown className="w-4 h-4 text-gray-400 ml-2" />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Description Information Section */}
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Description Information</h3>
                        <div className="border-b border-gray-200 pb-4">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Description
                          </label>
                          <textarea
                            value={formData.description || ''}
                            onChange={(e) => handleInputChange('description', e.target.value)}
                            rows={4}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                            placeholder="Enter description"
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {/* Other record types - keep existing structure for now */}
                  {selectedType !== 'task' && (
                    <div className="space-y-6">
                      {Object.entries(groupedFields).map(([group, fields]) => (
                        <div key={group}>
                          {group !== 'default' && (
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">
                              {group.charAt(0).toUpperCase() + group.slice(1)} Information
                            </h3>
                          )}
                          <div className="space-y-4">
                            {fields.map((field) => (
                              <div key={field.name} className="border-b border-gray-200 pb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  {field.label} {field.required && <span className="text-red-500">*</span>}
                                </label>
                                {renderField(field)}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Form Actions */}
                <div className="flex justify-end space-x-3 mt-8 pt-6 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={handleMainModalClose}
                    className="px-4 py-2 text-gray-700 hover:text-gray-900 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    {loading ? (
                      <>
                        <Icons.Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      `Create ${selectedType?.charAt(0).toUpperCase() + selectedType?.slice(1)}`
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </Dialog.Panel>
      </div>

      {/* Contact/Lead Search Overlay */}
      {showContactLeadSearch && createPortal(
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" 
          onClick={(e) => {
            console.log('🔍 DEBUG: Outer overlay div clicked');
            e.stopPropagation();
          }}
        >
          <div 
            className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[80vh] overflow-hidden" 
            onClick={(e) => {
              console.log('🔍 DEBUG: Inner overlay div clicked');
              e.stopPropagation();
            }}
          >
            <div className="overflow-x-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 z-10 min-w-[800px]">
                <div className="flex items-center justify-between p-6">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Search {formData.contactLeadType || 'contact'}s
                  </h3>
                  <button
                    onClick={(e) => {
                      console.log('🔍 DEBUG: Close button clicked');
                      e.stopPropagation();
                      setShowContactLeadSearch(false);
                    }}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <Icons.X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>
              </div>
              
              <div className="overflow-y-auto max-h-[calc(80vh-80px)]">
                <div className="bg-white min-w-[800px]">
                  <table className="w-full">
                    <thead className="bg-gray-50 sticky top-0 z-10">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <div className="flex items-center">
                            {formData.contactLeadType === 'contact' ? 'CONTACT' : 'LEAD'}
                            <Icons.ArrowUpDown className="w-4 h-4 ml-1 text-gray-400" />
                          </div>
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <div className="flex items-center">
                            OWNER
                            <Icons.ArrowUpDown className="w-4 h-4 ml-1 text-gray-400" />
                          </div>
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <div className="flex items-center">
                            EMAIL
                            <Icons.ArrowUpDown className="w-4 h-4 ml-1 text-gray-400" />
                          </div>
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <div className="flex items-center">
                            PHONE
                            <Icons.ArrowUpDown className="w-4 h-4 ml-1 text-gray-400" />
                          </div>
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <div className="flex items-center">
                            COMPANY
                            <Icons.ArrowUpDown className="w-4 h-4 ml-1 text-gray-400" />
                          </div>
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <div className="flex items-center">
                            STATUS
                            <Icons.ArrowUpDown className="w-4 h-4 ml-1 text-gray-400" />
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {(formData.contactLeadType === 'contact' ? contacts : leads).map((record: any) => (
                        <tr
                          key={record.id}
                          onClick={(e) => {
                            console.log('🔍 DEBUG: Record row clicked:', record.id, record.firstName, record.lastName);
                            e.stopPropagation();
                            const recordName = `${record.firstName} ${record.lastName}`;
                            console.log('🔍 DEBUG: Setting form data with record:', record.id, recordName);
                            // Update form data with the selected record
                            setFormData(prev => {
                              console.log('🔍 DEBUG: Previous form data:', prev);
                              const newData = {
                                ...prev,
                                contactLeadId: record.id
                              };
                              console.log('🔍 DEBUG: New form data:', newData);
                              return newData;
                            });
                            console.log('🔍 DEBUG: Closing search overlay');
                            setShowContactLeadSearch(false);
                          }}
                          className="hover:bg-blue-50 cursor-pointer transition-colors"
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                                <Icons.User className="w-4 h-4 text-blue-600" />
                              </div>
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {record.firstName} {record.lastName}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {record.id}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {record.contactOwner || record.leadOwner || 'Unknown'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {record.email || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {record.phone || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {record.companyName || record.company || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
                              {record.status || 'Active'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Related Record Search Overlay */}
      {showRelatedRecordSearch && createPortal(
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" 
          onClick={(e) => {
            console.log('🔍 DEBUG: Related Record outer overlay div clicked');
            e.stopPropagation();
          }}
        >
          <div 
            className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[80vh] overflow-hidden" 
            onClick={(e) => {
              console.log('🔍 DEBUG: Related Record inner overlay div clicked');
              e.stopPropagation();
            }}
          >
            <div className="overflow-x-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 z-10 min-w-[800px]">
                <div className="flex items-center justify-between p-6">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Search {formData.relatedRecordType || 'deal'}s
                  </h3>
                  <button
                    onClick={(e) => {
                      console.log('🔍 DEBUG: Related Record close button clicked');
                      e.stopPropagation();
                      setShowRelatedRecordSearch(false);
                    }}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <Icons.X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>
              </div>
              
              <div className="overflow-y-auto max-h-[calc(80vh-80px)]">
                <div className="bg-white min-w-[800px]">
                  <table className="w-full">
                    <thead className="bg-gray-50 sticky top-0 z-10">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <div className="flex items-center">
                            {formData.relatedRecordType === 'deal' ? 'DEAL' : 
                             formData.relatedRecordType === 'product' ? 'PRODUCT' : 'QUOTE'}
                            <Icons.ArrowUpDown className="w-4 h-4 ml-1 text-gray-400" />
                          </div>
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <div className="flex items-center">
                            OWNER
                            <Icons.ArrowUpDown className="w-4 h-4 ml-1 text-gray-400" />
                          </div>
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <div className="flex items-center">
                            {formData.relatedRecordType === 'deal' ? 'AMOUNT' : 
                             formData.relatedRecordType === 'product' ? 'UNIT PRICE' : 'TOTAL'}
                            <Icons.ArrowUpDown className="w-4 h-4 ml-1 text-gray-400" />
                          </div>
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <div className="flex items-center">
                            {formData.relatedRecordType === 'deal' ? 'STAGE' : 
                             formData.relatedRecordType === 'product' ? 'STOCK' : 'STATUS'}
                            <Icons.ArrowUpDown className="w-4 h-4 ml-1 text-gray-400" />
                          </div>
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <div className="flex items-center">
                            STATUS
                            <Icons.ArrowUpDown className="w-4 h-4 ml-1 text-gray-400" />
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {(formData.relatedRecordType === 'deal' ? deals : 
                        formData.relatedRecordType === 'product' ? products : quotes).map((record: any) => (
                        <tr
                          key={record.id}
                          onClick={(e) => {
                            console.log('🔍 DEBUG: Related Record row clicked:', record.id, record.dealName || record.name || record.quoteName);
                            e.stopPropagation();
                            const recordName = record.dealName || record.name || record.quoteName;
                            console.log('🔍 DEBUG: Setting form data with related record:', record.id, recordName);
                            // Update form data with the selected record
                            setFormData(prev => {
                              console.log('🔍 DEBUG: Previous form data for related record:', prev);
                              const newData = {
                                ...prev,
                                relatedRecordId: record.id
                              };
                              console.log('🔍 DEBUG: New form data for related record:', newData);
                              return newData;
                            });
                            console.log('🔍 DEBUG: Closing related record search overlay');
                            setShowRelatedRecordSearch(false);
                          }}
                          className="hover:bg-blue-50 cursor-pointer transition-colors"
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                                {formData.relatedRecordType === 'deal' ? (
                                  <Icons.Target className="w-4 h-4 text-blue-600" />
                                ) : formData.relatedRecordType === 'product' ? (
                                  <Icons.Package className="w-4 h-4 text-blue-600" />
                                ) : (
                                  <Icons.FileText className="w-4 h-4 text-blue-600" />
                                )}
                              </div>
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {record.dealName || record.name || record.quoteName}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {record.id}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {record.dealOwner || record.productOwner || record.quoteOwner || 'Unknown'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formData.relatedRecordType === 'deal' ? `$${record.amount?.toLocaleString() || '0'}` :
                             formData.relatedRecordType === 'product' ? `$${record.unitPrice?.toLocaleString() || '0'}` :
                             `$${record.totalAmount?.toLocaleString() || '0'}`}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formData.relatedRecordType === 'deal' ? record.stage :
                             formData.relatedRecordType === 'product' ? record.quantityInStock || '0' :
                             record.status}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
                              {formData.relatedRecordType === 'product' ? 
                                (record.activeStatus ? 'Active' : 'Inactive') :
                                record.status || 'Active'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </Dialog>
  );
};

export default AddNewModal;