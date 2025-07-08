import React, { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import * as Icons from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { useToastStore } from '../store/useToastStore';
import API from '../api/client';

interface ChannelModalProps {
  isOpen: boolean;
  onClose: () => void;
  channel?: {
    id: string;
    name: string;
    description?: string;
    type: 'public' | 'private';
    members: string[];
  };
  onSuccess?: () => void;
}

interface User {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

const ChannelModal: React.FC<ChannelModalProps> = ({ 
  isOpen, 
  onClose, 
  channel, 
  onSuccess 
}) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'public' as 'public' | 'private',
    members: [] as string[]
  });
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuthStore();
  const { addToast } = useToastStore();

  // Fetch users when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchUsers();
    }
  }, [isOpen]);

  // Initialize form data when channel prop changes
  useEffect(() => {
    if (channel) {
      setFormData({
        name: channel.name,
        description: channel.description || '',
        type: channel.type,
        members: channel.members
      });
    } else {
      setFormData({
        name: '',
        description: '',
        type: 'public',
        members: []
      });
    }
  }, [channel]);

  const fetchUsers = async () => {
    try {
      const response = await API.get('/users/tenant-users');
      const data = response.data?.data || [];
      setUsers(data);
    } catch (error) {
      console.error('Failed to fetch users:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to fetch users'
      });
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleMemberToggle = (userId: string) => {
    setFormData(prev => ({
      ...prev,
      members: prev.members.includes(userId)
        ? prev.members.filter(id => id !== userId)
        : [...prev.members, userId]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      addToast({
        type: 'error',
        title: 'Validation Error',
        message: 'Channel name is required'
      });
      return;
    }

    setLoading(true);
    try {
      if (channel) {
        // Update existing channel
        await API.put(`/chat/channels/${channel.id}`, {
          name: formData.name,
          description: formData.description,
          type: formData.type,
          members: formData.members
        });
        addToast({
          type: 'success',
          title: 'Success',
          message: 'Channel updated successfully'
        });
      } else {
        // Create new channel
        await API.post('/chat/channels', {
          name: formData.name,
          description: formData.description,
          type: formData.type,
          members: formData.members
        });
        addToast({
          type: 'success',
          title: 'Success',
          message: 'Channel created successfully'
        });
      }
      
      onSuccess?.();
      onClose();
    } catch (error: any) {
      console.error('Failed to save channel:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: error.response?.data?.message || 'Failed to save channel'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      name: '',
      description: '',
      type: 'public',
      members: []
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onClose={handleClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto max-w-md w-full bg-white rounded-lg shadow-xl">
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <Dialog.Title className="text-lg font-semibold text-gray-900">
              {channel ? 'Edit Channel' : 'Create New Channel'}
            </Dialog.Title>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <Icons.X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Channel Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter channel name"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter channel description"
                rows={3}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Channel Type
              </label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="public"
                    checked={formData.type === 'public'}
                    onChange={(e) => handleInputChange('type', e.target.value)}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Public - Anyone can join</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="private"
                    checked={formData.type === 'private'}
                    onChange={(e) => handleInputChange('type', e.target.value)}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Private - Invite only</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Add Members
              </label>
              <div className="max-h-40 overflow-y-auto border border-gray-300 rounded-lg p-2">
                {users.map((userItem) => (
                  <label key={userItem.userId} className="flex items-center py-1">
                    <input
                      type="checkbox"
                      checked={formData.members.includes(userItem.userId)}
                      onChange={() => handleMemberToggle(userItem.userId)}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">
                      {userItem.firstName} {userItem.lastName}
                      {userItem.userId === user?.userId && ' (You)'}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !formData.name.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Saving...' : (channel ? 'Update Channel' : 'Create Channel')}
              </button>
            </div>
          </form>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};

export default ChannelModal; 