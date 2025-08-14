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
        return <Icons.Shield className="w-6 h-6 text-gray-400" />; // Default to shield for security
    }
  };

  const getRoleColor = (role: string) => {
    switch (role?.toUpperCase()) {
      case 'SUPER_ADMIN':
        return 'bg-gradient-to-br from-purple-500 to-purple-600';
      case 'ADMIN':
        return 'bg-gradient-to-br from-blue-500 to-blue-600';
      default:
        return 'bg-gradient-to-br from-gray-500 to-gray-600'; // Default for any unexpected roles
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
  const [userList, setUserList] = useState<OrganisationUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<OrganisationUser | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { user: currentUser } = useAuthStore();
  


  useEffect(() => {
    let isMounted = true;
    
    const fetchUsers = async () => {
      try {
        setLoading(true);
        console.log('🔍 Debug - Starting to fetch users...');
        
        // For SUPER_ADMIN, try to fetch all users, fallback to tenant users if needed
        let users;
        try {
          console.log('🔍 Debug - Attempting to fetch all users with getAllUsers()...');
          users = await usersApi.getAllUsers();
          console.log('🔍 Debug - getAllUsers() successful, got users:', users.length);
        } catch (error) {
          console.log('🔍 Debug - getAllUsers() failed, falling back to getAll():', error);
          try {
            users = await usersApi.getAll();
            console.log('🔍 Debug - getAll() successful, got users:', users.length);
          } catch (fallbackError) {
            console.log('🔍 Debug - getAll() also failed, trying direct API call:', fallbackError);
            // Try a direct API call as last resort
            try {
              const response = await fetch('/api/users/', {
                headers: {
                  'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
                  'Content-Type': 'application/json'
                }
              });
              if (response.ok) {
                const data = await response.json();
                users = data.data || data || [];
                console.log('🔍 Debug - Direct API call successful, got users:', users.length);
              } else {
                throw new Error(`Direct API call failed: ${response.status}`);
              }
            } catch (directError) {
              console.error('🔍 Debug - All API methods failed:', directError);
              users = [];
            }
          }
        }
        
        if (isMounted) {
          console.log('🔍 Debug - Raw API response total users:', users.length);
          
          // Only allow SuperAdmin and Admin users to be displayed for SuperAdmin view
          const filteredUsers = users.filter((user: any) => {
            const userRole = user.role?.toUpperCase();
            const userOriginalRole = user.originalRole?.toUpperCase();
            
            // More flexible role matching to catch variations
            const isSuperAdmin = userRole === 'SUPER_ADMIN' || userOriginalRole === 'SUPER_ADMIN' ||
                                userRole === 'SUPERADMIN' || userOriginalRole === 'SUPERADMIN' ||
                                userRole === 'ROOT' || userOriginalRole === 'ROOT';
            
            const isAdmin = userRole === 'ADMIN' || userOriginalRole === 'ADMIN' ||
                           userRole === 'ADMINISTRATOR' || userOriginalRole === 'ADMINISTRATOR';
            
            return isSuperAdmin || isAdmin;
          });
          
          console.log('🔍 Debug - Filtered users count:', filteredUsers.length);
          
          setUserList(filteredUsers);
        }
      } catch (error) {
        if (isMounted) {
          console.error('Failed to fetch users:', error);
          setError('Failed to load organisation data');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    
    fetchUsers();
    
    return () => {
      isMounted = false;
    };
  }, []);
  
  // Debug effect to monitor userList changes
  useEffect(() => {
    console.log('🔍 Debug - userList state changed, length:', userList.length);
  }, [userList]);

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
        return <Icons.Shield className="w-5 h-5 text-gray-400" />; // Default to shield for security
    }
  };

  const getRoleColor = (role: string) => {
    switch (role?.toUpperCase()) {
      case 'SUPER_ADMIN':
        return 'bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 shadow-purple-100';
      case 'ADMIN':
        return 'bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 shadow-blue-100';
      default:
        return 'bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200 shadow-gray-100'; // Default for any unexpected roles
    }
  };

  const getRoleDisplayName = (role: string) => {
    switch (role?.toUpperCase()) {
      case 'SUPER_ADMIN':
        return 'Super Admin';
      case 'ADMIN':
        return 'Admin';
      default:
        return 'Unknown Role'; // Only SuperAdmin and Admin are allowed
    }
  };

  const filterUsersByRole = (role: string) => {
    console.log(`🔍 Debug - filterUsersByRole called with role:`, role, `userList length:`, userList.length);
    
    // Guard clause: if userList is empty, return empty array
    if (userList.length === 0) {
      console.log(`🔍 Debug - userList is empty, returning empty array`);
      return [];
    }
    
    // Create a fresh copy of userList to ensure we're working with the latest data
    const currentUserList = [...userList];
    
    const filtered = currentUserList.filter(user => {
      const userRole = user.role?.toUpperCase();
      const userOriginalRole = user.originalRole?.toUpperCase();
      const targetRole = role.toUpperCase();
      
      // Only allow SuperAdmin and Admin roles for SuperAdmin view
      if (targetRole === 'SUPER_ADMIN') {
        const isSuperAdmin = userRole === 'SUPER_ADMIN' || userOriginalRole === 'SUPER_ADMIN' ||
                            userRole === 'SUPERADMIN' || userOriginalRole === 'SUPERADMIN' ||
                            userRole === 'ROOT' || userOriginalRole === 'ROOT';
        return isSuperAdmin;
      } else if (targetRole === 'ADMIN') {
        // For ADMIN role, show ALL Admin users (don't exclude current user)
        const isAdmin = userRole === 'ADMIN' || userOriginalRole === 'ADMIN' ||
                       userRole === 'ADMINISTRATOR' || userOriginalRole === 'ADMINISTRATOR';
        return isAdmin;
      } else {
        // Block all other roles (Manager, Sales Rep, etc.) for SuperAdmin view
        return false;
      }
    });
    
    console.log(`🔍 Debug - filterUsersByRole result for ${role}:`, filtered.length, 'users found');
    
    // Additional safeguard: remove any duplicates based on ID
    const uniqueFiltered = filtered.filter((user, index, arr) => {
      const firstIndex = arr.findIndex(u => u.id === user.id);
      return firstIndex === index;
    });
    
    return uniqueFiltered;
  };

  const getChildRoles = (parentRole: string): string[] => {
    switch (parentRole.toUpperCase()) {
      case 'SUPER_ADMIN':
        return ['ADMIN']; // SUPER_ADMIN shows ADMIN users below them
      case 'ADMIN':
        return []; // ADMIN users don't show any children for security
      default:
        return [];
    }
  };

  const handleUserClick = (user: OrganisationUser) => {
    setSelectedUser(user);
    setIsModalOpen(true);
  };

  const TreeNode: React.FC<{ users: OrganisationUser[]; role: string; level: number; onUserClick: (user: OrganisationUser) => void }> = ({ users, role, level, onUserClick }) => {
    if (users.length === 0) return null;

    return (
      <div className="flex flex-col items-center w-full">
        {users.map((user, index) => {
          const childRoles = getChildRoles(role);
          let uniqueDirectReports: OrganisationUser[] = [];
          
          // For SUPER_ADMIN, show actual ADMIN users below them
          if (role.toUpperCase() === 'SUPER_ADMIN' && childRoles.includes('ADMIN')) {
            console.log('🔍 Debug - Getting ADMIN users for SUPER_ADMIN...');
            uniqueDirectReports = filterUsersByRole('ADMIN');
            console.log('🔍 Debug - ADMIN users for SUPER_ADMIN count:', uniqueDirectReports.length);
          } else {
            // For other roles, no children displayed for security
            uniqueDirectReports = [];
          }
          
                  
          
          return (
            <div key={`${user.id}-${user.email}-${index}`} className="flex flex-col items-center w-full">
              {/* User card */}
              <div 
                className={`flex items-center p-4 mb-6 rounded-xl border-2 shadow-lg hover:shadow-xl transition-all duration-300 ${getRoleColor(role)} min-w-64 backdrop-blur-sm bg-white/90 cursor-pointer hover:scale-105 hover:border-blue-300`}
                onClick={() => onUserClick(user)}
                title="Click to view user details"
              >
                <div className="flex-shrink-0 mr-3">
                  <div className="p-2 rounded-full bg-gradient-to-br from-blue-50 to-blue-100">
                    {getRoleIcon(role)}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-base font-semibold text-gray-900 truncate">
                        {getUserFullName(user)}
                      </p>
                      <p className="text-sm text-gray-500 truncate">
                        {user.email}
                      </p>
                    </div>
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-sm font-medium capitalize shadow-sm">
                      {getRoleDisplayName(role)}
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Connecting line down from user card */}
              {role.toUpperCase() === 'SUPER_ADMIN' && (
                <div className="w-1 h-6 bg-gradient-to-b from-gray-300 to-gray-200 mb-3 rounded-full"></div>
              )}

              {/* Admin Users Display */}
              {uniqueDirectReports.length > 0 && (
                <div className="relative w-full">
                  {/* Horizontal line connecting to Admin users */}
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-gray-300 via-gray-200 to-gray-300 rounded-full"></div>
                  
                  {/* Admin Users Cards */}
                  <div className="flex justify-center space-x-8 pt-3">
                    {uniqueDirectReports.map((adminUser, adminIndex) => (
                      <div key={`${adminUser.id}-${adminUser.email}-${adminIndex}`} className="flex flex-col items-center">
                        {/* Vertical line from horizontal line to Admin user */}
                        <div className="w-1 h-6 bg-gradient-to-b from-gray-300 to-gray-200 mb-3 rounded-full"></div>
                        
                        {/* Admin User Card */}
                        <div 
                          className="flex items-center p-4 rounded-xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100 shadow-lg min-w-64 backdrop-blur-sm bg-white/90 cursor-pointer hover:scale-105 hover:border-blue-300 transition-all duration-300"
                          onClick={() => onUserClick(adminUser)}
                          title="Click to view user details"
                        >
                          <div className="flex-shrink-0 mr-3">
                            <div className="p-2 rounded-full bg-gradient-to-br from-blue-50 to-blue-100">
                              <Icons.Shield className="w-5 h-5 text-blue-600" />
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-base font-semibold text-gray-900">
                                  {getUserFullName(adminUser)}
                                </p>
                                <p className="text-sm text-gray-500">
                                  {adminUser.email}
                                </p>
                              </div>
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-sm font-medium capitalize shadow-sm bg-blue-100 text-blue-800">
                                Admin
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 p-6">
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
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-12">
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
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 p-6">
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

  // For SuperAdmin, show only the specific rootuser@sharp.com at root and ADMIN users below
  // Only calculate these if userList is populated
  let allRootUsers: OrganisationUser[] = [];
  let rootUsers: OrganisationUser[] = [];
  let adminUsers: OrganisationUser[] = [];
  
  if (userList.length > 0) {
    console.log('🔍 Debug - userList is populated, calculating role-based users...');
    allRootUsers = filterUsersByRole('SUPER_ADMIN');
    rootUsers = allRootUsers.filter(user => user.email === 'rootuser@sharp.com');
    adminUsers = filterUsersByRole('ADMIN');
  } else {
    console.log('🔍 Debug - userList is empty, skipping role calculations');
  }
  
  console.log('🔍 Debug - Main render summary:', {
    userListLength: userList.length,
    allRootUsersCount: allRootUsers.length,
    rootUsersCount: rootUsers.length,
    adminUsersCount: adminUsers.length
  });


  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 p-6">
      <PageHeader
        title="Super Admin Organisation Tree"
        subtitle="View organisational role structure (individual user details hidden for security)"
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Settings' },
          { name: 'Super Admin Organisation Tree' }
        ]}
      />

      <div className="max-w-7xl mx-auto">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20">

          {/* SuperAdmin Organizational Structure Overview */}
          <div className="p-6 bg-gradient-to-r from-purple-50 to-blue-50 border-b border-purple-200">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-white rounded-xl shadow-sm border border-purple-200">
                <div className="text-2xl font-bold text-purple-600">{rootUsers.length}</div>
                <div className="text-sm text-purple-800 font-medium">Super Admin Users</div>
              </div>
              <div className="text-center p-4 bg-white rounded-xl shadow-sm border border-blue-200">
                <div className="text-2xl font-bold text-blue-600">{adminUsers.length}</div>
                <div className="text-sm text-blue-800 font-medium">Admin Users</div>
              </div>
            </div>
          </div>

          <div className="p-8 max-h-[70vh] overflow-y-auto">
            {rootUsers.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Icons.Users className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Super Admin Users Found</h3>
                <p className="text-gray-600">No users found in the Super Admin hierarchy.</p>
              </div>
            ) : (
              <div className="w-full overflow-x-auto orgtree-scrollbar">
                <div className="min-w-max mx-auto px-12 py-2">
                  <TreeNode users={rootUsers} role="SUPER_ADMIN" level={0} onUserClick={handleUserClick} />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Enhanced Legend */}
        <div className="mt-8 bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/30 p-6 overflow-hidden">
          {/* Legend Header */}
          <div className="relative mb-6">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-100/20 via-blue-100/20 to-indigo-100/20"></div>
            <div className="relative z-10 flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-600 rounded-xl flex items-center justify-center">
                <Icons.Info className="w-4 h-4 text-white" />
              </div>
              <h4 className="text-lg font-bold text-gray-900">SuperAdmin Role Legend</h4>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="group relative p-4 bg-gradient-to-r from-purple-50 to-purple-100 rounded-2xl border-2 border-purple-200 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
              <div className="absolute top-0 right-0 w-2 h-2 bg-purple-400 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300"></div>
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-gradient-to-br from-purple-100 to-purple-200 rounded-full shadow-md">
                  <Icons.Crown className="w-4 h-4 text-purple-600" />
                </div>
                <span className="text-sm font-semibold text-purple-800">Super Admin</span>
              </div>
            </div>
            
            <div className="group relative p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl border-2 border-blue-200 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
              <div className="absolute top-0 right-0 w-2 h-2 bg-blue-400 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300"></div>
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full shadow-md">
                  <Icons.Shield className="w-4 h-4 text-blue-600" />
                </div>
                <span className="text-sm font-semibold text-blue-800">Admin</span>
              </div>
            </div>
          </div>
          {/* Legend Footer */}
          <div className="mt-6 pt-4 border-t border-gray-200/50">
            <p className="text-xs text-gray-500 text-center">
              This view shows only Super Admin and Admin users for security purposes
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

// Add custom CSS for better scrolling experience
const customStyles = `
  .orgtree-scrollbar::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }
  
  .orgtree-scrollbar::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.05);
    border-radius: 4px;
  }
  
  .orgtree-scrollbar::-webkit-scrollbar-thumb {
    background: linear-gradient(135deg, #8b5cf6, #3b82f6);
    border-radius: 4px;
    transition: all 0.3s ease;
  }
  
  .orgtree-scrollbar::-webkit-scrollbar-thumb:hover {
    background: linear-gradient(135deg, #7c3aed, #2563eb);
    transform: scale(1.1);
  }
`;

// Inject custom styles
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style');
  styleElement.textContent = customStyles;
  document.head.appendChild(styleElement);
} 