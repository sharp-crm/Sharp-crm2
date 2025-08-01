import React, { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import * as Icons from 'lucide-react';
import { Lead, dealsApi } from '../api/services';
import PhoneNumberInput from './Common/PhoneNumberInput';
import { DEAL_STAGES } from '../types';

interface ConvertToDealModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead | null;
  onSuccess: () => void;
}

const ConvertToDealModal: React.FC<ConvertToDealModalProps> = ({
  isOpen,
  onClose,
  lead,
  onSuccess
}) => {
  const [formData, setFormData] = useState({
    dealName: '',
    amount: '',
    phone: '',
    email: '',
    leadSource: '',
    stage: 'Prospecting',
    closeDate: '',
    probability: '',
    description: '',
    visibleTo: [] as string[]
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Lead source options
  const leadSourceOptions = [
    { value: 'Email', label: 'Email' },
    { value: 'Website', label: 'Website' },
    { value: 'Cold Call', label: 'Cold Call' },
    { value: 'Social Media', label: 'Social Media' },
    { value: 'LinkedIn', label: 'LinkedIn' },
    { value: 'Referral', label: 'Referral' },
    { value: 'Trade Show', label: 'Trade Show' },
    { value: 'Other', label: 'Other' }
  ];

  // Deal stage options
  const dealStageOptions = DEAL_STAGES.map(stage => ({ value: stage, label: stage }));

  // Populate form data when lead changes
  useEffect(() => {
    if (lead) {
      // Format phone number with default country code if it doesn't have one
      let formattedPhone = lead.phone || '';
      if (formattedPhone && !formattedPhone.startsWith('+')) {
        formattedPhone = `+91${formattedPhone}`;
      }
      
      setFormData({
        dealName: '',
        amount: lead.value ? lead.value.toString() : '',
        phone: formattedPhone,
        email: lead.email || '',
        leadSource: lead.leadSource || 'Other',
        stage: 'Prospecting',
        closeDate: '',
        probability: '',
        description: '',
        visibleTo: lead.visibleTo || []
      });
    }
  }, [lead]);

  const handleInputChange = (field: string, value: string | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!lead) return;

    // Validate required fields
    if (!formData.dealName.trim() || !formData.amount.trim() || !formData.stage.trim()) {
      setError('Please fill in all required fields');
      return;
    }

    // Validate deal amount is a number
    const dealAmount = parseFloat(formData.amount);
    if (isNaN(dealAmount) || dealAmount <= 0) {
      setError('Please enter a valid deal amount');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Create new deal with lead data
      await dealsApi.create({
        dealOwner: lead.leadOwner || 'Unknown',
        dealName: formData.dealName,
        amount: dealAmount,
        phone: formData.phone,
        email: formData.email,
        leadSource: formData.leadSource,
        stage: formData.stage,
        closeDate: formData.closeDate,
        probability: formData.probability ? parseFloat(formData.probability) : 0,
        description: formData.description,
        visibleTo: formData.visibleTo
      });

      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to convert lead to deal');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setError(null);
    setLoading(false);
    onClose();
  };

  if (!lead) return null;

  return (
    <Dialog open={isOpen} onClose={handleClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto max-w-2xl w-full max-h-[90vh] rounded-lg bg-white shadow-xl flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
            <Dialog.Title className="text-xl font-semibold text-gray-900">
              Convert Lead to Deal
            </Dialog.Title>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <Icons.X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1">
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Deal Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Deal Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.dealName}
                  onChange={(e) => handleInputChange('dealName', e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter deal name"
                  required
                />
              </div>

              {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Deal Amount <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => handleInputChange('amount', e.target.value)}
                  placeholder="Enter deal amount"
                  min="0"
                  step="0.01"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contact Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter email address"
                />
              </div>

              {/* Lead Source */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Lead Source
                </label>
                <select
                  value={formData.leadSource}
                  onChange={(e) => handleInputChange('leadSource', e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {leadSourceOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Deal Stage */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Deal Stage <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.stage}
                  onChange={(e) => handleInputChange('stage', e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  {dealStageOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Expected Close Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Expected Close Date
                </label>
                <input
                  type="date"
                  value={formData.closeDate}
                  onChange={(e) => handleInputChange('closeDate', e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Probability */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Probability (%)
                </label>
                <input
                  type="number"
                  value={formData.probability}
                  onChange={(e) => handleInputChange('probability', e.target.value)}
                  placeholder="Enter probability percentage"
                  min="0"
                  max="100"
                  step="1"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Description */}
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                rows={3}
                placeholder="Enter description (optional)"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Footer */}
            <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200 flex-shrink-0">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {loading ? (
                  <>
                    <Icons.Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Converting...
                  </>
                ) : (
                  <>
                    <Icons.Target className="w-4 h-4 mr-2" />
                    Convert to Deal
                  </>
                )}
              </button>
            </div>
          </form>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};

export default ConvertToDealModal; 