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
}

const OrgTree: React.FC = () => {
  const [userList, setUserList] = useState<OrganisationUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
      
      // If current user is Super Admin, show all users
      if (currentUser?.role?.toUpperCase() === 'SUPER_ADMIN') {
        return userRole === targetRole;
      }
      
      // If current user is Admin, show users with same tenantId
      if (currentUser?.role?.toUpperCase() === 'ADMIN') {
        return userRole === targetRole && user.tenantId === currentUser.tenantId;
      }
      
      // For other roles, show users with same tenantId
      return userRole === targetRole && user.tenantId === currentUser?.tenantId;
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
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'ADMIN':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'SALES_MANAGER':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'SALES_REP':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  const TreeNode: React.FC<{ users: OrganisationUser[]; role: string; level: number }> = ({ users, role, level }) => {
    if (users.length === 0) return null;

    return (
      <div className={`ml-${level * 6} relative`}>
        {users.map((user, index) => {
          const isLast = index === users.length - 1;
          const childRoles = getChildRoles(role);
          
          return (
            <div key={user.id} className="relative">
              {/* Connecting lines */}
              {level > 0 && (
                <div className="absolute left-0 top-0 w-6 h-6 border-l-2 border-b-2 border-gray-300 rounded-bl-lg"></div>
              )}
              
              {/* User card */}
              <div className={`flex items-center p-3 mb-2 rounded-lg border-2 ${getRoleColor(role)} hover:shadow-md transition-shadow ml-${level > 0 ? '8' : '0'}`}>
                <div className="flex-shrink-0 mr-3">
                  {getRoleIcon(role)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium truncate">
                        {getUserFullName(user)}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {user.email}
                      </p>
                    </div>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize">
                      {role.toLowerCase().replace('_', ' ')}
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Render children - only direct reports */}
              {childRoles.map(childRole => {
                const directReports = filterUsersByRole(childRole).filter(u => u.reportingTo === user.id);
                return (
                  <TreeNode 
                    key={childRole} 
                    users={directReports} 
                    role={childRole} 
                    level={level + 1} 
                  />
                );
              })}
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
      <div className="p-6">
        <PageHeader
          title="Organisation Tree"
          subtitle="View your organisation hierarchy"
          breadcrumbs={[
            { name: 'Home', path: '/' },
            { name: 'Settings' },
            { name: 'Organisation Tree' }
          ]}
        />
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center space-x-2">
            <Icons.Loader2 className="w-6 h-6 animate-spin" />
            <span>Loading organisation data...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <PageHeader
          title="Organisation Tree"
          subtitle="View your organisation hierarchy"
          breadcrumbs={[
            { name: 'Home', path: '/' },
            { name: 'Settings' },
            { name: 'Organisation Tree' }
          ]}
        />
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Icons.AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Data</h3>
            <p className="text-gray-600">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  const rootRole = getRootRole();
  const rootUsers = filterUsersByRole(rootRole);

  return (
    <div className="p-6">
      <PageHeader
        title="Organisation Tree"
        subtitle="View your organisation hierarchy"
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Settings' },
          { name: 'Organisation Tree' }
        ]}
      />

      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Organisation Hierarchy</h3>
                <p className="text-sm text-gray-600">View the structure of your organisation based on reporting relationships</p>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-500">
                  Total Users: {userList.length}
                </span>
                <div className="flex items-center space-x-2">
                  <Icons.Network className="w-5 h-5 text-blue-500" />
                  <span className="text-sm font-medium text-blue-600">
                    {currentUser?.role?.toUpperCase().replace('_', ' ')} View
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="p-6">
            {rootUsers.length === 0 ? (
              <div className="text-center py-12">
                <Icons.Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Users Found</h3>
                <p className="text-gray-600">No users found in your organisation structure.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <TreeNode users={rootUsers} role={rootRole} level={0} />
              </div>
            )}
          </div>
        </div>

        {/* Legend */}
        <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Role Legend</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {/* Only show Super Admin role if current user is SUPER_ADMIN */}
            {currentUser?.role?.toUpperCase() === 'SUPER_ADMIN' && (
              <div className="flex items-center space-x-2">
                <Icons.Crown className="w-4 h-4 text-purple-600" />
                <span className="text-sm text-gray-600">Super Admin</span>
              </div>
            )}
            <div className="flex items-center space-x-2">
              <Icons.Shield className="w-4 h-4 text-blue-600" />
              <span className="text-sm text-gray-600">Admin</span>
            </div>
            <div className="flex items-center space-x-2">
              <Icons.Users className="w-4 h-4 text-green-600" />
              <span className="text-sm text-gray-600">Sales Manager</span>
            </div>
            <div className="flex items-center space-x-2">
              <Icons.User className="w-4 h-4 text-gray-600" />
              <span className="text-sm text-gray-600">Sales Rep</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrgTree;

