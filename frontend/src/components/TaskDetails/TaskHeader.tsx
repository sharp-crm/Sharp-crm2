import React from 'react';
import { useNavigate } from 'react-router-dom';
import * as Icons from 'lucide-react';
import { Task } from '../../types';

interface TaskHeaderProps {
  task: Task;
  onEdit: () => void;
  onSendEmail: () => void;
  getUserDisplayName: (userId: string) => string;
}

const TaskHeader: React.FC<TaskHeaderProps> = ({
  task,
  onEdit,
  onSendEmail,
  getUserDisplayName
}) => {
  const navigate = useNavigate();

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'High':
        return 'bg-red-100 text-red-800';
      case 'Normal':
        return 'bg-yellow-100 text-yellow-800';
      case 'Low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed':
        return 'bg-green-100 text-green-800';
      case 'In Progress':
        return 'bg-blue-100 text-blue-800';
      case 'Not Started':
        return 'bg-gray-100 text-gray-800';
      case 'Deferred':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/tasks')}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <Icons.ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">{task.title}</h1>
            <div className="flex items-center space-x-4 mt-1">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
                {task.priority}
              </span>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                {task.status}
              </span>
              <span className="text-sm text-gray-500">
                Due: {new Date(task.dueDate).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={onSendEmail}
            className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Icons.Mail className="w-4 h-4 mr-2" />
            Send Email
          </button>
          <button
            onClick={onEdit}
            className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Icons.Edit className="w-4 h-4 mr-2" />
            Edit Task
          </button>
        </div>
      </div>
    </div>
  );
};

export default TaskHeader; 