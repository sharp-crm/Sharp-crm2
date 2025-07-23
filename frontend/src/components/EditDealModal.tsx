import React, { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import * as Icons from 'lucide-react';
import { Deal, dealsApi } from '../api/services';
import { DEAL_STAGES } from '../types';

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
    visibleTo: [] as string[]
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
        visibleTo: deal.visibleTo || []
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
        visibleTo: formData.visibleTo.length > 0 ? formData.visibleTo : [] // Ensure empty array if no users selected
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
        <Dialog.Panel className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
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

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center">
                  <Icons.AlertCircle className="w-5 h-5 text-red-600 mr-2" />
                  <span className="text-red-700">{error}</span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Deal Owner */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Deal Owner *
                </label>
                <input
                  type="text"
                  value={formData.dealOwner}
                  onChange={(e) => handleInputChange('dealOwner', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              {/* Deal Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Deal Name *
                </label>
                <input
                  type="text"
                  value={formData.dealName}
                  onChange={(e) => handleInputChange('dealName', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              {/* Lead Source */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Lead Source *
                </label>
                <select
                  value={formData.leadSource}
                  onChange={(e) => handleInputChange('leadSource', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select Lead Source</option>
                  {leadSourceOptions.map(option => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>

              {/* Stage */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Stage *
                </label>
                <select
                  value={formData.stage}
                  onChange={(e) => handleInputChange('stage', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select Stage</option>
                  {stageOptions.map(option => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount *
                </label>
                <input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => handleInputChange('amount', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  min="0"
                  step="0.01"
                />
              </div>


              {/* Probability */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Probability (%)
                </label>
                <input
                  type="number"
                  value={formData.probability}
                  onChange={(e) => handleInputChange('probability', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="0"
                  max="100"
                  step="1"
                />
              </div>
              {/* Close Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Close Date *
                </label>
                <input
                  type="date"
                  value={formData.closeDate}
                  onChange={(e) => handleInputChange('closeDate', e.target.value)}
                  min={new Date(new Date().getFullYear() - 25, new Date().getMonth(), new Date().getDate()).toISOString().split('T')[0]}
                  max={new Date(new Date().getFullYear() + 50, new Date().getMonth(), new Date().getDate()).toISOString().split('T')[0]}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter deal description..."
              />
            </div>

            {/* Visibility Controls */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Visible To
              </label>
              <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-200 rounded-md p-2">
                {users.map(user => (
                  <label key={user.id} className="flex items-center space-x-2 p-1 hover:bg-gray-50 rounded">
                    <input
                      type="checkbox"
                      value={user.id}
                      checked={formData.visibleTo?.includes(user.id) || false}
                      onChange={(e) => {
                        const userId = e.target.value;
                        const newVisibleTo = e.target.checked
                          ? [...(formData.visibleTo || []), userId]
                          : (formData.visibleTo || []).filter(id => id !== userId);
                        handleInputChange('visibleTo', newVisibleTo);
                      }}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">{`${user.firstName} ${user.lastName}`}</span>
                  </label>
                ))}
              </div>
              <p className="mt-1 text-sm text-gray-500">By default, all users are selected (deal visible to everyone). Uncheck users to restrict visibility.</p>
            </div>

            <div className="border-t pt-4 flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-blue-400 transition-colors flex items-center"
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