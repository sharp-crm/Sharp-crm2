import React, { useState } from 'react';
import * as Icons from 'lucide-react';
import PageHeader from '../../components/Common/PageHeader';
import { useAuthStore } from '../../store/useAuthStore';
import { useToastStore } from '../../store/useToastStore';
import API from '../../api/client';
import avatar from '../../Assets/avatar.png';
import PhoneNumberInput from '../../components/Common/PhoneNumberInput';
import PasswordStrengthMeter from '../../components/Common/PasswordStrengthMeter';
import { validatePassword } from '../../utils/passwordValidation';

const Personal: React.FC = () => {
  const { user, updateUser } = useAuthStore();
  const { addToast } = useToastStore();
  const [isUploading, setIsUploading] = useState(false);
  const accessToken = useAuthStore((s) => s.accessToken);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    password: '',
    confirmPassword: '',
  });

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [passwordTouched, setPasswordTouched] = useState(false);

  // Load user data when component mounts or user changes
  React.useEffect(() => {
    if (user) {
      setFormData({
        firstName: user?.firstName || '',
        lastName: user?.lastName || '',
        email: user?.email || '',
        phoneNumber: user?.phoneNumber || '',
        password: '',
        confirmPassword: '',
      });
    }
  }, [user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    
    if (name === 'password') {
      setPasswordTouched(true);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const response = await API.put('/users/profile', formData);
      setSuccess('Profile updated successfully.');

      // Use the actual response data from the server
      if (response.data?.user) {
        const updatedUser = {
          ...user!,
          ...response.data.user, // Use all data from server response
          firstName: response.data.user.firstName,
          lastName: response.data.user.lastName,
          phoneNumber: response.data.user.phoneNumber,
          updatedAt: response.data.user.updatedAt
        };
        updateUser(updatedUser);
        
        // Also update local storage to persist the changes
        localStorage.setItem('user', JSON.stringify(updatedUser));
        sessionStorage.setItem('user', JSON.stringify(updatedUser));
        
        // Update form data to reflect the saved changes
        setFormData({
          firstName: response.data.user.firstName || '',
          lastName: response.data.user.lastName || '', 
          email: response.data.user.email || '',
          phoneNumber: response.data.user.phoneNumber || '',
          password: '',
          confirmPassword: '',
        });
      }

    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update profile');
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      addToast({
        type: 'error',
        title: 'Invalid File',
        message: 'Please upload an image file'
      });
      return;
    }

    // Validate file size (max 1MB)
    if (file.size > 1024 * 1024) {
      addToast({
        type: 'error',
        title: 'File Too Large',
        message: 'Please upload an image smaller than 1MB'
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
    <div className="p-6">
      <PageHeader
        title="Personal Settings"
        subtitle="Manage your personal information and preferences"
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Settings'},
          { name: 'Personal' }
        ]}
      />

      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Profile Information</h3>
            <p className="text-sm text-gray-600">Update your personal details and preferences.</p>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Profile Picture */}
            <div className="flex items-center space-x-6">
              <div className="relative group">
                <img
                  src={user?.profileImage || avatar}
                  alt="Profile"
                  className="w-20 h-20 rounded-full object-cover border-2 border-gray-200 transition-transform group-hover:opacity-75"
                />
                <label 
                  className="absolute inset-0 flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                  htmlFor="profile-image-upload"
                >
                  {isUploading ? (
                    <Icons.Loader2 className="w-6 h-6 text-white animate-spin" />
                  ) : (
                    <Icons.Camera className="w-6 h-6 text-white" />
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
              <div>
                <label 
                  htmlFor="profile-image-upload"
                  className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <Icons.Camera className="w-4 h-4 mr-2" />
                  {isUploading ? 'Uploading...' : 'Change Photo'}
                </label>
                <p className="text-xs text-gray-500 mt-1">JPG, GIF or PNG. 1MB max.</p>
              </div>
            </div>

            {/* Name Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Contact Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed"
                />
                <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                <PhoneNumberInput
                  value={formData.phoneNumber}
                  onChange={(phoneNumber) => setFormData(prev => ({ ...prev, phoneNumber }))}
                  placeholder="Enter phone number"
                  className="w-full"
                />
              </div>
            </div>

            {/* Password Update */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="Leave blank to keep current password"
                  autoComplete="new-password"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {formData.password && passwordTouched && (
                  <div className="mt-2">
                    <PasswordStrengthMeter
                      password={formData.password}
                      showRequirements={true}
                    />
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Confirm Password</label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  placeholder="Confirm new password"
                  autoComplete="new-password"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                  <p className="text-red-600 text-xs mt-1">Passwords do not match</p>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
              {error && <p className="text-red-600 text-sm">{error}</p>}
              {success && <p className="text-green-600 text-sm">{success}</p>}
              <button
                type="submit"
                disabled={
                  (formData.password.length > 0 && !validatePassword(formData.password).isValid) ||
                  (formData.password.length > 0 && formData.password !== formData.confirmPassword)
                }
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Personal;

