import React, { useState, useEffect } from 'react';
import * as Icons from 'lucide-react';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, LineChart, Line, ResponsiveContainer,
} from 'recharts';
import { analyticsApi } from '../../api/services';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

const ActivityStats: React.FC = () => {
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchActivityStats();
  }, []);

  const fetchActivityStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await analyticsApi.getActivityStats();
      setAnalytics(data);
    } catch (err) {
      setError('Failed to load activity statistics. Please try again.');
      console.error('Error fetching activity stats:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <h2 className="text-2xl font-semibold">Activity Statistics</h2>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className="p-6 space-y-6">
        <h2 className="text-2xl font-semibold">Activity Statistics</h2>
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <Icons.AlertCircle className="h-12 w-12 text-red-500 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Activity Statistics</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={fetchActivityStats}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const KPIData = [
    { title: 'Total Activities', value: analytics.totalActivities },
    { title: 'Completed Tasks', value: analytics.completedTasks },
    { title: 'Pending Tasks', value: analytics.pendingTasks },
    { title: 'Leads Generated', value: analytics.leadsGenerated },
  ];

  const activityBreakdown = [
    { name: 'Leads', value: analytics.leadsGenerated, color: '#0088FE' },
    { name: 'Contacts', value: analytics.contactsAdded, color: '#00C49F' },
    { name: 'Deals', value: analytics.dealsCreated, color: '#FFBB28' },
    { name: 'Completed Tasks', value: analytics.completedTasks, color: '#FF8042' }
  ];

  const taskStatusData = [
    { status: 'Completed', count: analytics.completedTasks },
    { status: 'Pending', count: analytics.pendingTasks }
  ];

  // Generate activity trends (sample data)
  const activityTrends = [
    { week: 'Week 1', activities: Math.floor(analytics.totalActivities * 0.15) },
    { week: 'Week 2', activities: Math.floor(analytics.totalActivities * 0.18) },
    { week: 'Week 3', activities: Math.floor(analytics.totalActivities * 0.20) },
    { week: 'Week 4', activities: Math.floor(analytics.totalActivities * 0.22) },
    { week: 'Week 5', activities: Math.floor(analytics.totalActivities * 0.16) },
    { week: 'Week 6', activities: Math.floor(analytics.totalActivities * 0.09) },
  ];

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-semibold">Activity Statistics</h2>

      {analytics.totalActivities === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <Icons.Activity className="h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Activity Data</h3>
          <p className="text-gray-600 mb-4">Start using the CRM to track activities and see statistics.</p>
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {KPIData.map((item, index) => (
              <div key={index} className="bg-white rounded-2xl shadow p-4">
                <p className="text-sm text-gray-500">{item.title}</p>
                <p className="text-xl font-bold mt-2">{item.value}</p>
              </div>
            ))}
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Activity Breakdown Pie Chart */}
            <div className="bg-white rounded-2xl shadow p-4">
              <h3 className="text-lg font-semibold mb-2">Activity Breakdown</h3>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie 
                    data={activityBreakdown} 
                    dataKey="value" 
                    nameKey="name" 
                    outerRadius={80}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {activityBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Task Status Bar Chart */}
            <div className="bg-white rounded-2xl shadow p-4">
              <h3 className="text-lg font-semibold mb-2">Task Status</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={taskStatusData}>
                  <XAxis dataKey="status" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Activity Trends Line Chart */}
            <div className="bg-white rounded-2xl shadow p-4 md:col-span-2">
              <h3 className="text-lg font-semibold mb-2">Activity Trends (Sample Data)</h3>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={activityTrends}>
                  <XAxis dataKey="week" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="activities" stroke="#82ca9d" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Activity Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white rounded-2xl shadow p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">CRM Activities</h3>
                <Icons.Database className="h-6 w-6 text-blue-500" />
              </div>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Leads Generated</span>
                  <span className="font-semibold">{analytics.leadsGenerated}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Contacts Added</span>
                  <span className="font-semibold">{analytics.contactsAdded}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Deals Created</span>
                  <span className="font-semibold">{analytics.dealsCreated}</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Task Management</h3>
                <Icons.CheckSquare className="h-6 w-6 text-green-500" />
              </div>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Completed Tasks</span>
                  <span className="font-semibold text-green-600">{analytics.completedTasks}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Pending Tasks</span>
                  <span className="font-semibold text-orange-600">{analytics.pendingTasks}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Completion Rate</span>
                  <span className="font-semibold">
                    {analytics.completedTasks + analytics.pendingTasks > 0
                      ? Math.round((analytics.completedTasks / (analytics.completedTasks + analytics.pendingTasks)) * 100)
                      : 0}%
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Overall Stats</h3>
                <Icons.TrendingUp className="h-6 w-6 text-purple-500" />
              </div>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Activities</span>
                  <span className="font-semibold">{analytics.totalActivities}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Most Active Area</span>
                  <span className="font-semibold">
                    {analytics.leadsGenerated >= analytics.contactsAdded && analytics.leadsGenerated >= analytics.dealsCreated
                      ? 'Leads'
                      : analytics.contactsAdded >= analytics.dealsCreated
                        ? 'Contacts'
                        : 'Deals'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Productivity</span>
                  <span className="font-semibold text-blue-600">
                    {analytics.totalActivities > 50 ? 'High' : analytics.totalActivities > 20 ? 'Medium' : 'Low'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ActivityStats;
