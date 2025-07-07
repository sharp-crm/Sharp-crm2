import React, { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import * as Icons from 'lucide-react';
import { Dealer, dealersApi } from '../api/services';
import { useToastStore } from '../store/useToastStore';
import { useNotificationStore } from '../store/useNotificationStore';
import PhoneNumberInput from './Common/PhoneNumberInput';
import API from '../api/client';

interface EditDealerModalProps {
  isOpen: boolean;
  onClose: () => void;
  dealer: Dealer | null;
  onSuccess?: () => void;
}

interface TenantUser {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

const EditDealerModal: React.FC<EditDealerModalProps> = ({
  isOpen,
  onClose,
  dealer,
  onSuccess
}) => {
  const { addToast } = useToastStore();
  const { addNotification } = useNotificationStore();
  const [formData, setFormData] = useState<Partial<Dealer>>({
    name: '',
    email: '',
    phone: '',
    company: '',
    visibleTo: []
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tenantUsers, setTenantUsers] = useState<TenantUser[]>([]);

  // Fetch tenant users when modal opens
  useEffect(() => {
    if (isOpen) {
      const fetchTenantUsers = async () => {
        try {
          const response = await API.get('/users/tenant-users');
          const users = response.data?.data || [];
          setTenantUsers(users);
        } catch (error) {
          console.error('Failed to fetch tenant users:', error);
          addToast({
            type: 'error',
            title: 'Error',
            message: 'Failed to fetch users. Some features may be limited.'
          });
        }
      };
      fetchTenantUsers();
    }
  }, [isOpen]);

  // Load dealer data when modal opens or dealer changes
  useEffect(() => {
    if (dealer && isOpen) {
      setFormData({
        name: dealer.name || '',
        email: dealer.email || '',
        phone: dealer.phone || '',
        company: dealer.company || '',
        visibleTo: dealer.visibleTo || []
      });
    }
  }, [dealer, isOpen]);

  if (!dealer) return null;

  const handleInputChange = (name: string, value: any) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleVisibilityChange = (userId: string) => {
    const currentVisibleTo = formData.visibleTo || [];
    const newVisibleTo = currentVisibleTo.includes(userId)
      ? currentVisibleTo.filter(id => id !== userId)
      : [...currentVisibleTo, userId];
    handleInputChange('visibleTo', newVisibleTo);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dealer.id) return;

    try {
      setIsSubmitting(true);

      // Validate required fields
      if (!formData.name?.trim()) throw new Error('Name is required');
      if (!formData.email?.trim()) throw new Error('Email is required');
      if (!formData.phone?.trim()) throw new Error('Phone is required');
      if (!formData.company?.trim()) throw new Error('Company is required');

      // Update dealer
      await dealersApi.update(dealer.id, formData);

      addToast({
        type: 'success',
        title: 'Dealer Updated',
        message: `Successfully updated dealer: ${formData.name}`
      });

      addNotification({
        type: 'success',
        title: 'Dealer Updated',
        message: `Successfully updated dealer: ${formData.name}`,
        timestamp: new Date().toISOString(),
        read: false
      });

      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (error) {
      console.error('Error updating dealer:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to update dealer'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mr-3">
                <Icons.Handshake className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <Dialog.Title className="text-xl font-semibold text-gray-900">
                  Edit Dealer
                </Dialog.Title>
                <p className="text-sm text-gray-600">{dealer.email}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Icons.X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Content */}
          <form onSubmit={handleSubmit}>
            <div className="p-6 space-y-6">
              {/* Basic Information */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <Icons.Handshake className="w-5 h-5 mr-2 text-green-600" />
                  Dealer Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone <span className="text-red-500">*</span>
                    </label>
                    <PhoneNumberInput
                      value={formData.phone}
                      onChange={(value) => handleInputChange('phone', value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Company <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.company}
                      onChange={(e) => handleInputChange('company', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Visibility Controls */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <Icons.Eye className="w-5 h-5 mr-2 text-blue-600" />
                  Visibility Settings
                </h3>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Visible To
                  </label>
                  <div className="max-h-48 overflow-y-auto border border-gray-300 rounded-md p-2">
                    {tenantUsers.map(user => (
                      <label key={user.id || user.userId} className="flex items-center p-2 hover:bg-gray-50">
                        <input
                          type="checkbox"
                          checked={formData.visibleTo?.includes(user.id || user.userId)}
                          onChange={() => handleVisibilityChange(user.id || user.userId)}
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
                      ? "Dealer will be visible to all users" 
                      : `Dealer will be visible to ${formData.visibleTo?.length} selected user(s)`}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end p-6 border-t border-gray-200 bg-gray-50 gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Icons.Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Update Dealer'
                )}
              </button>
            </div>
          </form>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};

export default EditDealerModal; 