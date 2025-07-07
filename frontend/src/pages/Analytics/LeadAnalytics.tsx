import React, { useState, useEffect } from 'react';
import * as Icons from 'lucide-react';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, LineChart, Line, ResponsiveContainer,
} from 'recharts';
import { analyticsApi } from '../../api/services';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

const LeadAnalytics: React.FC = () => {
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLeadAnalytics();
  }, []);

  const fetchLeadAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await analyticsApi.getLeadAnalytics();
      setAnalytics(data);
    } catch (err) {
      setError('Failed to load lead analytics. Please try again.');
      console.error('Error fetching lead analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <h2 className="text-2xl font-semibold">Lead Analytics</h2>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className="p-6 space-y-6">
        <h2 className="text-2xl font-semibold">Lead Analytics</h2>
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <Icons.AlertCircle className="h-12 w-12 text-red-500 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Lead Analytics</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={fetchLeadAnalytics}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const KPIData = [
    { title: 'Total Leads', value: analytics.totalLeads },
    { title: 'Qualified Leads', value: analytics.qualifiedLeads },
    { title: 'Lead Conversion Rate', value: `${analytics.conversionRate}%` },
    { title: 'Avg Lead Value', value: `$${analytics.averageValue}` },
  ];

  // Generate recent leads trend data (sample data since we don't have time-based filtering yet)
  const recentLeads = [
    { date: 'Week 1', leads: Math.floor(analytics.totalLeads * 0.15) },
    { date: 'Week 2', leads: Math.floor(analytics.totalLeads * 0.18) },
    { date: 'Week 3', leads: Math.floor(analytics.totalLeads * 0.22) },
    { date: 'Week 4', leads: Math.floor(analytics.totalLeads * 0.20) },
    { date: 'Week 5', leads: Math.floor(analytics.totalLeads * 0.16) },
    { date: 'Week 6', leads: Math.floor(analytics.totalLeads * 0.09) },
  ];

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-semibold">Lead Analytics</h2>

      {analytics.totalLeads === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <Icons.Users className="h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Leads Data</h3>
          <p className="text-gray-600 mb-4">Start adding leads to see analytics and insights.</p>
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
            {/* Lead Source Pie Chart */}
            <div className="bg-white rounded-2xl shadow p-4">
              <h3 className="text-lg font-semibold mb-2">Lead Sources</h3>
              {analytics.leadSources.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie 
                      data={analytics.leadSources} 
                      dataKey="value" 
                      nameKey="name" 
                      outerRadius={80}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {analytics.leadSources.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[250px] text-gray-500">
                  <p>No lead source data available</p>
                </div>
              )}
            </div>

            {/* Lead Status Bar Chart */}
            <div className="bg-white rounded-2xl shadow p-4">
              <h3 className="text-lg font-semibold mb-2">Lead Status</h3>
              {analytics.leadStatusData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={analytics.leadStatusData}>
                    <XAxis dataKey="status" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[250px] text-gray-500">
                  <p>No lead status data available</p>
                </div>
              )}
            </div>

            {/* Recent Leads Line Chart */}
            <div className="bg-white rounded-2xl shadow p-4 md:col-span-2">
              <h3 className="text-lg font-semibold mb-2">Lead Trends (Sample Data)</h3>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={recentLeads}>
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="leads" stroke="#82ca9d" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default LeadAnalytics;
