import React from 'react';
import { useNavigate } from 'react-router-dom';
import * as Icons from 'lucide-react';
import { Quote } from '../../types';
import StatusBadge from '../Common/StatusBadge';

interface QuoteHeaderProps {
  quote: Quote;
  onEdit: () => void;
}

const QuoteHeader: React.FC<QuoteHeaderProps> = ({ quote, onEdit }) => {
  const navigate = useNavigate();

  return (
    <div className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/quotes')}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <Icons.ArrowLeft className="w-5 h-5" />
          </button>
          
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Icons.FileText className="w-6 h-6 text-blue-600" />
            </div>
            
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{quote.quoteName}</h1>
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <span>Quote #{quote.quoteNumber}</span>
                <span>•</span>
                <StatusBadge status={quote.status} />
                <span>•</span>
                <span>Valid until {new Date(quote.validUntil).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={onEdit}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Icons.Edit2 className="w-4 h-4 mr-2" />
            Edit Quote
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuoteHeader; 