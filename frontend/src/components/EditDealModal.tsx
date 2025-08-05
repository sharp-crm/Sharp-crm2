import React, { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import * as Icons from 'lucide-react';
import { Deal, dealsApi } from '../api/services';
import { DEAL_STAGES } from '../types';
import PhoneNumberInput from './Common/PhoneNumberInput';

interface EditDealModalProps {
  isOpen: boolean;
  onClose: () => void;
  deal: Deal | null;
  onSuccess?: () => void;
  users: { id: string; firstName: string; lastName: string }[];
}

const EditDealModal: React.FC<EditDealModalProps> = ({ isOpen, onClose, deal, onSuccess, users }) => {
  const [formData, setFormData] = useState({
    dealOwner: '',
    dealName: '',
    leadSource: '',
    stage: '' as Deal['stage'],
    amount: '',
    probability: '',
    closeDate: '',
    description: '',
    phone: '',
    email: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Populate form with deal data when modal opens
  useEffect(() => {
    if (deal && isOpen) {
      setFormData({
        dealOwner: deal.dealOwner || deal.owner || '',
        dealName: deal.dealName || deal.name || '',
        leadSource: deal.leadSource || '',
        stage: deal.stage || '',
        amount: (deal.amount || deal.value || 0).toString(),
        probability: (deal.probability || 0).toString(),
        closeDate: deal.closeDate || '',
        description: deal.description || '',
        phone: deal.phone || '',
        email: deal.email || ''
      });
      setError(null);
    }
  }, [deal, isOpen]);

  const handleInputChange = (name: string, value: string | string[]) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deal) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const updatedDeal = await dealsApi.update(deal.id, {
        dealOwner: formData.dealOwner,
        dealName: formData.dealName,
        leadSource: formData.leadSource,
        stage: formData.stage,
        amount: parseFloat(formData.amount) || 0,
        probability: parseFloat(formData.probability) || 0,
        closeDate: formData.closeDate,
        description: formData.description,
        phone: formData.phone,
        email: formData.email
      });

      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (err) {
      console.error('Error updating deal:', err);
      setError(err instanceof Error ? err.message : 'Failed to update deal. Please check your input and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const leadSourceOptions = [
    'Advertisement', 'Cold Call', 'Employee Referral', 'External Referral', 'Online Store',
    'X (Twitter)', 'Facebook', 'Partner', 'Public Relations', 'Sales Email Alias',
    'Seminar Partner', 'Internal Seminar', 'Trade Show', 'Web Download', 'Web Research', 'Chat'
  ];

  const stageOptions = [...DEAL_STAGES];

  if (!deal) return null;

  return (
    <Dialog 
      open={isOpen} 
      onClose={onClose} 
      className="relative z-50"
    >
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      
      <div className="fixed inset-0 flex items-center justify-center p-4" onClick={(e) => e.stopPropagation()}>
        <Dialog.Panel className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <Dialog.Title className="text-xl font-semibold text-gray-900">
              Edit Deal
            </Dialog.Title>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Icons.X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6">
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center">
                  <Icons.AlertCircle className="w-5 h-5 text-red-600 mr-2" />
                  <span className="text-red-700">{error}</span>
                </div>
              </div>
            )}

            {/* Deal Information Section */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
                <Icons.Target className="w-5 h-5 mr-2 text-blue-600" />
                Deal Information
              </h3>
              <div className="space-y-4">
                {/* Deal Owner */}
                <div className="border-b border-gray-200 pb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Deal Owner <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center">
                    <input
                      type="text"
                      value={formData.dealOwner}
                      onChange={(e) => handleInputChange('dealOwner', e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                    <Icons.User className="w-4 h-4 text-gray-400 ml-2" />
                  </div>
                </div>

                {/* Deal Name */}
                <div className="border-b border-gray-200 pb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Deal Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.dealName}
                    onChange={(e) => handleInputChange('dealName', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                {/* Lead Source */}
                <div className="border-b border-gray-200 pb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Lead Source <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center">
                    <select
                      value={formData.leadSource}
                      onChange={(e) => handleInputChange('leadSource', e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    >
                      <option value="">Select Lead Source</option>
                      {leadSourceOptions.map(option => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                    <Icons.ChevronDown className="w-4 h-4 text-gray-400 ml-2" />
                  </div>
                </div>

                {/* Stage */}
                <div className="border-b border-gray-200 pb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Stage <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center">
                    <select
                      value={formData.stage}
                      onChange={(e) => handleInputChange('stage', e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    >
                      <option value="">Select Stage</option>
                      {stageOptions.map(option => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                    <Icons.ChevronDown className="w-4 h-4 text-gray-400 ml-2" />
                  </div>
                </div>

                {/* Amount */}
                <div className="border-b border-gray-200 pb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Amount <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center">
                    <input
                      type="number"
                      value={formData.amount}
                      onChange={(e) => handleInputChange('amount', e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                      min="0"
                      step="0.01"
                    />
                    <Icons.DollarSign className="w-4 h-4 text-gray-400 ml-2" />
                  </div>
                </div>

                {/* Probability */}
                <div className="border-b border-gray-200 pb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Probability (%)
                  </label>
                  <div className="flex items-center">
                    <input
                      type="number"
                      value={formData.probability}
                      onChange={(e) => handleInputChange('probability', e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      min="0"
                      max="100"
                      step="1"
                    />
                    <Icons.Percent className="w-4 h-4 text-gray-400 ml-2" />
                  </div>
                </div>

                {/* Close Date */}
                <div className="border-b border-gray-200 pb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Close Date <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center">
                    <input
                      type="date"
                      value={formData.closeDate}
                      onChange={(e) => handleInputChange('closeDate', e.target.value)}
                      min={new Date(new Date().getFullYear() - 25, new Date().getMonth(), new Date().getDate()).toISOString().split('T')[0]}
                      max={new Date(new Date().getFullYear() + 50, new Date().getMonth(), new Date().getDate()).toISOString().split('T')[0]}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                    <Icons.Calendar className="w-4 h-4 text-gray-400 ml-2" />
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Information Section */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
                <Icons.Phone className="w-5 h-5 mr-2 text-green-600" />
                Contact Information
              </h3>
              <div className="space-y-4">
                {/* Phone */}
                <div className="border-b border-gray-200 pb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Contact Phone
                  </label>
                  <PhoneNumberInput
                    value={formData.phone}
                    onChange={(phoneNumber) => handleInputChange('phone', phoneNumber)}
                    placeholder="Enter phone number"
                    className="w-full"
                    defaultCountryCode="+91"
                  />
                </div>

                {/* Email */}
                <div className="border-b border-gray-200 pb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Contact Email
                  </label>
                  <div className="flex items-center">
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter email address"
                    />
                    <Icons.Mail className="w-4 h-4 text-gray-400 ml-2" />
                  </div>
                </div>
              </div>
            </div>

            {/* Description Section */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
                <Icons.FileText className="w-5 h-5 mr-2 text-purple-600" />
                Additional Information
              </h3>
              <div className="border-b border-gray-200 pb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  placeholder="Enter deal description..."
                />
              </div>
            </div>

            {/* Footer */}
            <div className="border-t pt-6 flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-blue-400 transition-colors flex items-center"
              >
                {isSubmitting ? (
                  <>
                    <Icons.Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Update Deal'
                )}
              </button>
            </div>
          </form>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};

export default EditDealModal; 