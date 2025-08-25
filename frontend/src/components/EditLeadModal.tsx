import React, { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import * as Icons from 'lucide-react';
import { createPortal } from 'react-dom';
import { Lead, leadsApi } from '../api/services';
import PhoneNumberInput from './Common/PhoneNumberInput';
import API from '../api/client';
import { useAuthStore } from '../store/useAuthStore';

interface EditLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead | null;
  onSuccess: () => void;
}

interface User {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

const EditLeadModal: React.FC<EditLeadModalProps> = ({ isOpen, onClose, lead, onSuccess }) => {
  const [formData, setFormData] = useState<Partial<Lead>>({
    leadOwner: '',
    firstName: '',
    lastName: '',
    company: '',
    email: '',
    phone: '',
    leadSource: '',
    leadStatus: '',
    title: '',
    street: '',
    area: '',
    city: '',
    state: '',
    country: '',
    zipCode: '',
    description: '',
    value: 0,
    visibleTo: []
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const currentUser = useAuthStore((s) => s.user);

  const leadSourceOptions = [
    'Advertisement', 'Cold Call', 'Employee Referral', 'External Referral', 'Online Store',
    'X (Twitter)', 'Facebook', 'LinkedIn', 'Partner', 'Public Relations', 'Sales Email Alias',
    'Seminar Partner', 'Internal Seminar', 'Trade Show', 'Web Download', 'Web Research', 'Website', 'Chat'
  ];

  const leadStatusOptions = [
    'New', 'Contacted', 'Qualified', 'Prequalified', 'Follow Up', 'Converted', 'Lost', 'Not Contacted'
  ];

  useEffect(() => {
    if (lead && isOpen) {
      setFormData({
        leadOwner: lead.leadOwner,
        firstName: lead.firstName,
        lastName: lead.lastName,
        company: lead.company,
        email: lead.email,
        phone: lead.phone || '',
        leadSource: lead.leadSource,
        leadStatus: lead.leadStatus,
        title: lead.title || '',
        street: lead.street || '',
        area: lead.area || '',
        city: lead.city || '',
        state: lead.state || '',
        country: lead.country || '',
        zipCode: lead.zipCode || '',
        description: lead.description || '',
        value: lead.value || 0,
        visibleTo: lead.visibleTo || []
      });
      setError(null);
    }
  }, [lead, isOpen]);

  // Fetch users when modal opens
  useEffect(() => {
    if (isOpen) {
      const fetchUsers = async () => {
        try {
          const response = await API.get('/users/tenant-users');
          const data = response.data?.data || [];
          setUsers(data);
        } catch (err) {
          console.error('Failed to fetch users:', err);
        }
      };
      fetchUsers();
    }
  }, [isOpen]);

  const handleInputChange = (name: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleVisibilityChange = (userId: string) => {
    setFormData(prev => {
      const currentVisibleTo = prev.visibleTo || [];
      const newVisibleTo = currentVisibleTo.includes(userId)
        ? currentVisibleTo.filter(id => id !== userId)
        : [...currentVisibleTo, userId];
      return { ...prev, visibleTo: newVisibleTo };
    });
  };

  // Helper function to safely get user ID
  const getUserId = (user: User) => user.userId || user.id || '';

  // Get filtered users based on search term
  const getFilteredUsers = () => {
    if (!userSearchTerm.trim()) {
      return users;
    }
    
    const searchTerm = userSearchTerm.toLowerCase();
    return users.filter((user: User) => {
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

  // Get display name for selected lead owner
  const getSelectedLeadOwnerName = () => {
    if (!formData.leadOwner) return '';
    const user = users.find(u => getUserId(u) === formData.leadOwner);
    return user ? `${user.firstName} ${user.lastName} (${user.role})` : formData.leadOwner;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lead) return;

    // Client-side validation for required fields
    const requiredFields = ['leadOwner', 'firstName', 'lastName', 'company', 'email', 'phone', 'leadSource', 'leadStatus'];
    const missingFields = requiredFields.filter(field => !formData[field as keyof typeof formData]);
    
    if (missingFields.length > 0) {
      setError(`Missing required fields: ${missingFields.join(', ')}`);
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.email && !emailRegex.test(formData.email)) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await leadsApi.update(lead.id, formData);
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Update error:', err);
      setError(err instanceof Error ? err.message : 'Failed to update lead');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      leadOwner: '',
      firstName: '',
      lastName: '',
      company: '',
      email: '',
      phone: '',
      leadSource: '',
      leadStatus: '',
      title: '',
      street: '',
      area: '',
      city: '',
      state: '',
      country: '',
      zipCode: '',
      description: '',
      value: 0,
      visibleTo: []
    });
    setError(null);
    setShowUserSearch(false);
    setUserSearchTerm('');
    onClose();
  };

  if (!lead) return null;

  return (
    <Dialog open={isOpen} onClose={handleClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto max-w-3xl w-full bg-white rounded-xl shadow-lg max-h-[90vh] flex flex-col">
          <div className="p-6 border-b border-gray-200">
            <div className="flex justify-between items-start">
              <Dialog.Title className="text-2xl font-semibold text-gray-900">
                Edit Lead
              </Dialog.Title>
              <button
                onClick={handleClose}
                className="text-gray-400 hover:text-gray-500"
              >
                <Icons.X className="w-6 h-6" />
              </button>
            </div>

            {error && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-600">{error}</p>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            <form id="editLeadForm" onSubmit={handleSubmit} className="space-y-6">
              {/* Form Fields - Clean Layout */}
              <div className="space-y-8">
                {/* Basic Information Section */}
                <div className="bg-gray-50 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
                    Basic Information
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Lead Owner
                        <span className="text-red-500 ml-1">*</span>
                      </label>
                      <div className="flex items-center">
                        <select
                          value={formData.leadOwner || ''}
                          onChange={(e) => handleInputChange('leadOwner', e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-sm"
                          required
                        >
                          <option value="">Select Lead Owner</option>
                          {users.map(user => (
                            <option key={getUserId(user)} value={getUserId(user)}>
                              {user.firstName} {user.lastName} ({user.role})
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => setShowUserSearch(true)}
                          className="ml-2 p-2 text-gray-400 hover:text-gray-600 transition-colors"
                          title="Search users"
                        >
                          <Icons.Search className="w-4 h-4" />
                        </button>
                      </div>
                      {formData.leadOwner && (
                        <p className="mt-1 text-sm text-blue-600">
                          ✓ {getSelectedLeadOwnerName()}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        First Name
                        <span className="text-red-500 ml-1">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.firstName || ''}
                        onChange={(e) => handleInputChange('firstName', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Last Name
                        <span className="text-red-500 ml-1">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.lastName || ''}
                        onChange={(e) => handleInputChange('lastName', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Company
                        <span className="text-red-500 ml-1">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.company || ''}
                        onChange={(e) => handleInputChange('company', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Title
                      </label>
                      <input
                        type="text"
                        value={formData.title || ''}
                        onChange={(e) => handleInputChange('title', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Contact Information Section */}
                <div className="bg-gray-50 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
                    Contact Information
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email
                        <span className="text-red-500 ml-1">*</span>
                      </label>
                      <input
                        type="email"
                        value={formData.email || ''}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Phone
                        <span className="text-red-500 ml-1">*</span>
                      </label>
                      <PhoneNumberInput
                        value={formData.phone || ''}
                        onChange={(value) => handleInputChange('phone', value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Lead Source
                        <span className="text-red-500 ml-1">*</span>
                      </label>
                      <select
                        value={formData.leadSource || ''}
                        onChange={(e) => handleInputChange('leadSource', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        required
                      >
                        <option value="">Select Source</option>
                        {leadSourceOptions.map(source => (
                          <option key={source} value={source}>{source}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Lead Status
                        <span className="text-red-500 ml-1">*</span>
                      </label>
                      <select
                        value={formData.leadStatus || ''}
                        onChange={(e) => handleInputChange('leadStatus', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        required
                      >
                        <option value="">Select Status</option>
                        {leadStatusOptions.map(status => (
                          <option key={status} value={status}>{status}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Value
                      </label>
                      <input
                        type="number"
                        value={formData.value || ''}
                        onChange={(e) => handleInputChange('value', parseFloat(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Address Information Section */}
                <div className="bg-gray-50 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
                    Address Information
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Street
                      </label>
                      <input
                        type="text"
                        value={formData.street || ''}
                        onChange={(e) => handleInputChange('street', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Area
                      </label>
                      <input
                        type="text"
                        value={formData.area || ''}
                        onChange={(e) => handleInputChange('area', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        City
                      </label>
                      <input
                        type="text"
                        value={formData.city || ''}
                        onChange={(e) => handleInputChange('city', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        State
                      </label>
                      <input
                        type="text"
                        value={formData.state || ''}
                        onChange={(e) => handleInputChange('state', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Country
                      </label>
                      <input
                        type="text"
                        value={formData.country || ''}
                        onChange={(e) => handleInputChange('country', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        ZIP Code
                      </label>
                      <input
                        type="text"
                        value={formData.zipCode || ''}
                        onChange={(e) => handleInputChange('zipCode', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Description Section */}
                <div className="bg-gray-50 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
                    Description Information
                  </h3>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description
                    </label>
                    <textarea
                      value={formData.description || ''}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm"
                      placeholder="Enter description..."
                    />
                  </div>
                </div>
              </div>
            </form>
          </div>

          <div className="p-6 border-t border-gray-200 bg-white">
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="editLeadForm"
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </Dialog.Panel>
      </div>

      {/* User Search Modal */}
      {showUserSearch && createPortal(
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" 
          onClick={(e) => {
            // Only close if clicking the backdrop, not the content
            if (e.target === e.currentTarget) {
              setShowUserSearch(false);
              setUserSearchTerm('');
            }
          }}
        >
          <div 
            className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
            onClick={(e) => {
              // Prevent clicks inside the modal from bubbling up
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
                      e.preventDefault();
                      e.stopPropagation();
                      setShowUserSearch(false);
                      setUserSearchTerm('');
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
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setUserSearchTerm('');
                        }}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      >
                        Clear search
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
                      {users.length} total user{users.length !== 1 ? 's' : ''} available
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
                        getFilteredUsers().map((userItem: User) => (
                          <tr
                            key={getUserId(userItem)}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              console.log('User selected:', userItem.firstName, userItem.lastName);
                              
                              // Update the form data with the selected user
                              setFormData(prev => ({
                                ...prev,
                                leadOwner: getUserId(userItem)
                              }));
                              
                              // Close only the search overlay, not the main modal
                              setShowUserSearch(false);
                              setUserSearchTerm('');
                              
                              // Optional: Show a brief success message
                              console.log('Lead owner updated to:', userItem.firstName, userItem.lastName);
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
                                    {getUserId(userItem) === currentUser?.userId && ' (You)'}
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
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setUserSearchTerm('');
                                  }}
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

export default EditLeadModal; 