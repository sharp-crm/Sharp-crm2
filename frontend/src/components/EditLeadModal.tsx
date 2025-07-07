import React, { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import * as Icons from 'lucide-react';
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lead) return;

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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Basic Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900">Basic Information</h3>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Lead Owner</label>
                    <input
                      type="text"
                      value={formData.leadOwner || ''}
                      onChange={(e) => handleInputChange('leadOwner', e.target.value)}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">First Name</label>
                    <input
                      type="text"
                      value={formData.firstName || ''}
                      onChange={(e) => handleInputChange('firstName', e.target.value)}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Last Name</label>
                    <input
                      type="text"
                      value={formData.lastName || ''}
                      onChange={(e) => handleInputChange('lastName', e.target.value)}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Company</label>
                    <input
                      type="text"
                      value={formData.company || ''}
                      onChange={(e) => handleInputChange('company', e.target.value)}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Title</label>
                    <input
                      type="text"
                      value={formData.title || ''}
                      onChange={(e) => handleInputChange('title', e.target.value)}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Contact Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900">Contact Information</h3>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Email</label>
                    <input
                      type="email"
                      value={formData.email || ''}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Phone</label>
                    <PhoneNumberInput
                      value={formData.phone || ''}
                      onChange={(value) => handleInputChange('phone', value)}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Lead Source</label>
                    <select
                      value={formData.leadSource || ''}
                      onChange={(e) => handleInputChange('leadSource', e.target.value)}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="">Select Source</option>
                      {leadSourceOptions.map(source => (
                        <option key={source} value={source}>{source}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Lead Status</label>
                    <select
                      value={formData.leadStatus || ''}
                      onChange={(e) => handleInputChange('leadStatus', e.target.value)}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="">Select Status</option>
                      {leadStatusOptions.map(status => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Value</label>
                    <input
                      type="number"
                      value={formData.value || ''}
                      onChange={(e) => handleInputChange('value', parseFloat(e.target.value))}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Address Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900">Address Information</h3>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Street</label>
                    <input
                      type="text"
                      value={formData.street || ''}
                      onChange={(e) => handleInputChange('street', e.target.value)}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Area</label>
                    <input
                      type="text"
                      value={formData.area || ''}
                      onChange={(e) => handleInputChange('area', e.target.value)}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">City</label>
                      <input
                        type="text"
                        value={formData.city || ''}
                        onChange={(e) => handleInputChange('city', e.target.value)}
                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">State</label>
                      <input
                        type="text"
                        value={formData.state || ''}
                        onChange={(e) => handleInputChange('state', e.target.value)}
                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Country</label>
                      <input
                        type="text"
                        value={formData.country || ''}
                        onChange={(e) => handleInputChange('country', e.target.value)}
                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">ZIP Code</label>
                      <input
                        type="text"
                        value={formData.zipCode || ''}
                        onChange={(e) => handleInputChange('zipCode', e.target.value)}
                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Visibility Settings */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900">Visibility Settings</h3>
                  
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">Visible To</label>
                    <div className="max-h-48 overflow-y-auto border border-gray-300 rounded-md p-2">
                      {users.map(user => (
                        <label key={user.id} className="flex items-center p-2 hover:bg-gray-50">
                          <input
                            type="checkbox"
                            checked={formData.visibleTo?.includes(user.id)}
                            onChange={() => handleVisibilityChange(user.id)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <span className="ml-2 text-sm text-gray-700">
                            {user.firstName} {user.lastName} ({user.role})
                          </span>
                        </label>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {formData.visibleTo?.length === 0 
                        ? "Lead will be visible to all users" 
                        : `Lead will be visible to ${formData.visibleTo?.length} selected user(s)`}
                    </p>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  value={formData.description || ''}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  rows={4}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
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
    </Dialog>
  );
};

export default EditLeadModal; 