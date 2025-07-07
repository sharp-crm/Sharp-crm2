import React, { useState } from 'react';
import { Dialog } from '@headlessui/react';
import * as Icons from 'lucide-react';
import { reportsApi } from '../../api/services';

interface GenerateReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const REPORT_TYPES = [
  {
    id: 'deals-pipeline',
    name: 'Deals Pipeline Report',
    description: 'Analysis of deals across different stages with conversion rates',
    icon: Icons.Target,
    module: 'deals'
  },
  {
    id: 'sales-forecast',
    name: 'Sales Forecast Report',
    description: 'Projected revenue based on deal probability and value',
    icon: Icons.TrendingUp,
    module: 'deals'
  },
  {
    id: 'lead-conversion',
    name: 'Lead Conversion Analysis',
    description: 'Track lead sources and conversion rates',
    icon: Icons.Users,
    module: 'leads'
  },
  {
    id: 'task-completion',
    name: 'Task Completion Report',
    description: 'Overview of task completion rates and pending activities',
    icon: Icons.CheckSquare,
    module: 'tasks'
  },
  {
    id: 'contact-engagement',
    name: 'Contact Engagement Report',
    description: 'Analysis of contact interactions and activity',
    icon: Icons.BookOpen,
    module: 'contacts'
  }
];

const GenerateReportModal: React.FC<GenerateReportModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const resetModal = () => {
    setSelectedType(null);
    setIsGenerating(false);
    setError(null);
    setSuccess(false);
  };

  const handleClose = () => {
    if (!isGenerating && !success) {
      resetModal();
      onClose();
    }
  };

  const handleGenerate = async () => {
    if (!selectedType) {
      setError('Please select a report type');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setSuccess(false);

    try {
      await reportsApi.generate({
        reportType: selectedType,
        name: REPORT_TYPES.find(t => t.id === selectedType)?.name || '',
        description: REPORT_TYPES.find(t => t.id === selectedType)?.description || '',
        isPublic: true
      });

      setSuccess(true);
      
      // Auto-close after 1.5 seconds and trigger refresh
      setTimeout(() => {
        onSuccess();
        resetModal();
        onClose();
      }, 1500);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate report');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={isOpen} onClose={handleClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <Dialog.Title className="text-xl font-semibold text-gray-900">
              Generate New Report
            </Dialog.Title>
            <button
              onClick={handleClose}
              disabled={isGenerating || success}
              className="p-1 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Icons.X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          <div className="p-6">
            {error && (
              <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center">
                  <Icons.AlertCircle className="w-5 h-5 text-red-600 mr-2" />
                  <span className="text-red-700">{error}</span>
                </div>
              </div>
            )}

            {success && (
              <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center">
                  <Icons.CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                  <span className="text-green-700">Report generated successfully! Refreshing...</span>
                </div>
              </div>
            )}

            <div className="space-y-4">
              {REPORT_TYPES.map((type) => {
                const Icon = type.icon;
                return (
                  <label
                    key={type.id}
                    className={`block p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedType === type.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:bg-gray-50'
                    } ${isGenerating || success ? 'opacity-50 pointer-events-none' : ''}`}
                  >
                    <div className="flex items-start">
                      <input
                        type="radio"
                        name="reportType"
                        value={type.id}
                        checked={selectedType === type.id}
                        onChange={(e) => setSelectedType(e.target.value)}
                        className="mt-1"
                        disabled={isGenerating || success}
                      />
                      <div className="ml-3">
                        <div className="flex items-center">
                          <Icon className="w-5 h-5 text-blue-600 mr-2" />
                          <span className="font-medium text-gray-900">{type.name}</span>
                        </div>
                        <p className="mt-1 text-sm text-gray-500">{type.description}</p>
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="border-t border-gray-200 p-6 bg-gray-50 rounded-b-lg">
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={handleClose}
                disabled={isGenerating || success}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleGenerate}
                disabled={isGenerating || !selectedType || success}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-blue-400 transition-colors flex items-center disabled:cursor-not-allowed"
              >
                {isGenerating ? (
                  <>
                    <Icons.Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : success ? (
                  <>
                    <Icons.CheckCircle className="w-4 h-4 mr-2" />
                    Generated!
                  </>
                ) : (
                  'Generate Report'
                )}
              </button>
            </div>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};

export default GenerateReportModal; 