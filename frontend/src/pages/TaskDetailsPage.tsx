import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import * as Icons from 'lucide-react';
import { tasksApi, Task, usersApi, User } from '../api/services';
import TaskHeader from '../components/TaskDetails/TaskHeader';
import TaskTabs from '../components/TaskDetails/TaskTabs';
import EditTaskModal from '../components/EditTaskModal';

const TaskDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [task, setTask] = useState<Task | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'timeline'>('overview');
  const [currentTask, setCurrentTask] = useState<Task | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  useEffect(() => {
    if (!id) {
      setError('Task ID is required');
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch task data
        const taskData = await tasksApi.getById(id);
        if (!taskData) {
          setError('Task not found');
          return;
        }
        setTask(taskData);
        setCurrentTask(taskData);

        // Fetch users for display names
        const usersData = await usersApi.getAll();
        setUsers(usersData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch task details');
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
        const updatedTask = await tasksApi.getById(id);
        if (updatedTask) {
          setTask(updatedTask);
          setCurrentTask(updatedTask);
        }
      }
      setIsEditModalOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh task data');
    }
  };

  const handleSendEmail = () => {
    // Open email compose modal
    console.log('Send email for task:', task?.title);
  };

  const getUserDisplayName = (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (!user) return userId;
    
    const firstName = user.firstName || 'Unknown';
    const lastName = user.lastName || 'User';
    
    return `${firstName} ${lastName}`;
  };

  const handleTaskUpdate = useCallback((updatedTask: Task) => {
    setTask(updatedTask);
    setCurrentTask(updatedTask);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !task) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <Icons.AlertCircle className="w-5 h-5 text-red-600 mr-2" />
            <p className="text-red-700">{error || 'Task not found'}</p>
          </div>
          <button
            onClick={() => navigate('/tasks')}
            className="mt-4 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Back to Tasks
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
        <TaskHeader
          task={task}
          onEdit={handleEdit}
          onSendEmail={handleSendEmail}
          getUserDisplayName={getUserDisplayName}
        />

        {/* Content with Tabs */}
        <div className="flex-1 flex overflow-hidden">
          {/* Main Content */}
          <div className="flex-1 overflow-y-auto">
            <TaskTabs
              activeTab={activeTab}
              onTabChange={setActiveTab}
              task={currentTask || task}
              getUserDisplayName={getUserDisplayName}
              onTaskUpdate={handleTaskUpdate}
            />
          </div>
        </div>
      </div>

      {/* Edit Task Modal */}
      <EditTaskModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        task={task}
        onSave={handleEditSuccess}
        userName={getUserDisplayName(task.assignee)}
        users={users}
      />
    </div>
  );
};

export default TaskDetailsPage; 