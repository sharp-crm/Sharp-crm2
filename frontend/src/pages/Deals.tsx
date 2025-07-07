import React, { useState, useEffect } from 'react';
import * as Icons from 'lucide-react';
import { Dialog } from '@headlessui/react';
import PageHeader from '../components/Common/PageHeader';
import DataTable from '../components/Common/DataTable';
import StatusBadge from '../components/Common/StatusBadge';
import ViewToggle from '../components/Common/ViewToggle';
import KanbanView from '../components/Views/KanbanView';
import GridView from '../components/Views/GridView';
import TimelineView from '../components/Views/TimelineView';
import ChartView from '../components/Views/ChartView';
import { dealsApi } from '../api/services';
import { ViewType, Deal } from '../types';
import AddNewModal from '../components/Common/AddNewModal';
import ViewDealModal from '../components/ViewDealModal';
import EditDealModal from '../components/EditDealModal';
import API from '../api/client';

const Deals: React.FC = () => {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [users, setUsers] = useState<{ id: string; userId?: string; firstName: string; lastName: string; }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<ViewType>('list');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [defaultType, setDefaultType] = useState<string | undefined>(undefined);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [dealToDelete, setDealToDelete] = useState<string | null>(null);

  // Fetch users data on component mount
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await API.get('/users/tenant-users');
        const data = response.data;
        const userArray = Array.isArray(data)
          ? data
          : Array.isArray(data?.data)
            ? data.data
            : [];
        setUsers(userArray);
      } catch (err) {
        console.error('Error fetching users:', err);
      }
    };

    fetchUsers();
  }, []);

  const getUserName = (userId: string) => {
    const user = users.find(u => u.id === userId || u.userId === userId);
    return user ? `${user.firstName} ${user.lastName}` : 'Unknown User';
  };

  // Fetch deals data on component mount
  useEffect(() => {
    const fetchDeals = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await dealsApi.getAll();
        setDeals(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch deals');
        console.error('Error fetching deals:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDeals();
  }, []);


  const columns = [
    {
      key: 'dealName',
      label: 'Deal Name',
      sortable: true,
      render: (value: string, row: Deal) => (
        <div className="flex items-center">
          <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center mr-3">
            <Icons.Target className="w-4 h-4 text-orange-600" />
          </div>
          <div className="font-medium text-gray-900">{value || row.name}</div>
        </div>
      )
    },

    {
      key: 'amount',
      label: 'Amount',
      sortable: true,
      render: (value: number, row: Deal) => (
        <span className="font-medium text-gray-900">${(value || row.value || 0).toLocaleString()}</span>
      )
    },
    {
      key: 'stage',
      label: 'Stage',
      sortable: true,
      render: (value: string) => <StatusBadge status={value} />
    },
    {
      key: 'probability',
      label: 'Probability',
      sortable: true,
      render: (value: number) => (
        <div className="flex items-center">
          <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
            <div
              className="bg-blue-600 h-2 rounded-full"
              style={{ width: `${value || 0}%` }}
            ></div>
          </div>
          <span className="text-sm font-medium text-gray-900">{value || 0}%</span>
        </div>
      )
    },
    {
      key: 'closeDate',
      label: 'Close Date',
      sortable: true,
      render: (value: string) => value ? new Date(value).toLocaleDateString() : 'Not set'
    },
    {
      key: 'dealOwner',
      label: 'Owner',
      sortable: true,
      render: (value: string, row: Deal) => value || row.owner
    }
  ];

  const handleDelete = async (id: string) => {
    setDealToDelete(id);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!dealToDelete) return;
    
    try {
      setError(null);
      await dealsApi.delete(dealToDelete);
      setDeals(prev => prev.filter(deal => deal.id !== dealToDelete));
      setDeleteConfirmOpen(false);
      setDealToDelete(null);
    } catch (err) {
      console.error('Error deleting deal:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete deal');
      setDeleteConfirmOpen(false);
      setDealToDelete(null);
    }
  };

  const handleView = (deal: Deal) => {
    setSelectedDeal(deal);
    setIsViewModalOpen(true);
  };

  const handleEdit = (deal: Deal) => {
    setSelectedDeal(deal);
    setIsEditModalOpen(true);
  };

  const handleModalClose = () => {
    setSelectedDeal(null);
    setIsViewModalOpen(false);
    setIsEditModalOpen(false);
  };

  const handleEditSuccess = async () => {
    try {
      const data = await dealsApi.getAll();
      setDeals(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh deals');
    }
  };

  const actions = (row: any) => (
    <div className="flex items-center space-x-2">
      <button
        className="p-1 text-gray-400 hover:text-blue-600"
        onClick={(e) => {
          e.stopPropagation();
          handleView(row);
        }}
        title="View Deal"
      >
        <Icons.Eye className="w-4 h-4" />
      </button>
      <button
        className="p-1 text-gray-400 hover:text-green-600"
        onClick={(e) => {
          e.stopPropagation();
          handleEdit(row);
        }}
        title="Edit Deal"
      >
        <Icons.Edit2 className="w-4 h-4" />
      </button>
      <button 
        className="p-1 text-gray-400 hover:text-red-600"
        onClick={(e) => {
          e.stopPropagation();
          handleDelete(row.id);
        }}
        title="Delete Deal"
      >
        <Icons.Trash2 className="w-4 h-4" />
      </button>
    </div>
  );

  const handleDealMove = async (dealId: string, newStage: Deal['stage']) => {
    try {
      const updatedDeal = await dealsApi.update(dealId, { stage: newStage });
      setDeals(prev => prev.map(deal => 
        deal.id === dealId ? updatedDeal : deal
      ));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update deal');
    }
  };

  const headerActions = (
    <>
      <ViewToggle
        currentView={currentView}
        onViewChange={setCurrentView}
      />
      <button className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
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
          setDefaultType('deal'); // set the type
          setIsModalOpen(true);      // open the modal
        }}
      >
        <Icons.Plus className="w-4 h-4 mr-2" />
        New Deal
      </button>
    </>
  );

  const totalValue = deals.reduce((sum, deal) => sum + (deal.amount || deal.value || 0), 0);
  const avgProbability = deals.length > 0 ? deals.reduce((sum, deal) => sum + (deal.probability || 0), 0) / deals.length : 0;
  const expectedValue = deals.reduce((sum, deal) => sum + ((deal.amount || deal.value || 0) * (deal.probability || 0) / 100), 0);

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    switch (currentView) {
      case 'kanban':
        return <KanbanView 
          data={deals} 
          onItemMove={(id, stage) => handleDealMove(id, stage as Deal['stage'])} 
          type="deals" 
        />;
      case 'grid':
        return <GridView data={deals} type="deals" onItemClick={(item) => handleView(item as Deal)} />;
      case 'timeline':
        return <TimelineView data={deals} type="deals" />;
      case 'chart':
        return <ChartView data={deals} type="deals" />;
      default:
        return (
          <DataTable
            columns={columns}
            data={deals}
            actions={actions}
            onRowClick={handleView}
          />
        );
    }
  };

  return (
    <div className="p-6">
      <PageHeader
        title="Deals"
        subtitle="Track your sales opportunities"
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Deals' }
        ]}
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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <Icons.Target className="w-6 h-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Deals</p>
              <p className="text-2xl font-bold text-gray-900">{deals.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Icons.DollarSign className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Value</p>
              <p className="text-2xl font-bold text-gray-900">${totalValue.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Icons.TrendingUp className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Avg Probability</p>
              <p className="text-2xl font-bold text-gray-900">{Math.round(avgProbability)}%</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Icons.Calculator className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Expected Value</p>
              <p className="text-2xl font-bold text-gray-900">${Math.round(expectedValue).toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Pipeline Overview - Only show for list view */}
      {currentView === 'list' && (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Deal Pipeline</h3>
          <div className="grid grid-cols-6 gap-4">
            {['Needs Analysis', 'Value Proposition', 'Identify Decision Makers', 'Negotiation/Review', 'Closed Won', 'Closed Lost'].map((stage) => {
              const stageDeals = deals.filter(deal => deal.stage === stage);
              const stageValue = stageDeals.reduce((sum, deal) => sum + (deal.amount || deal.value || 0), 0);
              return (
                <div key={stage} className="text-center">
                  <div className="bg-gray-50 rounded-lg p-4 mb-2">
                    <p className="text-sm font-medium text-gray-600">{stage}</p>
                    <p className="text-lg font-bold text-gray-900">{stageDeals.length}</p>
                    <p className="text-sm text-gray-500">${stageValue.toLocaleString()}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Content */}
      {deals.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <Icons.Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No deals found</h3>
          <p className="text-gray-500 mb-6">Get started by creating your first deal.</p>
          <button
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors mx-auto"
            onClick={() => {
              setDefaultType('deal');
              setIsModalOpen(true);
            }}
          >
            <Icons.Plus className="w-4 h-4 mr-2" />
            New Deal
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          {renderContent()}
        </div>
      )}

      <AddNewModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        defaultType={defaultType}
        onSuccess={() => {
          // Refresh deals data after successful creation
          dealsApi.getAll().then(data => setDeals(data)).catch(console.error);
        }}
      />

      {/* View Deal Modal */}
      <ViewDealModal
        isOpen={isViewModalOpen}
        onClose={handleModalClose}
        deal={selectedDeal}
        getUserName={getUserName}
      />

      {/* Edit Deal Modal */}
      <EditDealModal
        isOpen={isEditModalOpen}
        onClose={handleModalClose}
        deal={selectedDeal}
        onSuccess={handleEditSuccess}
        users={users}
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
              Confirm Delete
            </Dialog.Title>

            <p className="text-sm text-gray-500 mb-6">
              Are you sure you want to delete this deal? This action cannot be undone.
            </p>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setDeleteConfirmOpen(false)}
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

export default Deals;