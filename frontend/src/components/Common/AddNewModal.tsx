import React, { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import * as Icons from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { useNotificationStore } from '../../store/useNotificationStore';
import { useToastStore } from '../../store/useToastStore';
import { contactsApi, leadsApi, dealsApi, dealersApi, subsidiariesApi, tasksApi, productsApi, quotesApi } from '../../api/services';
import PhoneNumberInput from './PhoneNumberInput';
import LineItemsInput from './LineItemsInput';
import API from '../../api/client';
import { DEAL_STAGES, TASK_STATUSES } from '../../types';

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
  const { user } = useAuthStore();
  const { addNotification } = useNotificationStore();
  const { addToast } = useToastStore();

  // Define task options at component level
  const taskStatusOptions: FormFieldOption[] = TASK_STATUSES.map(status => ({ value: status, label: status }));
  const taskPriorityOptions: FormFieldOption[] = [
    'High', 'Normal', 'Low'
  ].map(priority => ({ value: priority, label: priority }));

  // Get filtered record types based on user role
  const getFilteredRecordTypes = () => {
    const isAdmin = user?.role?.name === 'ADMIN' || user?.role?.name === 'SUPER_ADMIN' || user?.role?.name === 'Admin' || user?.role?.name === 'SuperAdmin';

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
    if (isOpen && selectedType === 'task') {
      const fetchTaskRelatedData = async () => {
        try {
          // Fetch contacts, leads, deals, products, and quotes for dropdowns
          const [contactsRes, leadsRes, dealsRes, productsRes, quotesRes] = await Promise.all([
            contactsApi.getAll(),
            leadsApi.getAll(),
            dealsApi.getAll(),
            productsApi.getAll(),
            quotesApi.getAll()
          ]);
          
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
      const isAdmin = user?.role?.name === 'ADMIN' || user?.role?.name === 'SUPER_ADMIN' || user?.role?.name === 'Admin' || user?.role?.name === 'SuperAdmin';
      if ((defaultType === 'dealer' || defaultType === 'subsidiary') && !isAdmin) {
        addToast({
          type: 'error',
          title: 'Access Denied',
          message: 'You do not have permission to create this type of record.'
        });
        onClose();
        return;
      }

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
        setFormData(prev => ({ ...prev, ...prefillData }));
        
        // Set the selected types for dropdowns if provided
        if (prefillData.relatedRecordType) {
          setSelectedRelatedRecordType(prefillData.relatedRecordType);
        }
        if (prefillData.contactLeadType) {
          setSelectedContactLeadType(prefillData.contactLeadType);
        }
      }
    }
  }, [isOpen, defaultType, user?.role, prefillData]);

  const handleTypeSelection = (typeId: string) => {
    // Check if user has permission to access this type
    const isAdmin = user?.role?.name === 'ADMIN' || user?.role?.name === 'SUPER_ADMIN' || user?.role?.name === 'Admin' || user?.role?.name === 'SuperAdmin';
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
      return leads.map(l => ({
        value: l.id,
        label: `${l.firstName} ${l.lastName}`
      }));
    }
    return [];
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
    }
    return [];
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
          { name: 'email', label: 'Email', type: 'email', required: false },
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
          { name: 'email', label: 'Email', type: 'email', required: false },
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
          { name: 'contactLeadType', label: 'Contact/Lead Type', type: 'select', options: [
            { value: 'contact', label: 'Contact' },
            { value: 'lead', label: 'Lead' }
          ], required: false, group: 'task' },
          { name: 'contactLeadId', label: 'Contact/Lead', type: 'select', options: getContactLeadOptions(formData.contactLeadType || selectedContactLeadType), required: false, group: 'task' },
          { name: 'relatedRecordType', label: 'Related Record Type', type: 'select', options: [
            { value: 'deal', label: 'Deal' },
            { value: 'product', label: 'Product' },
            { value: 'quote', label: 'Quote' }
          ], required: false, group: 'task' },
          { name: 'relatedRecordId', label: 'Related Record', type: 'select', options: getRelatedRecordOptions(formData.relatedRecordType || selectedRelatedRecordType), required: false, group: 'task' },
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
      setFormData(prev => ({ 
        ...prev, 
        [name]: value,
        contactLeadId: '' // Reset the ID when type changes
      }));
    } else if (name === 'relatedRecordType') {
      // Reset related record ID when type changes
      setSelectedRelatedRecordType(value);
      setFormData(prev => ({ 
        ...prev, 
        [name]: value,
        relatedRecordId: '' // Reset the ID when type changes
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
    
    const baseRecord = {
      id: Date.now().toString(),
      createdAt: new Date().toISOString().split('T')[0]
    };

    try {
      switch (selectedType) {
        case 'lead':
          await leadsApi.create({
            leadOwner: formData.leadOwner,
            firstName: formData.firstName,
            lastName: formData.lastName,
            company: formData.company,
            email: formData.email || undefined, // Make email optional
            leadSource: formData.leadSource,
            leadStatus: formData.leadStatus,
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
            status: formData.leadStatus,
            source: formData.leadSource,
            visibleTo: formData.visibleTo || []
          });
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
          console.log('Creating task with data:', {
            title: formData.subject,
            description: formData.description || '',
            priority: formData.priority || 'Normal',
            status: formData.status || 'Open',
            dueDate: formData.dueDate,
            assignee: formData.taskOwner || user?.userId || '',
            type: 'Follow-up',
            tenantId: '',
            contactLeadId: formData.contactLeadId || undefined,
            contactLeadType: formData.contactLeadType || undefined,
            relatedRecordId: formData.relatedRecordId || undefined,
            relatedRecordType: formData.relatedRecordType || undefined,
            visibleTo: formData.visibleTo || []
          });
          
          await tasksApi.create({
          title: formData.subject,
          description: formData.description || '',
            priority: formData.priority || 'Normal',
            status: formData.status || 'Open',
          dueDate: formData.dueDate,
            assignee: formData.taskOwner || user?.userId || '',
            type: 'Follow-up',
            tenantId: '',
            // Add new fields for related records
            contactLeadId: formData.contactLeadId || undefined,
            contactLeadType: formData.contactLeadType || undefined,
            relatedRecordId: formData.relatedRecordId || undefined,
            relatedRecordType: formData.relatedRecordType || undefined,
            visibleTo: formData.visibleTo || []
          });
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
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </label>
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
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {field.label} {field.required && <span className="text-red-500">*</span>}
                </label>
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
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </label>
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
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
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
        <Dialog.Panel className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center space-x-4">
              <Dialog.Title className="text-xl font-semibold text-gray-900">
                {selectedType ? `Create ${selectedType.charAt(0).toUpperCase() + selectedType.slice(1)}` : 'Create New Record'}
              </Dialog.Title>
              <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                Edit Page Layout
              </button>
            </div>
            <button
              onClick={handleMainModalClose}
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

                {/* Form Fields - Clean Layout */}
                <div className="space-y-6">
                  {/* Task Information Section */}
                  {selectedType === 'task' && (
                    <>
                      <div>
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

                          {/* Contact/Lead Type */}
                          <div className="border-b border-gray-200 pb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Contact/Lead Type
                            </label>
                            <div className="flex items-center">
                              <select
                                value={formData.contactLeadType || ''}
                                onChange={(e) => handleInputChange('contactLeadType', e.target.value)}
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                              >
                                <option value="">Select Type</option>
                                <option value="contact">Contact</option>
                                <option value="lead">Lead</option>
                              </select>
                              <Icons.ChevronDown className="w-4 h-4 text-gray-400 ml-2" />
                              <Icons.Search className="w-4 h-4 text-gray-400 ml-2" />
                            </div>
                          </div>

                          {/* Contact/Lead Selection */}
                          {formData.contactLeadType && (
                            <div className="border-b border-gray-200 pb-4">
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Contact/Lead
                              </label>
                              <div className="flex items-center">
                                <select
                                  value={formData.contactLeadId || ''}
                                  onChange={(e) => handleInputChange('contactLeadId', e.target.value)}
                                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                                >
                                  <option value="">Select {formData.contactLeadType}</option>
                                  {getContactLeadOptions(formData.contactLeadType).map(option => (
                                    <option key={option.value} value={option.value}>{option.label}</option>
                                  ))}
                                </select>
                                <Icons.ChevronDown className="w-4 h-4 text-gray-400 ml-2" />
                                <Icons.Search className="w-4 h-4 text-gray-400 ml-2" />
                              </div>
                            </div>
                          )}

                          {/* Related Record Type */}
                          <div className="border-b border-gray-200 pb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Related Record Type
                            </label>
                            <div className="flex items-center">
                              <select
                                value={formData.relatedRecordType || ''}
                                onChange={(e) => handleInputChange('relatedRecordType', e.target.value)}
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                              >
                                <option value="">Select Type</option>
                                <option value="deal">Deal</option>
                                <option value="product">Product</option>
                                <option value="quote">Quote</option>
                              </select>
                              <Icons.ChevronDown className="w-4 h-4 text-gray-400 ml-2" />
                              <Icons.Search className="w-4 h-4 text-gray-400 ml-2" />
                            </div>
                          </div>

                          {/* Related Record Selection */}
                          {formData.relatedRecordType && (
                            <div className="border-b border-gray-200 pb-4">
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Related Record
                              </label>
                              <div className="flex items-center">
                                <select
                                  value={formData.relatedRecordId || ''}
                                  onChange={(e) => handleInputChange('relatedRecordId', e.target.value)}
                                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                                >
                                  <option value="">Select {formData.relatedRecordType}</option>
                                  {getRelatedRecordOptions(formData.relatedRecordType).map(option => (
                                    <option key={option.value} value={option.value}>{option.label}</option>
                                  ))}
                                </select>
                                <Icons.ChevronDown className="w-4 h-4 text-gray-400 ml-2" />
                                <Icons.Search className="w-4 h-4 text-gray-400 ml-2" />
                              </div>
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
    </Dialog>
  );
};

export default AddNewModal;