import React, { useState, useEffect } from 'react';
import * as Icons from 'lucide-react';
import { Contact, contactsApi } from '../../api/services';
import { useToastStore } from '../../store/useToastStore';

interface ContactSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onContactSelect: (contactId: string) => void;
  existingContactIds?: string[];
}

const ContactSelectionModal: React.FC<ContactSelectionModalProps> = ({
  isOpen,
  onClose,
  onContactSelect,
  existingContactIds = []
}) => {
  const { addToast } = useToastStore();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchContacts();
    }
  }, [isOpen]);

  const fetchContacts = async () => {
    setLoading(true);
    try {
      const allContacts = await contactsApi.getAll();
      // Filter out contacts that are already associated with this deal
      const availableContacts = allContacts.filter(
        contact => !existingContactIds.includes(contact.id)
      );
      setContacts(availableContacts);
    } catch (error) {
      console.error('Error fetching contacts:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to fetch contacts.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleContactSelect = (contactId: string) => {
    onContactSelect(contactId);
    onClose();
  };

  const filteredContacts = contacts.filter(contact =>
    (contact.firstName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (contact.lastName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (contact.companyName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (contact.email?.toLowerCase() || '').includes(searchTerm.toLowerCase()) 
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Add Contact to Deal</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <Icons.X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="mb-4">
          <div className="relative">
            <Icons.Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search contacts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Contacts List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p className="text-sm text-gray-500">Loading contacts...</p>
            </div>
          ) : filteredContacts.length > 0 ? (
            <div className="space-y-3">
              {filteredContacts.map((contact) => (
                <div
                  key={contact.id}
                  className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => handleContactSelect(contact.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <Icons.User className="w-4 h-4 text-blue-600" />
                        <h4 className="text-sm font-medium text-gray-900">
                          {contact.firstName || ''} {contact.lastName || ''}
                        </h4>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          contact.status === 'Active' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {contact.status || 'Active'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{contact.companyName || 'No company'}</p>
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <div className="flex items-center space-x-1">
                          <Icons.Mail className="w-3 h-3" />
                          <span>{contact.email || 'No email'}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Icons.Phone className="w-3 h-3" />
                          <span>{contact.phone || 'No phone'}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Icons.Briefcase className="w-3 h-3" />
                          <span>{contact.title || 'No title'}</span>
                        </div>
                      </div>
                    </div>
                    <Icons.Plus className="w-4 h-4 text-blue-600" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Icons.User className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-500">
                {searchTerm ? 'No contacts found matching your search.' : 'No contacts available.'}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-3 mt-4 pt-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default ContactSelectionModal; 