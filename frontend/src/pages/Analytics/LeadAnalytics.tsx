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
          <div className="space-y-8">
            {/* Lead Source Chart - Full Width */}
            <div className="bg-white rounded-2xl shadow p-6">
              <h3 className="text-xl font-semibold mb-6">Lead Sources Distribution</h3>
              {analytics.leadSources.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
                  {/* Pie Chart */}
                  <div className="lg:col-span-2">
                    <ResponsiveContainer width="100%" height={280}>
                      <PieChart>
                        <Pie 
                          data={analytics.leadSources} 
                          dataKey="value" 
                          nameKey="name" 
                          cx="50%"
                          cy="50%"
                          outerRadius={140}
                          innerRadius={70}
                          paddingAngle={2}
                          label={false}
                        >
                          {analytics.leadSources.map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value: number, name: string) => [
                            `${value} leads (${((value / analytics.totalLeads) * 100).toFixed(1)}%)`,
                            name
                          ]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  
                  {/* Legend */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-4">Sources</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {analytics.leadSources.map((entry: any, index: number) => (
                        <div key={entry.name} className="flex items-center space-x-2">
                          <div 
                            className="w-3 h-3 rounded-full flex-shrink-0" 
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-medium text-gray-900 truncate">
                              {entry.name}
                            </div>
                            <div className="text-xs text-gray-500">
                              {entry.value} ({((entry.value / analytics.totalLeads) * 100).toFixed(1)}%)
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-[280px] text-gray-500">
                  <div className="text-center">
                    <Icons.PieChart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p>No lead source data available</p>
                  </div>
                </div>
              )}
            </div>

            {/* Secondary Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Lead Status Bar Chart */}
              <div className="bg-white rounded-2xl shadow p-6">
                <h3 className="text-lg font-semibold mb-4">Lead Status Distribution</h3>
                {analytics.leadStatusData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={analytics.leadStatusData}>
                      <XAxis dataKey="status" />
                      <YAxis />
                      <Tooltip 
                        formatter={(value: number, name: string) => [
                          `${value} leads`,
                          'Count'
                        ]}
                      />
                      <Bar dataKey="count" fill="#8884d8" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[260px] text-gray-500">
                    <div className="text-center">
                      <Icons.BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p>No lead status data available</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Recent Leads Line Chart */}
              <div className="bg-white rounded-2xl shadow p-6">
                <h3 className="text-lg font-semibold mb-4">Lead Trends (Sample Data)</h3>
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={recentLeads}>
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip 
                      formatter={(value: number, name: string) => [
                        `${value} leads`,
                        'Leads Generated'
                      ]}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="leads" 
                      stroke="#82ca9d" 
                      strokeWidth={3}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default LeadAnalytics;
