import React from 'react';
import { Dialog } from '@headlessui/react';
import * as Icons from 'lucide-react';
import { Subsidiary } from '../api/services';

interface ViewSubsidiaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  subsidiary: Subsidiary | null;
}

const ViewSubsidiaryModal: React.FC<ViewSubsidiaryModalProps> = ({
  isOpen,
  onClose,
  subsidiary
}) => {
  if (!subsidiary) return null;

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                <Icons.Building2 className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <Dialog.Title className="text-xl font-semibold text-gray-900">
                  {subsidiary.name}
                </Dialog.Title>
                <p className="text-sm text-gray-600">{subsidiary.email}</p>
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
          <div className="p-6 space-y-6">
            {/* Basic Information */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <Icons.Building2 className="w-5 h-5 mr-2 text-blue-600" />
                Subsidiary Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name
                  </label>
                  <p className="text-sm text-gray-900 bg-white px-3 py-2 rounded-md border">
                    {subsidiary.name}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <p className="text-sm text-gray-900 bg-white px-3 py-2 rounded-md border">
                    {subsidiary.email}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Number
                  </label>
                  <p className="text-sm text-gray-900 bg-white px-3 py-2 rounded-md border">
                    {subsidiary.contact}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Total Employees
                  </label>
                  <p className="text-sm text-gray-900 bg-white px-3 py-2 rounded-md border">
                    {subsidiary.totalEmployees?.toLocaleString() || 'Not specified'}
                  </p>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Address
                  </label>
                  <p className="text-sm text-gray-900 bg-white px-3 py-2 rounded-md border">
                    {subsidiary.address}
                  </p>
                </div>
                {subsidiary.description && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <p className="text-sm text-gray-900 bg-white px-3 py-2 rounded-md border">
                      {subsidiary.description}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Audit Information */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <Icons.Clock className="w-5 h-5 mr-2 text-gray-600" />
                Audit Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Created At
                  </label>
                  <p className="text-sm text-gray-900 bg-white px-3 py-2 rounded-md border">
                    {new Date(subsidiary.createdAt).toLocaleString()}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Created By
                  </label>
                  <p className="text-sm text-gray-900 bg-white px-3 py-2 rounded-md border">
                    {subsidiary.createdBy}
                  </p>
                </div>
                {subsidiary.updatedAt && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Last Updated
                    </label>
                    <p className="text-sm text-gray-900 bg-white px-3 py-2 rounded-md border">
                      {new Date(subsidiary.updatedAt).toLocaleString()}
                    </p>
                  </div>
                )}
                {subsidiary.updatedBy && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Updated By
                    </label>
                    <p className="text-sm text-gray-900 bg-white px-3 py-2 rounded-md border">
                      {subsidiary.updatedBy}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end p-6 border-t border-gray-200 bg-gray-50">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Close
            </button>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};

export default ViewSubsidiaryModal; 