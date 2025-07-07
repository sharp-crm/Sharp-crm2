import React from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Deal, Task } from '../../types';

interface ChartViewProps {
  data: (Deal | Task)[];
  type: 'deals' | 'tasks';
}

const ChartView: React.FC<ChartViewProps> = ({ data, type }) => {
  const isDeal = type === 'deals';

  const generateChartData = () => {
    if (isDeal) {
      const dealData = data as Deal[];
      const stageData = dealData.reduce((acc, deal) => {
        acc[deal.stage] = (acc[deal.stage] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return Object.entries(stageData).map(([stage, count]) => ({
        name: stage,
        value: count,
        color: getStageColor(stage)
      }));
    } else {
      const taskData = data as Task[];
      const statusData = taskData.reduce((acc, task) => {
        acc[task.status] = (acc[task.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return Object.entries(statusData).map(([status, count]) => ({
        name: status,
        value: count,
        color: getStatusColor(status)
      }));
    }
  };

  const generateValueChart = () => {
    if (isDeal) {
      const dealData = data as Deal[];
      const stageValues = dealData.reduce((acc, deal) => {
        acc[deal.stage] = (acc[deal.stage] || 0) + deal.value;
        return acc;
      }, {} as Record<string, number>);

      return Object.entries(stageValues).map(([stage, value]) => ({
        stage,
        value: value / 1000, // Convert to thousands
      }));
    } else {
      const taskData = data as Task[];
      const priorityData = taskData.reduce((acc, task) => {
        acc[task.priority] = (acc[task.priority] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return Object.entries(priorityData).map(([priority, count]) => ({
        priority,
        count,
      }));
    }
  };

  const getStageColor = (stage: string) => {
    const colors: Record<string, string> = {
      'Prospecting': '#3B82F6',
      'Qualification': '#8B5CF6',
      'Proposal': '#F59E0B',
      'Negotiation': '#EF4444',
      'Closed Won': '#10B981',
      'Closed Lost': '#6B7280'
    };
    return colors[stage] || '#6B7280';
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'Open': '#3B82F6',
      'In Progress': '#F59E0B',
      'Completed': '#10B981'
    };
    return colors[status] || '#6B7280';
  };

  const chartData = generateChartData();
  const valueChartData = generateValueChart();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Distribution Chart */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {isDeal ? 'Deals by Stage' : 'Tasks by Status'}
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Value/Count Chart */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {isDeal ? 'Value by Stage (K)' : 'Tasks by Priority'}
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={valueChartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey={isDeal ? 'stage' : 'priority'} 
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis />
            <Tooltip 
              formatter={(value) => [
                isDeal ? `$${value}K` : value,
                isDeal ? 'Value' : 'Count'
              ]}
            />
            <Bar 
              dataKey={isDeal ? 'value' : 'count'} 
              fill="#3B82F6" 
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Summary Stats */}
      <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Summary Statistics</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {isDeal ? (
            <>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {(data as Deal[]).reduce((sum, deal) => sum + deal.value, 0).toLocaleString()}
                </div>
                <div className="text-sm text-gray-600">Total Value</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {Math.round((data as Deal[]).reduce((sum, deal) => sum + deal.probability, 0) / data.length)}%
                </div>
                <div className="text-sm text-gray-600">Avg Probability</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {(data as Deal[]).filter(deal => deal.stage === 'Closed Won').length}
                </div>
                <div className="text-sm text-gray-600">Won Deals</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {data.length}
                </div>
                <div className="text-sm text-gray-600">Total Deals</div>
              </div>
            </>
          ) : (
            <>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {(data as Task[]).filter(task => task.status === 'Completed').length}
                </div>
                <div className="text-sm text-gray-600">Completed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {(data as Task[]).filter(task => task.status === 'In Progress').length}
                </div>
                <div className="text-sm text-gray-600">In Progress</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {(data as Task[]).filter(task => task.priority === 'High').length}
                </div>
                <div className="text-sm text-gray-600">High Priority</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {data.length}
                </div>
                <div className="text-sm text-gray-600">Total Tasks</div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChartView;