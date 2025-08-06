import React from 'react';
import * as Icons from 'lucide-react';
import { Deal } from '../../api/services';

interface DealHeaderProps {
  deal: Deal;
  onEdit: () => void;
  onSendEmail: () => void;
  getUserDisplayName: (userId: string) => string;
}

const DealHeader: React.FC<DealHeaderProps> = ({
  deal,
  onEdit,
  onSendEmail,
  getUserDisplayName
}) => {
  const getStageColor = (stage: string) => {
    switch (stage) {
      case 'Needs Analysis':
        return 'bg-blue-100 text-blue-800';
      case 'Value Proposition':
        return 'bg-yellow-100 text-yellow-800';
      case 'Identify Decision Makers':
        return 'bg-purple-100 text-purple-800';
      case 'Negotiation/Review':
        return 'bg-orange-100 text-orange-800';
      case 'Closed Won':
        return 'bg-green-100 text-green-800';
      case 'Closed Lost':
        return 'bg-red-100 text-red-800';
      case 'Closed Lost to Competition':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <div className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
            <Icons.Target className="w-6 h-6 text-orange-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {deal.dealName || deal.name || 'Untitled Deal'}
            </h1>
            <div className="flex items-center space-x-4 mt-1">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStageColor(deal.stage)}`}>
                {deal.stage}
              </span>
              <span className="text-sm text-gray-600">
                {formatCurrency(deal.amount || deal.value || 0)}
              </span>
              {deal.probability && (
                <span className="text-sm text-gray-600">
                  {deal.probability}% probability
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={onSendEmail}
            className="flex items-center px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Icons.Mail className="w-4 h-4 mr-2" />
            Send Email
          </button>
          <button
            onClick={onEdit}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Icons.Edit2 className="w-4 h-4 mr-2" />
            Edit
          </button>
        </div>
      </div>

      {/* Deal Details Row */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
        <div>
          <span className="text-gray-500">Owner:</span>
          <span className="ml-2 font-medium text-gray-900">
            {getUserDisplayName(deal.dealOwner || deal.owner || '')}
          </span>
        </div>
        {deal.closeDate && (
          <div>
            <span className="text-gray-500">Close Date:</span>
            <span className="ml-2 font-medium text-gray-900">
              {new Date(deal.closeDate).toLocaleDateString()}
            </span>
          </div>
        )}
        {deal.leadSource && (
          <div>
            <span className="text-gray-500">Source:</span>
            <span className="ml-2 font-medium text-gray-900">{deal.leadSource}</span>
          </div>
        )}
        {deal.phone && (
          <div>
            <span className="text-gray-500">Phone:</span>
            <span className="ml-2 font-medium text-gray-900">{deal.phone}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default DealHeader; 