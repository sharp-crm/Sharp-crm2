import React, { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import * as Icons from 'lucide-react';
import { Quote, User, quotesApi } from '../api/services';
import { useToastStore } from '../store/useToastStore';
import PhoneNumberInput from './Common/PhoneNumberInput';
import LineItemsInput from './Common/LineItemsInput';

interface EditQuoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  quote: Quote;
  users: User[];
  onSuccess?: () => void;
}

const EditQuoteModal: React.FC<EditQuoteModalProps> = ({ isOpen, onClose, quote, users, onSuccess }) => {
  const [formData, setFormData] = useState<Partial<Quote>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { addToast } = useToastStore();

  useEffect(() => {
    if (isOpen && quote) {
      console.log('Loading quote data for editing:', quote);
      console.log('Quote lineItems:', quote.lineItems);
      console.log('Quote lineItems type:', typeof quote.lineItems);
      console.log('Quote lineItems length:', quote.lineItems?.length);
      
      setFormData({
        quoteNumber: quote.quoteNumber,
        quoteName: quote.quoteName,
        quoteOwner: quote.quoteOwner,
        status: quote.status,
        validUntil: quote.validUntil,
        activeStatus: quote.activeStatus,
        customerName: quote.customerName,
        customerEmail: quote.customerEmail,
        customerPhone: quote.customerPhone,
        subtotal: quote.subtotal,
        discountAmount: quote.discountAmount,
        taxAmount: quote.taxAmount,
        adjustment: quote.adjustment,
        totalAmount: quote.totalAmount,
        description: quote.description,
        terms: quote.terms,
        notes: quote.notes,
        visibleTo: quote.visibleTo,
        lineItems: quote.lineItems || []
      });
      console.log('Form data initialized:', {
        quoteNumber: quote.quoteNumber,
        quoteName: quote.quoteName,
        quoteOwner: quote.quoteOwner,
        status: quote.status,
        lineItems: quote.lineItems
      });
    }
  }, [isOpen, quote]);

  // Debug: Monitor formData.lineItems changes
  useEffect(() => {
    console.log('formData.lineItems changed:', formData.lineItems);
  }, [formData.lineItems]);

  const handleInputChange = (name: string, value: any) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await quotesApi.update(quote.id, formData);
      addToast({
        type: 'success',
        title: 'Quote Updated',
        message: `Successfully updated quote: ${formData.quoteName}`
      });
      
      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update quote';
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

  const getUserOptions = () => users.map(user => ({
    value: user.id,
    label: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.name || user.email
  }));

  const statusOptions = [
    { value: 'Draft', label: 'Draft' },
    { value: 'Sent', label: 'Sent' },
    { value: 'Accepted', label: 'Accepted' },
    { value: 'Rejected', label: 'Rejected' },
    { value: 'Expired', label: 'Expired' }
  ];

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <Dialog.Title className="text-xl font-semibold text-gray-900">
              Edit Quote
            </Dialog.Title>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Icons.X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
          
          <form onSubmit={handleSubmit} className="p-6">
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

            <div className="space-y-6">
              {/* Quote Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Icons.FileText className="w-5 h-5 mr-2 text-blue-600" />
                  Quote Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Quote Owner <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.quoteOwner || ''}
                      onChange={(e) => handleInputChange('quoteOwner', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    >
                      <option value="">Select Quote Owner</option>
                      {getUserOptions().map(option => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Quote Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.quoteNumber || ''}
                      onChange={(e) => handleInputChange('quoteNumber', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                      readOnly
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Quote Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.quoteName || ''}
                      onChange={(e) => handleInputChange('quoteName', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Status <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.status || ''}
                      onChange={(e) => handleInputChange('status', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    >
                      <option value="">Select Status</option>
                      {statusOptions.map(option => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Valid Until <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={formData.validUntil || ''}
                      onChange={(e) => handleInputChange('validUntil', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Active Status
                    </label>
                    <select
                      value={formData.activeStatus?.toString() || 'true'}
                      onChange={(e) => handleInputChange('activeStatus', e.target.value === 'true')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="true">Active</option>
                      <option value="false">Inactive</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Quote Items */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Icons.ShoppingCart className="w-5 h-5 mr-2 text-purple-600" />
                  Quote Items
                </h3>
                <LineItemsInput
                  key={quote.id} // Force re-render when quote changes
                  value={formData.lineItems || []}
                  onChange={(items) => {
                    console.log('LineItemsInput onChange called with:', items);
                    handleInputChange('lineItems', items);
                  }}
                />
              </div>

              {/* Quote Details */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Icons.FileText className="w-5 h-5 mr-2 text-purple-600" />
                  Quote Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description
                    </label>
                    <textarea
                      value={formData.description || ''}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      placeholder="Enter description..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Terms & Conditions
                    </label>
                    <textarea
                      value={formData.terms || ''}
                      onChange={(e) => handleInputChange('terms', e.target.value)}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      placeholder="Enter terms and conditions..."
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-8">
              <button
                type="button"
                onClick={onClose}
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
                    Updating...
                  </>
                ) : (
                  'Update Quote'
                )}
              </button>
            </div>
          </form>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};

export default EditQuoteModal; 