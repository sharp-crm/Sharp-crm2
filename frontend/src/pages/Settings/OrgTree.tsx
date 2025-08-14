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
  // Handle escape key
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
      case 'SALES_MANAGER':
      case 'MANAGER':
        return <Icons.Users className="w-6 h-6 text-green-600" />;
      case 'SALES_REP':
      case 'REP':
        return <Icons.User className="w-6 h-6 text-gray-600" />;
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
      case 'SALES_MANAGER':
      case 'MANAGER':
        return 'bg-gradient-to-br from-green-500 to-green-600';
      case 'SALES_REP':
      case 'REP':
        return 'bg-gradient-to-br from-gray-500 to-gray-600';
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
        {/* Header - Fixed */}
        <div className={`relative p-8 ${getRoleColor(user.role)} text-white overflow-hidden flex-shrink-0`}>
          {/* Gradient overlay */}
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
        
        {/* Content - Scrollable */}
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
          {/* Gradient fade indicator */}
          <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-white to-transparent pointer-events-none"></div>
        </div>
        
        {/* Footer - Fixed */}
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

const OrgTree: React.FC = () => {
  const [userList, setUserList] = useState<OrganisationUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<OrganisationUser | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { user: currentUser } = useAuthStore();



  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        console.log('🔍 Debug - Fetching users from API...');
        
        // For SUPER_ADMIN users, fetch all users from all tenants
        // For regular users, fetch only tenant users
        let users;
        if (currentUser?.originalRole?.toUpperCase() === 'SUPER_ADMIN' || 
            currentUser?.role?.toUpperCase() === 'SUPER_ADMIN') {
          try {
            console.log('🔍 Debug - SUPER_ADMIN detected, fetching all users...');
            users = await usersApi.getAllUsers();
            console.log('🔍 Debug - Successfully fetched all users for SUPER_ADMIN');
          } catch (error) {
            console.log('🔍 Debug - Failed to fetch all users, falling back to tenant users:', error);
            users = await usersApi.getAll();
          }
        } else {
          console.log('🔍 Debug - Regular user, fetching tenant users...');
          users = await usersApi.getAll();
        }
        
        console.log('🔍 Debug - API response:', {
          totalUsers: users.length,
          users: users.map(u => ({ id: u.id, role: u.role, originalRole: u.originalRole, email: u.email }))
        });
        // Allow all role types for organizational chart display
        const filteredUsers = users.filter((user: any) => {
          const userRole = user.role?.toUpperCase();
          const userOriginalRole = user.originalRole?.toUpperCase();
          const isAllowed = userRole === 'SUPER_ADMIN' || userRole === 'ADMIN' || userRole === 'SALES_MANAGER' || userRole === 'SALES_REP' ||
                 userOriginalRole === 'SUPER_ADMIN' || userOriginalRole === 'ADMIN' || userOriginalRole === 'SALES_MANAGER' || userOriginalRole === 'SALES_REP' ||
                 userRole === 'MANAGER' || userRole === 'REP' ||
                 userOriginalRole === 'MANAGER' || userOriginalRole === 'REP';
          
          if (!isAllowed) {
            console.log('🔍 Debug - Filtered out user:', { 
              email: user.email, 
              role: user.role, 
              originalRole: user.originalRole 
            });
          }
          
          return isAllowed;
        });
        
        console.log('🔍 Debug - After filtering:', {
          totalUsers: users.length,
          filteredUsers: filteredUsers.length,
          roles: filteredUsers.map(u => ({ email: u.email, role: u.role, originalRole: u.originalRole }))
        });
        setUserList(filteredUsers);
      } catch (error) {
        console.error('Failed to fetch users:', error);
        setError('Failed to load organisation data');
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, [currentUser]);

  const getUserFullName = (user: OrganisationUser) => {
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    return user.name || user.email;
  };

  const filterUsersByRole = (role: string) => {
    const usersToDisplay = getUsersToDisplay();
    console.log('🔍 Debug - filterUsersByRole:', { role, totalUsers: usersToDisplay.length });
    
    const filtered = usersToDisplay.filter(user => {
      const userRole = user.role?.toUpperCase();
      const userOriginalRole = user.originalRole?.toUpperCase();
      const targetRole = role.toUpperCase();
      
      // Allow all role types for organizational chart display
      if (targetRole === 'SUPER_ADMIN') {
        return userRole === 'SUPER_ADMIN' || userOriginalRole === 'SUPER_ADMIN';
      } else if (targetRole === 'ADMIN') {
        return userRole === 'ADMIN' || userOriginalRole === 'ADMIN';
      } else if (targetRole === 'SALES_MANAGER') {
        return userRole === 'SALES_MANAGER' || userOriginalRole === 'SALES_MANAGER' || userRole === 'MANAGER' || userOriginalRole === 'MANAGER';
      } else if (targetRole === 'SALES_REP') {
        return userRole === 'SALES_REP' || userOriginalRole === 'SALES_REP' || userRole === 'REP' || userOriginalRole === 'REP';
      } else if (targetRole === 'REP') {
        return userRole === 'SALES_REP' || userOriginalRole === 'SALES_REP' || userRole === 'REP' || userOriginalRole === 'REP';
      } else {
        // Block any other unexpected roles for security
        return false;
      }
    });
    
    console.log('🔍 Debug - filterUsersByRole result:', { role, filteredCount: filtered.length, filtered: filtered.map(u => ({ id: u.id, email: u.email, role: u.role, originalRole: u.originalRole })) });
    
    // Remove duplicates at the source using userId (since id might be undefined)
    const uniqueFiltered = filtered.filter((user, index, arr) => {
      const firstIndex = arr.findIndex(u => (u.userId || u.id) === (user.userId || user.id));
      return firstIndex === index;
    });
    
    return uniqueFiltered;
  };

  const getRoleIcon = (role: string) => {
    switch (role?.toUpperCase()) {
      case 'SUPER_ADMIN':
        return <Icons.Crown className="w-5 h-5 text-purple-600" />;
      case 'ADMIN':
        return <Icons.Shield className="w-5 h-5 text-blue-600" />;
      case 'SALES_MANAGER':
      case 'MANAGER':
        return <Icons.Users className="w-5 h-5 text-green-600" />;
      case 'SALES_REP':
      case 'REP':
        return <Icons.User className="w-5 h-5 text-gray-600" />;
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
      case 'SALES_MANAGER':
      case 'MANAGER':
        return 'bg-gradient-to-br from-green-50 to-green-100 border-green-200 shadow-green-100';
      case 'SALES_REP':
      case 'REP':
        return 'bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200 shadow-gray-100';
      default:
        return 'bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200 shadow-gray-100'; // Default for any unexpected roles
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
          console.log('🔍 Debug - TreeNode:', { user: user.email, role, childRoles });
          
          const directReports = childRoles.flatMap(childRole => 
            filterUsersByRole(childRole).filter(u => {
              // For SUPER_ADMIN, show all ADMIN users below them (no reporting relationship check)
              if (currentUser?.originalRole?.toUpperCase() === 'SUPER_ADMIN' && role.toUpperCase() === 'SUPER_ADMIN' && childRole.toUpperCase() === 'ADMIN') {
                return true;
              }
              // For ADMIN users, show all SALES_MANAGER users in their tenant
              if (role.toUpperCase() === 'ADMIN' && childRole.toUpperCase() === 'SALES_MANAGER') {
                return u.tenantId === user.tenantId; // Show SALES_MANAGER users in same tenant
              }
              // For SALES_MANAGER users, show their direct SALES_REP reports
              if (role.toUpperCase() === 'SALES_MANAGER' && childRole.toUpperCase() === 'SALES_REP') {
                // Check if the user reports to this manager OR if they're in the same tenant (fallback)
                const isDirectReport = u.reportingTo === (user.userId || user.id);
                const isSameTenant = u.tenantId === user.tenantId;
                console.log('🔍 Debug - SALES_REP filtering:', { 
                  userEmail: user.email, 
                  childUserEmail: u.email, 
                  childRole: u.role, 
                  reportingTo: u.reportingTo, 
                  userUserId: user.userId || user.id,
                  isDirectReport,
                  isSameTenant,
                  result: isDirectReport || isSameTenant
                });
                return isDirectReport || isSameTenant;
              }
              // For regular hierarchy, check reporting relationship
              return u.reportingTo === (user.userId || user.id);
            })
          );
          
          console.log('🔍 Debug - Direct reports:', { user: user.email, directReportsCount: directReports.length, directReports: directReports.map(u => ({ id: u.id, email: u.email, role: u.role })) });
          
          // Remove duplicates based on user ID more effectively
          const uniqueDirectReports = directReports.filter((u, index, arr) => {
            const firstIndex = arr.findIndex(user => (user.userId || user.id) === (u.userId || u.id));
            return firstIndex === index;
          });
          
          return (
            <div key={`${user.id}-${user.email}-${index}`} className="flex flex-col items-center w-full mb-8">
              {/* User card - Enhanced with better shadows and hover effects */}
              <div 
                className={`group relative flex items-center p-6 mb-8 rounded-2xl border-2 shadow-xl hover:shadow-2xl transition-all duration-500 ${getRoleColor(role)} min-w-72 backdrop-blur-sm bg-white/95 cursor-pointer hover:scale-105 hover:border-blue-400 transform-gpu`}
                onClick={() => onUserClick(user)}
                title="Click to view user details"
              >
                {/* Subtle background pattern */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                
                <div className="relative z-10 flex items-center w-full">
                  <div className="flex-shrink-0 mr-4">
                    <div className="p-3 rounded-full bg-gradient-to-br from-blue-50 to-blue-100 shadow-lg group-hover:shadow-xl transition-shadow duration-300">
                  {getRoleIcon(role)}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                      <div className="min-w-0">
                        <p className="text-lg font-bold text-gray-900 truncate group-hover:text-blue-800 transition-colors duration-300">
                        {getUserFullName(user)}
                      </p>
                        <p className="text-sm text-gray-600 truncate group-hover:text-blue-600 transition-colors duration-300">
                        {user.email}
                      </p>
                    </div>
                      <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-semibold capitalize shadow-lg bg-white/80 backdrop-blur-sm border border-white/50 group-hover:bg-blue-50 group-hover:border-blue-200 transition-all duration-300">
                      {role.toLowerCase().replace('_', ' ')}
                    </span>
                    </div>
                  </div>
                </div>
                
                {/* Hover indicator */}
                <div className="absolute top-0 right-0 w-3 h-3 bg-blue-400 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 transform scale-0 group-hover:scale-100"></div>
              </div>
              
              {/* Enhanced connecting line down from user card */}
              {uniqueDirectReports.length > 0 && (
                <div className="relative w-1 h-8 mb-4">
                  <div className="absolute inset-0 bg-gradient-to-b from-blue-300 via-blue-200 to-gray-200 rounded-full shadow-lg"></div>
                  <div className="absolute inset-0 bg-gradient-to-b from-blue-400 to-blue-300 rounded-full animate-pulse opacity-75"></div>
                </div>
              )}

              {/* Children container - Enhanced with better spacing and visual hierarchy */}
              {uniqueDirectReports.length > 0 && (
                <div className="relative w-full">
                  {/* Enhanced horizontal line connecting children */}
                  <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-300 via-green-300 to-blue-300 rounded-full shadow-lg"></div>
                  
                  {/* Children cards with improved spacing */}
                  <div className="flex justify-center space-x-16 pt-4 min-w-max mx-auto px-6">
                    {uniqueDirectReports.map((childUser, childIndex) => {
                      const childChildRoles = getChildRoles(childUser.role || '');
                      const grandChildren = childChildRoles.flatMap(childRole => 
                          filterUsersByRole(childRole).filter(u => u.reportingTo === (childUser.userId || childUser.id))
                      );
                        
                        // Remove duplicates from grandChildren as well
                        const uniqueGrandChildren = grandChildren.filter((u, index, arr) => {
                          const firstIndex = arr.findIndex(user => (user.userId || user.id) === (u.userId || u.id));
                          return firstIndex === index;
                        });

                return (
                        <div key={`${childUser.id}-${childUser.email}-${childIndex}`} className="flex flex-col items-center flex-shrink-0 min-w-0">
                          {/* Enhanced vertical line from horizontal line to child */}
                          <div className="relative w-1 h-8 mb-4">
                            <div className="absolute inset-0 bg-gradient-to-b from-green-300 via-green-200 to-gray-200 rounded-full shadow-lg"></div>
                            <div className="absolute inset-0 bg-gradient-to-b from-green-400 to-green-300 rounded-full animate-pulse opacity-75"></div>
                          </div>
                          
                          {/* Enhanced child user card */}
                          <div 
                            className={`group relative flex items-center p-4 mb-8 rounded-xl border-2 shadow-lg hover:shadow-2xl transition-all duration-500 ${getRoleColor(childUser.role || '')} min-w-60 max-w-72 backdrop-blur-sm bg-white/95 cursor-pointer hover:scale-105 hover:border-green-400 transform-gpu`}
                            onClick={() => onUserClick(childUser)}
                            title="Click to view user details"
                          >
                            {/* Subtle background pattern */}
                            <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                            
                            <div className="relative z-10 flex items-center w-full">
                              <div className="flex-shrink-0 mr-3">
                                <div className="p-2.5 rounded-full bg-gradient-to-br from-green-50 to-green-100 shadow-lg group-hover:shadow-xl transition-shadow duration-300">
                                {getRoleIcon(childUser.role || '')}
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <div className="min-w-0 flex-1">
                                    <p className="text-base font-semibold text-gray-900 truncate group-hover:text-green-800 transition-colors duration-300">
                                    {getUserFullName(childUser)}
                                  </p>
                                    <p className="text-sm text-gray-600 truncate group-hover:text-green-600 transition-colors duration-300">
                                    {childUser.email}
                                  </p>
                                </div>
                                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold capitalize shadow-lg bg-white/80 backdrop-blur-sm border border-white/50 group-hover:bg-green-50 group-hover:border-green-200 transition-all duration-300 flex-shrink-0 ml-2">
                                  {(childUser.role || '').toLowerCase().replace('_', ' ')}
                                </span>
                              </div>
                            </div>
                          </div>

                            {/* Hover indicator */}
                            <div className="absolute top-0 right-0 w-2.5 h-2.5 bg-green-400 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 transform scale-0 group-hover:scale-100"></div>
                          </div>

                          {/* Enhanced connecting line down from child card */}
                          {uniqueGrandChildren.length > 0 && (
                            <div className="relative w-1 h-8 mb-4">
                              <div className="absolute inset-0 bg-gradient-to-b from-gray-300 via-gray-200 to-gray-100 rounded-full shadow-lg"></div>
                              <div className="absolute inset-0 bg-gradient-to-b from-gray-400 to-gray-300 rounded-full animate-pulse opacity-75"></div>
                            </div>
                          )}

                          {/* Enhanced Grandchildren - Display vertically for Sales Reps */}
                          {uniqueGrandChildren.length > 0 && (
                            <div className="relative w-full">
                              {/* Grandchildren cards - Vertical layout with improved spacing */}
                              <div className="flex flex-col items-center space-y-4 pt-4">
                                {uniqueGrandChildren.map((grandChild, grandChildIndex) => (
                                  <div key={`${grandChild.id}-${grandChild.email}-${grandChildIndex}`} className="flex flex-col items-center">
                                    {/* Enhanced horizontal line from vertical line to grandchild */}
                                    <div className="w-8 h-1 bg-gradient-to-r from-gray-300 via-gray-200 to-gray-100 mb-4 rounded-full shadow-md"></div>
                                    
                                    {/* Enhanced grandchild user card */}
                                    <div 
                                      className={`group relative flex items-center p-3 rounded-lg border-2 shadow-md hover:shadow-xl transition-all duration-500 ${getRoleColor(grandChild.role || '')} min-w-52 max-w-60 backdrop-blur-sm bg-white/95 cursor-pointer hover:scale-105 hover:border-gray-400 transform-gpu`}
                                      onClick={() => onUserClick(grandChild)}
                                      title="Click to view user details"
                                    >
                                      {/* Subtle background pattern */}
                                      <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                                      
                                      <div className="relative z-10 flex items-center w-full">
                                      <div className="flex-shrink-0 mr-2">
                                          <div className="p-2 rounded-full bg-gradient-to-br from-gray-50 to-gray-100 shadow-md group-hover:shadow-lg transition-shadow duration-300">
                                          {getRoleIcon(grandChild.role || '')}
                                        </div>
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between">
                                          <div className="min-w-0 flex-1">
                                              <p className="text-sm font-semibold text-gray-900 truncate group-hover:text-gray-800 transition-colors duration-300">
                                              {getUserFullName(grandChild)}
                                            </p>
                                              <p className="text-xs text-gray-600 truncate group-hover:text-gray-700 transition-colors duration-300">
                                              {grandChild.email}
                                            </p>
                                          </div>
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize shadow-md bg-white/80 backdrop-blur-sm border border-white/50 group-hover:bg-gray-50 group-hover:border-gray-200 transition-all duration-300 flex-shrink-0 ml-2">
                                            {(grandChild.role || '').toLowerCase().replace('_', ' ')}
                                          </span>
                                          </div>
                                        </div>
                                      </div>
                                      
                                      {/* Hover indicator */}
                                      <div className="absolute top-0 right-0 w-2 h-2 bg-gray-400 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 transform scale-0 group-hover:scale-100"></div>
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
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const getChildRoles = (parentRole: string): string[] => {
    switch (parentRole.toUpperCase()) {
      case 'SUPER_ADMIN':
        return ['ADMIN']; // SUPER_ADMIN shows ADMIN role structure only
      case 'ADMIN':
        return ['SALES_MANAGER']; // ADMIN users can show SALES_MANAGER users
      case 'SALES_MANAGER':
      case 'MANAGER':
        return ['SALES_REP', 'REP']; // SALES_MANAGER users can show SALES_REP users
      default:
        return []; // No children for any other roles
    }
  };

  const getRootRole = (): string => {
    const currentUserRole = currentUser?.role?.toUpperCase();
    const currentUserOriginalRole = currentUser?.originalRole?.toUpperCase();
    
    if (currentUserOriginalRole === 'SUPER_ADMIN' || currentUserRole === 'SUPER_ADMIN') {
      return 'SUPER_ADMIN';
    }
    
    return 'ADMIN';
  };

  const getUsersToDisplay = (): OrganisationUser[] => {
    const currentUserRole = currentUser?.role?.toUpperCase();
    const currentUserOriginalRole = currentUser?.originalRole?.toUpperCase();
    
    console.log('🔍 Debug - getUsersToDisplay:', { 
      currentUserRole, 
      currentUserOriginalRole, 
      userListLength: userList.length,
      userList: userList.map(u => ({ id: u.id, email: u.email, role: u.role, originalRole: u.originalRole }))
    });
    
    if (currentUserOriginalRole === 'SUPER_ADMIN' || currentUserRole === 'SUPER_ADMIN') {
      // SUPER_ADMIN sees ALL users from ALL tenants
      return userList;
    } else {
      // Regular users see users in their tenant
      return userList;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 p-6">
        <PageHeader
          title="Organisation Tree"
          subtitle="View your organisation hierarchy"
          breadcrumbs={[
            { name: 'Home', path: '/' },
            { name: 'Settings' },
            { name: 'Organisation Tree' }
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
          title="Organisation Tree"
          subtitle="View your organisation hierarchy"
          breadcrumbs={[
            { name: 'Home', path: '/' },
            { name: 'Settings' },
            { name: 'Organisation Tree' }
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

  const rootRole = getRootRole();
  const rootUsers = filterUsersByRole(rootRole);
  
  const adminUsers = filterUsersByRole('ADMIN');
  const salesManagerUsers = filterUsersByRole('SALES_MANAGER');
  const salesRepUsers = filterUsersByRole('SALES_REP');
  
  console.log('🔍 Debug - Main render:', {
    rootRole,
    rootUsersCount: rootUsers.length,
    rootUsers: rootUsers.map(u => ({ id: u.id, email: u.email, role: u.role })),
    adminUsersCount: adminUsers.length,
    adminUsers: adminUsers.map(u => ({ id: u.id, email: u.email, role: u.role })),
    salesManagerUsersCount: salesManagerUsers.length,
    salesRepUsersCount: salesRepUsers.length,
    salesRepUsers: salesRepUsers.map(u => ({ id: u.id, email: u.email, role: u.role, reportingTo: u.reportingTo, tenantId: u.tenantId })),
    totalUsers: userList.length
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 p-6">
      <PageHeader
        title="Organisation Tree"
        subtitle="View your organisation hierarchy"
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Settings' },
          { name: 'Organisation Tree' }
        ]}
      />

      <div className="max-w-7xl mx-auto">
        <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/30 overflow-hidden">


          {/* Organizational Structure Overview */}
          <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-200">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-white rounded-xl shadow-sm border border-blue-200">
                <div className="text-2xl font-bold text-blue-600">{rootUsers.length}</div>
                <div className="text-sm text-blue-800 font-medium">Root Users</div>
              </div>
              <div className="text-center p-4 bg-white rounded-xl shadow-sm border border-blue-200">
                <div className="text-2xl font-bold text-blue-600">{adminUsers.length}</div>
                <div className="text-sm text-blue-800 font-medium">Admin Users</div>
                </div>
              <div className="text-center p-4 bg-white rounded-xl shadow-sm border border-green-200">
                <div className="text-2xl font-bold text-green-600">{salesManagerUsers.length}</div>
                <div className="text-sm text-green-800 font-medium">Sales Managers</div>
                </div>
              <div className="text-center p-4 bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="text-2xl font-bold text-gray-600">{salesRepUsers.length}</div>
                <div className="text-sm text-gray-800 font-medium">Sales Reps</div>
              </div>
            </div>
          </div>

          <div className="p-8 max-h-[70vh] overflow-y-auto bg-gradient-to-br from-gray-50/50 to-blue-50/50">
            {rootUsers.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                  <Icons.Users className="w-10 h-10 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">No Users Found</h3>
                <p className="text-gray-600 mb-4">No users found in your organisation structure.</p>
                <div className="w-16 h-1 bg-gradient-to-r from-gray-300 to-gray-400 rounded-full mx-auto"></div>
              </div>
            ) : (
              <div className="w-full overflow-x-auto orgtree-scrollbar">
                <div className="min-w-max mx-auto px-16 py-4">
                  <TreeNode users={rootUsers} role={rootRole} level={0} onUserClick={handleUserClick} />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Enhanced Legend */}
        <div className="mt-8 bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/30 p-6 overflow-hidden">
          {/* Legend Header */}
          <div className="relative mb-6">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-100/20 via-indigo-100/20 to-purple-100/20"></div>
            <div className="relative z-10 flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                <Icons.Info className="w-4 h-4 text-white" />
              </div>
              <h4 className="text-lg font-bold text-gray-900">Role Legend</h4>
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Only show Super Admin role if current user is SUPER_ADMIN */}
            {currentUser?.originalRole?.toUpperCase() === 'SUPER_ADMIN' && (
              <div className="group relative p-4 bg-gradient-to-r from-purple-50 to-purple-100 rounded-2xl border-2 border-purple-200 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
                <div className="absolute top-0 right-0 w-2 h-2 bg-purple-400 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300"></div>
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-gradient-to-br from-purple-100 to-purple-200 rounded-full shadow-md">
                    <Icons.Crown className="w-4 h-4 text-purple-600" />
                  </div>
                  <span className="text-sm font-semibold text-purple-800">Super Admin</span>
                </div>
              </div>
            )}
            
            <div className="group relative p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-2xl border-2 border-blue-200 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
              <div className="absolute top-0 right-0 w-2 h-2 bg-blue-400 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300"></div>
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full shadow-md">
                  <Icons.Shield className="w-4 h-4 text-blue-600" />
                </div>
                <span className="text-sm font-semibold text-blue-800">Admin</span>
              </div>
            </div>
            
            <div className="group relative p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-2xl border-2 border-green-200 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
              <div className="absolute top-0 right-0 w-2 h-2 bg-green-400 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300"></div>
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-gradient-to-br from-green-100 to-green-200 rounded-full shadow-md">
                  <Icons.Users className="w-4 h-4 text-green-600" />
                </div>
                <span className="text-sm font-semibold text-green-800">SALES_MANAGER</span>
              </div>
            </div>
            
            <div className="group relative p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl border-2 border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
              <div className="absolute top-0 right-0 w-2 h-2 bg-gray-400 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300"></div>
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full shadow-md">
                  <Icons.User className="w-4 h-4 text-gray-600" />
                </div>
                <span className="text-sm font-semibold text-gray-800">SALES_REP</span>
              </div>
            </div>
          </div>
          
          {/* Legend Footer */}
          <div className="mt-6 pt-4 border-t border-gray-200/50">
            <p className="text-xs text-gray-500 text-center">
              Click on any user card to view detailed information
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

export default OrgTree;

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
    background: linear-gradient(135deg, #3b82f6, #8b5cf6);
    border-radius: 4px;
    transition: all 0.3s ease;
  }
  
  .orgtree-scrollbar::-webkit-scrollbar-thumb:hover {
    background: linear-gradient(135deg, #2563eb, #7c3aed);
    transform: scale(1.1);
  }
`;

// Inject custom styles
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style');
  styleElement.textContent = customStyles;
  document.head.appendChild(styleElement);
}

