import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import * as Icons from 'lucide-react';
import { leadsApi, Lead, usersApi, User } from '../api/services';
import LeadHeader from '../components/LeadDetails/LeadHeader';
import LeadSidebar from '../components/LeadDetails/LeadSidebar';
import LeadTabs from '../components/LeadDetails/LeadTabs';

const LeadDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [lead, setLead] = useState<Lead | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'timeline'>('overview');
  const [sidebarSection, setSidebarSection] = useState<string>('notes');

  useEffect(() => {
    if (!id) {
      setError('Lead ID is required');
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch lead data
        const leadData = await leadsApi.getById(id);
        if (!leadData) {
          setError('Lead not found');
          return;
        }
        setLead(leadData);

        // Fetch users for display names
        const usersData = await usersApi.getAll();
        setUsers(usersData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch lead details');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const handleEdit = () => {
    // Navigate to edit page or open edit modal
    console.log('Edit lead:', lead?.id);
  };

  const handleConvert = () => {
    // Navigate to convert page or open convert modal
    console.log('Convert lead:', lead?.id);
  };

  const handleSendEmail = () => {
    // Open email compose modal
    console.log('Send email to:', lead?.email);
  };

  const getUserDisplayName = (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (!user) return userId;
    
    const firstName = user.firstName || 'Unknown';
    const lastName = user.lastName || 'User';
    
    return `${firstName} ${lastName}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !lead) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <Icons.AlertCircle className="w-5 h-5 text-red-600 mr-2" />
            <p className="text-red-700">{error || 'Lead not found'}</p>
          </div>
          <button
            onClick={() => navigate('/leads')}
            className="mt-4 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Back to Leads
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
        <LeadHeader
          lead={lead}
          onEdit={handleEdit}
          onConvert={handleConvert}
          onSendEmail={handleSendEmail}
          getUserDisplayName={getUserDisplayName}
        />

        {/* Content with Tabs */}
        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar */}
          <div className="w-56 bg-white border-r border-gray-200 overflow-y-auto">
            <LeadSidebar />
          </div>

          {/* Main Content */}
          <div className="flex-1 overflow-y-auto">
            <LeadTabs
              activeTab={activeTab}
              onTabChange={setActiveTab}
              lead={lead}
              getUserDisplayName={getUserDisplayName}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeadDetailsPage; 