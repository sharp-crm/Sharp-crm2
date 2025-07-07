import React, { useState, useEffect } from 'react';
import * as Icons from 'lucide-react';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, LineChart, Line, ResponsiveContainer,
} from 'recharts';
import { analyticsApi } from '../../api/services';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

const DealInsights: React.FC = () => {
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDealInsights();
  }, []);

  const fetchDealInsights = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await analyticsApi.getDealInsights();
      setAnalytics(data);
    } catch (err) {
      setError('Failed to load deal insights. Please try again.');
      console.error('Error fetching deal insights:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <h2 className="text-2xl font-semibold">Deal Insights</h2>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className="p-6 space-y-6">
        <h2 className="text-2xl font-semibold">Deal Insights</h2>
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <Icons.AlertCircle className="h-12 w-12 text-red-500 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Deal Insights</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={fetchDealInsights}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const KPIData = [
    { title: 'Total Deals', value: analytics.totalDeals },
    { title: 'Win Rate', value: `${analytics.winRate}%` },
    { title: 'Avg Deal Size', value: `$${analytics.avgDealSize.toLocaleString()}` },
    { title: 'Total Value', value: `$${analytics.totalValue.toLocaleString()}` },
  ];

  // Generate deal performance trend data (sample data)
  const dealTrends = [
    { month: 'Jan', deals: Math.floor(analytics.totalDeals * 0.12) },
    { month: 'Feb', deals: Math.floor(analytics.totalDeals * 0.15) },
    { month: 'Mar', deals: Math.floor(analytics.totalDeals * 0.18) },
    { month: 'Apr', deals: Math.floor(analytics.totalDeals * 0.20) },
    { month: 'May', deals: Math.floor(analytics.totalDeals * 0.22) },
    { month: 'Jun', deals: Math.floor(analytics.totalDeals * 0.13) },
  ];

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-semibold">Deal Insights</h2>

      {analytics.totalDeals === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <Icons.Target className="h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Deals Data</h3>
          <p className="text-gray-600 mb-4">Start creating deals to see insights and analytics.</p>
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
            {/* Deal Stages Distribution */}
            <div className="bg-white rounded-2xl shadow p-4">
              <h3 className="text-lg font-semibold mb-2">Deal Stages</h3>
              {analytics.dealStages.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie 
                      data={analytics.dealStages} 
                      dataKey="count" 
                      nameKey="stage" 
                      outerRadius={80}
                      label={({ stage, percent }) => `${stage} ${(percent * 100).toFixed(0)}%`}
                    >
                      {analytics.dealStages.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[250px] text-gray-500">
                  <p>No deal stage data available</p>
                </div>
              )}
            </div>

            {/* Deal Stages Bar Chart */}
            <div className="bg-white rounded-2xl shadow p-4">
              <h3 className="text-lg font-semibold mb-2">Deals by Stage</h3>
              {analytics.dealStages.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={analytics.dealStages}>
                    <XAxis dataKey="stage" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[250px] text-gray-500">
                  <p>No deal stage data available</p>
                </div>
              )}
            </div>

            {/* Deal Performance Trends */}
            <div className="bg-white rounded-2xl shadow p-4 md:col-span-2">
              <h3 className="text-lg font-semibold mb-2">Deal Performance Trends (Sample Data)</h3>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={dealTrends}>
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="deals" stroke="#82ca9d" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Additional Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl shadow p-4">
              <h3 className="text-lg font-semibold mb-4">Performance Metrics</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-600">Win Rate</span>
                  <span className="font-semibold text-green-600">{analytics.winRate}%</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-600">Average Deal Size</span>
                  <span className="font-semibold text-blue-600">${analytics.avgDealSize.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-600">Total Pipeline Value</span>
                  <span className="font-semibold text-purple-600">${analytics.totalValue.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow p-4">
              <h3 className="text-lg font-semibold mb-4">Deal Summary</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-600">Total Deals</span>
                  <span className="font-semibold text-gray-900">{analytics.totalDeals}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-600">Active Stages</span>
                  <span className="font-semibold text-gray-900">{analytics.dealStages.length}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-600">Revenue Generated</span>
                  <span className="font-semibold text-gray-900">${analytics.totalValue.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default DealInsights;
