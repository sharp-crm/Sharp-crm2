import React, { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import * as Icons from 'lucide-react';
import { Report, reportsApi } from '../api/services';
import API from '../api/client';

interface EditReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  report: Report | null;
}

interface User {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

const EditReportModal: React.FC<EditReportModalProps> = ({ isOpen, onClose, onSuccess, report }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    isPublic: false,
    sharedWith: [] as string[],
    schedule: '' as string
  });
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize form data when report changes
  useEffect(() => {
    if (report) {
      setFormData({
        name: report.name || '',
        description: report.description || '',
        isPublic: report.isPublic || false,
        sharedWith: report.sharedWith || [],
        schedule: report.schedule || ''
      });
    }
  }, [report]);

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

  const handleInputChange = (name: string, value: any) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleVisibilityChange = (userId: string) => {
    setFormData(prev => {
      const currentSharedWith = prev.sharedWith || [];
      const newSharedWith = currentSharedWith.includes(userId)
        ? currentSharedWith.filter(id => id !== userId)
        : [...currentSharedWith, userId];
      return { ...prev, sharedWith: newSharedWith };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!report) return;

    setLoading(true);
    setError(null);

    try {
      const updatedReport = await reportsApi.update(report.id, formData);
      
      // Reset form data
      setFormData({
        name: '',
        description: '',
        isPublic: false,
        sharedWith: [],
        schedule: ''
      });
      
      // Call onSuccess and let parent handle modal closing and data refresh
      onSuccess();
    } catch (err) {
      console.error('Update error:', err);
      setError(err instanceof Error ? err.message : 'Failed to update report');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      name: '',
      description: '',
      isPublic: false,
      sharedWith: [],
      schedule: ''
    });
    setError(null);
    onClose();
  };

  if (!report) return null;

  return (
    <Dialog open={isOpen} onClose={handleClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <Dialog.Title className="text-xl font-semibold text-gray-900">
              Edit Report
            </Dialog.Title>
            <button
              onClick={handleClose}
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

            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Basic Information</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Report Name <span className="text-red-500">*</span>
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
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter report description..."
                />
              </div>
            </div>

            

            {/* Scheduling Controls */}
            <div className="bg-green-50 rounded-lg p-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <Icons.Clock className="w-5 h-5 mr-2 text-green-600" />
                Schedule Settings
              </h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Report Schedule
                </label>
                <select
                  value={formData.schedule}
                  onChange={(e) => handleInputChange('schedule', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">No Schedule (Manual Only)</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  {formData.schedule 
                    ? `Report will be automatically generated ${formData.schedule}` 
                    : "Report will only be generated manually"}
                </p>
              </div>
            </div>

            {/* Report Type Info */}
            <div className="bg-blue-50 rounded-lg p-4">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Report Information</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-600">Type:</span>
                  <span className="ml-2 text-gray-900">{report.reportType}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Status:</span>
                  <span className="ml-2 text-gray-900">{report.status}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Created:</span>
                  <span className="ml-2 text-gray-900">
                    {new Date(report.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Last Run:</span>
                  <span className="ml-2 text-gray-900">
                    {report.lastRun ? new Date(report.lastRun).toLocaleDateString() : 'Never'}
                  </span>
                </div>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={handleClose}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !formData.name.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-blue-400 transition-colors flex items-center"
              >
                {loading ? (
                  <>
                    <Icons.Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Update Report'
                )}
              </button>
            </div>
          </form>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};

export default EditReportModal; 