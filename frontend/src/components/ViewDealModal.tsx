import React from 'react';
import { Dialog } from '@headlessui/react';
import * as Icons from 'lucide-react';
import { Deal } from '../api/services';

interface ViewDealModalProps {
  isOpen: boolean;
  onClose: () => void;
  deal: Deal | null;
  getUserName: (userId: string) => string;
}

const ViewDealModal: React.FC<ViewDealModalProps> = ({ isOpen, onClose, deal, getUserName }) => {
  if (!deal) return null;

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <Dialog.Title className="text-xl font-semibold text-gray-900">
              Deal Details
            </Dialog.Title>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Icons.X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            {/* Deal Header */}
            <div className="bg-orange-50 rounded-lg p-4">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                  <Icons.Target className="w-6 h-6 text-orange-600" />
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {deal.dealName || deal.name}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {deal.stage} • ${(deal.amount || deal.value || 0).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            {/* Deal Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-3">Deal Information</h4>
                <div className="space-y-3">
                  <div>
                    <span className="text-sm text-gray-600">Deal Name:</span>
                    <p className="font-medium text-gray-900">{deal.dealName || deal.name}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Deal Owner:</span>
                    <p className="font-medium text-gray-900">{deal.dealOwner || deal.owner}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Lead Source:</span>
                    <p className="font-medium text-gray-900">{deal.leadSource}</p>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-3">Deal Progress</h4>
                <div className="space-y-3">
                  <div>
                    <span className="text-sm text-gray-600">Stage:</span>
                    <p className="font-medium text-gray-900">{deal.stage}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Amount:</span>
                    <p className="font-medium text-gray-900">${(deal.amount || deal.value || 0).toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Probability:</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-20 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${deal.probability || 0}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium text-gray-900">{deal.probability || 0}%</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Close Date:</span>
                    <p className="font-medium text-gray-900">
                      {deal.closeDate ? new Date(deal.closeDate).toLocaleDateString() : 'Not set'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Expected Value */}
            <div className="bg-blue-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-blue-900 mb-2">Expected Value</h4>
              <p className="text-lg font-bold text-blue-900">
                ${Math.round(((deal.amount || deal.value || 0) * (deal.probability || 0)) / 100).toLocaleString()}
              </p>
              <p className="text-sm text-blue-700">
                Based on {deal.probability || 0}% probability
              </p>
            </div>

            {/* Description */}
            {deal.description && (
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-3">Description</h4>
                <p className="text-gray-900 whitespace-pre-wrap">{deal.description}</p>
              </div>
            )}

            {/* Visibility Information */}
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-3">Visible To</h4>
              <p className="text-gray-900">
                {deal.visibleTo && deal.visibleTo.length > 0
                  ? deal.visibleTo.map(userId => getUserName(userId)).join(', ')
                  : 'All users'}
              </p>
            </div>

            {/* Audit Information */}
            <div className="border-t pt-4">
              <h4 className="text-sm font-medium text-gray-500 mb-3">Audit Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Created by:</span>
                  <p className="font-medium text-gray-900">{deal.createdBy}</p>
                </div>
                <div>
                  <span className="text-gray-600">Created at:</span>
                  <p className="font-medium text-gray-900">
                    {new Date(deal.createdAt).toLocaleString()}
                  </p>
                </div>
                <div>
                  <span className="text-gray-600">Updated by:</span>
                  <p className="font-medium text-gray-900">{deal.updatedBy}</p>
                </div>
                <div>
                  <span className="text-gray-600">Updated at:</span>
                  <p className="font-medium text-gray-900">
                    {new Date(deal.updatedAt).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t px-6 py-4 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Close
            </button>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};

export default ViewDealModal; 