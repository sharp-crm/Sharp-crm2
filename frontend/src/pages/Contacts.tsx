import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import * as Icons from 'lucide-react';
import { Dialog } from '@headlessui/react';
import PageHeader from '../components/Common/PageHeader';
import DataTable from '../components/Common/DataTable';
import StatusBadge from '../components/Common/StatusBadge';
import { contactsApi, Contact } from '../api/services';
import AddNewModal from '../components/Common/AddNewModal';

import ViewContactModal from '../components/ViewContactModal';
import EditContactModal from '../components/EditContactModal';

const Contacts: React.FC = () => {
  const navigate = useNavigate();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [defaultType, setDefaultType] = useState<string | undefined>(undefined);
  
  // View and Edit modal states
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [contactToDelete, setContactToDelete] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const [filters, setFilters] = useState({
    status: false,
    company: false,
    createdDate: false
  });

  // Filter values
  const [filterValues, setFilterValues] = useState({
    status: '',
    company: '',
    createdDate: ''
  });

  // Sorting state
  const [sortBy, setSortBy] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  
  // Phone search state
  const [phoneSearch, setPhoneSearch] = useState<string>('');
  const [showPhoneSearch, setShowPhoneSearch] = useState(false);
  
  // Company suggestions state
  const [companySuggestions, setCompanySuggestions] = useState<string[]>([]);
  const [showCompanySuggestions, setShowCompanySuggestions] = useState(false);

  // Filtered contacts
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);

  // Fetch contacts data on component mount
  useEffect(() => {
    const fetchContacts = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await contactsApi.getAll();
        setContacts(data);
        
        // Note: Removed conversion detection since contacts can have multiple leads
        // with the same contact information
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch contacts');
        console.error('Error fetching contacts:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchContacts();
  }, []);

  // Apply filters and sorting whenever contacts, filter values, or sort settings change
  useEffect(() => {
    let filtered = [...contacts];

    // Apply status filter
    if (filters.status && filterValues.status && filterValues.status !== 'All') {
      filtered = filtered.filter(contact => contact.status === filterValues.status);
    }

    // Apply company filter
    if (filters.company && filterValues.company.trim()) {
      filtered = filtered.filter(contact => 
        contact.companyName.toLowerCase().includes(filterValues.company.toLowerCase())
      );
    }

    // Apply created date filter
    if (filters.createdDate && filterValues.createdDate) {
      const filterDate = new Date(filterValues.createdDate);
      filtered = filtered.filter(contact => {
        const contactDate = new Date(contact.createdAt);
        return contactDate.toDateString() === filterDate.toDateString();
      });
    }

    // Apply phone search filter (minimum 2 digits)
    if (phoneSearch && phoneSearch.length >= 2) {
      filtered = filtered.filter(contact => {
        const phone = contact.phone || '';
        // Remove any non-digit characters and search within the phone number
        const cleanPhone = phone.replace(/\D/g, '');
        const searchDigits = phoneSearch.replace(/\D/g, '');
        return cleanPhone.includes(searchDigits);
      });
    }

    // Apply sorting
    if (sortBy) {
      filtered.sort((a, b) => {
        let aValue = a[sortBy as keyof Contact];
        let bValue = b[sortBy as keyof Contact];
        
        // Handle undefined values
        if (aValue === undefined) aValue = '';
        if (bValue === undefined) bValue = '';
        
        // Handle string values
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          aValue = aValue.toLowerCase();
          bValue = bValue.toLowerCase();
        }
        
        if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
    }

    setFilteredContacts(filtered);
  }, [contacts, filters, filterValues, sortBy, sortOrder, phoneSearch]);

  // Clear success message after 5 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const handleCheckboxChange = (key: keyof typeof filters) => {
    setFilters(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleFilterValueChange = (key: keyof typeof filterValues, value: string) => {
    setFilterValues(prev => ({ ...prev, [key]: value }));
    
    // Handle company suggestions
    if (key === 'company') {
      if (value.length >= 2) {
        // Get unique company names from contacts
        const uniqueCompanies = [...new Set(contacts.map(contact => contact.companyName).filter(Boolean))];
        
        // Filter companies that contain the search term (case-insensitive)
        const suggestions = uniqueCompanies.filter(company => 
          company.toLowerCase().includes(value.toLowerCase())
        );
        
        setCompanySuggestions(suggestions);
        setShowCompanySuggestions(suggestions.length > 0);
      } else {
        setCompanySuggestions([]);
        setShowCompanySuggestions(false);
      }
    }
  };

  const handleApplyFilters = () => {
    // Filters are applied automatically via useEffect
    // This could be used for additional logic if needed
  };

  const handleClearFilters = () => {
    setFilters({
      status: false,
      company: false,
      createdDate: false
    });
    setFilterValues({
      status: '',
      company: '',
      createdDate: ''
    });
    setSortBy('');
    setSortOrder('asc');
    setPhoneSearch('');
    setShowPhoneSearch(false);
    setCompanySuggestions([]);
    setShowCompanySuggestions(false);
  };

  const handleDelete = async (id: string) => {
    const contact = contacts.find(c => c.id === id);
    setContactToDelete(id);
    setSelectedContact(contact || null);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!contactToDelete) return;
    
    try {
      await contactsApi.delete(contactToDelete);
      // Refresh the contacts list to ensure accurate data
      const data = await contactsApi.getAll();
      setContacts(data);
      setSuccessMessage(`Contact has been deleted successfully.`);
      setDeleteConfirmOpen(false);
      setContactToDelete(null);
      setSelectedContact(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete contact');
    }
  };

  const handleView = (contact: Contact) => {
    setSelectedContact(contact);
    setIsViewModalOpen(true);
  };

  const handleRowClick = (item: Contact) => {
    navigate(`/contacts/${item.id}`);
  };

  const handleEdit = (contact: Contact) => {
    setSelectedContact(contact);
    setIsEditModalOpen(true);
  };



  const handleEditSuccess = async () => {
    // Refresh contacts list after successful edit
    try {
      const data = await contactsApi.getAll();
      setContacts(data);
      setSuccessMessage(`Contact "${selectedContact?.firstName}" has been updated successfully.`);
    } catch (err) {
      console.error('Error refreshing contacts:', err);
    }
    setIsEditModalOpen(false);
    setSelectedContact(null);
  };

  const columns = [
    {
      key: 'firstName',
      label: 'Name',
      sortable: true,
      render: (value: string, row: any) => {
        const fullName = `${row.firstName || ''} ${row.lastName || ''}`.trim() || 'Unknown';
        const initials = `${(row.firstName || '')[0] || ''}${(row.lastName || '')[0] || ''}`.trim() || '??';
        return (
          <div className="flex items-center">
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
              <span className="text-sm font-medium text-green-700">
                {initials}
              </span>
            </div>
            <div>
              <div className="font-medium text-gray-900">{fullName}</div>
              <div className="text-sm text-gray-500">{row.email}</div>
            </div>
          </div>
        );
      }
    },
    {
      key: 'companyName',
      label: 'Company',
      sortable: true
    },
    {
      key: 'title',
      label: 'Title',
      sortable: true
    },
    {
      key: 'phone',
      label: 'Phone',
      sortable: false
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (value: string) => <StatusBadge status={value} />
    },
    {
      key: 'createdAt',
      label: 'Created',
      sortable: true,
      render: (value: string) => new Date(value).toLocaleDateString()
    }
  ];

  const actions = (row: Contact) => (
    <div className="flex items-center space-x-2">
      <button 
        className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
        onClick={(e) => {
          e.stopPropagation();
          handleView(row);
        }}
        title="View contact"
      >
        <Icons.Eye className="w-4 h-4" />
      </button>
      <button 
        className="p-1 text-gray-400 hover:text-green-600 transition-colors"
        onClick={(e) => {
          e.stopPropagation();
          handleEdit(row);
        }}
        title="Edit contact"
      >
        <Icons.Edit2 className="w-4 h-4" />
      </button>

      <button 
        className="p-1 text-gray-400 hover:text-red-600 transition-colors"
        onClick={(e) => {
          e.stopPropagation();
          handleDelete(row.id);
        }}
        title="Delete contact"
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
      <button className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
        <Icons.Download className="w-4 h-4 mr-2" />
        Export
      </button>
      <button
        className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        onClick={() => {
          setDefaultType('contact');
          setIsModalOpen(true);
        }}
      >
        <Icons.Plus className="w-4 h-4 mr-2" />
        New Contact
      </button>
    </>
  );

  const getStatusCounts = () => {
    const displayedContacts = filteredContacts.length > 0 || Object.values(filters).some(f => f) ? filteredContacts : contacts;
    const counts = {
      total: displayedContacts.length,
      active: displayedContacts.filter(contact => contact.status === 'Active').length,
      companies: new Set(displayedContacts.map(contact => contact.companyName).filter(Boolean)).size
    };
    return counts;
  };

  const statusCounts = getStatusCounts();

  if (loading) {
    return (
      <div className="p-4 sm:p-6">
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
          title="Contacts"
          subtitle="Manage your business contacts"
          breadcrumbs={[{ name: 'Home', path: '/' }, { name: 'Contacts' }]}
          actions={headerActions}
        />

        {/* Filter Section */}
        {showFilters && (
          <div className="w-full max-w-md bg-white p-4 border border-gray-200 rounded-lg shadow-sm">
            <p className="font-medium text-gray-700 mb-3">Filter & Sort Contacts</p>
            <div className="text-sm text-gray-600 space-y-3">
            {/* Status Filter */}
            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  className="mr-2"
                  checked={filters.status}
                  onChange={() => handleCheckboxChange('status')}
                />
                Status
              </label>
              {filters.status && (
                <div className="mt-2 pl-4">
                  <select 
                    className="w-full border border-gray-300 rounded p-1 text-sm focus:ring-2 focus:ring-blue-500"
                    value={filterValues.status}
                    onChange={(e) => handleFilterValueChange('status', e.target.value)}
                  >
                    <option value="">All</option>
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                    <option value="Archived">Archived</option>
                  </select>
                </div>
              )}
            </div>

            {/* Company Filter */}
            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  className="mr-2"
                  checked={filters.company}
                  onChange={() => handleCheckboxChange('company')}
                />
                Company
              </label>
              {filters.company && (
                <div className="mt-2 pl-4 relative">
                  <input
                    type="text"
                    placeholder="Company name (min 3 characters for suggestions)"
                    className="w-full border border-gray-300 rounded p-1 text-sm focus:ring-2 focus:ring-blue-500"
                    value={filterValues.company}
                    onChange={(e) => handleFilterValueChange('company', e.target.value)}
                    onFocus={() => {
                      if (filterValues.company.length >= 3) {
                        setShowCompanySuggestions(companySuggestions.length > 0);
                      }
                    }}
                    onBlur={() => {
                      // Delay hiding suggestions to allow clicking on them
                      setTimeout(() => setShowCompanySuggestions(false), 200);
                    }}
                  />
                  {showCompanySuggestions && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-40 overflow-y-auto">
                      {companySuggestions.map((suggestion, index) => (
                        <div
                          key={index}
                          className="px-3 py-2 text-sm hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
                          onClick={() => {
                            handleFilterValueChange('company', suggestion);
                            setShowCompanySuggestions(false);
                          }}
                        >
                          {suggestion}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Created Date Filter */}
            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  className="mr-2"
                  checked={filters.createdDate}
                  onChange={() => handleCheckboxChange('createdDate')}
                />
                Created Date
              </label>
              {filters.createdDate && (
                <div className="mt-2 pl-4">
                  <input
                    type="date"
                    className="w-full border border-gray-300 rounded p-1 text-sm focus:ring-2 focus:ring-blue-500"
                    value={filterValues.createdDate}
                    onChange={(e) => handleFilterValueChange('createdDate', e.target.value)}
                  />
                </div>
              )}
            </div>

            {/* Search by Phone */}
            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  className="mr-2"
                  checked={showPhoneSearch}
                  onChange={() => setShowPhoneSearch(!showPhoneSearch)}
                />
                Search by Phone
              </label>
              {showPhoneSearch && (
                <div className="mt-2 pl-4">
                  <input
                    type="text"
                    placeholder="Enter phone number (min 2 digits)"
                    className="w-full border border-gray-300 rounded p-1 text-sm focus:ring-2 focus:ring-blue-500"
                    value={phoneSearch}
                    onChange={(e) => setPhoneSearch(e.target.value)}
                  />
                  {phoneSearch.length > 0 && phoneSearch.length < 2 && (
                    <p className="text-xs text-gray-500 mt-1">Enter at least 2 digits to search</p>
                  )}
                </div>
              )}
            </div>

              {/* Action Buttons */}
              <div className="flex gap-2 mt-4">
                <button 
                  className="flex-1 py-1.5 px-3 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors"
                  onClick={handleApplyFilters}
                >
                  Apply
                </button>
                <button 
                  className="flex-1 py-1.5 px-3 bg-gray-200 text-gray-800 rounded text-sm hover:bg-gray-300 transition-colors"
                  onClick={handleClearFilters}
                >
                  Clear
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 min-w-0 w-full">
          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex">
                <Icons.AlertCircle className="w-5 h-5 text-red-600 mr-2" />
                <p className="text-red-700">{error}</p>
              </div>
            </div>
          )}

          {/* Success Message */}
          {successMessage && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <div className="flex">
                <Icons.CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                <p className="text-green-700">{successMessage}</p>
              </div>
            </div>
          )}

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <Icons.Users className="w-6 h-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Contacts</p>
                  <p className="text-2xl font-bold text-gray-900">{statusCounts.total}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Icons.CheckCircle className="w-6 h-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Active</p>
                  <p className="text-2xl font-bold text-gray-900">{statusCounts.active}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Icons.Building2 className="w-6 h-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Companies</p>
                  <p className="text-2xl font-bold text-gray-900">{statusCounts.companies}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Data Table */}
          {(filteredContacts.length === 0 && (Object.values(filters).some(f => f) || phoneSearch.length >= 2)) ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
              <Icons.Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No contacts match your filters</h3>
              <p className="text-gray-500 mb-6">Try adjusting your filter criteria.</p>
              <button
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                onClick={handleClearFilters}
              >
                Clear Filters
              </button>
            </div>
          ) : contacts.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
              <Icons.Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No contacts found</h3>
              <p className="text-gray-500 mb-6">Get started by creating your first contact.</p>
              <button
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors mx-auto"
                onClick={() => {
                  setDefaultType('contact');
                  setIsModalOpen(true);
                }}
              >
                <Icons.Plus className="w-4 h-4 mr-2" />
                New Contact
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 w-full">
              <DataTable
                data={Object.values(filters).some(f => f) || phoneSearch.length >= 2 ? filteredContacts : contacts}
                columns={columns}
                actions={actions}
                onRowClick={handleRowClick}
              />
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
          // Refresh contacts data after successful creation
          contactsApi.getAll().then(setContacts).catch(console.error);
          setSuccessMessage('New contact has been created successfully.');
        }}
      />



      {/* View Contact Modal */}
      <ViewContactModal
        isOpen={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setSelectedContact(null);
        }}
        contact={selectedContact}
      />

      {/* Edit Contact Modal */}
      <EditContactModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedContact(null);
        }}
        contact={selectedContact}
        onSuccess={handleEditSuccess}
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
              Delete Contact
            </Dialog.Title>

            <p className="text-sm text-gray-500 mb-6">
              Are you sure you want to delete {selectedContact?.firstName}? This action cannot be undone.
            </p>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => {
                  setDeleteConfirmOpen(false);
                  setContactToDelete(null);
                  setSelectedContact(null);
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

export default Contacts;
