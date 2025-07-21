import React, { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import * as Icons from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { useNotificationStore } from '../../store/useNotificationStore';
import { useToastStore } from '../../store/useToastStore';
import { contactsApi, leadsApi, dealsApi, dealersApi, subsidiariesApi, tasksApi } from '../../api/services';
import PhoneNumberInput from './PhoneNumberInput';
import API from '../../api/client';
import { DEAL_STAGES } from '../../types';

interface AddNewModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultType?: string;
  onSuccess?: () => void;
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
  type: 'text' | 'tel' | 'email' | 'select' | 'multiselect' | 'textarea' | 'date' | 'number';
  required?: boolean;
  group?: string;
  options?: FormFieldOption[];
}

const AddNewModal: React.FC<AddNewModalProps> = ({ isOpen, onClose, defaultType, onSuccess }): JSX.Element => {
  const [selectedType, setSelectedType] = useState<string>();
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [tenantUsers, setTenantUsers] = useState<TenantUser[]>([]);
  const { user } = useAuthStore();
  const { addNotification } = useNotificationStore();
  const { addToast } = useToastStore();

  // Get filtered record types based on user role
  const getFilteredRecordTypes = () => {
    const isAdmin = user?.role?.name === 'ADMIN' || user?.role?.name === 'SUPER_ADMIN' || user?.role?.name === 'Admin' || user?.role?.name === 'SuperAdmin';

    // Base record types available to all roles
    const baseTypes = [
      { id: 'lead', name: 'Lead', icon: 'UserPlus', description: 'A potential customer' },
      { id: 'contact', name: 'Contact', icon: 'User', description: 'A person you do business with' },
      { id: 'deal', name: 'Deal', icon: 'Target', description: 'A sales opportunity' },
      { id: 'task', name: 'Task', icon: 'CheckSquare', description: 'A to-do item' },
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
    if (isOpen && (selectedType === 'lead' || selectedType === 'contact' || selectedType === 'task' || selectedType === 'deal' || selectedType === 'dealer' || selectedType === 'subsidiary')) {
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
      const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN' || user?.role === 'Admin' || user?.role === 'SuperAdmin';
      if ((defaultType === 'dealer' || defaultType === 'subsidiary') && !isAdmin) {
        addToast({
          type: 'error',
          title: 'Access Denied',
          message: 'You do not have permission to create this type of record.'
        });
        onClose();
        return;ƒ
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
    }
  }, [isOpen, defaultType, user?.role]);

  const handleTypeSelection = (typeId: string) => {
    // Check if user has permission to access this type
    const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN' || user?.role === 'Admin' || user?.role === 'SuperAdmin';
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
    onClose();
  };

  // Helper function to safely get user ID
  const getUserId = (user: TenantUser) => user.userId || user.id || '';

  // Update the multiselect options mapping
  const getUserOptions = (users: TenantUser[]) => users.map(u => ({
    value: getUserId(u),
    label: `${u.firstName} ${u.lastName}${getUserId(u) === user?.userId ? ' (You)' : ''}`
  })).filter((opt): opt is FormFieldOption => Boolean(opt.value));

  const getFormFields = (): FormField[] => {
    const leadSourceOptions: FormFieldOption[] = [
      'Advertisement', 'Cold Call', 'Employee Referral', 'External Referral', 'Online Store',
      'X (Twitter)', 'Facebook', 'Partner', 'Public Relations', 'Sales Email Alias',
      'Seminar Partner', 'Internal Seminar', 'Trade Show', 'Web Download', 'Web Research', 'Chat'
    ].map(source => ({ value: source, label: source }));

    const leadStatusOptions: FormFieldOption[] = [
      'Attempted to Contact', 'Contact in Future', 'Contacted', 'Junk Lead',
      'Lost Lead', 'Not Contacted', 'Prequalified', 'Not Qualified'
    ].map(status => ({ value: status, label: status }));

    const taskStatusOptions: FormFieldOption[] = [
      'Not Started', 'In Progress', 'Completed', 'Waiting on Someone Else', 'Deferred'
    ].map(status => ({ value: status, label: status }));

    const taskPriorityOptions: FormFieldOption[] = [
      'High', 'Normal', 'Low'
    ].map(priority => ({ value: priority, label: priority }));

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
          { name: 'phone', label: 'Phone', type: 'tel', required: false },
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
          { name: 'phone', label: 'Phone', type: 'tel', required: false },
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
          { name: 'subject', label: 'Subject', type: 'text', required: true },
          { name: 'dueDate', label: 'Due Date', type: 'date', required: true },
          { name: 'status', label: 'Status', type: 'select', options: taskStatusOptions, required: true },
          { name: 'priority', label: 'Priority', type: 'select', options: taskPriorityOptions, required: true },
          { name: 'type', label: 'Type', type: 'select', options: [
            { value: 'Call', label: 'Call' },
            { value: 'Email', label: 'Email' },
            { value: 'Meeting', label: 'Meeting' },
            { value: 'Follow-up', label: 'Follow-up' },
            { value: 'Demo', label: 'Demo' }
          ], required: true },
          { name: 'assignedTo', label: 'Assigned To', type: 'select', options: getUserOptions(tenantUsers), required: true },
          { name: 'visibleTo', label: 'Visible To', type: 'multiselect', options: getUserOptions(tenantUsers), required: false },
          { name: 'description', label: 'Description', type: 'textarea', required: false }
        ];
      case 'deal':
        return [
          { name: 'dealOwner', label: 'Deal Owner', type: 'text', required: true },
          { name: 'dealName', label: 'Deal Name', type: 'text', required: true },
          { name: 'amount', label: 'Amount', type: 'number', required: true },
          { name: 'leadSource', label: 'Lead Source', type: 'select', options: leadSourceOptions, required: true },
          { name: 'stage', label: 'Stage', type: 'select', options: dealStageOptions, required: true },
          { name: 'closeDate', label: 'Expected Close Date', type: 'date', required: true },
          { name: 'probability', label: 'Probability (%)', type: 'number', required: false },
          { name: 'visibleTo', label: 'Visible To', type: 'multiselect', options: getUserOptions(tenantUsers), required: false },
          { name: 'description', label: 'Description', type: 'textarea', required: false }
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
    } else {
    setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
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
            email: formData.email,
            leadSource: formData.leadSource,
            leadStatus: formData.leadStatus,
            phone: formData.phone,
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
            companyName: formData.companyName,
            email: formData.email,
            leadSource: formData.leadSource,
            phone: formData.phone,
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
          await tasksApi.create({
          title: formData.subject,
          description: formData.description || '',
            priority: formData.priority || 'Medium',
            status: formData.status || 'Open',
          dueDate: formData.dueDate,
            assignee: formData.assignedTo || user?.userId || '',
            type: 'Follow-up',
            tenantId: '',
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
      }

      // Call onSuccess callback to refresh the UI
      if (onSuccess) {
        onSuccess();
      }
      
      setFormData({});
      setSelectedType('');
      handleMainModalClose();
    } catch (error) {
      console.error('Error creating record:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to create record. Please try again.'
      });
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
          <div key={field.name} className={field.group ? 'col-span-2' : ''}>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </label>
            <div className="border border-gray-300 rounded-lg p-4 max-h-60 overflow-y-auto">
              <div className="space-y-2">
                {field.options?.map(option => (
                  <label key={option.value} className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded cursor-pointer">
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
            <p className="mt-1 text-sm text-gray-500">Select users who can view this lead</p>
          </div>
        );
      case 'select':
        return (
          <div key={field.name} className={field.group ? 'col-span-2' : ''}>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </label>
            <select
              value={formData[field.name] || ''}
              onChange={(e) => handleInputChange(field.name, e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required={field.required}
            >
              <option value="">Select {field.label}</option>
              {field.options?.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
        );
      default:
        return (
          <div key={field.name} className={field.type === 'textarea' ? 'md:col-span-2' : ''}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            {field.type === 'tel' ? (
              <PhoneNumberInput
                value={formData[field.name] || ''}
                onChange={(phoneNumber) => handleInputChange(field.name, phoneNumber)}
                placeholder={`Enter ${field.label.toLowerCase()}...`}
                className="w-full"
              />
            ) : (
              <input
                type={field.type}
                value={formData[field.name] || ''}
                onChange={(e) => handleInputChange(field.name, field.type === 'number' ? Number(e.target.value) : e.target.value)}
                required={field.required}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder={`Enter ${field.label.toLowerCase()}...`}
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
            <Dialog.Title className="text-xl font-semibold text-gray-900">
              {selectedType ? `Create New ${selectedType.charAt(0).toUpperCase() + selectedType.slice(1)}` : 'Create New Record'}
            </Dialog.Title>
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
                  <h2 className="text-xl font-semibold text-gray-900 ml-4">
                    Create New {selectedType.charAt(0).toUpperCase() + selectedType.slice(1)}
                  </h2>
                </div>

                <p className="text-sm text-gray-600 mb-6">
                  Fill in the details below to create a new {selectedType.toLowerCase()}.
                </p>

                {/* Form Fields */}
                {Object.entries(groupedFields).map(([group, fields]) => (
                  <div key={group} className="mb-8">
                    {group !== 'default' && (
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        {group.charAt(0).toUpperCase() + group.slice(1)} Information
                      </h3>
                    )}
                    <div className={`grid ${group === 'address' ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'} gap-4`}>
                      {fields.map((field) => renderField(field))}
                    </div>
                  </div>
                ))}

                {/* Form Actions */}
                <div className="flex justify-end space-x-3 mt-8">
                <button
                  type="button"
                  onClick={handleMainModalClose}
                    className="px-4 py-2 text-gray-700 hover:text-gray-900 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    Create {selectedType.charAt(0).toUpperCase() + selectedType.slice(1)}
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