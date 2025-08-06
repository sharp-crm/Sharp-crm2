import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import * as Icons from 'lucide-react';
import { dealsApi, Deal, usersApi, User, Task } from '../api/services';
import DealHeader from '../components/DealDetails/DealHeader';
import DealSidebar from '../components/DealDetails/DealSidebar';
import DealTabs from '../components/DealDetails/DealTabs';
import EditDealModal from '../components/EditDealModal';

const DealDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [deal, setDeal] = useState<Deal | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'timeline'>('overview');
  const [sidebarSection, setSidebarSection] = useState<string>('notes');
  const [currentDeal, setCurrentDeal] = useState<Deal | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  useEffect(() => {
    if (!id) {
      setError('Deal ID is required');
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch deal data
        const dealData = await dealsApi.getById(id);
        if (!dealData) {
          setError('Deal not found');
          return;
        }
        setDeal(dealData);
        setCurrentDeal(dealData);

        // Fetch users for display names
        const usersData = await usersApi.getAll();
        setUsers(usersData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch deal details');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const handleEdit = () => {
    // Open edit modal
    setIsEditModalOpen(true);
  };

  const handleEditSuccess = async () => {
    try {
      if (id) {
        const updatedDeal = await dealsApi.getById(id);
        if (updatedDeal) {
          setDeal(updatedDeal);
          setCurrentDeal(updatedDeal);
        }
      }
      setIsEditModalOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh deal data');
    }
  };

  const handleSendEmail = () => {
    // Open email compose modal
    console.log('Send email for deal:', deal?.dealName);
  };

  const getUserDisplayName = (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (!user) return userId;
    
    const firstName = user.firstName || 'Unknown';
    const lastName = user.lastName || 'User';
    
    return `${firstName} ${lastName}`;
  };

  const handleDealUpdate = useCallback((updatedDeal: Deal) => {
    setDeal(updatedDeal);
    setCurrentDeal(updatedDeal);
  }, []);

  const handleTasksUpdate = useCallback((updatedTasks: Task[]) => {
    setTasks(updatedTasks);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !deal) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <Icons.AlertCircle className="w-5 h-5 text-red-600 mr-2" />
            <p className="text-red-700">{error || 'Deal not found'}</p>
          </div>
          <button
            onClick={() => navigate('/deals')}
            className="mt-4 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Back to Deals
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <DealHeader
          deal={deal}
          onEdit={handleEdit}
          onSendEmail={handleSendEmail}
          getUserDisplayName={getUserDisplayName}
        />

        {/* Content with Tabs */}
        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar */}
          <div className="w-56 bg-white border-r border-gray-200 overflow-y-auto">
            <DealSidebar deal={currentDeal || deal} tasks={tasks} />
          </div>

          {/* Main Content */}
          <div className="flex-1 overflow-y-auto">
            <DealTabs
              activeTab={activeTab}
              onTabChange={setActiveTab}
              deal={currentDeal || deal}
              getUserDisplayName={getUserDisplayName}
              onDealUpdate={handleDealUpdate}
              onTasksUpdate={handleTasksUpdate}
            />
          </div>
        </div>
      </div>

      {/* Edit Deal Modal */}
      <EditDealModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        deal={deal}
        onSuccess={handleEditSuccess}
        users={users}
      />
    </div>
  );
};

export default DealDetailsPage; 