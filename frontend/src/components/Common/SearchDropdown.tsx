import React from 'react';
import { useNavigate } from 'react-router-dom';
import * as Icons from 'lucide-react';
import { SearchResult, SearchResults } from '../../services/globalSearchService';

interface SearchDropdownProps {
  results: SearchResults;
  isLoading: boolean;
  searchTerm: string;
  onClose: () => void;
  onResultClick: (result: SearchResult) => void;
}

const SearchDropdown: React.FC<SearchDropdownProps> = ({
  results,
  isLoading,
  searchTerm,
  onClose,
  onResultClick
}) => {
  const navigate = useNavigate();

  const getIcon = (type: string) => {
    switch (type) {
      case 'lead':
        return <Icons.UserPlus className="w-4 h-4 text-blue-500" />;
      case 'contact':
        return <Icons.User className="w-4 h-4 text-green-500" />;
      case 'deal':
        return <Icons.DollarSign className="w-4 h-4 text-purple-500" />;
      case 'task':
        return <Icons.CheckSquare className="w-4 h-4 text-orange-500" />;
      case 'subsidiary':
        return <Icons.Building2 className="w-4 h-4 text-indigo-500" />;
      case 'dealer':
        return <Icons.Store className="w-4 h-4 text-red-500" />;
      case 'product':
        return <Icons.Package className="w-4 h-4 text-teal-500" />;
      case 'quote':
        return <Icons.FileText className="w-4 h-4 text-amber-500" />;
      default:
        return <Icons.Search className="w-4 h-4 text-gray-500" />;
    }
  };

  const handleResultClick = (result: SearchResult) => {
    onResultClick(result);
    navigate(result.route);
    onClose();
  };

  const handleViewAll = (type: string, route: string) => {
    navigate(route);
    onClose();
  };

  const renderSection = (title: string, items: SearchResult[], type: string, route: string) => {
    if (items.length === 0) return null;

    return (
      <div className="border-b border-gray-100 last:border-b-0">
        <div className="flex items-center justify-between px-4 py-2 bg-gray-50">
          <div className="flex items-center space-x-2">
            {getIcon(type)}
            <span className="text-sm font-medium text-gray-700 capitalize">{title}</span>
            <span className="text-xs text-gray-500">({items.length})</span>
          </div>
          {items.length >= 5 && (
            <button
              onClick={() => handleViewAll(type, route)}
              className="text-xs text-blue-600 hover:text-blue-800"
            >
              View All
            </button>
          )}
        </div>
        <div>
          {items.map((result) => (
            <button
              key={`${result.type}-${result.id}`}
              onClick={() => handleResultClick(result)}
              className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-50 last:border-b-0 transition-colors group"
              title={`Click to view ${result.type} details`}
            >
                              <div className="flex items-start space-x-3">
                  {getIcon(result.type)}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                      {result.title}
                    </div>
                    {result.subtitle && (
                      <div className="text-sm text-gray-600 truncate group-hover:text-blue-500 transition-colors">
                        {result.subtitle}
                      </div>
                    )}
                    <div className="text-xs text-gray-500 truncate">
                      {result.description}
                    </div>
                  </div>
                  {/* Navigation indicator */}
                  <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Icons.ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-blue-500" />
                  </div>
                </div>
            </button>
          ))}
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
        <div className="px-4 py-8 text-center">
          <Icons.Loader2 className="w-6 h-6 text-blue-500 animate-spin mx-auto mb-2" />
          <p className="text-sm text-gray-500">Searching...</p>
        </div>
      </div>
    );
  }

  if (!searchTerm) {
    return null;
  }

  if (results.total === 0) {
    return (
      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
        <div className="px-4 py-8 text-center">
          <Icons.Search className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm font-medium text-gray-900">No results found</p>
          <p className="text-xs text-gray-500 mt-1">
            Try searching with different keywords
          </p>
          <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-xs text-blue-800">
              <strong>Searchable items:</strong> Contacts, Leads, Deals, Tasks, Products, Quotes, Subsidiaries, Dealers
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto animate-in fade-in-0 slide-in-from-top-2 duration-200">
      <div className="px-4 py-2 border-b border-gray-100 bg-gray-50">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-gray-700">
            Search Results ({results.total})
          </p>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <Icons.X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Results Sections */}
      {renderSection('Leads', results.leads, 'lead', '/leads')}
      {renderSection('Contacts', results.contacts, 'contact', '/contacts')}
      {renderSection('Deals', results.deals, 'deal', '/deals')}
      {renderSection('Tasks', results.tasks, 'task', '/tasks')}
      {renderSection('Subsidiaries', results.subsidiaries, 'subsidiary', '/subsidiaries')}
      {renderSection('Dealers', results.dealers, 'dealer', '/dealers')}
      {renderSection('Products', results.products, 'product', '/products')}
      {renderSection('Quotes', results.quotes, 'quote', '/quotes')}

      
    </div>
  );
};

export default SearchDropdown; 