import React, { useEffect, useState } from 'react';
import * as Icons from 'lucide-react';
import { usersApi, User } from '../../api/services';
import { useAuthStore } from '../../store/useAuthStore';
import PageHeader from '../../components/Common/PageHeader';

interface OrganisationUser {
  id: string;
  name: string;
  email: string;
  role: string;
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
        return <Icons.Users className="w-6 h-6 text-green-600" />;
      case 'SALES_REP':
        return <Icons.User className="w-6 h-6 text-gray-600" />;
      default:
        return <Icons.User className="w-6 h-6 text-gray-400" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role?.toUpperCase()) {
      case 'SUPER_ADMIN':
        return 'bg-gradient-to-br from-purple-500 to-purple-600';
      case 'ADMIN':
        return 'bg-gradient-to-br from-blue-500 to-blue-600';
      case 'SALES_MANAGER':
        return 'bg-gradient-to-br from-green-500 to-green-600';
      case 'SALES_REP':
        return 'bg-gradient-to-br from-gray-500 to-gray-600';
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
        const users = await usersApi.getAll();
        setUserList(users);
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

  const filterUsersByRole = (role: string) => {
    return userList.filter(user => {
      const userRole = user.role?.toUpperCase();
      const targetRole = role.toUpperCase();
      
      // The backend already handles filtering based on user role and tenant
      // SuperAdmin sees users they created (admins), others see users in their tenant
      return userRole === targetRole;
    });
  };

  const getRoleIcon = (role: string) => {
    switch (role?.toUpperCase()) {
      case 'SUPER_ADMIN':
        return <Icons.Crown className="w-5 h-5 text-purple-600" />;
      case 'ADMIN':
        return <Icons.Shield className="w-5 h-5 text-blue-600" />;
      case 'SALES_MANAGER':
        return <Icons.Users className="w-5 h-5 text-green-600" />;
      case 'SALES_REP':
        return <Icons.User className="w-5 h-5 text-gray-600" />;
      default:
        return <Icons.User className="w-5 h-5 text-gray-400" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role?.toUpperCase()) {
      case 'SUPER_ADMIN':
        return 'bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 shadow-purple-100';
      case 'ADMIN':
        return 'bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 shadow-blue-100';
      case 'SALES_MANAGER':
        return 'bg-gradient-to-br from-green-50 to-green-100 border-green-200 shadow-green-100';
      case 'SALES_REP':
        return 'bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200 shadow-gray-100';
      default:
        return 'bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200 shadow-gray-100';
    }
  };

  const TreeNode: React.FC<{ users: OrganisationUser[]; role: string; level: number }> = ({ users, role, level }) => {
    if (users.length === 0) return null;

    const handleUserClick = (user: OrganisationUser) => {
      setSelectedUser(user);
      setIsModalOpen(true);
    };

    return (
      <div className="flex flex-col items-center w-full">
        {users.map((user, index) => {
          const childRoles = getChildRoles(role);
          const directReports = childRoles.flatMap(childRole => 
            filterUsersByRole(childRole).filter(u => {
              if (currentUser?.role?.toUpperCase() === 'SUPER_ADMIN' && role.toUpperCase() === 'SUPER_ADMIN' && childRole.toUpperCase() === 'ADMIN') {
                return true;
              }
              return u.reportingTo === user.id;
            })
          );
          
          return (
            <div key={user.id} className="flex flex-col items-center w-full">
              {/* User card */}
              <div 
                className={`flex items-center p-4 mb-6 rounded-xl border-2 shadow-lg hover:shadow-xl transition-all duration-300 ${getRoleColor(role)} min-w-64 backdrop-blur-sm bg-white/90 cursor-pointer hover:scale-105 hover:border-blue-300`}
                onClick={() => handleUserClick(user)}
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
                      {role.toLowerCase().replace('_', ' ')}
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Connecting line down from user card */}
              {directReports.length > 0 && (
                <div className="w-1 h-6 bg-gradient-to-b from-gray-300 to-gray-200 mb-3 rounded-full"></div>
              )}

              {/* Children container */}
              {directReports.length > 0 && (
                <div className="relative w-full">
                  {/* Horizontal line connecting children (Sales Managers) */}
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-gray-300 via-gray-200 to-gray-300 rounded-full"></div>
                  
                  {/* Children cards */}
                  <div className="flex justify-center space-x-12 pt-3 min-w-max mx-auto px-4">
                    {directReports.map((childUser, childIndex) => {
                      const childChildRoles = getChildRoles(childUser.role || '');
                      const grandChildren = childChildRoles.flatMap(childRole => 
                        filterUsersByRole(childRole).filter(u => u.reportingTo === childUser.id)
                      );

                return (
                        <div key={childUser.id} className="flex flex-col items-center flex-shrink-0 min-w-0">
                          {/* Vertical line from horizontal line to child */}
                          <div className="w-1 h-6 bg-gradient-to-b from-gray-300 to-gray-200 mb-3 rounded-full"></div>
                          
                          {/* Child user card */}
                          <div 
                            className={`flex items-center p-3 mb-6 rounded-xl border-2 shadow-lg hover:shadow-xl transition-all duration-300 ${getRoleColor(childUser.role || '')} min-w-56 max-w-64 backdrop-blur-sm bg-white/90 cursor-pointer hover:scale-105 hover:border-green-300`}
                            onClick={() => handleUserClick(childUser)}
                            title="Click to view user details"
                          >
                            <div className="flex-shrink-0 mr-2">
                              <div className="p-2 rounded-full bg-gradient-to-br from-green-50 to-green-100">
                                {getRoleIcon(childUser.role || '')}
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-semibold text-gray-900 truncate">
                                    {getUserFullName(childUser)}
                                  </p>
                                  <p className="text-xs text-gray-500 truncate">
                                    {childUser.email}
                                  </p>
                                </div>
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize shadow-sm flex-shrink-0 ml-2">
                                  {(childUser.role || '').toLowerCase().replace('_', ' ')}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Connecting line down from child card */}
                          {grandChildren.length > 0 && (
                            <div className="w-1 h-6 bg-gradient-to-b from-gray-300 to-gray-200 mb-3 rounded-full"></div>
                          )}

                          {/* Grandchildren - Display vertically for Sales Reps */}
                          {grandChildren.length > 0 && (
                            <div className="relative w-full">
                              {/* Grandchildren cards - Vertical layout */}
                              <div className="flex flex-col items-center space-y-3 pt-3">
                                {grandChildren.map((grandChild) => (
                                  <div key={grandChild.id} className="flex flex-col items-center">
                                    {/* Horizontal line from vertical line to grandchild */}
                                    <div className="w-6 h-0.5 bg-gradient-to-r from-gray-300 to-gray-200 mb-3 rounded-full"></div>
                                    
                                    {/* Grandchild user card */}
                                    <div 
                                      className={`flex items-center p-3 rounded-xl border-2 shadow-lg hover:shadow-xl transition-all duration-300 ${getRoleColor(grandChild.role || '')} min-w-48 max-w-56 backdrop-blur-sm bg-white/90 cursor-pointer hover:scale-105 hover:border-gray-300`}
                                      onClick={() => handleUserClick(grandChild)}
                                      title="Click to view user details"
                                    >
                                      <div className="flex-shrink-0 mr-2">
                                        <div className="p-1.5 rounded-full bg-gradient-to-br from-gray-50 to-gray-100">
                                          {getRoleIcon(grandChild.role || '')}
                                        </div>
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between">
                                          <div className="min-w-0 flex-1">
                                            <p className="text-sm font-semibold text-gray-900 truncate">
                                              {getUserFullName(grandChild)}
                                            </p>
                                            <p className="text-xs text-gray-500 truncate">
                                              {grandChild.email}
                                            </p>
                                          </div>
                                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize shadow-sm flex-shrink-0 ml-2">
                                            {(grandChild.role || '').toLowerCase().replace('_', ' ')}
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
        return ['ADMIN'];
      case 'ADMIN':
        return ['SALES_MANAGER'];
      case 'SALES_MANAGER':
        return ['SALES_REP'];
      default:
        return [];
    }
  };

  const getRootRole = (): string => {
    const currentUserRole = currentUser?.role?.toUpperCase();
    if (currentUserRole === 'SUPER_ADMIN') {
      return 'SUPER_ADMIN';
    }
    return 'ADMIN';
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
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20">
          <div className="p-6 border-b border-gray-200/50">
            <div className="flex items-center justify-between">
              
              <div className="flex items-center space-x-4">
                <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-3 py-1.5 rounded-full shadow-lg">
                  <span className="text-sm font-semibold">
                  Total Users: {userList.length}
                </span>
                </div>
                <div className="flex items-center space-x-2 bg-white/80 px-3 py-1.5 rounded-full shadow-sm border border-gray-200/50">
                  <Icons.Network className="w-4 h-4 text-blue-500" />
                  <span className="text-sm font-medium text-blue-600">
                    {currentUser?.role?.toUpperCase().replace('_', ' ')} View
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="p-8 max-h-[70vh] overflow-y-auto">
            {rootUsers.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Icons.Users className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Users Found</h3>
                <p className="text-gray-600">No users found in your organisation structure.</p>
              </div>
            ) : (
              <div className="w-full overflow-x-auto orgtree-scrollbar">
                <div className="min-w-max mx-auto px-12 py-2">
                <TreeNode users={rootUsers} role={rootRole} level={0} />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Legend */}
        <div className="mt-6 bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-4">
          <h4 className="text-base font-semibold text-gray-900 mb-3">Role Legend</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {/* Only show Super Admin role if current user is SUPER_ADMIN */}
            {currentUser?.role?.toUpperCase() === 'SUPER_ADMIN' && (
              <div className="flex items-center space-x-2 p-2 bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg border border-purple-200">
                <div className="p-1.5 bg-gradient-to-br from-purple-100 to-purple-200 rounded-full">
                  <Icons.Crown className="w-3 h-3 text-purple-600" />
                </div>
                <span className="text-sm font-medium text-purple-800">Super Admin</span>
              </div>
            )}
            <div className="flex items-center space-x-2 p-2 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg border border-blue-200">
              <div className="p-1.5 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full">
                <Icons.Shield className="w-3 h-3 text-blue-600" />
              </div>
              <span className="text-sm font-medium text-blue-800">Admin</span>
            </div>
            <div className="flex items-center space-x-2 p-2 bg-gradient-to-r from-green-50 to-green-100 rounded-lg border border-green-200">
              <div className="p-1.5 bg-gradient-to-br from-green-100 to-green-200 rounded-full">
                <Icons.Users className="w-3 h-3 text-green-600" />
              </div>
              <span className="text-sm font-medium text-green-800">Sales Manager</span>
            </div>
            <div className="flex items-center space-x-2 p-2 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg border border-gray-200">
              <div className="p-1.5 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full">
                <Icons.User className="w-3 h-3 text-gray-600" />
              </div>
              <span className="text-sm font-medium text-gray-800">Sales Rep</span>
            </div>
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

