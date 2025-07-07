import React, { useState, useEffect } from 'react';
import * as Icons from 'lucide-react';
import PageHeader from '../components/Common/PageHeader';
import { dealersApi, Dealer } from '../api/services';
import AddNewModal from '../components/Common/AddNewModal';
import ViewDealerModal from '../components/ViewDealerModal';
import EditDealerModal from '../components/EditDealerModal';
import { useAuthStore } from '../store/useAuthStore';
import { Dialog } from '@headlessui/react';

const Dealers: React.FC = () => {
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [defaultType, setDefaultType] = useState<string | undefined>(undefined);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedDealer, setSelectedDealer] = useState<Dealer | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [dealerToDelete, setDealerToDelete] = useState<string | null>(null);

  // Filter state
  const [filters, setFilters] = useState({
    territory: false,
    status: false,
    company: false,
    location: false
  });

  // Filter values
  const [filterValues, setFilterValues] = useState({
    territory: '',
    status: '',
    company: '',
    location: ''
  });

  // Filtered dealers
  const [filteredDealers, setFilteredDealers] = useState<Dealer[]>([]);
  
  const { user } = useAuthStore();

  useEffect(() => {
    fetchDealers();
  }, []);

  // Apply filters whenever dealers or filter values change
  useEffect(() => {
    let filtered = [...dealers];

    // Apply territory filter
    if (filters.territory && filterValues.territory.trim()) {
      filtered = filtered.filter(dealer => 
        dealer.territory.toLowerCase().includes(filterValues.territory.toLowerCase())
      );
    }

    // Apply status filter
    if (filters.status && filterValues.status) {
      filtered = filtered.filter(dealer => dealer.status === filterValues.status);
    }

    // Apply company filter
    if (filters.company && filterValues.company.trim()) {
      filtered = filtered.filter(dealer => 
        dealer.company.toLowerCase().includes(filterValues.company.toLowerCase())
      );
    }

    // Apply location filter
    if (filters.location && filterValues.location.trim()) {
      filtered = filtered.filter(dealer => 
        dealer.location.toLowerCase().includes(filterValues.location.toLowerCase())
      );
    }

    setFilteredDealers(filtered);
  }, [dealers, filters, filterValues]);

  const fetchDealers = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await dealersApi.getAll();
      setDealers(data);
    } catch (err) {
      setError('Failed to load dealers. Please try again.');
      console.error('Error fetching dealers:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckboxChange = (key: keyof typeof filters) => {
    setFilters(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleFilterValueChange = (key: keyof typeof filterValues, value: string) => {
    setFilterValues(prev => ({ ...prev, [key]: value }));
  };

  const handleApplyFilters = () => {
    // Filters are applied automatically via useEffect
  };

  const handleClearFilters = () => {
    setFilters({
      territory: false,
      status: false,
      company: false,
      location: false
    });
    setFilterValues({
      territory: '',
      status: '',
      company: '',
      location: ''
    });
  };

  const handleView = (dealer: Dealer) => {
    setSelectedDealer(dealer);
    setIsViewModalOpen(true);
  };

  const handleEdit = (id: string) => {
    const dealer = dealers.find(d => d.id === id);
    if (dealer) {
      setSelectedDealer(dealer);
      setIsEditModalOpen(true);
    }
  };

  const handleDelete = async (id: string) => {
    const dealer = dealers.find(d => d.id === id) || null;
    setDealerToDelete(id);
    setSelectedDealer(dealer);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!dealerToDelete) return;

    try {
      await dealersApi.delete(dealerToDelete);
      await fetchDealers(); // Refresh the list
      setDeleteConfirmOpen(false);
      setDealerToDelete(null);
      setSelectedDealer(null);
    } catch (err) {
      console.error('Error deleting dealer:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete dealer');
    }
  };

  const handleModalClose = () => {
    setSelectedDealer(null);
    setIsViewModalOpen(false);
  };

  const canEditOrDelete = user?.role === 'ADMIN' || user?.role === 'Admin' || user?.role === 'SUPER_ADMIN' || user?.role === 'SuperAdmin';
  const canCreate = user?.role === 'ADMIN' || user?.role === 'Admin' || user?.role === 'SUPER_ADMIN' || user?.role === 'SuperAdmin';

  const headerActions = (
    <>
      {canCreate && (
        <button
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          onClick={() => {
            setDefaultType('dealer');
            setIsModalOpen(true);
          }}
        >
          <Icons.Plus className="w-4 h-4 mr-2" />
          New Dealer
        </button>
      )}
    </>
  );

  // Get statistics
  const getStats = () => {
    const dataToUse = Object.values(filters).some(f => f) ? filteredDealers : dealers;
    const activeCount = dataToUse.filter(dealer => dealer.status === 'Active').length;
    const inactiveCount = dataToUse.filter(dealer => dealer.status === 'Inactive').length;
    
    // Group by territory
    const territories = [...new Set(dataToUse.map(dealer => dealer.territory))];
    
    return {
      total: dataToUse.length,
      active: activeCount,
      inactive: inactiveCount,
      territories: territories.length
    };
  };

  const stats = getStats();

  if (loading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="w-full lg:w-72 bg-white p-6 border border-gray-200 rounded-xl shadow-sm h-fit">
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="space-y-2">
                <div className="h-3 bg-gray-200 rounded"></div>
                <div className="h-3 bg-gray-200 rounded w-5/6"></div>
              </div>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <PageHeader
              title="Dealers"
              subtitle="List of dealers and their associated subsidiaries"
              breadcrumbs={[{ name: 'Home', path: '/' }, { name: 'Dealers' }]}
              actions={headerActions}
            />
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 lg:p-8">
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="w-full lg:w-72 bg-white p-6 border border-gray-200 rounded-xl shadow-sm h-fit">
            <p className="font-medium text-gray-700 mb-4">Filter Dealers by</p>
            <div className="text-sm text-gray-400">Filters unavailable</div>
          </div>
          <div className="flex-1 min-w-0">
            <PageHeader
              title="Dealers"
              subtitle="List of dealers and their associated subsidiaries"
              breadcrumbs={[{ name: 'Home', path: '/' }, { name: 'Dealers' }]}
              actions={headerActions}
            />
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <Icons.AlertCircle className="h-12 w-12 text-red-500 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Dealers</h3>
              <p className="text-gray-600 mb-4">{error}</p>
              <button
                onClick={fetchDealers}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 overflow-x-auto">
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Filter Sidebar */}
        <div className="w-full lg:w-72 bg-white p-6 border border-gray-200 rounded-xl shadow-sm h-fit">
          <p className="font-medium text-gray-700 mb-4">Filter Dealers by</p>
          <div className="text-sm text-gray-600 space-y-5">
            <div>
              <label className="flex items-center">
                <input type="checkbox" className="mr-2 h-4 w-4" checked={filters.territory} onChange={() => handleCheckboxChange('territory')} />
                Territory
              </label>
              {filters.territory && (
                <div className="mt-3 pl-4">
                  <input
                    type="text"
                    placeholder="Territory name"
                    className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500"
                    value={filterValues.territory}
                    onChange={(e) => handleFilterValueChange('territory', e.target.value)}
                  />
                </div>
              )}
            </div>
            <div>
              <label className="flex items-center">
                <input type="checkbox" className="mr-2 h-4 w-4" checked={filters.status} onChange={() => handleCheckboxChange('status')} />
                Status
              </label>
              {filters.status && (
                <div className="mt-3 pl-4">
                  <select 
                    className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500"
                    value={filterValues.status}
                    onChange={(e) => handleFilterValueChange('status', e.target.value)}
                  >
                    <option value="">-Select Status-</option>
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              )}
            </div>
            <div>
              <label className="flex items-center">
                <input type="checkbox" className="mr-2 h-4 w-4" checked={filters.company} onChange={() => handleCheckboxChange('company')} />
                Company
              </label>
              {filters.company && (
                <div className="mt-3 pl-4">
                  <input
                    type="text"
                    placeholder="Company name"
                    className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500"
                    value={filterValues.company}
                    onChange={(e) => handleFilterValueChange('company', e.target.value)}
                  />
                </div>
              )}
            </div>
            <div>
              <label className="flex items-center">
                <input type="checkbox" className="mr-2 h-4 w-4" checked={filters.location} onChange={() => handleCheckboxChange('location')} />
                Location
              </label>
              {filters.location && (
                <div className="mt-3 pl-4">
                  <input
                    type="text"
                    placeholder="Location"
                    className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500"
                    value={filterValues.location}
                    onChange={(e) => handleFilterValueChange('location', e.target.value)}
                  />
                </div>
              )}
            </div>

            <button 
              className="w-full mt-6 py-2 px-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              onClick={handleApplyFilters}
            >
              Apply Filter
            </button>
            <button 
              className="w-full mt-3 py-2 px-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
              onClick={handleClearFilters}
            >
              Clear
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          <PageHeader
            title="Dealers"
            subtitle="List of dealers and their associated subsidiaries"
            breadcrumbs={[{ name: 'Home', path: '/' }, { name: 'Dealers' }]}
            actions={headerActions}
          />

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex">
                <Icons.AlertCircle className="w-5 h-5 text-red-600 mr-2" />
                <p className="text-red-700">{error}</p>
              </div>
            </div>
          )}

          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white shadow-sm rounded-xl p-5 border border-gray-200">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                  <Icons.Users className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Dealers</p>
                  <p className="text-xl font-semibold text-gray-900">{stats.total}</p>
                </div>
              </div>
            </div>
            <div className="bg-white shadow-sm rounded-xl p-5 border border-gray-200">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                  <Icons.CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Active</p>
                  <p className="text-xl font-semibold text-gray-900">{stats.active}</p>
                </div>
              </div>
            </div>
            <div className="bg-white shadow-sm rounded-xl p-5 border border-gray-200">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center mr-3">
                  <Icons.XCircle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Inactive</p>
                  <p className="text-xl font-semibold text-gray-900">{stats.inactive}</p>
                </div>
              </div>
            </div>
            <div className="bg-white shadow-sm rounded-xl p-5 border border-gray-200">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                  <Icons.MapPin className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Territories</p>
                  <p className="text-xl font-semibold text-gray-900">{stats.territories}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Dealers Grid */}
          {(filteredDealers.length === 0 && (Object.values(filters).some(f => f))) ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <Icons.Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No dealers match your filters</h3>
              <p className="text-gray-500 mb-6">Try adjusting your filter criteria.</p>
              <button
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                onClick={handleClearFilters}
              >
                Clear Filters
              </button>
            </div>
          ) : dealers.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <Icons.UserCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Dealers Found</h3>
              <p className="text-gray-600 mb-4">Get started by adding your first dealer.</p>
              {canCreate && (
                <button
                  onClick={() => {
                    setDefaultType('dealer');
                    setIsModalOpen(true);
                  }}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors mx-auto"
                >
                  <Icons.Plus className="w-4 h-4 mr-2" />
                  Add Dealer
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {(Object.values(filters).some(f => f) ? filteredDealers : dealers).map((dealer) => (
                <div
                  key={dealer.id}
                  className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 relative"
                >
                  <div className="flex items-center mb-4">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                      <Icons.UserCircle className="w-6 h-6 text-green-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-lg font-semibold text-gray-900">{dealer.name}</p>
                      <p className="text-sm text-gray-500">{dealer.phone}</p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-700 mb-1">
                    <strong>Email:</strong> {dealer.email}
                  </p>
                  <p className="text-sm text-gray-700 mb-1">
                    <strong>Company:</strong> {dealer.company}
                  </p>
                  <p className="text-sm text-gray-700 mb-1">
                    <strong>Location:</strong> {dealer.location}
                  </p>
                  <p className="text-sm text-gray-700 mb-1">
                    <strong>Territory:</strong> {dealer.territory}
                  </p>
                  <p className="text-sm text-gray-700 mb-4">
                    <strong>Status:</strong> 
                    <span className={`ml-1 px-2 py-1 rounded-full text-xs ${
                      dealer.status === 'Active' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {dealer.status}
                    </span>
                  </p>

                  {/* Action Buttons */}
                  <div className="flex justify-end space-x-2 pt-4 border-t border-gray-100">
                    <button
                      onClick={() => handleView(dealer)}
                      className="flex items-center px-3 py-1.5 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                      title="View Details"
                    >
                      <Icons.Eye className="w-4 h-4 mr-1" />
                      View
                    </button>
                    {canEditOrDelete && (
                      <>
                        <button
                          onClick={() => handleEdit(dealer.id)}
                          className="flex items-center px-3 py-1.5 text-sm text-green-600 hover:text-green-800 hover:bg-green-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Icons.Edit2 className="w-4 h-4 mr-1" />
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(dealer.id)}
                          className="flex items-center px-3 py-1.5 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Icons.Trash2 className="w-4 h-4 mr-1" />
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* Add New Modal */}
      <AddNewModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        defaultType={defaultType}
        onSuccess={() => {
          fetchDealers();
        }}
      />

      {/* View Dealer Modal */}
      <ViewDealerModal
        isOpen={isViewModalOpen}
        onClose={handleModalClose}
        dealer={selectedDealer}
      />

      {/* Edit Dealer Modal */}
      <EditDealerModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        dealer={selectedDealer}
        onSuccess={() => {
          fetchDealers();
          setIsEditModalOpen(false);
        }}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog 
        open={deleteConfirmOpen} 
        onClose={() => setDeleteConfirmOpen(false)}
        className="relative z-50"
      >
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="mx-auto max-w-sm rounded-lg bg-white p-6 shadow-xl">
            <Dialog.Title className="text-lg font-medium text-gray-900 mb-4">
              Delete Dealer
            </Dialog.Title>

            <p className="text-sm text-gray-500 mb-6">
              Are you sure you want to delete {selectedDealer?.name}? This action cannot be undone.
            </p>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => {
                  setDeleteConfirmOpen(false);
                  setDealerToDelete(null);
                  setSelectedDealer(null);
                }}
                className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="px-3 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>
    </div>
  );
};

export default Dealers;
