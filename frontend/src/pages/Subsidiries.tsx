import React, { useState, useEffect } from 'react';
import * as Icons from 'lucide-react';
import { Dialog } from '@headlessui/react';
import PageHeader from '../components/Common/PageHeader';
import { subsidiariesApi, Subsidiary } from '../api/services';
import AddNewModal from '../components/Common/AddNewModal';
import ViewSubsidiaryModal from '../components/ViewSubsidiaryModal';
import EditSubsidiaryModal from '../components/EditSubsidiaryModal';
import { useAuthStore } from '../store/useAuthStore';

const Subsidiaries: React.FC = () => {
  const [subsidiaries, setSubsidiaries] = useState<Subsidiary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [defaultType, setDefaultType] = useState<string | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedSubsidiary, setSelectedSubsidiary] = useState<Subsidiary | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [subsidiaryToDelete, setSubsidiaryToDelete] = useState<string | null>(null);

  // Filter state
  const [filters, setFilters] = useState({
    address: false,
    employees: false,
    contact: false,
    name: false
  });

  // Filter values
  const [filterValues, setFilterValues] = useState({
    address: '',
    minEmployees: '',
    maxEmployees: '',
    contact: '',
    name: ''
  });

  // Filtered subsidiaries
  const [filteredSubsidiaries, setFilteredSubsidiaries] = useState<Subsidiary[]>([]);
  
  const { user } = useAuthStore();

  useEffect(() => {
    fetchSubsidiaries();
  }, []);

  // Apply filters whenever subsidiaries or filter values change
  useEffect(() => {
    let filtered = [...subsidiaries];

    // Apply address filter
    if (filters.address && filterValues.address.trim()) {
      filtered = filtered.filter(sub => 
        sub.address.toLowerCase().includes(filterValues.address.toLowerCase())
      );
    }

    // Apply name filter
    if (filters.name && filterValues.name.trim()) {
      filtered = filtered.filter(sub => 
        sub.name.toLowerCase().includes(filterValues.name.toLowerCase())
      );
    }

    // Apply contact filter
    if (filters.contact && filterValues.contact.trim()) {
      filtered = filtered.filter(sub => 
        sub.contact.toLowerCase().includes(filterValues.contact.toLowerCase())
      );
    }

    // Apply employee count filter
    if (filters.employees && (filterValues.minEmployees || filterValues.maxEmployees)) {
      filtered = filtered.filter(sub => {
        const employeeCount = sub.totalEmployees || 0;
        const min = filterValues.minEmployees ? parseInt(filterValues.minEmployees) : 0;
        const max = filterValues.maxEmployees ? parseInt(filterValues.maxEmployees) : Infinity;
        return employeeCount >= min && employeeCount <= max;
      });
    }

    setFilteredSubsidiaries(filtered);
  }, [subsidiaries, filters, filterValues]);

  const fetchSubsidiaries = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await subsidiariesApi.getAll();
      setSubsidiaries(data);
    } catch (err) {
      setError('Failed to load subsidiaries. Please try again.');
      console.error('Error fetching subsidiaries:', err);
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
      address: false,
      employees: false,
      contact: false,
      name: false
    });
    setFilterValues({
      address: '',
      minEmployees: '',
      maxEmployees: '',
      contact: '',
      name: ''
    });
  };

  const handleView = (subsidiary: Subsidiary) => {
    setSelectedSubsidiary(subsidiary);
    setIsViewModalOpen(true);
  };

  const handleEdit = (id: string) => {
    const subsidiary = subsidiaries.find(s => s.id === id);
    if (subsidiary) {
      setSelectedSubsidiary(subsidiary);
      setIsEditModalOpen(true);
    }
  };

  const handleDelete = async (id: string) => {
    const subsidiary = subsidiaries.find(s => s.id === id);
    setSubsidiaryToDelete(id);
    setSelectedSubsidiary(subsidiary);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!subsidiaryToDelete) return;

    try {
      await subsidiariesApi.delete(subsidiaryToDelete);
      await fetchSubsidiaries(); // Refresh the list
      setDeleteConfirmOpen(false);
      setSubsidiaryToDelete(null);
      setSelectedSubsidiary(null);
    } catch (err) {
      console.error('Error deleting subsidiary:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete subsidiary');
    }
  };

  const handleModalClose = () => {
    setSelectedSubsidiary(null);
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
            setDefaultType('subsidiary');
            setIsModalOpen(true);
          }}
        >
          <Icons.Plus className="w-4 h-4 mr-2" />
          New Subsidiary
        </button>
      )}
    </>
  );

  // Get statistics
  const getStats = () => {
    const dataToUse = Object.values(filters).some(f => f) ? filteredSubsidiaries : subsidiaries;
    const totalEmployees = dataToUse.reduce((sum, sub) => sum + (sub.totalEmployees || 0), 0);
    const avgEmployees = dataToUse.length > 0 ? Math.round(totalEmployees / dataToUse.length) : 0;
    
    return {
      total: dataToUse.length,
      totalEmployees,
      avgEmployees,
      active: dataToUse.length // All subsidiaries are considered active
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
          title="Subsidiaries"
          subtitle="List of company subsidiaries"
          breadcrumbs={[{ name: 'Home', path: '/' }, { name: 'Subsidiaries' }]}
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
            <p className="font-medium text-gray-700 mb-4">Filter Subsidiaries by</p>
            <div className="text-sm text-gray-400">Filters unavailable</div>
          </div>
          <div className="flex-1 min-w-0">
        <PageHeader
          title="Subsidiaries"
          subtitle="List of company subsidiaries"
          breadcrumbs={[{ name: 'Home', path: '/' }, { name: 'Subsidiaries' }]}
          actions={headerActions}
        />
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <Icons.AlertCircle className="h-12 w-12 text-red-500 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Subsidiaries</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={fetchSubsidiaries}
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
          <p className="font-medium text-gray-700 mb-4">Filter Subsidiaries by</p>
          <div className="text-sm text-gray-600 space-y-5">
            <div>
              <label className="flex items-center">
                <input type="checkbox" className="mr-2 h-4 w-4" checked={filters.name} onChange={() => handleCheckboxChange('name')} />
                Name
              </label>
              {filters.name && (
                <div className="mt-3 pl-4">
                  <input
                    type="text"
                    placeholder="Subsidiary name"
                    className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500"
                    value={filterValues.name}
                    onChange={(e) => handleFilterValueChange('name', e.target.value)}
                  />
                </div>
              )}
            </div>
            <div>
              <label className="flex items-center">
                <input type="checkbox" className="mr-2 h-4 w-4" checked={filters.address} onChange={() => handleCheckboxChange('address')} />
                Address
              </label>
              {filters.address && (
                <div className="mt-3 pl-4">
                  <input
                    type="text"
                    placeholder="Address or location"
                    className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500"
                    value={filterValues.address}
                    onChange={(e) => handleFilterValueChange('address', e.target.value)}
                  />
                </div>
              )}
            </div>
            <div>
              <label className="flex items-center">
                <input type="checkbox" className="mr-2 h-4 w-4" checked={filters.contact} onChange={() => handleCheckboxChange('contact')} />
                Contact
              </label>
              {filters.contact && (
                <div className="mt-3 pl-4">
                  <input
                    type="text"
                    placeholder="Contact info"
                    className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500"
                    value={filterValues.contact}
                    onChange={(e) => handleFilterValueChange('contact', e.target.value)}
                  />
                </div>
              )}
            </div>
            <div>
              <label className="flex items-center">
                <input type="checkbox" className="mr-2 h-4 w-4" checked={filters.employees} onChange={() => handleCheckboxChange('employees')} />
                Employee Count
              </label>
              {filters.employees && (
                <div className="mt-3 pl-4 space-y-2">
                  <input
                    type="number"
                    placeholder="Min employees"
                    className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500"
                    value={filterValues.minEmployees}
                    onChange={(e) => handleFilterValueChange('minEmployees', e.target.value)}
                  />
                  <input
                    type="number"
                    placeholder="Max employees"
                    className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500"
                    value={filterValues.maxEmployees}
                    onChange={(e) => handleFilterValueChange('maxEmployees', e.target.value)}
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
        title="Subsidiaries"
        subtitle="List of company subsidiaries"
        breadcrumbs={[{ name: 'Home', path: '/' }, { name: 'Subsidiaries' }]}
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
                  <Icons.Building2 className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Subsidiaries</p>
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
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                  <Icons.Users className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Employees</p>
                  <p className="text-xl font-semibold text-gray-900">{stats.totalEmployees.toLocaleString()}</p>
                </div>
              </div>
            </div>
            <div className="bg-white shadow-sm rounded-xl p-5 border border-gray-200">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center mr-3">
                  <Icons.TrendingUp className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Avg Employees</p>
                  <p className="text-xl font-semibold text-gray-900">{stats.avgEmployees}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Subsidiaries Grid */}
          {(filteredSubsidiaries.length === 0 && (Object.values(filters).some(f => f))) ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <Icons.Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No subsidiaries match your filters</h3>
              <p className="text-gray-500 mb-6">Try adjusting your filter criteria.</p>
              <button
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                onClick={handleClearFilters}
              >
                Clear Filters
              </button>
            </div>
          ) : subsidiaries.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <Icons.Building2 className="w-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Subsidiaries Found</h3>
          <p className="text-gray-600 mb-4">Get started by creating your first subsidiary.</p>
          {canCreate && (
            <button
              onClick={() => {
                setDefaultType('subsidiary');
                setIsModalOpen(true);
              }}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors mx-auto"
            >
                  <Icons.Plus className="w-4 h-4 mr-2" />
              Add Subsidiary
            </button>
          )}
        </div>
      ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {(Object.values(filters).some(f => f) ? filteredSubsidiaries : subsidiaries).map(sub => (
            <div
              key={sub.id}
              className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 relative"
            >
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <Icons.Building2 className="w-6 h-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-lg font-semibold text-gray-900">{sub.name}</p>
                  <p className="text-sm text-gray-500">{sub.email}</p>
                </div>
              </div>
              <p className="text-sm text-gray-700 mb-1">
                <strong>Address:</strong> {sub.address}
              </p>
              <p className="text-sm text-gray-700 mb-1">
                <strong>Contact:</strong> {sub.contact}
              </p>
                  <p className="text-sm text-gray-700 mb-4">
                <strong>Total Employees:</strong> {sub.totalEmployees}
              </p>

                  {/* Action Buttons */}
                  <div className="flex justify-end space-x-2 pt-4 border-t border-gray-100">
                    <button
                      onClick={() => handleView(sub)}
                      className="flex items-center px-3 py-1.5 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                      title="View Details"
                    >
                      <Icons.Eye className="w-4 h-4 mr-1" />
                      View
                    </button>
                    {canEditOrDelete && (
                      <>
                        <button
                          onClick={() => handleEdit(sub.id)}
                          className="flex items-center px-3 py-1.5 text-sm text-green-600 hover:text-green-800 hover:bg-green-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Icons.Edit2 className="w-4 h-4 mr-1" />
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(sub.id)}
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
          fetchSubsidiaries();
        }}
      />

      {/* View Subsidiary Modal */}
      <ViewSubsidiaryModal
        isOpen={isViewModalOpen}
        onClose={handleModalClose}
        subsidiary={selectedSubsidiary}
      />

      {/* Edit Subsidiary Modal */}
      <EditSubsidiaryModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        subsidiary={selectedSubsidiary}
        onSuccess={() => {
          fetchSubsidiaries();
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
              Delete Subsidiary
            </Dialog.Title>

            <p className="text-sm text-gray-500 mb-6">
              Are you sure you want to delete {selectedSubsidiary?.name}? This action cannot be undone.
            </p>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => {
                  setDeleteConfirmOpen(false);
                  setSubsidiaryToDelete(null);
                  setSelectedSubsidiary(null);
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

export default Subsidiaries;
