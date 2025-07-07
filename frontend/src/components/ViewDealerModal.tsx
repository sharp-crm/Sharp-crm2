import React from 'react';
import { Dialog } from '@headlessui/react';
import * as Icons from 'lucide-react';
import { Dealer } from '../api/services';

interface ViewDealerModalProps {
  isOpen: boolean;
  onClose: () => void;
  dealer: Dealer | null;
}

const ViewDealerModal: React.FC<ViewDealerModalProps> = ({
  isOpen,
  onClose,
  dealer
}) => {
  if (!dealer) return null;

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
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
                  {dealer.name}
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
                    Name
                  </label>
                  <p className="text-sm text-gray-900 bg-white px-3 py-2 rounded-md border">
                    {dealer.name}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <p className="text-sm text-gray-900 bg-white px-3 py-2 rounded-md border">
                    {dealer.email}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone
                  </label>
                  <p className="text-sm text-gray-900 bg-white px-3 py-2 rounded-md border">
                    {dealer.phone}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Company
                  </label>
                  <p className="text-sm text-gray-900 bg-white px-3 py-2 rounded-md border">
                    {dealer.company}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Location
                  </label>
                  <p className="text-sm text-gray-900 bg-white px-3 py-2 rounded-md border">
                    {dealer.location}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Territory
                  </label>
                  <p className="text-sm text-gray-900 bg-white px-3 py-2 rounded-md border">
                    {dealer.territory}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <div className="bg-white px-3 py-2 rounded-md border">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(dealer.status)}`}>
                      {dealer.status}
                    </span>
                  </div>
                </div>
                {dealer.description && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <p className="text-sm text-gray-900 bg-white px-3 py-2 rounded-md border">
                      {dealer.description}
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
                    {new Date(dealer.createdAt).toLocaleString()}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Created By
                  </label>
                  <p className="text-sm text-gray-900 bg-white px-3 py-2 rounded-md border">
                    {dealer.createdBy}
                  </p>
                </div>
                {dealer.updatedAt && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Last Updated
                    </label>
                    <p className="text-sm text-gray-900 bg-white px-3 py-2 rounded-md border">
                      {new Date(dealer.updatedAt).toLocaleString()}
                    </p>
                  </div>
                )}
                {dealer.updatedBy && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Updated By
                    </label>
                    <p className="text-sm text-gray-900 bg-white px-3 py-2 rounded-md border">
                      {dealer.updatedBy}
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

export default ViewDealerModal; 