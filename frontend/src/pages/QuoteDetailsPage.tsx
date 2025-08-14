import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import * as Icons from 'lucide-react';
import { quotesApi, Quote, usersApi, User, tasksApi, Task } from '../api/services';
import QuoteHeader from '../components/QuoteDetails/QuoteHeader';
import QuoteSidebar from '../components/QuoteDetails/QuoteSidebar';
import QuoteTabs from '../components/QuoteDetails/QuoteTabs';
import EditQuoteModal from '../components/EditQuoteModal';

const QuoteDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'timeline'>('overview');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Handle quote update with memoization
  const handleQuoteUpdate = useCallback((updatedQuote: Quote) => {
    setQuote(updatedQuote);
  }, []);

  // Handle tasks update with memoization
  const handleTasksUpdate = useCallback((updatedTasks: Task[]) => {
    setTasks(updatedTasks);
  }, []);

  // Fetch quote and users data
  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        setError(null);
        const [quoteData, usersData] = await Promise.all([
          quotesApi.getById(id),
          usersApi.getAll()
        ]);
        
        if (quoteData) {
          setQuote(quoteData);
        } else {
          setError('Quote not found');
        }
        setUsers(usersData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  // Fetch tasks related to this quote
  useEffect(() => {
    const fetchTasks = async () => {
      if (!id) return;
      
      try {
        const quoteTasks = await tasksApi.getByRelatedRecord('quote', id);
        setTasks(quoteTasks);
      } catch (err) {
        console.error('Error fetching quote tasks:', err);
        // Don't set error for tasks, just log it
      }
    };

    fetchTasks();
  }, [id]);

  const getUserDisplayName = (userId: string): string => {
    const user = users.find(u => u.id === userId);
    if (!user) return userId;
    
    const firstName = user.firstName || 'Unknown';
    const lastName = user.lastName || 'User';
    
    return `${firstName} ${lastName}`;
  };

  const handleEdit = () => {
    setIsEditModalOpen(true);
  };

  const handleEditSuccess = async () => {
    try {
      const data = await quotesApi.getById(id!);
      if (data) {
        setQuote(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh quote');
    }
    setIsEditModalOpen(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !quote) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <Icons.AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Error</h2>
        <p className="text-gray-600 mb-4">{error || 'Quote not found'}</p>
        <button
          onClick={() => navigate('/quotes')}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Back to Quotes
        </button>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <QuoteHeader quote={quote} onEdit={handleEdit} />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-56 bg-white border-r border-gray-200">
          <QuoteSidebar quote={quote} tasks={tasks} />
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <QuoteTabs
            activeTab={activeTab}
            onTabChange={setActiveTab}
            quote={quote}
            getUserDisplayName={getUserDisplayName}
            onQuoteUpdate={handleQuoteUpdate}
            onTasksUpdate={handleTasksUpdate}
          />
        </div>
      </div>

      {/* Edit Quote Modal */}
      <EditQuoteModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        quote={quote}
        onSuccess={handleEditSuccess}
        users={users}
      />
    </div>
  );
};

export default QuoteDetailsPage; 