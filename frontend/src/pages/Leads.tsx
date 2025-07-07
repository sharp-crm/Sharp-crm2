import React, { useState, useEffect } from 'react';
import * as Icons from 'lucide-react';
import PageHeader from '../components/Common/PageHeader';
import DataTable from '../components/Common/DataTable';
import StatusBadge from '../components/Common/StatusBadge';
import { leadsApi, Lead } from '../api/services';
import AddNewModal from '../components/Common/AddNewModal';
import ViewLeadModal from '../components/ViewLeadModal';
import EditLeadModal from '../components/EditLeadModal';
import { Dialog } from '@headlessui/react';

const Leads: React.FC = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [defaultType, setDefaultType] = useState<string | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [leadToDelete, setLeadToDelete] = useState<string | null>(null);

  const [filters, setFilters] = useState({
    campaigns: false,
    city: false,
    company: false,
    leadSource: false
  });

  // Filter values
  const [filterValues, setFilterValues] = useState({
    status: '',
    date: '',
    company: '',
    leadSource: ''
  });

  // Filtered leads
  const [filteredLeads, setFilteredLeads] = useState<Lead[]>([]);

  // Fetch leads data on component mount
  useEffect(() => {
    const fetchLeads = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await leadsApi.getAll();
        setLeads(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch leads');
        console.error('Error fetching leads:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchLeads();
  }, []);

  // Apply filters whenever leads or filter values change
  useEffect(() => {
    let filtered = [...leads];

    // Apply status filter
    if (filters.campaigns && filterValues.status) {
      filtered = filtered.filter(lead => lead.leadStatus === filterValues.status);
    }

    // Apply company filter
    if (filters.company && filterValues.company.trim()) {
      filtered = filtered.filter(lead => 
        lead.company.toLowerCase().includes(filterValues.company.toLowerCase())
      );
    }

    // Apply date filter
    if (filters.city && filterValues.date) {
      const filterDate = new Date(filterValues.date);
      filtered = filtered.filter(lead => {
        const leadDate = new Date(lead.createdAt);
        return leadDate.toDateString() === filterDate.toDateString();
      });
    }

    // Apply lead source filter
    if (filters.leadSource && filterValues.leadSource) {
      filtered = filtered.filter(lead => lead.leadSource === filterValues.leadSource);
    }

    setFilteredLeads(filtered);
  }, [leads, filters, filterValues]);

  const handleCheckboxChange = (key: keyof typeof filters) => {
    setFilters(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleFilterValueChange = (key: keyof typeof filterValues, value: string) => {
    setFilterValues(prev => ({ ...prev, [key]: value }));
  };

  const handleApplyFilters = () => {
    // Filters are applied automatically via useEffect
    // This could be used for additional logic if needed
  };

  const handleClearFilters = () => {
    setFilters({
      campaigns: false,
      city: false,
      company: false,
      leadSource: false
    });
    setFilterValues({
      status: '',
      date: '',
      company: '',
      leadSource: ''
    });
  };

  const handleDelete = async (id: string) => {
    setLeadToDelete(id);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!leadToDelete) return;
    
    try {
      await leadsApi.delete(leadToDelete);
      setLeads(prev => prev.filter(lead => lead.id !== leadToDelete));
      setDeleteConfirmOpen(false);
      setLeadToDelete(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete lead');
    }
  };

  const handleView = (lead: Lead) => {
    setSelectedLead(lead);
    setIsViewModalOpen(true);
  };

  const handleEdit = (lead: Lead) => {
    setSelectedLead(lead);
    setIsEditModalOpen(true);
  };

  const handleModalClose = () => {
    setSelectedLead(null);
    setIsViewModalOpen(false);
    setIsEditModalOpen(false);
  };

  const handleEditSuccess = async () => {
    try {
      const data = await leadsApi.getAll();
      setLeads(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh leads');
    }
  };

  const columns = [
    {
      key: 'name',
      label: 'Name',
      sortable: true,
      render: (value: string, row: any) => {
        const firstName = row.firstName || '';
        const lastName = row.lastName || '';
        const fullName = `${firstName} ${lastName}`.trim() || 'Unknown';
        const initials = `${firstName[0] || ''}${lastName[0] || ''}`.trim() || '??';
        return (
          <div className="flex items-center">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
              <span className="text-sm font-medium text-blue-700">
                {initials}
              </span>
            </div>
            <div>
              <div className="font-medium text-gray-900">{fullName}</div>
              <div className="text-sm text-gray-500">{row.email || 'No email'}</div>
            </div>
          </div>
        );
      }
    },
    { key: 'company', label: 'Company', sortable: true },
    { key: 'phone', label: 'Phone', sortable: false, render: (value: string) => value || 'N/A' },
    {
      key: 'leadStatus',
      label: 'Status',
      sortable: true,
      render: (value: string) => <StatusBadge status={value} />
    },
    { key: 'leadSource', label: 'Source', sortable: true },
    {
      key: 'value',
      label: 'Value',
      sortable: true,
      render: (value: number) => (
        <span className="font-medium text-gray-900">${(value || 0).toLocaleString()}</span>
      )
    },
    {
      key: 'createdAt',
      label: 'Created',
      sortable: true,
      render: (value: string) => new Date(value).toLocaleDateString()
    }
  ];

  const actions = (row: any) => (
    <div className="flex items-center space-x-2">
      <button 
        className="p-1 text-gray-400 hover:text-blue-600"
        onClick={() => handleView(row)}
        title="View Lead"
      >
        <Icons.Eye className="w-4 h-4" />
      </button>
      <button 
        className="p-1 text-gray-400 hover:text-green-600"
        onClick={() => handleEdit(row)}
        title="Edit Lead"
      >
        <Icons.Edit2 className="w-4 h-4" />
      </button>
      <button 
        className="p-1 text-gray-400 hover:text-red-600"
        onClick={() => handleDelete(row.id)}
        title="Delete Lead"
      >
        <Icons.Trash2 className="w-4 h-4" />
      </button>
    </div>
  );

  const headerActions = (
    <>
      
      <button
        className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        onClick={() => {
          setDefaultType('lead');
          setIsModalOpen(true);
        }}
      >
        <Icons.Plus className="w-4 h-4 mr-2" />
        New Lead
      </button>
    </>
  );

  const getStatusCounts = () => {
    const displayedLeads = filteredLeads.length > 0 || Object.values(filters).some(f => f) ? filteredLeads : leads;
    const counts = {
      total: displayedLeads.length,
      new: displayedLeads.filter(lead => lead.leadStatus === 'New' || lead.leadStatus === 'Not Contacted').length,
      qualified: displayedLeads.filter(lead => lead.leadStatus === 'Qualified' || lead.leadStatus === 'Prequalified').length,
      contacted: displayedLeads.filter(lead => lead.leadStatus === 'Contacted' || lead.leadStatus === 'Attempted to Contact').length
    };
    return counts;
  };

  const statusCounts = getStatusCounts();
  const displayedLeads = filteredLeads.length > 0 || Object.values(filters).some(f => f) ? filteredLeads : leads;
  const totalValue = displayedLeads.reduce((sum, lead) => sum + lead.value, 0);

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
    <div className="p-6 lg:p-8 overflow-x-auto">
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Filter Sidebar */}
        <div className="w-full lg:w-72 bg-white p-6 border border-gray-200 rounded-xl shadow-sm h-fit">
          <p className="font-medium text-gray-700 mb-4">Filter Leads by</p>
          <div className="text-sm text-gray-600 space-y-5">
            <div>
              <label className="flex items-center">
                <input type="checkbox" className="mr-2 h-4 w-4" checked={filters.campaigns} onChange={() => handleCheckboxChange('campaigns')} />
                Status
              </label>
              {filters.campaigns && (
                <div className="mt-3 space-y-2 pl-4">
                  <select 
                    className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500"
                    value={filterValues.status}
                    onChange={(e) => handleFilterValueChange('status', e.target.value)}
                  >
                    <option value="">-Select Status Type-</option>
                    <option value="New">New</option>
                    <option value="Follow Up">Follow Up</option>
                    <option value="Qualified">Qualified</option>
                    <option value="Contacted">Contacted</option>
                    <option value="Converted">Converted</option>
                  </select>
                </div>
              )}
            </div>
            <div>
              <label className="flex items-center">
                <input type="checkbox" className="mr-2 h-4 w-4" checked={filters.city} onChange={() => handleCheckboxChange('city')} />
                Date
              </label>
              {filters.city && (
                <div className="mt-3 pl-4 space-y-2">
                  <input 
                    type="date" 
                    className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500"
                    value={filterValues.date}
                    onChange={(e) => handleFilterValueChange('date', e.target.value)}
                  />
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
                <input type="checkbox" className="mr-2 h-4 w-4" checked={filters.leadSource} onChange={() => handleCheckboxChange('leadSource')} />
                Lead Source
              </label>
              {filters.leadSource && (
                <div className="mt-3 pl-4">
                  <select 
                    className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500"
                    value={filterValues.leadSource}
                    onChange={(e) => handleFilterValueChange('leadSource', e.target.value)}
                  >
                    <option value="">-Select Lead Source-</option>
                    <option value="Email">Email</option>
                    <option value="Website">Website</option>
                    <option value="Cold Call">Cold Call</option>
                    <option value="Social Media">Social Media</option>
                    <option value="LinkedIn">LinkedIn</option>
                    <option value="Referral">Referral</option>
                    <option value="Trade Show">Trade Show</option>
                    <option value="Other">Other</option>
                  </select>
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
            title="Leads"
            subtitle="Manage your potential customers"
            breadcrumbs={[{ name: 'Home', path: '/' }, { name: 'Leads' }]}
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
                  <p className="text-sm text-gray-500">Total Leads</p>
                  <p className="text-xl font-semibold text-gray-900">{statusCounts.total}</p>
                </div>
              </div>
            </div>
            <div className="bg-white shadow-sm rounded-xl p-5 border border-gray-200">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                  <Icons.UserCheck className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Qualified</p>
                  <p className="text-xl font-semibold text-gray-900">{statusCounts.qualified}</p>
                </div>
              </div>
            </div>
            <div className="bg-white shadow-sm rounded-xl p-5 border border-gray-200">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center mr-3">
                  <Icons.UserPlus className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">New Leads</p>
                  <p className="text-xl font-semibold text-gray-900">{statusCounts.new}</p>
                </div>
              </div>
            </div>
            <div className="bg-white shadow-sm rounded-xl p-5 border border-gray-200">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                  <Icons.DollarSign className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Value</p>
                  <p className="text-xl font-semibold text-gray-900">${totalValue.toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Data Table */}
          {(filteredLeads.length === 0 && (Object.values(filters).some(f => f))) ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <Icons.Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No leads match your filters</h3>
              <p className="text-gray-500 mb-6">Try adjusting your filter criteria.</p>
              <button
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                onClick={handleClearFilters}
              >
                Clear Filters
              </button>
            </div>
          ) : leads.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <Icons.Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No leads found</h3>
              <p className="text-gray-500 mb-6">Get started by creating your first lead.</p>
              <button
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors mx-auto"
                onClick={() => {
                  setDefaultType('lead');
                  setIsModalOpen(true);
                }}
              >
                <Icons.Plus className="w-4 h-4 mr-2" />
                New Lead
              </button>
            </div>
          ) : (
            <DataTable
              data={Object.values(filters).some(f => f) ? filteredLeads : leads}
              columns={columns}
              actions={actions}
            />
          )}
        </div>
      </div>

      {/* Add New Modal */}
      <AddNewModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        defaultType={defaultType}
        onSuccess={() => {
          // Refresh leads data after successful creation
          leadsApi.getAll().then(setLeads).catch(console.error);
        }}
      />

      {/* View Lead Modal */}
      <ViewLeadModal
        isOpen={isViewModalOpen}
        onClose={handleModalClose}
        lead={selectedLead}
      />

      {/* Edit Lead Modal */}
      <EditLeadModal
        isOpen={isEditModalOpen}
        onClose={handleModalClose}
        lead={selectedLead}
        onSuccess={handleEditSuccess}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)} className="relative z-50">
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="mx-auto max-w-sm rounded-lg bg-white p-6 shadow-lg">
            <Dialog.Title className="text-lg font-medium text-gray-900 mb-2">
              Delete Lead
            </Dialog.Title>
            
            <p className="text-sm text-gray-500 mb-6">
              Are you sure you want to delete this lead? This action cannot be undone.
            </p>
            
            <div className="flex justify-end space-x-4">
              <button
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md"
                onClick={() => {
                  setDeleteConfirmOpen(false);
                  setLeadToDelete(null);
                }}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md"
                onClick={confirmDelete}
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

export default Leads;