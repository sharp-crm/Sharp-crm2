import React, { useState, useEffect } from 'react';
import * as Icons from 'lucide-react';
import PageHeader from '../components/Common/PageHeader';
import DataTable from '../components/Common/DataTable';
import StatusBadge from '../components/Common/StatusBadge';
import ViewToggle from '../components/Common/ViewToggle';
import KanbanView from '../components/Views/KanbanView';
import GridView from '../components/Views/GridView';
import TimelineView from '../components/Views/TimelineView';
import ChartView from '../components/Views/ChartView';
import { tasksApi, Task, usersApi } from '../api/services';
import { ViewType, Deal } from '../types';
import AddNewModal from '../components/Common/AddNewModal';
import ViewTaskModal from '../components/ViewTaskModal';
import EditTaskModal from '../components/EditTaskModal';
import API from '../api/client';
import { Dialog } from '@headlessui/react';

interface User {
  id: string;
  userId?: string;
  name: string;
  firstName: string;
  lastName: string;
}

const Tasks: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<ViewType>('list');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);

    const fetchTasks = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await tasksApi.getAll();
        setTasks(data);
      } catch (err) {
      setError('Failed to load tasks. Please try again.');
        console.error('Error fetching tasks:', err);
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    fetchTasks();
  }, []);

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

  const columns = [
    {
      key: 'title',
      label: 'Task',
      sortable: true,
      render: (value: string, row: any) => (
        <div className="flex items-center">
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
            <Icons.CheckSquare className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <div className="font-medium text-gray-900">{value}</div>
            <div className="text-sm text-gray-500 line-clamp-1">{row.description}</div>
          </div>
        </div>
      )
    },
    {
      key: 'priority',
      label: 'Priority',
      sortable: true,
      render: (value: string) => <StatusBadge status={value} variant="warning" />
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (value: string) => <StatusBadge status={value} />
    },
    {
      key: 'assignee',
      label: 'Assignee',
      sortable: true,
      render: (value: string) => getUserName(value)
    },
    {
      key: 'dueDate',
      label: 'Due Date',
      sortable: true,
      render: (value: string) => {
        const dueDate = new Date(value);
        const today = new Date();
        const isOverdue = dueDate < today;
        const isDueSoon = dueDate.getTime() - today.getTime() < 3 * 24 * 60 * 60 * 1000; // 3 days
        
        return (
          <span className={`${
            isOverdue ? 'text-red-600 font-medium' : 
            isDueSoon ? 'text-orange-600 font-medium' : 
            'text-gray-900'
          }`}>
            {dueDate.toLocaleDateString()}
          </span>
        );
      }
    }
  ];

  const handleUpdateTask = async (taskId: string, updates: Partial<Task>) => {
    try {
      setError(null);
      await tasksApi.update(taskId, updates);
      await fetchTasks();
    } catch (err) {
      setError('Failed to update task. Please try again.');
      console.error('Error updating task:', err);
    }
  };

  const handleDelete = async (id: string) => {
    setTaskToDelete(id);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!taskToDelete) return;
    
    try {
      await tasksApi.delete(taskToDelete);
      setTasks(prev => prev.filter(task => task.id !== taskToDelete));
      setDeleteConfirmOpen(false);
      setTaskToDelete(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete task');
    }
  };

  const actions = (row: Task) => (
    <div className="flex items-center space-x-2">
      <button 
        className="p-1 text-gray-400 hover:text-gray-600"
        onClick={() => {
          setSelectedTask(row);
          setIsViewModalOpen(true);
        }}
      >
        <Icons.Eye className="w-4 h-4" />
      </button>
      <button 
        className="p-1 text-gray-400 hover:text-gray-600"
        onClick={() => {
          setSelectedTask(row);
          setIsEditModalOpen(true);
        }}
      >
        <Icons.Edit2 className="w-4 h-4" />
      </button>
      <button 
        className="p-1 text-gray-400 hover:text-green-600"
        onClick={() => handleUpdateTask(row.id, { status: 'Completed' })}
      >
        <Icons.Check className="w-4 h-4" />
      </button>
      <button 
        className="p-1 text-gray-400 hover:text-red-600"
        onClick={() => handleDelete(row.id)}
      >
        <Icons.Trash2 className="w-4 h-4" />
      </button>
    </div>
  );

  const handleTaskMove = async (taskId: string, newStatus: Task['status'] | Deal['stage']) => {
    await handleUpdateTask(taskId, { status: newStatus as Task['status'] });
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
        onClick={() => setIsAddModalOpen(true)}
      >
        <Icons.Plus className="w-4 h-4 mr-2" />
        New Task
      </button>
    </>
  );

  const completedTasks = tasks.filter(task => task.status === 'Completed').length;
  const inProgressTasks = tasks.filter(task => task.status === 'In Progress').length;
  const openTasks = tasks.filter(task => task.status === 'Open').length;
  const highPriorityTasks = tasks.filter(task => task.priority === 'High').length;

  const renderContent = () => {
    switch (currentView) {
      case 'kanban':
        return <KanbanView data={tasks} onItemMove={handleTaskMove} type="tasks" getUserName={getUserName} />;
      case 'grid':
        return <GridView data={tasks} type="tasks" onItemClick={(item) => {
          if ('title' in item) { // This is a Task
            setSelectedTask(item);
            setIsViewModalOpen(true);
          }
        }} />;
      case 'timeline':
        return <TimelineView data={tasks} type="tasks" />;
      case 'chart':
        return <ChartView data={tasks} type="tasks" />;
      default:
        return (
          <DataTable
            data={tasks}
            columns={columns}
            actions={actions}
          />
        );
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <PageHeader
        title="Tasks"
        subtitle="Manage and track your tasks"
        actions={headerActions}
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white shadow-sm rounded-xl p-5 border border-gray-200">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
              <Icons.ListTodo className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Tasks</p>
              <p className="text-xl font-semibold text-gray-900">{tasks.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white shadow-sm rounded-xl p-5 border border-gray-200">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-3">
              <Icons.CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Completed</p>
              <p className="text-xl font-semibold text-gray-900">{completedTasks}</p>
            </div>
          </div>
        </div>
        <div className="bg-white shadow-sm rounded-xl p-5 border border-gray-200">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center mr-3">
              <Icons.Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">In Progress</p>
              <p className="text-xl font-semibold text-gray-900">{inProgressTasks}</p>
            </div>
          </div>
        </div>
        <div className="bg-white shadow-sm rounded-xl p-5 border border-gray-200">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center mr-3">
              <Icons.AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">High Priority</p>
              <p className="text-xl font-semibold text-gray-900">{highPriorityTasks}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex">
            <Icons.AlertCircle className="w-5 h-5 text-red-600 mr-2" />
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Task Overview - Only show for list view */}
      {currentView === 'list' && (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Task Overview</h3>
          <div className="grid grid-cols-3 gap-4">
            {['Open', 'In Progress', 'Completed'].map((status) => {
              const statusTasks = tasks.filter(task => task.status === status);
              return (
                <div key={status} className="text-center">
                  <div className="bg-gray-50 rounded-lg p-4 mb-2">
                    <p className="text-sm font-medium text-gray-600">{status}</p>
                    <p className="text-lg font-bold text-gray-900">{statusTasks.length}</p>
                    <p className="text-sm text-gray-500">
                      {Math.round((statusTasks.length / tasks.length) * 100)}% of total
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Content */}
      {tasks.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <Icons.CheckSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No tasks found</h3>
          <p className="text-gray-500 mb-6">Get started by creating your first task.</p>
          <button
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors mx-auto"
            onClick={() => setIsAddModalOpen(true)}
          >
            <Icons.Plus className="w-4 h-4 mr-2" />
            New Task
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          {renderContent()}
        </div>
      )}
      
      {selectedTask && (
        <>
          <ViewTaskModal
            isOpen={isViewModalOpen}
            onClose={() => {
              setIsViewModalOpen(false);
              setSelectedTask(null);
            }}
            task={selectedTask}
            userName={getUserName(selectedTask.assignee)}
            getUserName={getUserName}
          />
          <EditTaskModal
            isOpen={isEditModalOpen}
            onClose={() => {
              setIsEditModalOpen(false);
              setSelectedTask(null);
            }}
            task={selectedTask}
            userName={getUserName(selectedTask.assignee)}
            onSave={(updatedTask) => handleUpdateTask(selectedTask.id, updatedTask)}
            users={users}
          />
        </>
      )}
      
      <AddNewModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        defaultType="task"
        onSuccess={fetchTasks}
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
              Are you sure you want to delete this task? This action cannot be undone.
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

export default Tasks;