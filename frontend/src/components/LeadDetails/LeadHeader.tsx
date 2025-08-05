import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as Icons from 'lucide-react';
import { Lead, User } from '../../api/services';
import ConvertLeadModal from '../ConvertLeadModal';

interface LeadHeaderProps {
  lead: Lead;
  onEdit: () => void;
  onConvert: () => void;
  onSendEmail: () => void;
  getUserDisplayName: (userId: string) => string;
}

const LeadHeader: React.FC<LeadHeaderProps> = ({
  lead,
  onEdit,
  onConvert,
  onSendEmail,
  getUserDisplayName
}) => {
  const navigate = useNavigate();
  const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Qualified':
      case 'Pre-Qualified':
        return 'bg-green-100 text-green-800';
      case 'New':
      case 'Not Contacted':
        return 'bg-blue-100 text-blue-800';
      case 'Contacted':
      case 'Attempted to Contact':
        return 'bg-yellow-100 text-yellow-800';
      case 'Lost Lead':
      case 'Junk Lead':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Left side - Lead info */}
        <div className="flex items-center space-x-4">
          {/* Avatar */}
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
            <span className="text-lg font-semibold text-blue-700">
              {((lead.firstName || '')[0] || '').toUpperCase()}
            </span>
          </div>

          {/* Lead details */}
          <div className="flex items-center space-x-6">
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                {lead.firstName} {lead.lastName}
              </h1>
              <p className="text-sm text-gray-600">{lead.title} at {lead.company}</p>
            </div>

            {/* Contact info */}
            <div className="flex items-center space-x-4 text-sm">
              {lead.email && (
                <div className="flex items-center space-x-1">
                  <Icons.Mail className="w-4 h-4 text-gray-400" />
                  <a 
                    href={`mailto:${lead.email}`}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    {lead.email}
                  </a>
                </div>
              )}
              
              {lead.phone && (
                <div className="flex items-center space-x-1">
                  <Icons.Phone className="w-4 h-4 text-gray-400" />
                  <a 
                    href={`tel:${lead.phone}`}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    {lead.phone}
                  </a>
                </div>
              )}
            </div>

            {/* Status badge */}
            <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(lead.leadStatus)}`}>
              {lead.leadStatus}
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
            onClick={() => setIsConvertModalOpen(true)}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Icons.Target className="w-4 h-4 mr-2" />
            Convert
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
          <span>Owner: {getUserDisplayName(lead.leadOwner)}</span>
        </div>
        
        {lead.value && (
          <div className="flex items-center space-x-1">
            <Icons.DollarSign className="w-4 h-4" />
            <span>Value: ${lead.value.toLocaleString()}</span>
          </div>
        )}
        
        <div className="flex items-center space-x-1">
          <Icons.Calendar className="w-4 h-4" />
          <span>Created: {new Date(lead.createdAt).toLocaleDateString()}</span>
        </div>
        
        {lead.leadSource && (
          <div className="flex items-center space-x-1">
            <Icons.TrendingUp className="w-4 h-4" />
            <span>Source: {lead.leadSource}</span>
          </div>
        )}
      </div>

      {/* Convert Lead Modal */}
      <ConvertLeadModal
        isOpen={isConvertModalOpen}
        onClose={() => setIsConvertModalOpen(false)}
        lead={lead}
        onSuccess={() => {
          setIsConvertModalOpen(false);
          // Navigate to leads page after successful conversion
          navigate('/leads');
        }}
      />
    </div>
  );
};

export default LeadHeader; 