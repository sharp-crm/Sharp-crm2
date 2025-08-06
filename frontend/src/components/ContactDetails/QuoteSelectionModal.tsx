import React, { useState, useEffect } from 'react';
import * as Icons from 'lucide-react';
import { Quote, quotesApi } from '../../api/services';
import { useToastStore } from '../../store/useToastStore';

interface QuoteSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onQuoteSelect: (quoteId: string) => void;
  existingQuoteIds?: string[];
}

const QuoteSelectionModal: React.FC<QuoteSelectionModalProps> = ({
  isOpen,
  onClose,
  onQuoteSelect,
  existingQuoteIds = []
}) => {
  const { addToast } = useToastStore();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchQuotes();
    }
  }, [isOpen]);

  const fetchQuotes = async () => {
    setLoading(true);
    try {
      const allQuotes = await quotesApi.getAll();
      // Filter out quotes that are already associated with this contact
      const availableQuotes = allQuotes.filter(
        quote => !existingQuoteIds.includes(quote.id)
      );
      setQuotes(availableQuotes);
    } catch (error) {
      console.error('Error fetching quotes:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to fetch quotes.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleQuoteSelect = (quoteId: string) => {
    onQuoteSelect(quoteId);
    onClose();
  };

  const filteredQuotes = quotes.filter(quote =>
    quote.quoteName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    quote.quoteNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Add Quote</h3>
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
              placeholder="Search quotes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Quotes List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p className="text-sm text-gray-500">Loading quotes...</p>
            </div>
          ) : filteredQuotes.length > 0 ? (
            <div className="space-y-3">
              {filteredQuotes.map((quote) => (
                <div
                  key={quote.id}
                  className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => handleQuoteSelect(quote.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <Icons.FileText className="w-4 h-4 text-blue-600" />
                        <h4 className="text-sm font-medium text-gray-900">{quote.quoteName}</h4>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          quote.status === 'Draft' ? 'bg-gray-100 text-gray-800' :
                          quote.status === 'Sent' ? 'bg-blue-100 text-blue-800' :
                          quote.status === 'Accepted' ? 'bg-green-100 text-green-800' :
                          quote.status === 'Rejected' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {quote.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{quote.description}</p>
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <div className="flex items-center space-x-1">
                          <Icons.Hash className="w-3 h-3" />
                          <span>{quote.quoteNumber}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Icons.DollarSign className="w-3 h-3" />
                          <span>${quote.totalAmount.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Icons.Calendar className="w-3 h-3" />
                          <span>Valid until {new Date(quote.validUntil).toLocaleDateString()}</span>
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
              <Icons.FileText className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-500">
                {searchTerm ? 'No quotes found matching your search.' : 'No quotes available.'}
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

export default QuoteSelectionModal; 