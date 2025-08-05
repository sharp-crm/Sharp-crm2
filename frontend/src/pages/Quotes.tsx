import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import * as Icons from 'lucide-react';
import PageHeader from '../components/Common/PageHeader';
import DataTable from '../components/Common/DataTable';
import StatusBadge from '../components/Common/StatusBadge';
import { quotesApi, Quote, usersApi, User } from '../api/services';
import AddNewModal from '../components/Common/AddNewModal';
import ViewQuoteModal from '../components/ViewQuoteModal';
import EditQuoteModal from '../components/EditQuoteModal';
import { Dialog } from '@headlessui/react';

const Quotes: React.FC = () => {
  const navigate = useNavigate();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [defaultType, setDefaultType] = useState<string | undefined>(undefined);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [quoteToDelete, setQuoteToDelete] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [filters, setFilters] = useState({
    quoteName: false,
    status: false,
    priceRange: false
  });

  // Filter values
  const [filterValues, setFilterValues] = useState({
    quoteName: '',
    status: '',
    minPrice: '',
    maxPrice: ''
  });

  // Filtered quotes
  const [filteredQuotes, setFilteredQuotes] = useState<Quote[]>([]);

  // Fetch quotes and users data on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const [quotesData, usersData] = await Promise.all([
          quotesApi.getAll(),
          usersApi.getAll()
        ]);
        setQuotes(quotesData);
        setUsers(usersData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Apply filters whenever quotes, filter values change
  useEffect(() => {
    let filtered = [...quotes];

    // Apply quote name filter
    if (filters.quoteName && filterValues.quoteName) {
      filtered = filtered.filter(quote => 
        quote.quoteName?.toLowerCase().includes(filterValues.quoteName.toLowerCase())
      );
    }



    // Apply status filter
    if (filters.status && filterValues.status) {
      filtered = filtered.filter(quote => 
        quote.status?.toLowerCase() === filterValues.status.toLowerCase()
      );
    }

    // Apply price range filter
    if (filters.priceRange && (filterValues.minPrice || filterValues.maxPrice)) {
      filtered = filtered.filter(quote => {
        const totalAmount = quote.totalAmount || 0;
        const minPrice = filterValues.minPrice ? parseFloat(filterValues.minPrice) : 0;
        const maxPrice = filterValues.maxPrice ? parseFloat(filterValues.maxPrice) : Infinity;
        return totalAmount >= minPrice && totalAmount <= maxPrice;
      });
    }

    setFilteredQuotes(filtered);
  }, [quotes, filters, filterValues]);

  const handleCheckboxChange = (key: keyof typeof filters) => {
    setFilters(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleFilterValueChange = (key: keyof typeof filterValues, value: string) => {
    setFilterValues(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleApplyFilters = () => {
    // Filters are applied automatically via useEffect
  };

  const handleClearFilters = () => {
    setFilters({
      quoteName: false,
      status: false,
      priceRange: false
    });
    setFilterValues({
      quoteName: '',
      status: '',
      minPrice: '',
      maxPrice: ''
    });
  };

  const handleDelete = async (id: string) => {
    setQuoteToDelete(id);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!quoteToDelete) return;
    
    try {
      await quotesApi.delete(quoteToDelete);
      setQuotes(prev => prev.filter(quote => quote.id !== quoteToDelete));
      setSuccessMessage('Quote deleted successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      setError('Failed to delete quote');
    } finally {
      setDeleteConfirmOpen(false);
      setQuoteToDelete(null);
    }
  };

  const handleView = (quote: Quote) => {
    setSelectedQuote(quote);
    setIsViewModalOpen(true);
  };

  const handleRowClick = (item: Quote) => {
    navigate(`/quotes/${item.id}`);
  };

  const handleEdit = (quote: Quote) => {
    setSelectedQuote(quote);
    setIsEditModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setIsViewModalOpen(false);
    setIsEditModalOpen(false);
    setSelectedQuote(null);
    setDefaultType(undefined);
  };

  const getUserDisplayName = (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (user) {
      return user.firstName && user.lastName 
        ? `${user.firstName} ${user.lastName}`
        : user.name || user.email;
    }
    return userId;
  };

  const handleEditSuccess = async () => {
    try {
      const updatedQuotes = await quotesApi.getAll();
      setQuotes(updatedQuotes);
      setSuccessMessage('Quote updated successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      setError('Failed to refresh quotes');
    }
  };

  const columns = [
    {
      key: 'quoteName',
      label: 'Quote Name',
      sortable: true,
      render: (value: any, row: Quote) => (
        <div className="flex items-center">
          <Icons.FileText className="w-5 h-5 text-gray-400 mr-3" />
          <div>
            <div className="font-medium text-gray-900">{row.quoteName}</div>
            <div className="text-sm text-gray-500">{row.quoteNumber}</div>
          </div>
        </div>
      )
    },
    {
      key: 'quoteOwner',
      label: 'Owner',
      sortable: true,
      render: (value: any, row: Quote) => (
        <div className="text-gray-900">{getUserDisplayName(row.quoteOwner)}</div>
      )
    },

    {
      key: 'totalAmount',
      label: 'Total Amount',
      sortable: true,
      render: (value: any, row: Quote) => (
        <div className="font-medium text-gray-900">
          ${row.totalAmount?.toLocaleString() || '0'}
        </div>
      )
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (value: any, row: Quote) => (
        <StatusBadge status={row.status} />
      )
    },
    {
      key: 'validUntil',
      label: 'Valid Until',
      sortable: true,
      render: (value: any, row: Quote) => (
        <div className="text-gray-600">
          {new Date(row.validUntil).toLocaleDateString()}
        </div>
      )
    },
    {
      key: 'createdAt',
      label: 'Created',
      sortable: true,
      render: (value: any, row: Quote) => (
        <div className="text-gray-600">
          {new Date(row.createdAt).toLocaleDateString()}
        </div>
      )
    }
  ];

  const actions = (row: any) => (
    <div className="flex items-center space-x-2">
      <button 
        className="p-1 text-gray-400 hover:text-blue-600"
        onClick={(e) => {
          e.stopPropagation();
          handleView(row);
        }}
        title="View Quote"
      >
        <Icons.Eye className="w-4 h-4" />
      </button>
      <button 
        className="p-1 text-gray-400 hover:text-green-600"
        onClick={(e) => {
          e.stopPropagation();
          handleEdit(row);
        }}
        title="Edit Quote"
      >
        <Icons.Edit2 className="w-4 h-4" />
      </button>
      <button 
        className="p-1 text-gray-400 hover:text-red-600"
        onClick={(e) => {
          e.stopPropagation();
          handleDelete(row.id);
        }}
        title="Delete Quote"
      >
        <Icons.Trash2 className="w-4 h-4" />
      </button>
    </div>
  );

  const headerActions = (
    <>
      <button 
        className={`flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors ${
          showFilters ? 'bg-blue-50 border-blue-300 text-blue-700' : ''
        }`}
        onClick={() => setShowFilters(!showFilters)}
      >
        <Icons.Filter className="w-4 h-4 mr-2" />
        Filter
      </button>
      <button
        className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        onClick={() => {
          setDefaultType('quote');
          setIsModalOpen(true);
        }}
      >
        <Icons.Plus className="w-4 h-4 mr-2" />
        New Quote
      </button>
    </>
  );

  const getStatusCounts = () => {
    const displayedQuotes = filteredQuotes.length > 0 || Object.values(filters).some(f => f) ? filteredQuotes : quotes;
    const counts = {
      total: displayedQuotes.length,
      draft: displayedQuotes.filter(quote => quote.status === 'Draft').length,
      sent: displayedQuotes.filter(quote => quote.status === 'Sent').length,
      accepted: displayedQuotes.filter(quote => quote.status === 'Accepted').length,
      rejected: displayedQuotes.filter(quote => quote.status === 'Rejected').length,
      expired: displayedQuotes.filter(quote => quote.status === 'Expired').length
    };
    return counts;
  };

  const statusCounts = getStatusCounts();
  const displayedQuotes = filteredQuotes.length > 0 || Object.values(filters).some(f => f) ? filteredQuotes : quotes;
  const totalValue = displayedQuotes.reduce((sum, quote) => sum + (quote.totalAmount || 0), 0);

  if (loading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="flex flex-col gap-4">
        {/* Page Header */}
        <PageHeader
          title="Quotes"
          subtitle="Manage your sales quotes"
          breadcrumbs={[{ name: 'Home', path: '/' }, { name: 'Quotes' }]}
          actions={headerActions}
        />

        {/* Filter Section */}
        {showFilters && (
          <div className="w-full max-w-md bg-white p-4 border border-gray-200 rounded-lg shadow-sm">
            <p className="font-medium text-gray-700 mb-3">Filter & Sort Quotes</p>
            <div className="text-sm text-gray-600 space-y-3">
              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={filters.quoteName}
                    onChange={() => handleCheckboxChange('quoteName')}
                    className="mr-2"
                  />
                  Quote Name
                </label>
                {filters.quoteName && (
                  <input
                    type="text"
                    value={filterValues.quoteName}
                    onChange={(e) => handleFilterValueChange('quoteName', e.target.value)}
                    placeholder="Enter quote name"
                    className="mt-1 w-full px-3 py-1 border border-gray-300 rounded text-sm"
                  />
                )}
              </div>



              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={filters.status}
                    onChange={() => handleCheckboxChange('status')}
                    className="mr-2"
                  />
                  Status
                </label>
                {filters.status && (
                  <select
                    value={filterValues.status}
                    onChange={(e) => handleFilterValueChange('status', e.target.value)}
                    className="mt-1 w-full px-3 py-1 border border-gray-300 rounded text-sm"
                  >
                    <option value="">All Statuses</option>
                    <option value="Draft">Draft</option>
                    <option value="Sent">Sent</option>
                    <option value="Accepted">Accepted</option>
                    <option value="Rejected">Rejected</option>
                    <option value="Expired">Expired</option>
                  </select>
                )}
              </div>

              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={filters.priceRange}
                    onChange={() => handleCheckboxChange('priceRange')}
                    className="mr-2"
                  />
                  Price Range
                </label>
                {filters.priceRange && (
                  <div className="mt-1 space-y-2">
                    <input
                      type="number"
                      value={filterValues.minPrice}
                      onChange={(e) => handleFilterValueChange('minPrice', e.target.value)}
                      placeholder="Min price"
                      className="w-full px-3 py-1 border border-gray-300 rounded text-sm"
                    />
                    <input
                      type="number"
                      value={filterValues.maxPrice}
                      onChange={(e) => handleFilterValueChange('maxPrice', e.target.value)}
                      placeholder="Max price"
                      className="w-full px-3 py-1 border border-gray-300 rounded text-sm"
                    />
                  </div>
                )}
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  onClick={handleApplyFilters}
                  className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                >
                  Apply
                </button>
                <button
                  onClick={handleClearFilters}
                  className="px-3 py-1 bg-gray-300 text-gray-700 rounded text-sm hover:bg-gray-400"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center">
              <Icons.FileText className="w-8 h-8 text-gray-400 mr-3" />
              <div>
                <div className="text-2xl font-bold text-gray-900">{statusCounts.total}</div>
                <div className="text-sm text-gray-600">Total Quotes</div>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center">
              <Icons.CheckCircle className="w-8 h-8 text-green-500 mr-3" />
              <div>
                <div className="text-2xl font-bold text-green-600">{statusCounts.draft}</div>
                <div className="text-sm text-gray-600">Draft</div>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center">
              <Icons.AlertTriangle className="w-8 h-8 text-yellow-500 mr-3" />
              <div>
                <div className="text-2xl font-bold text-yellow-600">{statusCounts.sent}</div>
                <div className="text-sm text-gray-600">Sent</div>
              </div>
            </div>
          </div>
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-4 rounded-lg text-white">
            <div className="flex items-center">
              <Icons.DollarSign className="w-8 h-8 text-white mr-3" />
              <div>
                <div className="text-2xl font-bold">${totalValue.toLocaleString()}</div>
                <div className="text-blue-100">Total Value</div>
              </div>
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-white rounded-lg border border-gray-200">
          <DataTable
            data={displayedQuotes}
            columns={columns}
            onRowClick={handleRowClick}
            actions={actions}
          />
        </div>
      </div>

      {/* Modals */}
      <AddNewModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        defaultType={defaultType}
        onSuccess={handleEditSuccess}
      />

      {selectedQuote && (
        <>
          <ViewQuoteModal
            isOpen={isViewModalOpen}
            onClose={handleModalClose}
            quote={selectedQuote}
            users={users}
          />
          <EditQuoteModal
            isOpen={isEditModalOpen}
            onClose={handleModalClose}
            quote={selectedQuote}
            users={users}
            onSuccess={handleEditSuccess}
          />
        </>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        className="relative z-50"
      >
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="mx-auto max-w-sm rounded-lg bg-white p-6">
            <Dialog.Title className="text-lg font-medium text-gray-900 mb-4">
              Delete Quote
            </Dialog.Title>
            <Dialog.Description className="text-sm text-gray-600 mb-6">
              Are you sure you want to delete this quote? This action cannot be undone.
            </Dialog.Description>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setDeleteConfirmOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>

      {/* Success Message */}
      {successMessage && (
        <div className="fixed bottom-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg">
          {successMessage}
        </div>
      )}
    </div>
  );
};

export default Quotes; 