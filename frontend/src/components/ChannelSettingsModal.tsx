import React, { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import * as Icons from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { useToastStore } from '../store/useToastStore';
import API from '../api/client';

interface ChannelSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  channel: {
    id: string;
    name: string;
    description?: string;
    type: 'public' | 'private';
    members: string[];
    createdBy?: string;
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

const ChannelSettingsModal: React.FC<ChannelSettingsModalProps> = ({ 
  isOpen, 
  onClose, 
  channel, 
  onSuccess 
}) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'public' as 'public' | 'private'
  });
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'members' | 'permissions'>('general');
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
        type: channel.type
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

  const handleRemoveMember = async (userId: string) => {
    if (!confirm('Are you sure you want to remove this member from the channel?')) {
      return;
    }

    setLoading(true);
    try {
      await API.delete(`/chat/channels/${channel.id}/members/${userId}`);
      addToast({
        type: 'success',
        title: 'Success',
        message: 'Member removed successfully'
      });
      onSuccess?.();
    } catch (error: any) {
      console.error('Failed to remove member:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: error.response?.data?.message || 'Failed to remove member'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = async (userId: string) => {
    setLoading(true);
    try {
      await API.post(`/chat/channels/${channel.id}/members`, {
        userId
      });
      addToast({
        type: 'success',
        title: 'Success',
        message: 'Member added successfully'
      });
      onSuccess?.();
    } catch (error: any) {
      console.error('Failed to add member:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: error.response?.data?.message || 'Failed to add member'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteChannel = async () => {
    if (!confirm('Are you sure you want to delete this channel? This action cannot be undone.')) {
      return;
    }

    setLoading(true);
    try {
      await API.delete(`/chat/channels/${channel.id}`);
      addToast({
        type: 'success',
        title: 'Success',
        message: 'Channel deleted successfully'
      });
      onSuccess?.();
      onClose();
    } catch (error: any) {
      console.error('Failed to delete channel:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: error.response?.data?.message || 'Failed to delete channel'
      });
    } finally {
      setLoading(false);
    }
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
      await API.put(`/chat/channels/${channel.id}`, {
        name: formData.name,
        description: formData.description,
        type: formData.type
      });
      addToast({
        type: 'success',
        title: 'Success',
        message: 'Channel updated successfully'
      });
      onSuccess?.();
    } catch (error: any) {
      console.error('Failed to update channel:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: error.response?.data?.message || 'Failed to update channel'
      });
    } finally {
      setLoading(false);
    }
  };

  const isChannelOwner = channel.createdBy === user?.userId;
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN' || user?.role === 'Admin' || user?.role === 'SuperAdmin';
  const canManageChannel = isChannelOwner || isAdmin;

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto max-w-2xl w-full bg-white rounded-lg shadow-xl max-h-[90vh] overflow-hidden">
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <Dialog.Title className="text-lg font-semibold text-gray-900">
              Channel Settings - #{channel.name}
            </Dialog.Title>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <Icons.X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex">
            {/* Sidebar */}
            <div className="w-48 border-r border-gray-200 bg-gray-50">
              <nav className="p-4 space-y-1">
                <button
                  onClick={() => setActiveTab('general')}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === 'general'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  General
                </button>
                <button
                  onClick={() => setActiveTab('members')}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === 'members'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  Members
                </button>
                {canManageChannel && (
                  <button
                    onClick={() => setActiveTab('permissions')}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      activeTab === 'permissions'
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    Permissions
                  </button>
                )}
              </nav>
            </div>

            {/* Content */}
            <div className="flex-1 p-6 overflow-y-auto">
              {activeTab === 'general' && (
                <form onSubmit={handleSubmit} className="space-y-4">
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
                      disabled={!canManageChannel}
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
                      disabled={!canManageChannel}
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
                          disabled={!canManageChannel}
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
                          disabled={!canManageChannel}
                        />
                        <span className="text-sm text-gray-700">Private - Invite only</span>
                      </label>
                    </div>
                  </div>

                  {canManageChannel && (
                    <div className="flex justify-end space-x-3 pt-4">
                      <button
                        type="submit"
                        disabled={loading || !formData.name.trim()}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {loading ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  )}
                </form>
              )}

              {activeTab === 'members' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium text-gray-900">Channel Members</h3>
                    <span className="text-sm text-gray-500">{channel.members.length} members</span>
                  </div>

                  <div className="space-y-2">
                    {users
                      .filter(userItem => channel.members.includes(userItem.userId))
                      .map((userItem) => (
                        <div key={userItem.userId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                              <span className="text-sm font-medium text-blue-700">
                                {userItem.firstName.charAt(0) + userItem.lastName.charAt(0)}
                              </span>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {userItem.firstName} {userItem.lastName}
                                {userItem.userId === user?.userId && ' (You)'}
                              </p>
                              <p className="text-xs text-gray-500">{userItem.email}</p>
                            </div>
                          </div>
                          {canManageChannel && userItem.userId !== user?.userId && (
                            <button
                              onClick={() => handleRemoveMember(userItem.userId)}
                              className="text-red-600 hover:text-red-800 text-sm"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      ))}
                  </div>

                  {canManageChannel && (
                    <div className="mt-6">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Add Members</h4>
                      <div className="space-y-2">
                        {users
                          .filter(userItem => !channel.members.includes(userItem.userId))
                          .map((userItem) => (
                            <div key={userItem.userId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <div className="flex items-center">
                                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center mr-3">
                                  <span className="text-sm font-medium text-gray-600">
                                    {userItem.firstName.charAt(0) + userItem.lastName.charAt(0)}
                                  </span>
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-gray-900">
                                    {userItem.firstName} {userItem.lastName}
                                  </p>
                                  <p className="text-xs text-gray-500">{userItem.email}</p>
                                </div>
                              </div>
                              <button
                                onClick={() => handleAddMember(userItem.userId)}
                                className="text-blue-600 hover:text-blue-800 text-sm"
                              >
                                Add
                              </button>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'permissions' && canManageChannel && (
                <div className="space-y-4">
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex">
                      <Icons.AlertTriangle className="w-5 h-5 text-yellow-400 mr-2 mt-0.5" />
                      <div>
                        <h3 className="text-sm font-medium text-yellow-800">Permissions Management</h3>
                        <p className="text-sm text-yellow-700 mt-1">
                          Channel permissions are managed at the system level. Contact your administrator for permission changes.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-4">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Danger Zone</h3>
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-sm font-medium text-red-800">Delete Channel</h4>
                          <p className="text-sm text-red-700 mt-1">
                            Permanently delete this channel and all its messages. This action cannot be undone.
                          </p>
                        </div>
                        <button
                          onClick={handleDeleteChannel}
                          disabled={loading}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {loading ? 'Deleting...' : 'Delete Channel'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};

export default ChannelSettingsModal; 