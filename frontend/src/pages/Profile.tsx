import React, { useState } from 'react';
import * as Icons from 'lucide-react';
import PageHeader from '../components/Common/PageHeader';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import avatar from '../Assets/avatar.png';
import API from '../api/client';
import { useToastStore } from '../store/useToastStore';

const Profile: React.FC = () => {
  const { user, updateUser } = useAuthStore();
  const { addToast } = useToastStore();
  const [isUploading, setIsUploading] = useState(false);

  const profileStats = [
    { label: 'Deals Closed', value: '-', icon: 'Target' },
    { label: 'Revenue Generated', value: '-', icon: 'DollarSign' },
    { label: 'Leads Converted', value: '-', icon: 'UserPlus' },
    { label: 'Tasks Completed', value: '-', icon: 'CheckSquare' }
  ];

  const recentActivity = [
    { action: 'Closed deal with Global Industries', time: '2 hours ago', type: 'success' },
    { action: 'Created new lead from website inquiry', time: '4 hours ago', type: 'info' },
    { action: 'Updated task status', time: '6 hours ago', type: 'info' },
    { action: 'Completed follow-up call with client', time: '1 day ago', type: 'info' }
  ];

  if (!user) {
    return <div className="p-6 text-gray-600">Loading user profile...</div>;
  }

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      addToast({
        type: 'error',
        title: 'Invalid File',
        message: 'Please upload an image file'
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      addToast({
        type: 'error',
        title: 'File Too Large',
        message: 'Please upload an image smaller than 5MB'
      });
      return;
    }

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append('image', file);

      const response = await API.post('/users/profile-image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      // Update user profile with new image URL
      if (response.data?.imageUrl) {
        const updatedUser = {
          ...user,
          profileImage: response.data.imageUrl
        };
        updateUser(updatedUser);

        // Update local storage
        localStorage.setItem('user', JSON.stringify(updatedUser));
        sessionStorage.setItem('user', JSON.stringify(updatedUser));

        addToast({
          type: 'success',
          title: 'Success',
          message: 'Profile picture updated successfully'
        });
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      addToast({
        type: 'error',
        title: 'Upload Failed',
        message: 'Failed to upload profile picture. Please try again.'
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">

      <PageHeader
        title="Profile"
        subtitle="Your personal dashboard and settings"
        breadcrumbs={[
          {
            name: 'Home',
            path: '/',
          },
          { name: 'Profile' },
        ]}
      />

      <div className="max-w-7xl mx-auto">
        {/* Profile Header */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 mb-8 overflow-hidden">
          <div className="p-6 flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0">
            <div className="flex items-center space-x-6">
              <div className="relative group">
                <img
                  src={user.profileImage || avatar}
                  alt={`${user.firstName} ${user.lastName}`}
                  className="w-24 h-24 rounded-full object-cover border-2 border-blue-200 transition-transform group-hover:opacity-75"
                />
                <label 
                  className="absolute inset-0 flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                  htmlFor="profile-image-upload"
                >
                  {isUploading ? (
                    <Icons.Loader2 className="w-8 h-8 text-white animate-spin" />
                  ) : (
                    <Icons.Camera className="w-8 h-8 text-white" />
                  )}
                </label>
                <input
                  type="file"
                  id="profile-image-upload"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  disabled={isUploading}
                />
              </div>
              <div className="space-y-1">
                <h2 className="text-3xl font-bold text-gray-900">{`${user.firstName} ${user.lastName}`}</h2>
                <p className="text-gray-600 font-medium">{user.role}</p>
                <p className="text-gray-500 text-sm">{user.email}</p>
                <p className="text-gray-500 text-sm">User ID: {user.userId}</p>
              </div>
            </div>
            <div className="flex space-x-3">
              <Link
                to="/settings/personal"
                className="flex items-center px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 shadow-sm hover:shadow-md"
              >
                <Icons.Edit2 className="w-5 h-5 mr-2" />
                Edit Profile
              </Link>
            </div>
          </div>
        </div>

        {/* Stats + Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            {/* Stats */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 mb-8">
              <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-white">
                <h3 className="text-xl font-semibold text-gray-900">Performance Overview</h3>
              </div>
              <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {profileStats.map((stat, index) => {
                  const Icon = Icons[stat.icon as keyof typeof Icons] as any;
                  return (
                    <div
                      key={index}
                      className="text-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-all duration-200"
                    >
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                        <Icon className="w-6 h-6 text-blue-600" />
                      </div>
                      <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                      <p className="text-sm text-gray-600 font-medium">{stat.label}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-100">
              <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-green-50 to-white">
                <h3 className="text-xl font-semibold text-gray-900">Recent Activity</h3>
              </div>
              <div className="p-6 space-y-4">
                {recentActivity.map((activity, index) => (
                  <div
                    key={index}
                    className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-all duration-200"
                  >
                    <div
                      className={`w-2 h-2 rounded-full mt-2 ${activity.type === 'success' ? 'bg-green-500' : 'bg-blue-500'
                        }`}
                    />
                    <div className="flex-1">
                      <p className="text-sm text-gray-900 font-medium">{activity.action}</p>
                      <p className="text-xs text-gray-500">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          {/* Right side column (placeholder for future widgets) */}
          <div className="lg:col-span-1 hidden lg:block">
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 h-full p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h3>
              {/* Add widgets or placeholders here later */}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;