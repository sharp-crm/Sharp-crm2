import React, { useEffect, useState } from 'react';
import * as Icons from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { usersApi } from '../api/services';

const SuperAdminHome: React.FC = () => {
  const today = new Date();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [adminUsersCount, setAdminUsersCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAdminUsersCount = async () => {
      try {
        setLoading(true);
        let users;
        try {
          users = await usersApi.getAllUsers();
        } catch (error) {
          users = await usersApi.getAll();
        }
        
        // Count only admin users
        const adminCount = users.filter(user => 
          user.role?.toUpperCase() === 'ADMIN' || 
          user.originalRole?.toUpperCase() === 'ADMIN'
        ).length;
        
        setAdminUsersCount(adminCount);
      } catch (error) {
        console.error('Failed to fetch admin users count:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchAdminUsersCount();
  }, []);

  const quickActions = [
    {
      title: 'SuperAdmin Org Tree',
      description: 'View SuperAdmin and Admin organizational hierarchy',
      icon: Icons.Network,
      path: '/settings/super-admin-org-tree',
      color: 'bg-blue-500 hover:bg-blue-600'
    },
    {
                  title: 'Admin Access Control',
      description: 'Manage Super Admin and Admin user access',
      icon: Icons.Users,
      path: '/settings/super-admin-access-control',
      color: 'bg-green-500 hover:bg-green-600'
    },
    {
      title: 'Personal Settings',
      description: 'Update your profile and preferences',
      icon: Icons.User,
      path: '/settings/personal',
      color: 'bg-purple-500 hover:bg-purple-600'
    },
    {
      title: 'Email Integration',
      description: 'Configure email settings and integrations',
      icon: Icons.Mail,
      path: '/integrations/email',
      color: 'bg-orange-500 hover:bg-orange-600'
    },
    {
      title: 'Team Chat',
      description: 'Communicate with your team members',
      icon: Icons.MessageSquare,
      path: '/team-chat',
      color: 'bg-indigo-500 hover:bg-indigo-600'
    }
  ];

  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-screen-xl mx-auto">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-8 rounded-xl shadow-md border border-gray-200">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <Icons.Crown className="w-8 h-8 text-purple-600" />
              <h1 className="text-3xl font-bold text-gray-900">
                Super Admin Dashboard
              </h1>
            </div>
            <h2 className="text-xl text-gray-700 mb-2">
              Welcome, {`${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Super Admin'}
            </h2>
            <p className="text-md text-gray-600">
              Today is {today.toLocaleDateString("en-US", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}, {today.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })} IST
            </p>
          </div>
          <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-lg shadow-sm">
            <Icons.Shield className="w-5 h-5 text-purple-600" />
            <span className="text-sm font-medium text-gray-700">Super Admin Access</span>
          </div>
        <div className="flex items-center gap-3 bg-blue-100 px-4 py-2 rounded-lg">
          <Icons.Users className="w-5 h-5 text-blue-600" />
          <span className="text-sm font-medium text-blue-800">
            {loading ? 'Loading...' : `Total Admins: ${adminUsersCount}`}
          </span>
        </div>
        </div>
      </div>

      {/* Quick Actions Grid */}
      <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
        <h3 className="text-xl font-semibold text-gray-800 mb-6">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {quickActions.map((action, index) => {
            const Icon = action.icon;
            return (
              <div
                key={index}
                className="group cursor-pointer"
                onClick={() => navigate(action.path)}
              >
                <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-all duration-200 hover:border-gray-300">
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-12 h-12 ${action.color} rounded-lg flex items-center justify-center text-white transition-colors`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <Icons.ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
                  </div>
                  <h4 className="text-lg font-semibold text-gray-800 mb-2">{action.title}</h4>
                  <p className="text-sm text-gray-600">{action.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* System Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* System Status */}
        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
          <h3 className="text-xl font-semibold text-gray-800 mb-6">System Status</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="font-medium text-green-800">System Online</span>
              </div>
              <span className="text-sm text-green-600">All services operational</span>
            </div>
            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span className="font-medium text-blue-800">Database</span>
              </div>
              <span className="text-sm text-blue-600">Connected</span>
            </div>
            <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg border border-purple-200">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                <span className="font-medium text-purple-800">Authentication</span>
              </div>
              <span className="text-sm text-purple-600">Active</span>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
          <h3 className="text-xl font-semibold text-gray-800 mb-6">Recent Activity</h3>
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <Icons.UserPlus className="w-5 h-5 text-green-600 mt-1" />
              <div>
                <p className="text-sm font-medium text-gray-800">New admin user created</p>
                <p className="text-xs text-gray-500">2 hours ago</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <Icons.Settings className="w-5 h-5 text-blue-600 mt-1" />
              <div>
                <p className="text-sm font-medium text-gray-800">System settings updated</p>
                <p className="text-xs text-gray-500">1 day ago</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <Icons.Shield className="w-5 h-5 text-purple-600 mt-1" />
              <div>
                <p className="text-sm font-medium text-gray-800">Access permissions modified</p>
                <p className="text-xs text-gray-500">3 days ago</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Information Panel */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-xl shadow-md border border-blue-200">
        <div className="flex items-start gap-4">
          <Icons.Info className="w-6 h-6 text-blue-600 mt-1 flex-shrink-0" />
          <div>
            <h4 className="text-lg font-semibold text-blue-800 mb-2">Super Admin Responsibilities</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Manage organisational hierarchy and user roles</li>
              <li>• Control access permissions across the system</li>
              <li>• Monitor system health and performance</li>
              <li>• Configure integrations and system settings</li>
              <li>• Oversee administrative functions</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminHome; 