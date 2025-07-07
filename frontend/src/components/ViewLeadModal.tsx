import React from 'react';
import { Dialog } from '@headlessui/react';
import * as Icons from 'lucide-react';
import { Lead } from '../api/services';

interface ViewLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead | null;
}

const ViewLeadModal: React.FC<ViewLeadModalProps> = ({ isOpen, onClose, lead }) => {
  if (!lead) return null;

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <Dialog.Title className="text-lg font-semibold text-gray-900">
              Lead Details
            </Dialog.Title>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Icons.X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
          
          <div className="p-6">
            {/* Header with avatar and name */}
            <div className="flex items-center mb-6">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mr-4">
                <span className="text-xl font-semibold text-blue-700">
                  {((lead.firstName || '')[0] || '').toUpperCase()}
                </span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">{lead.firstName} {lead.lastName}</h2>
                <p className="text-gray-600">{lead.title} at {lead.company}</p>
                <div className="flex items-center mt-1">
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                    lead.leadStatus === 'Qualified' 
                      ? 'bg-green-100 text-green-800' 
                      : lead.leadStatus === 'New'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {lead.leadStatus}
                  </span>
                </div>
              </div>
            </div>

            {/* Lead Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Lead Information</h3>
                
                <div className="space-y-3">
                  <div className="flex items-start">
                    <Icons.Mail className="w-4 h-4 text-gray-400 mt-1 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-600">Email</p>
                      <p className="text-gray-900">{lead.email}</p>
                    </div>
                  </div>

                  {lead.phone && (
                    <div className="flex items-start">
                      <Icons.Phone className="w-4 h-4 text-gray-400 mt-1 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-gray-600">Phone</p>
                        <p className="text-gray-900">{lead.phone}</p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-start">
                    <Icons.Building2 className="w-4 h-4 text-gray-400 mt-1 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-600">Company</p>
                      <p className="text-gray-900">{lead.company}</p>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <Icons.User className="w-4 h-4 text-gray-400 mt-1 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-600">Lead Owner</p>
                      <p className="text-gray-900">{lead.leadOwner}</p>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <Icons.Eye className="w-4 h-4 text-gray-400 mt-1 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-600">Visible To</p>
                      <p className="text-gray-900">
                        {lead.visibleTo && lead.visibleTo.length > 0 
                          ? lead.visibleTo.join(', ')
                          : 'All Users'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <Icons.TrendingUp className="w-4 h-4 text-gray-400 mt-1 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-600">Lead Source</p>
                      <p className="text-gray-900">{lead.leadSource}</p>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <Icons.Target className="w-4 h-4 text-gray-400 mt-1 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-600">Lead Status</p>
                      <p className="text-gray-900">{lead.leadStatus}</p>
                    </div>
                  </div>

                  {lead.value && (
                    <div className="flex items-start">
                      <Icons.DollarSign className="w-4 h-4 text-gray-400 mt-1 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-gray-600">Expected Value</p>
                        <p className="text-gray-900">${lead.value.toLocaleString()}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Address Information</h3>
                
                {(lead.street || lead.city || lead.state || lead.country) ? (
                  <div className="flex items-start">
                    <Icons.MapPin className="w-4 h-4 text-gray-400 mt-1 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-600">Address</p>
                      <div className="text-gray-900">
                        {lead.street && <p>{lead.street}</p>}
                        {lead.area && <p>{lead.area}</p>}
                        <p>
                          {[lead.city, lead.state, lead.zipCode].filter(Boolean).join(', ')}
                        </p>
                        {lead.country && <p>{lead.country}</p>}
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500 italic">No address information provided</p>
                )}

                {lead.description && (
                  <div className="mt-6">
                    <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Description</h3>
                    <p className="text-gray-700 mt-3">{lead.description}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Audit Information */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Audit Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Created: {new Date(lead.createdAt).toLocaleString()}</p>
                  <p className="text-gray-600">Created By: {lead.createdBy}</p>
                </div>
                <div>
                  <p className="text-gray-600">Updated: {new Date(lead.updatedAt).toLocaleString()}</p>
                  <p className="text-gray-600">Updated By: {lead.updatedBy}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end p-6 border-t border-gray-200">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Close
            </button>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};

export default ViewLeadModal; 