import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import API from '../api/client';
import { useAuthStore } from '../store/useAuthStore';
import PhoneNumberInput from './Common/PhoneNumberInput';
import PasswordStrengthMeter from './Common/PasswordStrengthMeter';
import { validatePassword } from '../utils/passwordValidation';

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  role: string;
}

interface EditUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUserUpdated: () => void;
  user: User | null;
}

const EditUserModal: React.FC<EditUserModalProps> = ({
  isOpen,
  onClose,
  onUserUpdated,
  user
}) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phoneNumber: '',
    role: '',
    email: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [changePassword, setChangePassword] = useState(false);
  const [passwordValidation, setPasswordValidation] = useState(validatePassword(''));
  const [showPasswordRequirements, setShowPasswordRequirements] = useState(false);
  
  // Get current user to determine edit permissions
  const currentUser = useAuthStore((s) => s.user);
  
  // Check if current user is editing themselves
  const isEditingSelf = currentUser?.userId === user?.id;
  
  // Super admin and admin can only edit email for other users
  const canEditOnlyEmail = !isEditingSelf && (currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'ADMIN' || currentUser?.role === 'Admin' || currentUser?.role === 'SuperAdmin');

  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        phoneNumber: user.phoneNumber || '',
        role: user.role || '',
        email: user.email || '',
        newPassword: '',
        confirmPassword: ''
      });
      setChangePassword(false);
      setPasswordValidation(validatePassword(''));
      setShowPasswordRequirements(false);
    }
  }, [user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // Clear any existing errors when user starts typing
    if (error) {
      setError('');
    }
    
    setFormData({
      ...formData,
      [name]: value
    });
    
    // Real-time password validation
    if (name === 'newPassword') {
      setPasswordValidation(validatePassword(value));
      setShowPasswordRequirements(value.length > 0);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setError('');
    setLoading(true);

    // Password validation if changing password
    if (changePassword && formData.newPassword) {
      const passwordCheck = validatePassword(formData.newPassword);
      if (!passwordCheck.isValid) {
        setError('Password does not meet requirements');
        setLoading(false);
        return;
      }
      
      if (formData.newPassword !== formData.confirmPassword) {
        setError('Passwords do not match');
        setLoading(false);
        return;
      }
    }

    try {
      let payload: any = {};
      
      if (canEditOnlyEmail) {
        // Super admin and admin can only edit email for other users
        payload = {
          email: formData.email
        };
      } else {
        // Current user editing themselves can edit all fields except email
        payload = {
          firstName: formData.firstName,
          lastName: formData.lastName,
          phoneNumber: formData.phoneNumber,
          role: formData.role
        };
        
        // Add password to payload if changing password
        if (changePassword && formData.newPassword) {
          payload.password = formData.newPassword;
        }
      }

      await API.put(`/users/${user.id}`, payload);

      alert(`User ${formData.firstName} ${formData.lastName} has been successfully updated.`);
      onUserUpdated();
      onClose();
    } catch (error: any) {
      console.error('Failed to update user:', error);
      const errorMessage = error.response?.data?.error || 
                          error.response?.data?.errorMessage || 
                          error.response?.data?.message || 
                          'Failed to update user';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !user) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Edit User</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email - Editable only by Super Admin/Admin for other users */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <input
              type="email"
              name="email"
              value={canEditOnlyEmail ? formData.email : user.email}
              onChange={canEditOnlyEmail ? handleInputChange : undefined}
              readOnly={!canEditOnlyEmail}
              className={`w-full px-3 py-2 border border-gray-300 rounded-md ${
                canEditOnlyEmail 
                  ? 'focus:ring-2 focus:ring-blue-500 focus:border-transparent' 
                  : 'bg-gray-100 cursor-not-allowed text-gray-600'
              }`}
            />
            {!canEditOnlyEmail && (
              <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
            )}
          </div>

          {/* Other fields - Read-only for Super Admin/Admin editing other users */}
          {/* First Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              First Name
            </label>
            <input
              type="text"
              name="firstName"
              value={formData.firstName}
              onChange={canEditOnlyEmail ? undefined : handleInputChange}
              readOnly={canEditOnlyEmail}
              required={!canEditOnlyEmail}
              className={`w-full px-3 py-2 border border-gray-300 rounded-md ${
                canEditOnlyEmail 
                  ? 'bg-gray-100 cursor-not-allowed text-gray-600' 
                  : 'focus:ring-2 focus:ring-blue-500 focus:border-transparent'
              }`}
            />
          </div>

          {/* Last Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Last Name
            </label>
            <input
              type="text"
              name="lastName"
              value={formData.lastName}
              onChange={canEditOnlyEmail ? undefined : handleInputChange}
              readOnly={canEditOnlyEmail}
              required={!canEditOnlyEmail}
              className={`w-full px-3 py-2 border border-gray-300 rounded-md ${
                canEditOnlyEmail 
                  ? 'bg-gray-100 cursor-not-allowed text-gray-600' 
                  : 'focus:ring-2 focus:ring-blue-500 focus:border-transparent'
              }`}
            />
          </div>



          {/* Phone Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number
            </label>
            {canEditOnlyEmail ? (
              <input
                type="tel"
                value={formData.phoneNumber}
                readOnly
                placeholder="+1 (123) 456-7890"
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 cursor-not-allowed text-gray-600"
              />
            ) : (
              <PhoneNumberInput
                value={formData.phoneNumber}
                onChange={(phoneNumber) => setFormData(prev => ({ ...prev, phoneNumber }))}
                placeholder="Enter phone number"
                className="w-full"
              />
            )}
            {!canEditOnlyEmail && (
              <p className="text-xs text-gray-500 mt-1">
                Enter a unique phone number
              </p>
            )}
          </div>

          {/* Role */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Role
            </label>
            {canEditOnlyEmail ? (
              <input
                type="text"
                value={formData.role}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 cursor-not-allowed text-gray-600"
              />
            ) : (
              <select
                name="role"
                value={formData.role}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="SALES_REP">Sales Rep</option>
                <option value="SALES_MANAGER">Sales Manager</option>
                <option value="ADMIN">Admin</option>
              </select>
            )}
          </div>

          {/* Change Password Section - Only for self-editing */}
          {!canEditOnlyEmail && (
            <div className="border-t border-gray-200 pt-4">
              <div className="flex items-center mb-3">
                <input
                  type="checkbox"
                  id="changePassword"
                  checked={changePassword}
                  onChange={(e) => {
                    setChangePassword(e.target.checked);
                    if (!e.target.checked) {
                      setFormData(prev => ({ ...prev, newPassword: '', confirmPassword: '' }));
                      setPasswordValidation(validatePassword(''));
                      setShowPasswordRequirements(false);
                    }
                  }}
                  className="mr-2"
                />
                <label htmlFor="changePassword" className="text-sm font-medium text-gray-700">
                  Change Password
                </label>
              </div>

              {changePassword && (
                <div className="space-y-4">
                                     {/* New Password Field with Validation */}
                   <div className="space-y-2">
                     <label className="block text-sm font-medium text-gray-700">
                       New Password
                     </label>
                     <input 
                       type="password" 
                       name="newPassword" 
                       value={formData.newPassword} 
                       onChange={handleInputChange} 
                       className={`w-full px-3 py-2 border rounded-md ${
                         formData.newPassword && !passwordValidation.isValid ? 'border-red-500' : 'border-gray-300'
                       }`}
                     />
                     
                     {/* Password Strength Meter */}
                     <PasswordStrengthMeter 
                       password={formData.newPassword} 
                       showRequirements={showPasswordRequirements}
                     />
                   </div>
                  
                  {/* Confirm Password Field */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Confirm New Password
                    </label>
                    <input 
                      type="password" 
                      name="confirmPassword" 
                      value={formData.confirmPassword} 
                      onChange={handleInputChange} 
                      className={`w-full px-3 py-2 border rounded-md ${
                        formData.confirmPassword && formData.newPassword !== formData.confirmPassword ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {formData.confirmPassword && formData.newPassword !== formData.confirmPassword && (
                      <p className="text-red-600 text-sm mt-1">Passwords do not match</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="text-red-600 text-sm">{error}</div>
          )}

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Updating...' : 'Update User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditUserModal; 