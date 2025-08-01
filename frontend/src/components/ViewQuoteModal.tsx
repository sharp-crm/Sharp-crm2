import React from 'react';
import { Dialog } from '@headlessui/react';
import * as Icons from 'lucide-react';
import { Quote, User } from '../api/services';

interface ViewQuoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  quote: Quote;
  users: User[];
}

const ViewQuoteModal: React.FC<ViewQuoteModalProps> = ({ isOpen, onClose, quote, users }) => {
  const getUserDisplayName = (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (user) {
      return user.firstName && user.lastName 
        ? `${user.firstName} ${user.lastName}`
        : user.name || user.email;
    }
    return userId;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatCurrency = (amount: number) => {
    return `$${amount.toLocaleString()}`;
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <Dialog.Title className="text-xl font-semibold text-gray-900">
              View Quote
            </Dialog.Title>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Icons.X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
          
          <div className="p-6 space-y-6">
            {/* Quote Header */}
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6 rounded-lg text-white">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold">{quote.quoteName}</h2>
                  <p className="text-blue-100">Quote #{quote.quoteNumber}</p>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold">{formatCurrency(quote.totalAmount)}</div>
                  <div className="text-blue-100">Total Amount</div>
                </div>
              </div>
            </div>

            {/* Quote Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-6 border border-gray-200 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Icons.FileText className="w-5 h-5 mr-2 text-blue-600" />
                  Quote Information
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Quote Owner</label>
                    <p className="text-gray-900">{getUserDisplayName(quote.quoteOwner)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Status</label>
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      quote.status === 'Draft' ? 'bg-gray-100 text-gray-800' :
                      quote.status === 'Sent' ? 'bg-blue-100 text-blue-800' :
                      quote.status === 'Accepted' ? 'bg-green-100 text-green-800' :
                      quote.status === 'Rejected' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {quote.status}
                    </span>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Valid Until</label>
                    <p className="text-gray-900">{formatDate(quote.validUntil)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Active Status</label>
                    <p className="text-gray-900">{quote.activeStatus ? 'Active' : 'Inactive'}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 border border-gray-200 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Icons.User className="w-5 h-5 mr-2 text-green-600" />
                  Customer Information
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Customer Name</label>
                    <p className="text-gray-900">{quote.customerName}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Email</label>
                    <p className="text-gray-900">{quote.customerEmail || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Phone</label>
                    <p className="text-gray-900">{quote.customerPhone}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Pricing Information */}
            <div className="bg-white p-6 border border-gray-200 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Icons.DollarSign className="w-5 h-5 mr-2 text-green-600" />
                Pricing Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Subtotal</label>
                  <p className="text-lg font-semibold text-gray-900">{formatCurrency(quote.subtotal)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Tax ({quote.taxPercentage}%)</label>
                  <p className="text-lg font-semibold text-gray-900">{formatCurrency(quote.subtotal * quote.taxPercentage / 100)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Discount ({quote.discountPercentage}%)</label>
                  <p className="text-lg font-semibold text-gray-900">{formatCurrency(quote.subtotal * quote.discountPercentage / 100)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Total Amount</label>
                  <p className="text-lg font-semibold text-blue-600">{formatCurrency(quote.totalAmount)}</p>
                </div>
              </div>
            </div>

            {/* Quote Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-6 border border-gray-200 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Icons.FileText className="w-5 h-5 mr-2 text-purple-600" />
                  Description
                </h3>
                <p className="text-gray-700 whitespace-pre-wrap">{quote.description || 'No description provided'}</p>
              </div>

              <div className="bg-white p-6 border border-gray-200 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Icons.FileText className="w-5 h-5 mr-2 text-purple-600" />
                  Terms & Conditions
                </h3>
                <p className="text-gray-700 whitespace-pre-wrap">{quote.terms || 'No terms specified'}</p>
              </div>
            </div>

            {/* Notes */}
            {quote.notes && (
              <div className="bg-white p-6 border border-gray-200 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Icons.StickyNote className="w-5 h-5 mr-2 text-yellow-600" />
                  Notes
                </h3>
                <p className="text-gray-700 whitespace-pre-wrap">{quote.notes}</p>
              </div>
            )}

            {/* Audit Information */}
            <div className="bg-gray-50 p-6 border border-gray-200 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Icons.History className="w-5 h-5 mr-2 text-gray-600" />
                Audit Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <label className="text-sm font-medium text-gray-500">Created By</label>
                  <p className="text-gray-900">{getUserDisplayName(quote.createdBy)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Created At</label>
                  <p className="text-gray-900">{formatDate(quote.createdAt)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Updated By</label>
                  <p className="text-gray-900">{getUserDisplayName(quote.updatedBy)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Updated At</label>
                  <p className="text-gray-900">{formatDate(quote.updatedAt)}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end p-6 border-t border-gray-200">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Close
            </button>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};

export default ViewQuoteModal; 