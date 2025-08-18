import React, { useEffect, useState } from 'react';
import * as Icons from 'lucide-react';
import { usersApi, User } from '../../api/services';
import { useAuthStore } from '../../store/useAuthStore';
import PageHeader from '../../components/Common/PageHeader';

interface OrganisationUser {
  id: string;
  userId?: string;
  name: string;
  email: string;
  role: string;
  originalRole?: string;
  tenantId: string;
  firstName?: string;
  lastName?: string;
  reportingTo?: string;
  phoneNumber?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface UserDetailsModalProps {
  user: OrganisationUser | null;
  isOpen: boolean;
  onClose: () => void;
}

const UserDetailsModal: React.FC<UserDetailsModalProps> = ({ user, isOpen, onClose }) => {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  if (!isOpen || !user) return null;

  const getRoleIcon = (role: string) => {
    switch (role?.toUpperCase()) {
      case 'SUPER_ADMIN':
        return <Icons.Crown className="w-6 h-6 text-purple-600" />;
      case 'ADMIN':
        return <Icons.Shield className="w-6 h-6 text-blue-600" />;
      default:
        return <Icons.Shield className="w-6 h-6 text-gray-400" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role?.toUpperCase()) {
      case 'SUPER_ADMIN':
        return 'bg-gradient-to-br from-purple-500 to-purple-600';
      case 'ADMIN':
        return 'bg-gradient-to-br from-blue-500 to-blue-600';
      default:
        return 'bg-gradient-to-br from-gray-500 to-gray-600';
    }
  };

  const getUserFullName = (user: OrganisationUser) => {
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    return user.name || user.email;
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 transition-all duration-200" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4 max-h-[85vh] overflow-hidden transform transition-all duration-300 scale-100 hover:scale-[1.02] flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={`relative p-8 ${getRoleColor(user.role)} text-white overflow-hidden flex-shrink-0`}>
          <div className="absolute inset-0 bg-gradient-to-br from-black/10 to-transparent"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-2xl font-bold">User Profile</h3>
              <button
                onClick={onClose}
                className="text-white/80 hover:text-white transition-all duration-200 p-2 rounded-full hover:bg-white/20 hover:scale-110"
                title="Close modal"
              >
                <Icons.X className="w-5 h-5" />
              </button>
            </div>
            
            {/* User Avatar and Basic Info */}
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm border border-white/30">
                {getRoleIcon(user.role)}
              </div>
              <div className="flex-1">
                <h4 className="text-xl font-semibold">{getUserFullName(user)}</h4>
                <p className="text-white/90 text-sm">{user.email}</p>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-white/20 backdrop-blur-sm mt-2 border border-white/30">
                  {user.role.toLowerCase().replace('_', ' ')}
                </span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 relative">
          <div className="p-8 pb-4">
            <div className="space-y-6">
              {/* Personal Information */}
              <div>
                <h5 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Personal Information</h5>
                <div className="grid grid-cols-1 gap-4">
                  <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Icons.User className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-gray-500 font-medium">Full Name</p>
                      <p className="text-sm font-semibold text-gray-900">{getUserFullName(user)}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200">
                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                      <Icons.Mail className="w-4 h-4 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-gray-500 font-medium">Email Address</p>
                      <p className="text-sm font-semibold text-gray-900">{user.email}</p>
                    </div>
                  </div>
                  
                  {user.phoneNumber && (
                    <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200">
                      <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                        <Icons.Phone className="w-4 h-4 text-purple-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-gray-500 font-medium">Phone Number</p>
                        <p className="text-sm font-semibold text-gray-900">{user.phoneNumber}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* System Information */}
              <div>
                <h5 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">System Information</h5>
                <div className="grid grid-cols-1 gap-4">
                  <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200">
                    <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                      <Icons.Shield className="w-4 h-4 text-orange-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-gray-500 font-medium">Role</p>
                      <p className="text-sm font-semibold text-gray-900 capitalize">{user.role.toLowerCase().replace('_', ' ')}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200">
                    <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                      <Icons.Hash className="w-4 h-4 text-indigo-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-gray-500 font-medium">User ID</p>
                      <p className="text-sm font-mono text-gray-900">{user.id}</p>
                    </div>
                  </div>
                  
                  {user.tenantId && (
                    <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200">
                      <div className="w-8 h-8 bg-teal-100 rounded-lg flex items-center justify-center">
                        <Icons.Building className="w-4 h-4 text-teal-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-gray-500 font-medium">Tenant ID</p>
                        <p className="text-sm font-mono text-gray-900">{user.tenantId}</p>
                      </div>
                    </div>
                  )}
                  
                  {user.createdAt && (
                    <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200">
                      <div className="w-8 h-8 bg-pink-100 rounded-lg flex items-center justify-center">
                        <Icons.Calendar className="w-4 h-4 text-pink-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-gray-500 font-medium">Created At</p>
                        <p className="text-sm font-semibold text-gray-900">
                          {new Date(user.createdAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-white to-transparent pointer-events-none"></div>
        </div>
        
        {/* Footer */}
        <div className="px-8 py-6 bg-gray-50 border-t border-gray-200 flex-shrink-0">
          <button
            onClick={onClose}
            className="w-full bg-gray-900 text-white py-3 px-6 rounded-xl font-semibold hover:bg-gray-800 transition-colors duration-200 shadow-lg hover:shadow-xl"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

UserDetailsModal.displayName = 'UserDetailsModal';

const SuperAdminOrgTree: React.FC = () => {
  const [superAdminUsers, setSuperAdminUsers] = useState<OrganisationUser[]>([]);
  const [adminUsers, setAdminUsers] = useState<OrganisationUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<OrganisationUser | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { user: currentUser } = useAuthStore();

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log('🔍 Starting to fetch users for SuperAdmin Org Tree...');
        
        // Fetch all users using the super-admin endpoint
        let allUsers: User[] = [];
        
        try {
          // First try the super-admin specific endpoint
          const response = await fetch('/api/users/super-admin/all', {
                headers: {
                  'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
                  'Content-Type': 'application/json'
                }
              });
          
              if (response.ok) {
                const data = await response.json();
            allUsers = data.data || [];
            console.log('🔍 Successfully fetched users from super-admin endpoint:', allUsers.length);
              } else {
            throw new Error(`Super-admin endpoint failed: ${response.status}`);
              }
        } catch (superAdminError) {
          console.log('🔍 Super-admin endpoint failed, trying getAllUsers():', superAdminError);
          
          try {
            allUsers = await usersApi.getAllUsers();
            console.log('🔍 Successfully fetched users from getAllUsers():', allUsers.length);
          } catch (getAllUsersError) {
            console.log('🔍 getAllUsers() failed, trying getAll():', getAllUsersError);
            
            try {
              allUsers = await usersApi.getAll();
              console.log('🔍 Successfully fetched users from getAll():', allUsers.length);
            } catch (getAllError) {
              console.log('🔍 All API methods failed:', getAllError);
              throw new Error('Failed to fetch users from any available endpoint');
            }
          }
        }
        
        console.log('🔍 Total users fetched:', allUsers.length);
        
        // Filter users by role
        const superAdmins = allUsers.filter((user: any) => {
          const role = user.role?.toUpperCase();
          const originalRole = user.originalRole?.toUpperCase();
          return role === 'SUPER_ADMIN' || originalRole === 'SUPER_ADMIN' ||
                 role === 'SUPERADMIN' || originalRole === 'SUPERADMIN' ||
                 role === 'ROOT' || originalRole === 'ROOT';
        });
            
        const admins = allUsers.filter((user: any) => {
          const role = user.role?.toUpperCase();
          const originalRole = user.originalRole?.toUpperCase();
          return role === 'ADMIN' || originalRole === 'ADMIN' ||
                 role === 'ADMINISTRATOR' || originalRole === 'ADMINISTRATOR';
        });
        
        console.log('🔍 Filtered users:', {
          superAdmins: superAdmins.length,
          admins: admins.length,
          total: allUsers.length
        });
        
        // Map to OrganisationUser format
        const mapToOrganisationUser = (user: any): OrganisationUser => ({
          id: user.id || user.userId,
          userId: user.userId,
          name: user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim(),
          email: user.email,
          role: user.role,
          originalRole: user.originalRole,
          tenantId: user.tenantId,
          firstName: user.firstName,
          lastName: user.lastName,
          reportingTo: user.reportingTo,
          phoneNumber: user.phoneNumber,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        });
        
        setSuperAdminUsers(superAdmins.map(mapToOrganisationUser));
        setAdminUsers(admins.map(mapToOrganisationUser));
        
      } catch (error) {
          console.error('Failed to fetch users:', error);
          setError('Failed to load organisation data');
      } finally {
          setLoading(false);
      }
    };
    
    fetchUsers();
  }, []);

  const getUserFullName = (user: OrganisationUser) => {
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
        return <Icons.Shield className="w-5 h-5 text-gray-400" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role?.toUpperCase()) {
      case 'SUPER_ADMIN':
        return 'bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 shadow-purple-100';
      case 'ADMIN':
        return 'bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 shadow-blue-100';
      default:
        return 'bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200 shadow-gray-100';
    }
  };

  const getRoleDisplayName = (role: string) => {
    switch (role?.toUpperCase()) {
      case 'SUPER_ADMIN':
        return 'Super Admin';
      case 'ADMIN':
        return 'Admin';
      default:
        return 'Unknown Role';
    }
  };

  const handleUserClick = (user: OrganisationUser) => {
    setSelectedUser(user);
    setIsModalOpen(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 p-4 sm:p-6">
        <PageHeader
          title="Super Admin Organisation Tree"
          subtitle="View and manage the complete organisational hierarchy"
          breadcrumbs={[
            { name: 'Home', path: '/' },
            { name: 'Settings' },
            { name: 'Super Admin Organisation Tree' }
          ]}
        />
        <div className="max-w-7xl mx-auto">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8 sm:p-12">
            <div className="flex items-center justify-center h-64">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                <span className="text-lg font-medium text-gray-700">Loading organisation data...</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 p-4 sm:p-6">
        <PageHeader
          title="Super Admin Organisation Tree"
          subtitle="View and manage the complete organisational hierarchy"
          breadcrumbs={[
            { name: 'Home', path: '/' },
            { name: 'Settings' },
            { name: 'Super Admin Organisation Tree' }
          ]}
        />
        <div className="max-w-7xl mx-auto">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8 sm:p-12">
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 p-4 sm:p-6">
      <PageHeader
        title="Super Admin Organisation Tree"
        subtitle="View organisational role structure for Super Admin and Admin users"
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Settings' },
          { name: 'Super Admin Organisation Tree' }
        ]}
      />

      <div className="max-w-7xl mx-auto space-y-6">
        {/* Statistics Overview */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-white/30 p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="text-center p-6 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl shadow-sm border border-purple-200">
              <div className="text-3xl font-bold text-purple-600 mb-2">{superAdminUsers.length}</div>
                <div className="text-sm text-purple-800 font-medium">Super Admin Users</div>
              </div>
            <div className="text-center p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl shadow-sm border border-blue-200">
              <div className="text-3xl font-bold text-blue-600 mb-2">{adminUsers.length}</div>
                <div className="text-sm text-blue-800 font-medium">Admin Users</div>
              </div>
            </div>
          </div>

        {/* Main Content Container */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-white/30 overflow-hidden">
          <div className="p-6 sm:p-8">
            {/* Super Admin Users Section */}
            {superAdminUsers.length > 0 && (
              <div className="mb-12">
                <div className="flex items-center justify-center mb-8">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-100 to-purple-200 rounded-full flex items-center justify-center">
                      <Icons.Crown className="w-5 h-5 text-purple-600" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900">Super Admin Users</h3>
                  </div>
                </div>
                
                <div className="flex justify-center">
                  <div className="flex justify-center w-full">
                    {superAdminUsers.map((user, index) => (
                      <div 
                        key={`super-admin-${user.id}-${index}`}
                        className={`group flex items-center p-6 rounded-xl border-2 shadow-lg hover:shadow-xl transition-all duration-300 ${getRoleColor(user.role)} cursor-pointer hover:scale-105 hover:border-purple-300 transform min-w-[250px] max-w-md`}
                        onClick={() => handleUserClick(user)}
                        title="Click to view user details"
                      >
                        <div className="flex-shrink-0 mr-4">
                          <div className="p-3 rounded-full bg-gradient-to-br from-purple-50 to-purple-100 group-hover:scale-110 transition-transform duration-300">
                            {getRoleIcon(user.role)}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="space-y-2">
                            <p className="text-lg font-semibold text-gray-900 truncate group-hover:text-purple-700 transition-colors duration-200">
                              {getUserFullName(user)}
                            </p>
                            <p className="text-sm text-gray-600 truncate group-hover:text-purple-600 transition-colors duration-200">
                              {user.email}
                            </p>
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium capitalize shadow-sm bg-purple-100 text-purple-800 border border-purple-200">
                              {getRoleDisplayName(user.role)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Admin Users Section */}
            {adminUsers.length > 0 && (
              <div>
                <div className="flex items-center justify-center mb-8">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center">
                      <Icons.Shield className="w-5 h-5 text-blue-600" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900">Admin Users</h3>
                  </div>
                </div>
                
                <div className="flex justify-center">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 w-full max-w-6xl mx-auto">
                    {adminUsers.map((user, index) => (
                      <div 
                        key={`admin-${user.id}-${index}`}
                        className={`group flex items-center p-6 rounded-xl border-2 shadow-lg hover:shadow-xl transition-all duration-300 ${getRoleColor(user.role)} cursor-pointer hover:scale-105 hover:border-blue-300 transform`}
                        onClick={() => handleUserClick(user)}
                        title="Click to view user details"
                      >
                        <div className="flex-shrink-0 mr-4">
                          <div className="p-3 rounded-full bg-gradient-to-br from-blue-50 to-blue-100 group-hover:scale-110 transition-transform duration-300">
                            {getRoleIcon(user.role)}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="space-y-2">
                            <p className="text-lg font-semibold text-gray-900 truncate group-hover:text-blue-700 transition-colors duration-200">
                              {getUserFullName(user)}
                            </p>
                            <p className="text-sm text-gray-600 truncate group-hover:text-blue-600 transition-colors duration-200">
                              {user.email}
                            </p>
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium capitalize shadow-sm bg-blue-100 text-blue-800 border border-blue-200">
                              {getRoleDisplayName(user.role)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* No Users Found */}
            {superAdminUsers.length === 0 && adminUsers.length === 0 && (
              <div className="text-center py-16">
                <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Icons.Users className="w-10 h-10 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">No Users Found</h3>
                <p className="text-gray-600 max-w-md mx-auto">No Super Admin or Admin users found in the system. Please check your user configuration.</p>
              </div>
            )}
          </div>
        </div>

        {/* Enhanced Legend */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-white/30 p-6 overflow-hidden">
          {/* Legend Header */}
          <div className="relative mb-6">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-100/20 via-blue-100/20 to-indigo-100/20"></div>
            <div className="relative z-10 flex items-center justify-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-600 rounded-xl flex items-center justify-center">
                <Icons.Info className="w-4 h-4 text-white" />
              </div>
              <h4 className="text-lg font-bold text-gray-900">SuperAdmin Role Legend</h4>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl mx-auto">
            <div className="group relative p-6 bg-gradient-to-r from-purple-50 to-purple-100 rounded-2xl border-2 border-purple-200 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
              <div className="absolute top-0 right-0 w-3 h-3 bg-purple-400 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300"></div>
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-gradient-to-br from-purple-100 to-purple-200 rounded-full shadow-md">
                  <Icons.Crown className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <span className="text-base font-semibold text-purple-800">Super Admin</span>
                  <p className="text-sm text-purple-600 mt-1">Highest level access</p>
                </div>
              </div>
            </div>
            
            <div className="group relative p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl border-2 border-blue-200 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
              <div className="absolute top-0 right-0 w-3 h-3 bg-blue-400 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300"></div>
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full shadow-md">
                  <Icons.Shield className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <span className="text-base font-semibold text-blue-800">Admin</span>
                  <p className="text-sm text-blue-600 mt-1">Administrative access</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Legend Footer */}
          <div className="mt-8 pt-6 border-t border-gray-200/50 text-center">
            <p className="text-sm text-gray-600 max-w-lg mx-auto">
              This view shows only Super Admin and Admin users for security purposes. Click on any user card to view detailed information.
            </p>
          </div>
        </div>
      </div>

      {/* User Details Modal */}
      <UserDetailsModal
        user={selectedUser}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedUser(null);
        }}
      />
    </div>
  );
};

export default SuperAdminOrgTree;