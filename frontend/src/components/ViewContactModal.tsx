import React from 'react';
import { Dialog } from '@headlessui/react';
import * as Icons from 'lucide-react';
import { Contact } from '../api/services';

interface ViewContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  contact: Contact | null;
}

const ViewContactModal: React.FC<ViewContactModalProps> = ({ isOpen, onClose, contact }) => {
  if (!contact) return null;

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <Dialog.Title className="text-lg font-semibold text-gray-900">
              Contact Details
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
                  {contact.firstName.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">{contact.firstName}</h2>
                <p className="text-gray-600">{contact.title} at {contact.companyName}</p>
                <div className="flex items-center mt-1">
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                    contact.status === 'Active' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {contact.status}
                  </span>
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Contact Information</h3>
                
                <div className="space-y-3">
                  <div className="flex items-start">
                    <Icons.Mail className="w-4 h-4 text-gray-400 mt-1 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-600">Email</p>
                      <p className="text-gray-900">{contact.email}</p>
                    </div>
                  </div>

                  {contact.phone && (
                    <div className="flex items-start">
                      <Icons.Phone className="w-4 h-4 text-gray-400 mt-1 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-gray-600">Phone</p>
                        <p className="text-gray-900">{contact.phone}</p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-start">
                    <Icons.Building2 className="w-4 h-4 text-gray-400 mt-1 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-600">Company</p>
                      <p className="text-gray-900">{contact.companyName}</p>
                    </div>
                  </div>

                  {contact.department && (
                    <div className="flex items-start">
                      <Icons.Users className="w-4 h-4 text-gray-400 mt-1 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-gray-600">Department</p>
                        <p className="text-gray-900">{contact.department}</p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-start">
                    <Icons.User className="w-4 h-4 text-gray-400 mt-1 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-600">Contact Owner</p>
                      <p className="text-gray-900">{contact.contactOwner}</p>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <Icons.TrendingUp className="w-4 h-4 text-gray-400 mt-1 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-600">Lead Source</p>
                      <p className="text-gray-900">{contact.leadSource}</p>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <Icons.Eye className="w-4 h-4 text-gray-400 mt-1 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-600">Visible To</p>
                      <p className="text-gray-900">
                        {contact.visibleTo && contact.visibleTo.length > 0 
                          ? contact.visibleTo.join(', ')
                          : 'All Users'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Address Information</h3>
                
                {(contact.street || contact.city || contact.state || contact.country) ? (
                  <div className="flex items-start">
                    <Icons.MapPin className="w-4 h-4 text-gray-400 mt-1 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-600">Address</p>
                      <div className="text-gray-900">
                        {contact.street && <p>{contact.street}</p>}
                        {contact.area && <p>{contact.area}</p>}
                        <p>
                          {[contact.city, contact.state, contact.zipCode].filter(Boolean).join(', ')}
                        </p>
                        {contact.country && <p>{contact.country}</p>}
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500 italic">No address information provided</p>
                )}

                {contact.description && (
                  <div className="mt-6">
                    <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Description</h3>
                    <p className="text-gray-700 mt-3">{contact.description}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Audit Information */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Audit Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Created: {new Date(contact.createdAt).toLocaleString()}</p>
                  <p className="text-gray-600">Created By: {contact.createdBy}</p>
                </div>
                <div>
                  <p className="text-gray-600">Updated: {new Date(contact.updatedAt).toLocaleString()}</p>
                  <p className="text-gray-600">Updated By: {contact.updatedBy}</p>
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

export default ViewContactModal; 