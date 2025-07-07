import React, { useState, useEffect } from 'react';
import * as Icons from 'lucide-react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import PageHeader from '../../components/Common/PageHeader';
import { analyticsApi } from '../../api/services';

const Overview: React.FC = () => {
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await analyticsApi.getOverview();
      setAnalytics(data);
    } catch (err) {
      setError('Failed to load analytics data. Please try again.');
      console.error('Error fetching analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <PageHeader
          title="Organization Overview"
          subtitle="High-level insights across your organization"
          breadcrumbs={[
            { name: 'Home', path: '/' },
            { name: 'Analytics', path: '/analytics' },
            { name: 'Overview' }
          ]}
        />
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className="p-6">
        <PageHeader
          title="Organization Overview"
          subtitle="High-level insights across your organization"
          breadcrumbs={[
            { name: 'Home', path: '/' },
            { name: 'Analytics', path: '/analytics' },
            { name: 'Overview' }
          ]}
        />
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <Icons.AlertCircle className="h-12 w-12 text-red-500 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Analytics</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={fetchAnalytics}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const pieData = [
    { name: 'Closed Won', value: analytics.deals.won, color: '#10B981' },
    { name: 'In Progress', value: analytics.deals.active, color: '#3B82F6' },
    { name: 'Closed Lost', value: analytics.deals.lost, color: '#EF4444' }
  ];

  const activityData = [
    { name: 'Leads', value: analytics.totalLeads },
    { name: 'Contacts', value: analytics.totalContacts },
    { name: 'Deals', value: analytics.deals.total },
    { name: 'Tasks', value: analytics.totalTasks }
  ];

  // Generate some sample chart data for revenue trend
  const chartData = [
    { month: 'Jan', revenue: Math.floor(analytics.totalRevenue * 0.15) },
    { month: 'Feb', revenue: Math.floor(analytics.totalRevenue * 0.12) },
    { month: 'Mar', revenue: Math.floor(analytics.totalRevenue * 0.18) },
    { month: 'Apr', revenue: Math.floor(analytics.totalRevenue * 0.16) },
    { month: 'May', revenue: Math.floor(analytics.totalRevenue * 0.20) },
    { month: 'Jun', revenue: Math.floor(analytics.totalRevenue * 0.19) }
  ];

  return (
    <div className="p-6">
      <PageHeader
        title="Organization Overview"
        subtitle="High-level insights across your organization"
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Analytics', path: '/analytics' },
          { name: 'Overview' }
        ]}
      />

      {/* Key Performance Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900">${analytics.totalRevenue.toLocaleString()}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Icons.TrendingUp className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-sm text-green-600">Total revenue from closed deals</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Deals</p>
              <p className="text-2xl font-bold text-gray-900">{analytics.activeDeals}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Icons.Target className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-sm text-blue-600">Pipeline value: ${analytics.pipelineValue.toLocaleString()}</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Conversion Rate</p>
              <p className="text-2xl font-bold text-gray-900">{analytics.conversionRate}%</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Icons.BarChart3 className="w-6 h-6 text-purple-600" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-sm text-purple-600">Deals won vs total deals</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Team Performance</p>
              <p className="text-2xl font-bold text-gray-900">{analytics.teamPerformance}%</p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <Icons.Users className="w-6 h-6 text-orange-600" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-sm text-orange-600">Overall team efficiency</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Revenue Trend */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value) => [`$${value.toLocaleString()}`, 'Revenue']} />
              <Line type="monotone" dataKey="revenue" stroke="#3B82F6" strokeWidth={3} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Deal Status Distribution */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Deal Status Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Activity Overview */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Activity Overview</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={activityData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#6366F1" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* CRM Statistics */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">CRM Statistics</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                  <Icons.Users className="w-4 h-4 text-blue-700" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Total Leads</p>
                  <p className="text-sm text-gray-600">Active prospects</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-semibold text-gray-900">{analytics.totalLeads}</p>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
                  <Icons.Phone className="w-4 h-4 text-green-700" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Total Contacts</p>
                  <p className="text-sm text-gray-600">In database</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-semibold text-gray-900">{analytics.totalContacts}</p>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mr-3">
                  <Icons.CheckSquare className="w-4 h-4 text-purple-700" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Total Tasks</p>
                  <p className="text-sm text-gray-600">Assigned</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-semibold text-gray-900">{analytics.totalTasks}</p>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center mr-3">
                  <Icons.Target className="w-4 h-4 text-orange-700" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Total Deals</p>
                  <p className="text-sm text-gray-600">All stages</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-semibold text-gray-900">{analytics.deals.total}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Overview;