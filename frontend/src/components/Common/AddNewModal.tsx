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
  const [showDealContactSearch, setShowDealContactSearch] = useState(false);
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [currentUserSearchField, setCurrentUserSearchField] = useState<string>('');
  const [isLoadingContacts, setIsLoadingContacts] = useState(false);
  const [dealContactSearchTerm, setDealContactSearchTerm] = useState('');
  const [taskContactLeadSearchTerm, setTaskContactLeadSearchTerm] = useState('');
  const [taskRelatedRecordSearchTerm, setTaskRelatedRecordSearchTerm] = useState('');
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
        } catch (error) {
          console.error('Failed to fetch tenant users:', error);
        }
      };
      fetchTenantUsers();
    }
  }, [isOpen, selectedType, user]);

  // Fetch related data for task and deal forms
  useEffect(() => {
    console.log('🔍 DEBUG: Task/Deal data useEffect - isOpen:', isOpen, 'selectedType:', selectedType);
    if (isOpen && (selectedType === 'task' || selectedType === 'deal')) {
      console.log('🔍 DEBUG: Fetching task/deal related data triggered');
      const fetchRelatedData = async () => {
        try {
          setIsLoadingContacts(true);
          console.log('🔍 DEBUG: Fetching task/deal related data...');
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
          console.error('Failed to fetch task/deal related data:', error);
        } finally {
          setIsLoadingContacts(false);
        }
      };
      fetchRelatedData();
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
        
        // If we have currentContact data, add it to the contacts array
        if (prefillData.currentContact) {
          console.log('🔍 DEBUG: Adding currentContact to contacts array:', prefillData.currentContact);
          setContacts(prev => {
            const existingContact = prev.find(c => c.id === prefillData.currentContact.id);
            if (!existingContact) {
              return [...prev, prefillData.currentContact];
            }
            return prev;
          });
        }
        
        // If we have currentDeal data, add it to the deals array
        if (prefillData.currentDeal) {
          console.log('🔍 DEBUG: Adding currentDeal to deals array:', prefillData.currentDeal);
          setDeals(prev => {
            const existingDeal = prev.find(d => d.id === prefillData.currentDeal.id);
            if (!existingDeal) {
              return [...prev, prefillData.currentDeal];
            }
            return prev;
          });
        }
        
        // Handle related contacts for task creation
        if (prefillData.relatedContacts && Array.isArray(prefillData.relatedContacts)) {
          console.log('🔍 DEBUG: Adding relatedContacts to contacts array:', prefillData.relatedContacts);
          setContacts(prev => {
            const newContacts = [...prev];
            prefillData.relatedContacts.forEach((contact: any) => {
              const existingContact = newContacts.find(c => c.id === contact.id);
              if (!existingContact) {
                newContacts.push(contact);
              }
            });
            return newContacts;
          });
          
          // Auto-select contact if only one exists
          if (prefillData.autoSelectContact) {
            console.log('🔍 DEBUG: Auto-selecting contact:', prefillData.autoSelectContact);
            setFormData(prev => ({
              ...prev,
              contactLeadId: prefillData.autoSelectContact,
              contactLeadType: 'contact'
            }));
          }
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
      case 'product':
        return 'productOwner';
      case 'quote':
        return 'quoteOwner';
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
    setShowDealContactSearch(false);
    setShowUserSearch(false);
    setUserSearchTerm('');
    setCurrentUserSearchField('');
    setDealContactSearchTerm('');
    setTaskContactLeadSearchTerm('');
    setTaskRelatedRecordSearchTerm('');
    onClose();
  };

  // Helper function to safely get user ID
  const getUserId = (user: TenantUser) => user.userId || user.id || '';

  // Update the multiselect options mapping
  const getUserOptions = (users: TenantUser[]) => users.map(u => ({
    value: getUserId(u),
    label: `${u.firstName} ${u.lastName}${getUserId(u) === user?.userId ? ' (You)' : ''}`
  })).filter((opt): opt is FormFieldOption => Boolean(opt.value));

  // Get filtered users based on search term
  const getFilteredUsers = () => {
    if (!userSearchTerm.trim()) {
      return tenantUsers;
    }
    
    const searchTerm = userSearchTerm.toLowerCase();
    return tenantUsers.filter((user: TenantUser) => {
      const firstName = user.firstName?.toLowerCase() || '';
      const lastName = user.lastName?.toLowerCase() || '';
      const email = user.email?.toLowerCase() || '';
      const role = user.role?.toLowerCase() || '';
      
      return firstName.includes(searchTerm) || 
             lastName.includes(searchTerm) || 
             email.includes(searchTerm) || 
             role.includes(searchTerm) ||
             `${firstName} ${lastName}`.includes(searchTerm);
    });
  };

  // Get dynamic options for contact/lead dropdown
  const getContactLeadOptions = (type: string): FormFieldOption[] => {
    if (type === 'contact') {
      // If we have related contacts from prefillData and requireContactSelection is true,
      // only show those contacts
      if (prefillData?.relatedContacts && prefillData?.requireContactSelection) {
        const relatedContactIds = prefillData.relatedContacts.map((c: any) => c.id);
        const filteredContacts = contacts.filter(c => relatedContactIds.includes(c.id));
        return filteredContacts.map(c => ({
          value: c.id,
          label: `${c.firstName || ''} ${c.lastName || ''}`
        }));
      }
      return contacts.map(c => ({
        value: c.id,
        label: `${c.firstName || ''} ${c.lastName || ''}`
      }));
    } else if (type === 'lead') {
      console.log('🔍 DEBUG: Getting lead options. Available leads:', leads);
      console.log('🔍 DEBUG: Current contactLeadId:', formData.contactLeadId);
      const options = leads.map(l => ({
        value: l.id,
        label: `${l.firstName || ''} ${l.lastName || ''}`
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
        label: d.dealName || d.name || 'Untitled Deal'
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
          { name: 'leadOwner', label: 'Lead Owner', type: 'select', options: getUserOptions(tenantUsers), required: true },
          { name: 'firstName', label: 'First Name', type: 'text', required: true },
          { name: 'lastName', label: 'Last Name', type: 'text', required: true },
          { name: 'company', label: 'Company', type: 'text', required: true },
          { name: 'title', label: 'Title', type: 'text', required: false },
          { name: 'phone', label: 'Phone', type: 'tel', required: true },
          { name: 'email', label: 'Email', type: 'email', required: true },
          { name: 'leadSource', label: 'Lead Source', type: 'select', options: leadSourceOptions, required: true },
          { name: 'leadStatus', label: 'Lead Status', type: 'select', options: leadStatusOptions, required: true },
          { name: 'value', label: 'Lead Value', type: 'number', required: true },
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
          { name: 'contactOwner', label: 'Contact Owner', type: 'select', options: getUserOptions(tenantUsers), required: true },
          { name: 'firstName', label: 'First Name', type: 'text', required: true },
          { name: 'lastName', label: 'Last Name', type: 'text', required: true },
          { name: 'companyName', label: 'Company', type: 'text', required: true },
          { name: 'email', label: 'Email', type: 'email', required: true },
          { name: 'phone', label: 'Phone', type: 'tel', required: true },
          { name: 'title', label: 'Title', type: 'text', required: false },
          { name: 'leadSource', label: 'Source', type: 'select', options: leadSourceOptions, required: true },
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
          { name: 'dealOwner', label: 'Deal Owner', type: 'select', options: getUserOptions(tenantUsers), required: true, group: 'deal' },
          { name: 'dealName', label: 'Deal Name', type: 'text', required: true, group: 'deal' },
          { name: 'amount', label: 'Amount', type: 'number', required: true, group: 'deal' },
          { name: 'leadSource', label: 'Lead Source', type: 'select', options: leadSourceOptions, required: true, group: 'deal' },
          { name: 'stage', label: 'Stage', type: 'select', options: dealStageOptions, required: true, group: 'deal' },
          { name: 'closeDate', label: 'Expected Close Date', type: 'date', required: true, group: 'deal' },
          { name: 'probability', label: 'Probability (%)', type: 'number', required: false, group: 'deal' },
          
          // Contact Information Section
          { name: 'contactId', label: 'Contact', type: 'select', options: isLoadingContacts ? [{ value: '', label: 'Loading contacts...' }] : contacts.length > 0 ? contacts.map(c => ({ value: c.id, label: `${c.firstName} ${c.lastName}${c.companyName ? ` (${c.companyName})` : ''}` })) : [{ value: '', label: 'No contacts available' }], required: false, group: 'contact' },
          { name: 'phone', label: 'Contact Phone', type: 'tel', required: true, group: 'contact' },
          { name: 'email', label: 'Contact Email', type: 'email', required: false, group: 'contact' },
          
          // Additional Information Section
          { name: 'description', label: 'Description', type: 'textarea', required: false, group: 'additional' }
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
          ], required: true }
        ];
      case 'subsidiary':
        return [
          { name: 'name', label: 'Name', type: 'text', required: true },
          { name: 'email', label: 'Email', type: 'email', required: true },
          { name: 'contact', label: 'Contact Number', type: 'tel', required: true },
          { name: 'address', label: 'Address', type: 'textarea', required: true },
          { name: 'totalEmployees', label: 'Total Employees', type: 'number', required: true }
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
          { name: 'notes', label: 'Notes', type: 'textarea', required: false, group: 'description' }
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
          { name: 'terms', label: 'Terms and Conditions', type: 'textarea', required: false, group: 'details' }
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
          setSelectedRelatedRecordType('lead');
        } else if (value === 'contact') {
          // If switching back to 'contact', reset related record type to 'deal' (default)
          newData.relatedRecordType = 'deal';
          newData.relatedRecordId = ''; // Reset the related record ID as well
          setSelectedRelatedRecordType('deal');
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
    } else if (name === 'contactId' && selectedType === 'deal') {
      // When a contact is selected for a deal, automatically populate phone and email
      const selectedContact = contacts.find(c => c.id === value);
      setFormData(prev => ({
        ...prev,
        [name]: value,
        phone: selectedContact?.phone || '',
        email: selectedContact?.email || ''
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
    
    // Additional validation for task creation when contacts are required
    if (selectedType === 'task' && prefillData?.requireContactSelection) {
      if (!formData.contactLeadId) {
        if (prefillData.relatedContacts && prefillData.relatedContacts.length === 0) {
          setError('No contacts associated with this deal. Please associate a contact with the deal first before creating a task.');
        } else if (prefillData.relatedContacts && prefillData.relatedContacts.length > 0) {
          setError('Please select a contact for this task.');
        } else {
          setError('Please select a contact for this task.');
        }
        setLoading(false);
        return;
      }
    }
    
    // Debug: Log the form data to see what's being submitted
    console.log('Form data being submitted:', formData);
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
            relatedProductIds: formData.relatedProductIds || prefillData?.relatedProductIds || []
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
          console.log('🚀 Starting contact creation process...');
          console.log('📋 Form data:', formData);
          console.log('📋 Prefill data:', prefillData);
          
          // Create the contact with relatedProductIds
          const contactData = {
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
            relatedProductIds: formData.relatedProductIds || prefillData?.relatedProductIds || []
          };

          console.log('📤 Creating contact with data:', contactData);
          console.log('📤 relatedProductIds being sent:', contactData.relatedProductIds);
          console.log('📤 relatedProductIds type:', typeof contactData.relatedProductIds);
          console.log('📤 relatedProductIds length:', contactData.relatedProductIds?.length);

          try {
            const newContact = await contactsApi.create(contactData);
            console.log('✅ Contact created successfully:', newContact.id);
            console.log('🔗 Contact relatedProductIds:', newContact.relatedProductIds);
            console.log('🔗 Contact relatedProductIds type:', typeof newContact.relatedProductIds);
            console.log('🔗 Contact relatedProductIds length:', newContact.relatedProductIds?.length);

            // Update products with the new contact (bidirectional relationship)
            if (newContact.relatedProductIds && newContact.relatedProductIds.length > 0) {
              console.log('🔄 Updating products with new contact...');
              console.log('🔄 Number of products to update:', newContact.relatedProductIds.length);
              
              for (const productId of newContact.relatedProductIds) {
                try {
                  console.log(`📦 Processing product ${productId}...`);
                  console.log(`📦 Fetching product ${productId} from database...`);
                  
                  const product = await productsApi.getById(productId);
                  console.log(`📦 Product ${productId} fetched:`, product ? 'Found' : 'Not found');
                  
                  if (product) {
                    const currentContactIds = product.relatedContactIds || [];
                    console.log(`📦 Product ${productId} current contacts:`, currentContactIds);
                    console.log(`📦 Product ${productId} current contacts length:`, currentContactIds.length);
                    
                    const updatedContactIds = [...currentContactIds, newContact.id];
                    console.log(`📦 Product ${productId} updated contacts:`, updatedContactIds);
                    console.log(`📦 Product ${productId} updated contacts length:`, updatedContactIds.length);
                    
                    console.log(`📦 Updating product ${productId} with new contact ${newContact.id}...`);
                    const updatedProduct = await productsApi.update(productId, { 
                      relatedContactIds: updatedContactIds 
                    });
                    console.log(`✅ Product ${productId} updated successfully with contact ${newContact.id}`);
                    console.log(`✅ Updated product relatedContactIds:`, updatedProduct?.relatedContactIds);
                  } else {
                    console.error(`❌ Product ${productId} not found in database`);
                  }
                } catch (error) {
                  console.error(`❌ Failed to update product ${productId} with new contact:`, error);
                  console.error(`❌ Error details:`, error instanceof Error ? error.message : 'Unknown error');
                  // Don't throw here, as the contact was created successfully
                  // Just log the error for debugging
                }
              }
            } else {
              console.log('ℹ️ No relatedProductIds found, skipping product updates');
              console.log('ℹ️ This might indicate the prefillData is not being passed correctly');
            }
          } catch (error) {
            console.error('❌ Failed to create contact:', error);
            console.error('❌ Error details:', error instanceof Error ? error.message : 'Unknown error');
            throw error;
          }

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
            relatedContactIds: formData.contactId ? [formData.contactId] : undefined // Add contact relationship
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
            // Always include contact/lead relationship if provided
            contactLeadId: formData.contactLeadId || undefined,
            contactLeadType: formData.contactLeadType || undefined,
            // Always include related record relationship if provided (except when contactLeadType is 'lead')
            ...(formData.contactLeadType !== 'lead' && formData.relatedRecordId && formData.relatedRecordType && {
              relatedRecordId: formData.relatedRecordId,
              relatedRecordType: formData.relatedRecordType,
            })
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
            totalEmployees: parseInt(formData.totalEmployees) || 0
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
            status: formData.status || 'Active'
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
          notes: ''
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
                <div className="flex items-center">
                <select
                  value={formData[field.name] || ''}
                  onChange={(e) => handleInputChange(field.name, e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-sm"
                  required={field.required}
                >
                  <option value="">Select {field.label}</option>
                  {field.options?.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                    {/* Show selected contact if it's not in the options (for deal contact selection) */}
                    {field.name === 'contactId' && formData.contactId && !field.options?.find(opt => opt.value === formData.contactId) && (
                      <option value={formData.contactId}>
                        {(() => {
                          const selectedContact = contacts.find(c => c.id === formData.contactId);
                          return selectedContact ? `${selectedContact.firstName} ${selectedContact.lastName}${selectedContact.companyName ? ` (${selectedContact.companyName})` : ''}` : 'Selected Contact';
                        })()}
                      </option>
                    )}
                </select>
                  {/* Add search button for contact selection in deals */}
                  {field.name === 'contactId' && selectedType === 'deal' && (
                    <button
                      type="button"
                      onClick={(e) => {
                        console.log('🔍 DEBUG: Search button clicked for Deal Contact');
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('🔍 DEBUG: Setting showDealContactSearch to true');
                        setShowDealContactSearch(true);
                      }}
                      className="ml-2 p-2 text-gray-400 hover:text-gray-600 transition-colors"
                      title="Search contacts"
                    >
                      <Icons.Search className="w-4 h-4" />
                    </button>
                  )}
                  {/* Add search button for user selection fields */}
                  {(field.name === 'productOwner' || field.name === 'quoteOwner' || field.name === 'taskOwner' || field.name === 'leadOwner' || field.name === 'contactOwner' || field.name === 'dealOwner') && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setCurrentUserSearchField(field.name);
                        setUserSearchTerm('');
                        setShowUserSearch(true);
                      }}
                      className="ml-2 p-2 text-gray-400 hover:text-gray-600 transition-colors"
                      title={`Search ${field.label}`}
                    >
                      <Icons.Search className="w-4 h-4" />
                    </button>
                  )}
                </div>
                {/* Show helper text for dependent dropdowns */}
                {(field.name === 'contactLeadType' && !formData.contactLeadType) && (
                  <p className="mt-1 text-sm text-gray-500">Select a type to see available options</p>
                )}
                {(field.name === 'relatedRecordType' && !formData.relatedRecordType) && (
                  <p className="mt-1 text-sm text-gray-500">Select a type to see available options</p>
                )}
                {/* Show helper text for contact selection in deals */}
                {field.name === 'contactId' && selectedType === 'deal' && (
                  <p className="mt-1 text-sm text-blue-600">
                    {formData.contactId ? '✓ Contact selected - Phone and Email will be auto-filled' : 'Select a contact to auto-fill phone and email'}
                  </p>
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
                className={`w-full ${selectedType === 'deal' && field.name === 'phone' && formData.contactId ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                defaultCountryCode="+91"
                disabled={selectedType === 'deal' && field.name === 'phone' && formData.contactId}
              />
            ) : field.type === 'textarea' ? (
              <textarea
                value={formData[field.name] || ''}
                onChange={(e) => handleInputChange(field.name, e.target.value)}
                required={field.required}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm"
                placeholder={`Enter ${field.label.toLowerCase()}...`}
              />
            ) : (
              <input
                type={field.type}
                value={formData[field.name] || ''}
                onChange={(e) => handleInputChange(field.name, field.type === 'number' ? Number(e.target.value) : e.target.value)}
                required={field.required}
                disabled={selectedType === 'deal' && (field.name === 'phone' || field.name === 'email') && formData.contactId}
                className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm ${
                  field.group === 'stock' && field.name === 'quantityInStock' ? 'border-green-300 focus:border-green-500 focus:ring-green-500' :
                  field.group === 'stock' && field.name === 'quantityInDemand' ? 'border-orange-300 focus:border-orange-500 focus:ring-orange-500' :
                  field.group === 'stock' && field.name === 'reorderLevel' ? 'border-red-300 focus:border-red-500 focus:ring-red-500' :
                  field.group === 'stock' && field.name === 'quantityOrdered' ? 'border-blue-300 focus:border-blue-500 focus:ring-blue-500' :
                  selectedType === 'deal' && (field.name === 'phone' || field.name === 'email') && formData.contactId ? 'bg-gray-100 cursor-not-allowed' :
                  ''
                }`}
                placeholder={`Enter ${field.label.toLowerCase()}...`}
                {...(field.type === 'date' && {
                  min: new Date(new Date().getFullYear() - 25, 0, 1).toISOString().split('T')[0],
                  max: new Date(new Date().getFullYear() + 50, 11, 31).toISOString().split('T')[0]
                })}
              />
            )}
            {/* Show helper text for read-only fields when contact is selected */}
            {selectedType === 'deal' && (field.name === 'phone' || field.name === 'email') && formData.contactId && (
              <p className="mt-1 text-sm text-gray-500">
                ✓ Auto-filled from selected contact
              </p>
            )}
          </div>
        );
    }
  };

  // Get filtered contacts for deal contact search
  const getFilteredContacts = () => {
    if (!dealContactSearchTerm.trim()) {
      return contacts;
    }
    
    const searchTerm = dealContactSearchTerm.toLowerCase();
    return contacts.filter((contact: any) => {
      const firstName = contact.firstName?.toLowerCase() || '';
      const lastName = contact.lastName?.toLowerCase() || '';
      const email = contact.email?.toLowerCase() || '';
      const phone = contact.phone?.toLowerCase() || '';
      const companyName = contact.companyName?.toLowerCase() || '';
      const contactOwner = contact.contactOwner?.toLowerCase() || '';
      
      return (
        firstName.includes(searchTerm) ||
        lastName.includes(searchTerm) ||
        email.includes(searchTerm) ||
        phone.includes(searchTerm) ||
        companyName.includes(searchTerm) ||
        contactOwner.includes(searchTerm) ||
        `${firstName} ${lastName}`.includes(searchTerm)
      );
    });
  };

  // Get filtered contacts/leads for task search
  const getFilteredTaskContactLeads = () => {
    if (!taskContactLeadSearchTerm.trim()) {
      return formData.contactLeadType === 'contact' ? contacts : leads;
    }
    
    const searchTerm = taskContactLeadSearchTerm.toLowerCase();
    const records = formData.contactLeadType === 'contact' ? contacts : leads;
    
    return records.filter((record: any) => {
      const firstName = record.firstName?.toLowerCase() || '';
      const lastName = record.lastName?.toLowerCase() || '';
      const email = record.email?.toLowerCase() || '';
      const phone = record.phone?.toLowerCase() || '';
      const companyName = record.companyName?.toLowerCase() || '';
      const company = record.company?.toLowerCase() || '';
      const owner = record.contactOwner?.toLowerCase() || record.leadOwner?.toLowerCase() || '';
      
      return (
        firstName.includes(searchTerm) ||
        lastName.includes(searchTerm) ||
        email.includes(searchTerm) ||
        phone.includes(searchTerm) ||
        companyName.includes(searchTerm) ||
        company.includes(searchTerm) ||
        owner.includes(searchTerm) ||
        `${firstName} ${lastName}`.includes(searchTerm)
      );
    });
  };

  // Get filtered related records for task search
  const getFilteredTaskRelatedRecords = () => {
    if (!taskRelatedRecordSearchTerm.trim()) {
      if (formData.relatedRecordType === 'deal') return deals;
      if (formData.relatedRecordType === 'product') return products;
      if (formData.relatedRecordType === 'quote') return quotes;
      return [];
    }
    
    const searchTerm = taskRelatedRecordSearchTerm.toLowerCase();
    let records: any[] = [];
    
    if (formData.relatedRecordType === 'deal') {
      records = deals;
    } else if (formData.relatedRecordType === 'product') {
      records = products;
    } else if (formData.relatedRecordType === 'quote') {
      records = quotes;
    }
    
    return records.filter((record: any) => {
      const name = record.dealName?.toLowerCase() || record.name?.toLowerCase() || record.quoteName?.toLowerCase() || '';
      const owner = record.dealOwner?.toLowerCase() || record.productOwner?.toLowerCase() || record.quoteOwner?.toLowerCase() || '';
      const amount = record.amount?.toString() || record.unitPrice?.toString() || record.totalAmount?.toString() || '';
      const stage = record.stage?.toLowerCase() || record.status?.toLowerCase() || '';
      
      return (
        name.includes(searchTerm) ||
        owner.includes(searchTerm) ||
        amount.includes(searchTerm) ||
        stage.includes(searchTerm)
      );
    });
  };

  return (
      <Dialog open={isOpen} onClose={handleMainModalClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" aria-hidden="true" />
      
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel 
          className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[95vh] overflow-hidden flex flex-col" 
          onClick={(e) => {
            console.log('🔍 DEBUG: Main modal Dialog.Panel clicked');
            e.stopPropagation();
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                {selectedType && Icons[getFilteredRecordTypes().find(t => t.id === selectedType)?.icon as keyof typeof Icons] ? 
                  React.createElement(Icons[getFilteredRecordTypes().find(t => t.id === selectedType)?.icon as keyof typeof Icons] as any, { className: "w-5 h-5 text-blue-600" }) :
                  <Icons.Plus className="w-5 h-5 text-blue-600" />
                }
              </div>
              <div>
                <Dialog.Title className="text-xl font-bold text-gray-900">
                {selectedType ? `Create ${selectedType.charAt(0).toUpperCase() + selectedType.slice(1)}` : 'Create New Record'}
              </Dialog.Title>
                <p className="text-sm text-gray-600 mt-1">
                  {selectedType ? getFilteredRecordTypes().find(t => t.id === selectedType)?.description : 'Select a record type to get started'}
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                console.log('🔍 DEBUG: Main modal close button clicked');
                handleMainModalClose();
              }}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors group"
            >
              <Icons.X className="w-5 h-5 text-gray-500 group-hover:text-gray-700" />
            </button>
          </div>
          
          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {!selectedType ? (
              <div>
                <p className="text-sm text-gray-600 mb-8 text-center">
                  Select the type of record you want to create from the options below.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {recordTypes.map((type) => {
                    const Icon = Icons[type.icon as keyof typeof Icons] as any;
                    return (
                      <button
                        key={type.id}
                        onClick={() => handleTypeSelection(type.id)}
                        className="group flex flex-col items-center p-6 border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:bg-gradient-to-br hover:from-blue-50 hover:to-indigo-50 transition-all duration-200 text-center hover:shadow-lg"
                      >
                        <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-blue-200 transition-colors">
                          <Icon className="w-6 h-6 text-blue-600" />
                        </div>
                        <h3 className="font-semibold text-gray-900 mb-2">{type.name}</h3>
                        <p className="text-sm text-gray-500">{type.description}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Back Button */}
                <div className="flex items-center">
                  <button
                    type="button"
                    onClick={handleBackToSelection}
                    className="text-gray-600 hover:text-gray-900 flex items-center px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <Icons.ArrowLeft className="w-4 h-4 mr-2" />
                    Back to selection
                  </button>
                </div>

                {/* Error Display */}
                {error && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                    <div className="flex">
                      <Icons.AlertCircle className="w-5 h-5 text-red-600 mr-3 mt-0.5 flex-shrink-0" />
                      <div>
                        <h3 className="text-sm font-semibold text-red-800">Error</h3>
                        <p className="text-sm text-red-700 mt-1">{error}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Product Association Indicator */}
                {selectedType === 'lead' && prefillData?.relatedProductIds && prefillData.relatedProductIds.length > 0 && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                    <div className="flex items-center">
                      <Icons.Package className="w-5 h-5 text-blue-600 mr-3 flex-shrink-0" />
                      <div>
                        <h3 className="text-sm font-semibold text-blue-800">Product Association</h3>
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
                <div className="space-y-8">
                  {(() => {
                    const formFields = getFormFields();
                    const groupedFields = formFields.reduce((acc, field) => {
                      const group = field.group || 'default';
                      if (!acc[group]) acc[group] = [];
                      acc[group].push(field);
                      return acc;
                    }, {} as Record<string, typeof formFields>);

                    return Object.entries(groupedFields).map(([groupName, fields]) => (
                      <div key={groupName} className="bg-gray-50 rounded-xl p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
                          {groupName === 'default' ? 'Basic Information' : 
                           groupName === 'task' ? 'Task Information' :
                           groupName === 'deal' ? 'Deal Information' :
                           groupName === 'contact' ? 'Contact Information' :
                           groupName === 'product' ? 'Product Information' :
                           groupName === 'quote' ? 'Quote Information' :
                           groupName === 'price' ? 'Pricing Information' :
                           groupName === 'stock' ? 'Stock Information' :
                           groupName === 'description' ? 'Description Information' :
                           groupName === 'lineItems' ? 'Line Items Information' :
                           groupName === 'details' ? 'Quote Details' :
                           groupName === 'additional' ? 'Additional Information' :
                           groupName.charAt(0).toUpperCase() + groupName.slice(1) + ' Information'
                          }
                          {groupName === 'lineItems' && <span className="text-red-500 ml-1">*</span>}
                        </h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {fields.map(field => {
                            if (field.type === 'lineItems') {
                              return (
                                <div key={field.name} className="md:col-span-2">
                                  <label className="block text-sm font-medium text-gray-700 mb-3">
                                    {field.label}
                                    {field.required && <span className="text-red-500 ml-1">*</span>}
                            </label>
                                  <div className="bg-white rounded-lg border border-gray-200 p-4">
                                    <LineItemsInput
                                      value={formData[field.name] || []}
                                      onChange={(items) => handleInputChange(field.name, items)}
                                      className="w-full"
                            />
                          </div>
                              </div>
                              );
                            }
                            
                            return (
                              <div key={field.name} className={field.type === 'textarea' ? 'md:col-span-2' : ''}>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                  {field.label}
                                  {field.required && <span className="text-red-500 ml-1">*</span>}
                                </label>
                                {renderField(field)}
                              </div>
                            );
                          })}
                          </div>
                        </div>
                    ));
                  })()}
                </div>

                {/* Form Actions */}
                <div className="flex justify-end space-x-3 mt-8 pt-6 border-t border-gray-200 bg-gray-50 -mx-6 -mb-6 px-6 pb-6">
                  <button
                    type="button"
                    onClick={handleMainModalClose}
                    className="px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center shadow-sm"
                  >
                    {loading ? (
                      <>
                        <Icons.Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Icons.Plus className="w-4 h-4 mr-2" />
                        Create {selectedType?.charAt(0).toUpperCase() + selectedType?.slice(1)}
                      </>
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
                      setTaskContactLeadSearchTerm('');
                    }}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <Icons.X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>
                {/* Search Bar */}
                <div className="px-6 pb-4">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Icons.Search className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      value={taskContactLeadSearchTerm}
                      onChange={(e) => setTaskContactLeadSearchTerm(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                          setTaskContactLeadSearchTerm('');
                          e.currentTarget.blur();
                        }
                      }}
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder={`Search ${formData.contactLeadType || 'contact'}s by name, email, phone, company, or owner...`}
                      autoFocus
                    />
                    {taskContactLeadSearchTerm && (
                      <button
                        onClick={() => setTaskContactLeadSearchTerm('')}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      >
                        <Icons.X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                      </button>
                    )}
                  </div>
                  {/* Search Results Count */}
                  {taskContactLeadSearchTerm ? (
                    <div className="mt-2 text-sm text-gray-500">
                      Found {getFilteredTaskContactLeads().length} {formData.contactLeadType || 'contact'}{getFilteredTaskContactLeads().length !== 1 ? 's' : ''} matching "{taskContactLeadSearchTerm}"
                    </div>
                  ) : (
                    <div className="mt-2 text-sm text-gray-500">
                      {(formData.contactLeadType === 'contact' ? contacts : leads).length} total {formData.contactLeadType || 'contact'}{(formData.contactLeadType === 'contact' ? contacts : leads).length !== 1 ? 's' : ''} available
                    </div>
                  )}
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
                      {getFilteredTaskContactLeads().length > 0 ? (
                        getFilteredTaskContactLeads().map((record: any) => (
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
                              setTaskContactLeadSearchTerm('');
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
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="px-6 py-8 text-center">
                            <div className="flex flex-col items-center">
                              <Icons.Search className="w-8 h-8 text-gray-400 mb-2" />
                              <p className="text-gray-500 text-sm">
                                {taskContactLeadSearchTerm ? `No ${formData.contactLeadType || 'contact'}s found matching "${taskContactLeadSearchTerm}"` : `No ${formData.contactLeadType || 'contact'}s available`}
                              </p>
                              {taskContactLeadSearchTerm && (
                                <button
                                  onClick={() => setTaskContactLeadSearchTerm('')}
                                  className="mt-2 text-blue-600 hover:text-blue-800 text-sm"
                                >
                                  Clear search
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
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
                      setTaskRelatedRecordSearchTerm('');
                    }}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <Icons.X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>
                {/* Search Bar */}
                <div className="px-6 pb-4">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Icons.Search className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      value={taskRelatedRecordSearchTerm}
                      onChange={(e) => setTaskRelatedRecordSearchTerm(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                          setTaskRelatedRecordSearchTerm('');
                          e.currentTarget.blur();
                        }
                      }}
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder={`Search ${formData.relatedRecordType || 'deal'}s by name, owner, amount, or status...`}
                      autoFocus
                    />
                    {taskRelatedRecordSearchTerm && (
                      <button
                        onClick={() => setTaskRelatedRecordSearchTerm('')}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      >
                        <Icons.X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                      </button>
                    )}
                  </div>
                  {/* Search Results Count */}
                  {taskRelatedRecordSearchTerm ? (
                    <div className="mt-2 text-sm text-gray-500">
                      Found {getFilteredTaskRelatedRecords().length} {formData.relatedRecordType || 'deal'}{getFilteredTaskRelatedRecords().length !== 1 ? 's' : ''} matching "{taskRelatedRecordSearchTerm}"
                    </div>
                  ) : (
                    <div className="mt-2 text-sm text-gray-500">
                      {(formData.relatedRecordType === 'deal' ? deals : 
                        formData.relatedRecordType === 'product' ? products : quotes).length} total {formData.relatedRecordType || 'deal'}{(formData.relatedRecordType === 'deal' ? deals : 
                        formData.relatedRecordType === 'product' ? products : quotes).length !== 1 ? 's' : ''} available
                    </div>
                  )}
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
                      {getFilteredTaskRelatedRecords().length > 0 ? (
                        getFilteredTaskRelatedRecords().map((record: any) => (
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
                              setTaskRelatedRecordSearchTerm('');
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
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="px-6 py-8 text-center">
                            <div className="flex flex-col items-center">
                              <Icons.Search className="w-8 h-8 text-gray-400 mb-2" />
                              <p className="text-gray-500 text-sm">
                                {taskRelatedRecordSearchTerm ? `No ${formData.relatedRecordType || 'deal'}s found matching "${taskRelatedRecordSearchTerm}"` : `No ${formData.relatedRecordType || 'deal'}s available`}
                              </p>
                              {taskRelatedRecordSearchTerm && (
                                <button
                                  onClick={() => setTaskRelatedRecordSearchTerm('')}
                                  className="mt-2 text-blue-600 hover:text-blue-800 text-sm"
                                >
                                  Clear search
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Deal Contact Search Overlay */}
      {showDealContactSearch && createPortal(
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" 
          onClick={(e) => {
            console.log('🔍 DEBUG: Deal Contact outer overlay div clicked');
            e.stopPropagation();
          }}
        >
          <div 
            className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[80vh] overflow-hidden" 
            onClick={(e) => {
              console.log('🔍 DEBUG: Deal Contact inner overlay div clicked');
              e.stopPropagation();
            }}
          >
            <div className="overflow-x-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 z-10 min-w-[800px]">
                <div className="flex items-center justify-between p-6">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Search Contacts
                  </h3>
                  <button
                    onClick={(e) => {
                      console.log('🔍 DEBUG: Deal Contact close button clicked');
                      e.stopPropagation();
                      setShowDealContactSearch(false);
                      setDealContactSearchTerm('');
                    }}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <Icons.X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>
                {/* Search Bar */}
                <div className="px-6 pb-4">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Icons.Search className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      value={dealContactSearchTerm}
                      onChange={(e) => setDealContactSearchTerm(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                          setDealContactSearchTerm('');
                          e.currentTarget.blur();
                        }
                      }}
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="Search contacts by name, email, phone, company, or owner..."
                      autoFocus
                    />
                    {dealContactSearchTerm && (
                      <button
                        onClick={() => setDealContactSearchTerm('')}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      >
                        <Icons.X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                      </button>
                    )}
                  </div>
                  {/* Search Results Count */}
                  {dealContactSearchTerm ? (
                    <div className="mt-2 text-sm text-gray-500">
                      Found {getFilteredContacts().length} contact{getFilteredContacts().length !== 1 ? 's' : ''} matching "{dealContactSearchTerm}"
                    </div>
                  ) : (
                    <div className="mt-2 text-sm text-gray-500">
                      {contacts.length} total contact{contacts.length !== 1 ? 's' : ''} available
                    </div>
                  )}
                </div>
              </div>
              
              <div className="overflow-y-auto max-h-[calc(80vh-80px)]">
                <div className="bg-white min-w-[800px]">
                  <table className="w-full">
                    <thead className="bg-gray-50 sticky top-0 z-10">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <div className="flex items-center">
                            CONTACT
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
                      {getFilteredContacts().length > 0 ? (
                        getFilteredContacts().map((contact: any) => (
                          <tr
                            key={contact.id}
                            onClick={(e) => {
                              console.log('🔍 DEBUG: Deal Contact row clicked:', contact.id, contact.firstName, contact.lastName);
                              e.stopPropagation();
                              const contactName = `${contact.firstName} ${contact.lastName}`;
                              console.log('🔍 DEBUG: Setting form data with contact:', contact.id, contactName);
                              // Update form data with the selected contact
                              setFormData(prev => {
                                console.log('🔍 DEBUG: Previous form data for deal contact:', prev);
                                const newData = {
                                  ...prev,
                                  contactId: contact.id,
                                  phone: contact.phone || '',
                                  email: contact.email || ''
                                };
                                console.log('🔍 DEBUG: New form data for deal contact:', newData);
                                return newData;
                              });
                              console.log('🔍 DEBUG: Closing deal contact search overlay');
                              setShowDealContactSearch(false);
                              setDealContactSearchTerm('');
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
                                    {contact.firstName} {contact.lastName}
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    {contact.id}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {contact.contactOwner || 'Unknown'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {contact.email || 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {contact.phone || 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {contact.companyName || 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
                                {contact.status || 'Active'}
                              </span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="px-6 py-8 text-center">
                            <div className="flex flex-col items-center">
                              <Icons.Search className="w-8 h-8 text-gray-400 mb-2" />
                              <p className="text-gray-500 text-sm">
                                {dealContactSearchTerm ? `No contacts found matching "${dealContactSearchTerm}"` : 'No contacts available'}
                              </p>
                              {dealContactSearchTerm && (
                                <button
                                  onClick={() => setDealContactSearchTerm('')}
                                  className="mt-2 text-blue-600 hover:text-blue-800 text-sm"
                                >
                                  Clear search
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* User Search Modal */}
      {showUserSearch && createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div 
            className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
            onClick={(e) => {
              console.log('🔍 DEBUG: User Search outer overlay div clicked');
              e.stopPropagation();
            }}
          >
            <div className="overflow-x-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 z-10 min-w-[800px]">
                <div className="flex items-center justify-between p-6">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Search Users
                  </h3>
                  <button
                    onClick={(e) => {
                      console.log('🔍 DEBUG: User Search close button clicked');
                      e.stopPropagation();
                      setShowUserSearch(false);
                      setUserSearchTerm('');
                      setCurrentUserSearchField('');
                    }}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <Icons.X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>
                {/* Search Bar */}
                <div className="px-6 pb-4">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Icons.Search className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      value={userSearchTerm}
                      onChange={(e) => setUserSearchTerm(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                          setUserSearchTerm('');
                          e.currentTarget.blur();
                        }
                      }}
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="Search users by name, email, or role..."
                      autoFocus
                    />
                    {userSearchTerm && (
                      <button
                        onClick={() => setUserSearchTerm('')}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      >
                        <Icons.X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                      </button>
                    )}
                  </div>
                  {/* Search Results Count */}
                  {userSearchTerm ? (
                    <div className="mt-2 text-sm text-gray-500">
                      Found {getFilteredUsers().length} user{getFilteredUsers().length !== 1 ? 's' : ''} matching "{userSearchTerm}"
                    </div>
                  ) : (
                    <div className="mt-2 text-sm text-gray-500">
                      {tenantUsers.length} total user{tenantUsers.length !== 1 ? 's' : ''} available
                    </div>
                  )}
                </div>
              </div>
              
              <div className="overflow-y-auto max-h-[calc(80vh-80px)]">
                <div className="bg-white min-w-[800px]">
                  <table className="w-full">
                    <thead className="bg-gray-50 sticky top-0 z-10">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <div className="flex items-center">
                            USER
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
                            ROLE
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
                      {getFilteredUsers().length > 0 ? (
                        getFilteredUsers().map((userItem: TenantUser) => (
                          <tr
                            key={getUserId(userItem)}
                            onClick={(e) => {
                              console.log('🔍 DEBUG: User row clicked:', getUserId(userItem), userItem.firstName, userItem.lastName);
                              e.stopPropagation();
                              const userName = `${userItem.firstName} ${userItem.lastName}`;
                              console.log('🔍 DEBUG: Setting form data with user:', getUserId(userItem), userName);
                              // Update form data with the selected user
                              setFormData(prev => {
                                console.log('🔍 DEBUG: Previous form data for user:', prev);
                                const newData = {
                                  ...prev,
                                  [currentUserSearchField]: getUserId(userItem)
                                };
                                console.log('🔍 DEBUG: New form data for user:', newData);
                                return newData;
                              });
                              console.log('🔍 DEBUG: Closing user search overlay');
                              setShowUserSearch(false);
                              setUserSearchTerm('');
                              setCurrentUserSearchField('');
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
                                    {userItem.firstName} {userItem.lastName}
                                    {getUserId(userItem) === user?.userId && ' (You)'}
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    {getUserId(userItem)}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {userItem.email || 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {userItem.role || 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                                Active
                              </span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="px-6 py-8 text-center">
                            <div className="flex flex-col items-center">
                              <Icons.Search className="w-8 h-8 text-gray-400 mb-2" />
                              <p className="text-gray-500 text-sm">
                                {userSearchTerm ? `No users found matching "${userSearchTerm}"` : 'No users available'}
                              </p>
                              {userSearchTerm && (
                                <button
                                  onClick={() => setUserSearchTerm('')}
                                  className="mt-2 text-blue-600 hover:text-blue-800 text-sm"
                                >
                                  Clear search
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
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