import React, { useEffect, useState } from 'react';
import API from '../api/client';
import PageHeader from '../components/Common/PageHeader';
import { useAuthStore } from '../store/useAuthStore';
import AddNewUserModal from '../components/AddNewUserModal';

interface User {
  lastName: string;
  firstName: string;
  id: string;
  name: string;
  email: string;
  role: string;
  originalRole?: string;
  phoneNumber?: string;
  reportingTo?: string;
  isDeleted?: boolean;
  deletedAt?: string;
  deletedBy?: string;
}

interface AllUsersProps {
  hideHeader?: boolean;
  hideBreadcrumbs?: boolean;
}

const AllUsers: React.FC<AllUsersProps> = ({ hideHeader = false, hideBreadcrumbs = false }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editEmail, setEditEmail] = useState('');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const accessToken = useAuthStore((s) => s.accessToken);
  const currentUser = useAuthStore((s) => s.user);
  const domain = useAuthStore((s) => s.user?.email?.split('@')[1]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError('');

      const res = await API.get('/users/tenant-users');

      const data = res.data;
      const userArray = Array.isArray(data)
        ? data
        : Array.isArray(data?.data)
          ? data.data
          : [];

      setUsers(userArray);
    } catch (err: any) {
      setError('Failed to load users.');
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEditUser = async (userId: string, newEmail: string) => {
    try {
      await API.put(`/users/${userId}`, {
        email: newEmail
      });
      
      // Show success message
      alert('User email updated successfully!');
      
      // Close edit modal and refresh users
      setIsEditModalOpen(false);
      setEditingUser(null);
      setEditEmail('');
      fetchUsers();
    } catch (error: any) {
      console.error("Failed to update user email", error);
      
      // Show error message
      const errorMessage = error.response?.data?.message || "Failed to update user email";
      alert(`Error: ${errorMessage}`);
    }
  };

  const handleSoftDelete = async (userId: string, firstName: string, lastName: string) => {
    const userName = `${firstName} ${lastName}`;
    // Show confirmation dialog
    const isConfirmed = window.confirm(
      `Are you sure you want to delete ${userName}? This action cannot be undone.`
    );
    
    if (!isConfirmed) {
      return;
    }

    try {
      await API.put(`/users/${userId}/soft-delete`, {});
      
      // Show success message
      alert(`User ${userName} has been successfully deleted.`);
      
      fetchUsers(); // Refresh list
    } catch (error: any) {
      console.error("Failed to soft delete user", error);
      
      // Show error message
      const errorMessage = error.response?.data?.message || "Failed to delete user";
      alert(`Error: ${errorMessage}`);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Filter out soft-deleted users
  const filteredUsers = users.filter(user => !user.isDeleted);

  // Function to get manager name
  const getManagerName = (managerId: string) => {
    const manager = users.find(user => user.id === managerId);
    return manager ? `${manager.firstName} ${manager.lastName}` : 'Unknown Manager';
  };

  // Group users by original role for display, but use normalized role for permissions
  const groupedUsers = filteredUsers.reduce((acc, user) => {
    const displayRole = user.originalRole || user.role.toUpperCase();
    if (!acc[displayRole]) acc[displayRole] = [];
    acc[displayRole].push(user);
    return acc;
  }, {} as Record<string, User[]>);

  // Define role order
  const roleOrder = ['SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER', 'MANAGER', 'SALES_REP', 'REP'];

  // Sort roles based on the defined order
  const sortedRoles = Object.keys(groupedUsers).sort((a, b) => {
    const indexA = roleOrder.indexOf(a);
    const indexB = roleOrder.indexOf(b);
    
    // If both roles are in the order array, sort by their index
    if (indexA !== -1 && indexB !== -1) {
      return indexA - indexB;
    }
    
    // If only one role is in the order array, prioritize it
    if (indexA !== -1) return -1;
    if (indexB !== -1) return 1;
    
    // If neither role is in the order array, sort alphabetically
    return a.localeCompare(b);
  });

  return (
    <div className="p-6">
      {!hideHeader && (
        <div className="flex justify-between items-center mb-6">
          <PageHeader
            title="All Users"
            subtitle="List of all registered users grouped by role"
            breadcrumbs={hideBreadcrumbs ? [] : [{ name: 'Home', path: '/' }, { name: 'Users' }]}
          />
          {((currentUser?.role && currentUser.role.toUpperCase() === 'ADMIN') || (currentUser?.originalRole && currentUser.originalRole.toUpperCase() === 'SUPER_ADMIN')) && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              + Add New User
            </button>
          )}
        </div>
      )}

      {loading && <p className="text-gray-600">Loading users...</p>}
      {error && <p className="text-red-600">{error}</p>}

      {!loading && !error && users.length === 0 && (
        <p className="text-gray-500 italic">No users found.</p>
      )}

      {!loading && !error && (
        <div className="space-y-8 mt-6">
          {sortedRoles.map((role) => (
            <div key={role}>
              {/* Role Header */}
              <h3 className="text-xl font-semibold text-gray-800 mb-3">
                {role === 'SUPER_ADMIN' ? 'Super Admin' : 
                 role === 'ADMIN' ? 'Admin' :
                 role === 'SALES_MANAGER' ? 'Sales Manager' :
                 role === 'MANAGER' ? 'Manager' :
                 role === 'SALES_REP' ? 'Sales Representative' :
                 role === 'REP' ? 'Representative' :
                 role.charAt(0) + role.slice(1).toLowerCase()}
              </h3>

              {/* User List */}
              <ul className="space-y-3">
                {groupedUsers[role].map((user) => (
                  <li
                    key={user.id}
                    className="p-4 bg-white border rounded shadow hover:bg-gray-50 transition"
                  >
                    <div className="text-lg font-medium text-gray-800">
                      {user.firstName + " " + user.lastName}{' '}
                      <br />
                      <span className="text-sm text-gray-500">({user.email})</span>
                    </div>
                    <div className="text-sm text-gray-700 mt-1">
                      Role: <span className="font-semibold">
                        {user.originalRole === 'SUPER_ADMIN' ? 'Super Admin' : 
                         user.originalRole === 'ADMIN' ? 'Admin' :
                         user.originalRole === 'SALES_MANAGER' ? 'Sales Manager' :
                         user.originalRole === 'SALES_REP' ? 'Sales Representative' :
                         user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1).toLowerCase() : 'Unknown'}
                      </span>
                    </div>
                    {user.reportingTo && (
                      <div className="text-sm text-gray-600 mt-1">
                        Reports to: {getManagerName(user.reportingTo)}
                      </div>
                    )}

                    {((currentUser?.role && currentUser.role.toUpperCase() === 'ADMIN') || (currentUser?.originalRole && currentUser.originalRole.toUpperCase() === 'SUPER_ADMIN')) && (
                      <div className="mt-3 flex gap-4">
                        <button
                          onClick={() => {
                            setEditingUser(user);
                            setEditEmail(user.email);
                            setIsEditModalOpen(true);
                          }}
                          className="text-sm text-blue-600 hover:underline"
                        >
                          Edit
                        </button>
                        {currentUser?.id !== user.id && (
                          <button
                            onClick={() => handleSoftDelete(user.id, user.firstName, user.lastName)}
                            className="text-sm text-red-600 hover:underline"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      <AddNewUserModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onUserAdded={() => {
          setIsModalOpen(false);
          fetchUsers();
        }}
      />

      {/* Edit User Email Modal */}
      {isEditModalOpen && editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Edit User Email
            </h3>
            <div className="mb-4">
              <label htmlFor="edit-email" className="block text-sm font-medium text-gray-700 mb-2">
                User: {editingUser.firstName} {editingUser.lastName}
              </label>
              <input
                type="email"
                id="edit-email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter new email"
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditingUser(null);
                  setEditEmail('');
                }}
                className="px-4 py-2 text-gray-600 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleEditUser(editingUser.id, editEmail)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Update Email
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AllUsers;
