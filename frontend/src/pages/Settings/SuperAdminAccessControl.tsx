import React, { useEffect, useState } from 'react';
import * as Icons from 'lucide-react';
import { usersApi, User } from '../../api/services';
import { useAuthStore } from '../../store/useAuthStore';
import PageHeader from '../../components/Common/PageHeader';

interface SuperAdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  originalRole?: string;
  tenantId: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  createdAt?: string;
  updatedAt?: string;
}

const SuperAdminAccessControl: React.FC = () => {
  const [users, setUsers] = useState<SuperAdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('ALL');
  const { user: currentUser } = useAuthStore();

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        let allUsers;
        try {
          allUsers = await usersApi.getAllUsers();
        } catch (error) {
          allUsers = await usersApi.getAll();
        }
        
        // Filter only SUPER_ADMIN and ADMIN users
        const filteredUsers = allUsers.filter(user => {
          const userRole = user.role?.toUpperCase();
          const userOriginalRole = user.originalRole?.toUpperCase();
          return userRole === 'SUPER_ADMIN' || userRole === 'ADMIN' || 
                 userOriginalRole === 'SUPER_ADMIN' || userOriginalRole === 'ADMIN';
        });
        
        setUsers(filteredUsers);
      } catch (error) {
        console.error('Failed to fetch users:', error);
        setError('Failed to load users');
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const getUserFullName = (user: SuperAdminUser) => {
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    return user.name || user.email;
  };

  const getRoleIcon = (role: string) => {
    switch (role?.toUpperCase()) {
      case 'SUPER_ADMIN':
        return <Icons.Crown className="w-5 h-5 text-purple-600" />;
      case 'ADMIN':
        return <Icons.Shield className="w-5 h-5 text-blue-600" />;
      default:
        return <Icons.User className="w-5 h-5 text-gray-400" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role?.toUpperCase()) {
      case 'SUPER_ADMIN':
        return 'bg-gradient-to-r from-purple-500 to-purple-600';
      case 'ADMIN':
        return 'bg-gradient-to-r from-blue-500 to-blue-600';
      default:
        return 'bg-gradient-to-r from-gray-500 to-gray-600';
    }
  };

  const getRoleDisplayName = (role: string) => {
    switch (role?.toUpperCase()) {
      case 'SUPER_ADMIN':
        return 'Super Admin';
      case 'ADMIN':
        return 'Admin';
      default:
        return role?.toLowerCase().replace('_', ' ') || 'Unknown';
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = getUserFullName(user).toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = selectedRole === 'ALL' || 
                       user.role?.toUpperCase() === selectedRole ||
                       user.originalRole?.toUpperCase() === selectedRole;
    
    return matchesSearch && matchesRole;
  });

  const superAdminUsers = filteredUsers.filter(user => 
    user.role?.toUpperCase() === 'SUPER_ADMIN' || 
    user.originalRole?.toUpperCase() === 'SUPER_ADMIN'
  );

  const adminUsers = filteredUsers.filter(user => 
    user.role?.toUpperCase() === 'ADMIN' || 
    user.originalRole?.toUpperCase() === 'ADMIN'
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 p-6">
        <PageHeader
          title="Admin Access Control"
          subtitle="Manage Super Admin and Admin user access"
          breadcrumbs={[
            { name: 'Home', path: '/' },
            { name: 'Settings' },
            { name: 'Admin Access Control' }
          ]}
        />
        <div className="max-w-7xl mx-auto">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-12">
            <div className="flex items-center justify-center h-64">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                <span className="text-lg font-medium text-gray-700">Loading users...</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 p-6">
        <PageHeader
          title="Admin Access Control"
          subtitle="Manage Super Admin and Admin user access"
          breadcrumbs={[
            { name: 'Home', path: '/' },
            { name: 'Settings' },
            { name: 'Admin Access Control' }
          ]}
        />
        <div className="max-w-7xl mx-auto">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-12">
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-red-100 to-red-200 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Icons.AlertCircle className="w-10 h-10 text-red-500" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Data</h3>
                <p className="text-gray-600">{error}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 p-6">
      <PageHeader
        title="Admin Access Control"
        subtitle="Manage Super Admin and Admin user access"
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Settings' },
          { name: 'Admin Access Control' }
        ]}
      />

      <div className="max-w-7xl mx-auto space-y-6">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Users</p>
                <p className="text-3xl font-bold text-gray-900">{filteredUsers.length}</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                <Icons.Users className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Super Admins</p>
                <p className="text-3xl font-bold text-purple-600">{superAdminUsers.length}</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Icons.Crown className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Admin Users</p>
                <p className="text-3xl font-bold text-blue-600">{adminUsers.length}</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                <Icons.Shield className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filter Controls */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
                Search Users
              </label>
              <div className="relative">
                <Icons.Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  id="search"
                  placeholder="Search by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            
            <div className="md:w-48">
              <label htmlFor="role-filter" className="block text-sm font-medium text-gray-700 mb-2">
                Filter by Role
              </label>
              <select
                id="role-filter"
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="ALL">All Roles</option>
                <option value="SUPER_ADMIN">Super Admin</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
          </div>
        </div>

        {/* Users List */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20">
          <div className="p-6 border-b border-gray-200/50">
            <h3 className="text-lg font-semibold text-gray-900">
              Users ({filteredUsers.length})
            </h3>
          </div>
          
          <div className="p-6">
            {filteredUsers.length === 0 ? (
              <div className="text-center py-12">
                <Icons.Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Users Found</h3>
                <p className="text-gray-600">
                  {searchTerm || selectedRole !== 'ALL' 
                    ? 'Try adjusting your search or filter criteria.'
                    : 'No users found in the system.'
                  }
                </p>
              </div>
            ) : (
                             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 {filteredUsers.map((user, index) => (
                   <div
                     key={`${user.id}-${user.email}-${index}`}
                     className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-all duration-200 hover:border-gray-300"
                   >
                    <div className="flex items-start justify-between mb-4">
                      <div className={`w-12 h-12 ${getRoleColor(user.role)} rounded-lg flex items-center justify-center`}>
                        {getRoleIcon(user.role)}
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${
                        user.role?.toUpperCase() === 'SUPER_ADMIN' 
                          ? 'bg-purple-100 text-purple-800' 
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {getRoleDisplayName(user.role)}
                      </span>
                    </div>
                    
                    <div className="space-y-3">
                      <div>
                        <h4 className="text-lg font-semibold text-gray-900">
                          {getUserFullName(user)}
                        </h4>
                        <p className="text-sm text-gray-500">{user.email}</p>
                      </div>
                      
                      {user.phoneNumber && (
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <Icons.Phone className="w-4 h-4" />
                          <span>{user.phoneNumber}</span>
                        </div>
                      )}
                      
                      {user.tenantId && (
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <Icons.Building className="w-4 h-4" />
                          <span>Tenant: {user.tenantId}</span>
                        </div>
                      )}
                      
                      {user.createdAt && (
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <Icons.Calendar className="w-4 h-4" />
                          <span>Created: {new Date(user.createdAt).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <div className="flex space-x-2">
                        <button className="flex-1 bg-blue-50 text-blue-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors">
                          View Details
                        </button>
                        <button className="flex-1 bg-gray-50 text-gray-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors">
                          Edit
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Information Panel */}
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-6 rounded-2xl shadow-xl border border-purple-200">
          <div className="flex items-start gap-4">
            <Icons.Info className="w-6 h-6 text-purple-600 mt-1 flex-shrink-0" />
            <div>
                              <h4 className="text-lg font-semibold text-purple-800 mb-2">Admin Access Control</h4>
              <ul className="text-sm text-purple-700 space-y-1">
                <li>• Manage Super Admin and Admin user accounts</li>
                <li>• Control access permissions for administrative functions</li>
                <li>• Monitor user activity and system access</li>
                <li>• Configure role-based permissions and restrictions</li>
                <li>• Oversee administrative hierarchy and structure</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminAccessControl; 