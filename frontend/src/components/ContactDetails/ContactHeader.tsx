import React from 'react';
import { useNavigate } from 'react-router-dom';
import * as Icons from 'lucide-react';
import { Contact, User } from '../../api/services';

interface ContactHeaderProps {
  contact: Contact;
  onEdit: () => void;
  onSendEmail: () => void;
  getUserDisplayName: (userId: string) => string;
}

const ContactHeader: React.FC<ContactHeaderProps> = ({
  contact,
  onEdit,
  onSendEmail,
  getUserDisplayName
}) => {
  const navigate = useNavigate();
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active':
        return 'bg-green-100 text-green-800';
      case 'Inactive':
        return 'bg-gray-100 text-gray-800';
      case 'Archived':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Left side - Contact info */}
        <div className="flex items-center space-x-4">
          {/* Avatar */}
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
            <span className="text-lg font-semibold text-green-700">
              {((contact.firstName || '')[0] || '').toUpperCase()}
            </span>
          </div>

          {/* Contact details */}
          <div className="flex items-center space-x-6">
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                {contact.firstName} {contact.lastName}
              </h1>
              <p className="text-sm text-gray-600">{contact.title} at {contact.companyName}</p>
            </div>

            {/* Contact info */}
            <div className="flex items-center space-x-4 text-sm">
              {contact.email && (
                <div className="flex items-center space-x-1">
                  <Icons.Mail className="w-4 h-4 text-gray-400" />
                  <a 
                    href={`mailto:${contact.email}`}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    {contact.email}
                  </a>
                </div>
              )}
              
              {contact.phone && (
                <div className="flex items-center space-x-1">
                  <Icons.Phone className="w-4 h-4 text-gray-400" />
                  <a 
                    href={`tel:${contact.phone}`}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    {contact.phone}
                  </a>
                </div>
              )}
            </div>

            {/* Status badge */}
            <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(contact.status)}`}>
              {contact.status}
            </span>
          </div>
        </div>

        {/* Right side - Action buttons */}
        <div className="flex items-center space-x-3">
          <button
            onClick={onSendEmail}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Icons.Mail className="w-4 h-4 mr-2" />
            Send Email
          </button>
          
          <button
            onClick={onEdit}
            className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            <Icons.Edit2 className="w-4 h-4 mr-2" />
            Edit
          </button>
        </div>
      </div>

      {/* Additional info row */}
      <div className="mt-4 flex items-center space-x-6 text-sm text-gray-600">
        <div className="flex items-center space-x-1">
          <Icons.User className="w-4 h-4" />
          <span>Owner: {getUserDisplayName(contact.contactOwner || contact.ownerId || '')}</span>
        </div>
        
        <div className="flex items-center space-x-1">
          <Icons.Building2 className="w-4 h-4" />
          <span>Company: {contact.companyName}</span>
        </div>
        
        <div className="flex items-center space-x-1">
          <Icons.Calendar className="w-4 h-4" />
          <span>Created: {new Date(contact.createdAt).toLocaleDateString()}</span>
        </div>
        
        {(contact.lastModifiedAt || contact.updatedAt) && (
          <div className="flex items-center space-x-1">
            <Icons.Clock className="w-4 h-4" />
            <span>Modified: {new Date(contact.lastModifiedAt || contact.updatedAt).toLocaleDateString()}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ContactHeader; 