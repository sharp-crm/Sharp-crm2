import React, { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import * as Icons from 'lucide-react';
import { createPortal } from 'react-dom';
import { Contact, contactsApi } from '../api/services';
import PhoneNumberInput from './Common/PhoneNumberInput';
import API from '../api/client';
import { useAuthStore } from '../store/useAuthStore';

interface EditContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  contact: Contact | null;
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

const EditContactModal: React.FC<EditContactModalProps> = ({ isOpen, onClose, contact, onSuccess }) => {
  const [formData, setFormData] = useState<Partial<Contact>>({
    contactOwner: '',
    firstName: '',
    lastName: '',
    companyName: '',
    email: '',
    phone: '',
    leadSource: '',
    title: '',
    department: '',
    street: '',
    area: '',
    city: '',
    state: '',
    country: '',
    zipCode: '',
    description: '',
    status: 'Active',
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
    'X (Twitter)', 'Facebook', 'Partner', 'Public Relations', 'Sales Email Alias',
    'Seminar Partner', 'Internal Seminar', 'Trade Show', 'Web Download', 'Web Research', 'Chat'
  ];

  useEffect(() => {
    if (contact && isOpen) {
      setFormData({
        contactOwner: contact.contactOwner,
        firstName: contact.firstName,
        lastName: contact.lastName || '',
        companyName: contact.companyName,
        email: contact.email,
        phone: contact.phone || '',
        leadSource: contact.leadSource,
        title: contact.title || '',
        department: contact.department || '',
        street: contact.street || '',
        area: contact.area || '',
        city: contact.city || '',
        state: contact.state || '',
        country: contact.country || '',
        zipCode: contact.zipCode || '',
        description: contact.description || '',
        status: contact.status || 'Active',
        visibleTo: contact.visibleTo || []
      });
      setError(null);
    }
  }, [contact, isOpen]);

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

  const handleInputChange = (name: string, value: string) => {
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

  // Get display name for selected contact owner
  const getSelectedContactOwnerName = () => {
    if (!formData.contactOwner) return '';
    const user = users.find(u => u.userId === formData.contactOwner);
    return user ? `${user.firstName} ${user.lastName}` : '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contact) return;

    setLoading(true);
    setError(null);

    try {
      await contactsApi.update(contact.id, formData);
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Update error:', err);
      setError(err instanceof Error ? err.message : 'Failed to update contact');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      contactOwner: '',
      firstName: '',
      companyName: '',
      email: '',
      phone: '',
      leadSource: '',
      title: '',
      department: '',
      street: '',
      area: '',
      city: '',
      state: '',
      country: '',
      zipCode: '',
      description: '',
      status: 'Active',
      visibleTo: []
    });
    setError(null);
    setShowUserSearch(false);
    setUserSearchTerm('');
    onClose();
  };

  if (!contact) return null;

  return (
    <Dialog open={isOpen} onClose={handleClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" aria-hidden="true" />
      
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[95vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Icons.User className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <Dialog.Title className="text-xl font-bold text-gray-900">
                  Edit Contact
                </Dialog.Title>
                <p className="text-sm text-gray-600 mt-1">
                  Update contact information and settings
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors group"
            >
              <Icons.X className="w-5 h-5 text-gray-500 group-hover:text-gray-700" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl mb-6">
                <div className="flex">
                  <Icons.AlertCircle className="w-5 h-5 text-red-600 mr-3 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="text-sm font-semibold text-red-800">Error</h3>
                    <p className="text-sm text-red-700 mt-1">{error}</p>
                  </div>
                </div>
              </div>
            )}

            <form id="editContactForm" onSubmit={handleSubmit} className="space-y-8">
              {/* Basic Information Section */}
              <div className="bg-gray-50 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
                  <Icons.User className="w-5 h-5 text-blue-600 mr-2" />
                  Basic Information
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Contact Owner
                      <span className="text-red-500 ml-1">*</span>
                    </label>
                    <div className="flex items-center">
                      <select
                        value={formData.contactOwner || ''}
                        onChange={(e) => handleInputChange('contactOwner', e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-sm"
                        required
                      >
                        <option value="">Select Owner</option>
                        {users.map(user => (
                          <option key={user.userId} value={user.userId}>
                            {user.firstName} {user.lastName} ({user.role})
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setUserSearchTerm('');
                          setShowUserSearch(true);
                        }}
                        className="ml-2 p-2 text-gray-400 hover:text-gray-600 transition-colors"
                        title="Search users"
                      >
                        <Icons.Search className="w-4 h-4" />
                      </button>
                    </div>
                    {formData.contactOwner && (
                      <p className="mt-1 text-sm text-blue-600">
                        ✓ Selected: {getSelectedContactOwnerName()}
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
                      placeholder="Enter first name..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Last Name
                    </label>
                    <input
                      type="text"
                      value={formData.lastName || ''}
                      onChange={(e) => handleInputChange('lastName', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      placeholder="Enter last name..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Company Name
                      <span className="text-red-500 ml-1">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.companyName || ''}
                      onChange={(e) => handleInputChange('companyName', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      required
                      placeholder="Enter company name..."
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
                      placeholder="Enter job title..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Department
                    </label>
                    <input
                      type="text"
                      value={formData.department || ''}
                      onChange={(e) => handleInputChange('department', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      placeholder="Enter department..."
                    />
                  </div>
                </div>
              </div>

              {/* Contact Information Section */}
              <div className="bg-gray-50 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
                  <Icons.Mail className="w-5 h-5 text-blue-600 mr-2" />
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
                      placeholder="Enter email address..."
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
                      defaultCountryCode="+91"
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
                      Status
                    </label>
                    <select
                      value={formData.status || ''}
                      onChange={(e) => handleInputChange('status', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Address Information Section */}
              <div className="bg-gray-50 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
                  <Icons.MapPin className="w-5 h-5 text-blue-600 mr-2" />
                  Address Information
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Street
                    </label>
                    <input
                      type="text"
                      value={formData.street || ''}
                      onChange={(e) => handleInputChange('street', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      placeholder="Enter street address..."
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
                      placeholder="Enter area..."
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
                      placeholder="Enter city..."
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
                      placeholder="Enter state..."
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
                      placeholder="Enter country..."
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
                      placeholder="Enter ZIP code..."
                    />
                  </div>
                </div>
              </div>

              

              {/* Description Section */}
              <div className="bg-gray-50 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
                  <Icons.FileText className="w-5 h-5 text-blue-600 mr-2" />
                  Additional Information
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
                    placeholder="Enter contact description..."
                  />
                </div>
              </div>
            </form>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
            <button
              type="button"
              onClick={handleClose}
              className="px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="editContactForm"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center shadow-sm"
            >
              {loading ? (
                <>
                  <Icons.Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Icons.Save className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              )}
            </button>
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
                            key={userItem.userId}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              console.log('User selected:', userItem.firstName, userItem.lastName);
                              
                              // Update the form data with the selected user
                              setFormData(prev => ({
                                ...prev,
                                contactOwner: userItem.userId
                              }));
                              
                              // Close only the search overlay, not the main modal
                              setShowUserSearch(false);
                              setUserSearchTerm('');
                              
                              // Optional: Show a brief success message
                              console.log('Contact owner updated to:', userItem.firstName, userItem.lastName);
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
                                    {userItem.userId === currentUser?.userId && ' (You)'}
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    {userItem.userId}
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

export default EditContactModal; 