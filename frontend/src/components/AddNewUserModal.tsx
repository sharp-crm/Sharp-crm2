import React, { useState, useEffect } from 'react';
import API from '../api/client';
import { useAuthStore } from '../store/useAuthStore';
import PhoneNumberInput from './Common/PhoneNumberInput';
import DatePicker from './Common/DatePicker';
import PasswordStrengthMeter from './Common/PasswordStrengthMeter';
import { validatePassword } from '../utils/passwordValidation';

interface AddNewUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUserAdded: () => void;
}

const AddNewUserModal: React.FC<AddNewUserModalProps> = ({ isOpen, onClose, onUserAdded }) => {
  const currentUser = useAuthStore((s) => s.user);
  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';
  const isAdmin = currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'Admin' || currentUser?.role === 'SuperAdmin';
  
  const getInitialFormData = () => ({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phoneNumber: '',
    role: isSuperAdmin ? 'ADMIN' : 'SALES_REP', // Super admin defaults to ADMIN
    dateOfBirth: '',
  });

  const [formData, setFormData] = useState(getInitialFormData);
  const [error, setError] = useState<string | null>(null);
  const [resetKey, setResetKey] = useState(0);
  const [passwordValidation, setPasswordValidation] = useState(validatePassword(''));
  const [showPasswordRequirements, setShowPasswordRequirements] = useState(false);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData(getInitialFormData());
      setError(null);
      setResetKey(prev => prev + 1); // Force component re-render
    }
  }, [isOpen, isSuperAdmin]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleEscKey);
    return () => document.removeEventListener('keydown', handleEscKey);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    
    // Real-time password validation
    if (name === 'password') {
      setPasswordValidation(validatePassword(value));
      setShowPasswordRequirements(value.length > 0);
    }
  };

  const resetForm = () => {
    setFormData(getInitialFormData());
    setError(null);
    setResetKey(prev => prev + 1); // Force component re-render
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    // Validate password
    const passwordCheck = validatePassword(formData.password);
    if (!passwordCheck.isValid) {
      setError('Password does not meet requirements');
      return;
    }
    
    // Check password confirmation
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    try {
      const { confirmPassword, ...payload } = formData; // Remove confirmPassword from payload
      
      const res = await API.post('/users', payload);
      if (res.status === 201) {
        resetForm(); // Reset form after successful creation
        onUserAdded(); // refresh list
        onClose(); // close modal
      }
    } catch (err: any) {
      if (err.response?.data?.error?.includes('PhoneNumberIndex')) {
        setError('Please enter a valid phone number');
      } else {
        setError(err.response?.data?.error || err.response?.data?.errorMessage || 'Failed to create user. Please try again.');
      }
    }
  };

  const handleClose = () => {
    resetForm(); // Reset form when modal is closed
    onClose();
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    // Only close if clicking the overlay itself, not the modal content
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40"
      onClick={handleOverlayClick}
    >
      <div className="bg-white rounded-xl p-8 w-full max-w-lg shadow-lg max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold text-center mb-4">
          {isSuperAdmin ? 'Add New Admin' : 'Add New User'}
        </h2>
        {error && (
          <div className="text-red-600 text-sm mb-4 bg-red-100 px-4 py-2 rounded">{error}</div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-4">
            <input name="firstName" placeholder="First Name" value={formData.firstName} onChange={handleChange} required className="w-1/2 p-2 border rounded" />
            <input name="lastName" placeholder="Last Name" value={formData.lastName} onChange={handleChange} required className="w-1/2 p-2 border rounded" />
          </div>
          <input type="email" name="email" placeholder="Email" value={formData.email} onChange={handleChange} required className="w-full p-2 border rounded" />
          
          {/* Password Field with Validation */}
          <div className="space-y-2">
            <input 
              type="password" 
              name="password" 
              placeholder="Password" 
              value={formData.password} 
              onChange={handleChange} 
              required 
              className={`w-full p-2 border rounded ${
                formData.password && !passwordValidation.isValid ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            
            {/* Password Strength Meter */}
            <PasswordStrengthMeter 
              password={formData.password} 
              showRequirements={showPasswordRequirements}
            />
          </div>
          
          {/* Confirm Password Field */}
          <input 
            type="password" 
            name="confirmPassword" 
            placeholder="Confirm Password" 
            value={formData.confirmPassword} 
            onChange={handleChange} 
            required 
            className={`w-full p-2 border rounded ${
              formData.confirmPassword && formData.password !== formData.confirmPassword ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {formData.confirmPassword && formData.password !== formData.confirmPassword && (
            <p className="text-red-600 text-sm">Passwords do not match</p>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
            <PhoneNumberInput
              key={`phone-${resetKey}`} // Force re-render when form resets
              value={formData.phoneNumber}
              onChange={(phoneNumber) => setFormData(prev => ({ ...prev, phoneNumber }))}
              placeholder="Enter phone number"
              className="w-full"
            />
          </div>
          <select name="role" value={formData.role} onChange={handleChange} required className="w-full p-2 border rounded">
            {isSuperAdmin ? (
              // Super Admin can only create Admins
              <option value="ADMIN">Admin</option>
            ) : isAdmin ? (
              // Admins can create Sales Reps and Sales Managers, but not other Admins
              <>
                <option value="SALES_REP">Sales Rep</option>
                <option value="SALES_MANAGER">Sales Manager</option>
              </>
            ) : (
              // Other roles (if any) have no creation permissions
              <option value="" disabled>No permissions to create users</option>
            )}
          </select>
          <DatePicker
            key={`date-${resetKey}`} // Force re-render when form resets
            value={formData.dateOfBirth}
            onChange={(date) => setFormData(prev => ({ ...prev, dateOfBirth: date }))}
            placeholder="Select date of birth"
            label="Date of Birth"
            required
            className="w-full"
          />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={handleClose} className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Create</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddNewUserModal;
