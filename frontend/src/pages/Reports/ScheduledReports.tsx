// src/Pages/Reports/ScheduledReports.tsx
import React, { useState, useEffect } from 'react';
import PageHeader from '../../components/Common/PageHeader';
import DataTable from '../../components/Common/DataTable';
import { reportsApi, Report } from '../../api/services';
import ReportView from '../../components/Common/ReportView';
import EditReportModal from '../../components/EditReportModal';
import * as Icons from 'lucide-react';

const ScheduledReports: React.FC = () => {
  const [scheduledReports, setScheduledReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isReportViewOpen, setIsReportViewOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);

  useEffect(() => {
    fetchScheduledReports();
  }, []);

  const fetchScheduledReports = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await reportsApi.getScheduled();
      setScheduledReports(data);
    } catch (err) {
      setError('Failed to load scheduled reports. Please try again.');
      console.error('Error fetching scheduled reports:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleReportClick = (report: Report) => {
    setSelectedReportId(report.id);
    setIsReportViewOpen(true);
  };

  const handleEditClick = (report: Report) => {
    setSelectedReport(report);
    setIsEditModalOpen(true);
  };

  const handleRunReport = async (reportId: string) => {
    try {
      // Run the report manually
      await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/reports/${reportId}/run`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sessionStorage.getItem('accessToken') || localStorage.getItem('accessToken')}`,
          'Content-Type': 'application/json'
        }
      });
      
      // Refresh the list to show updated last run time
      fetchScheduledReports();
    } catch (err) {
      console.error('Error running report:', err);
    }
  };

  const getScheduleColor = (schedule: string | null | undefined) => {
    switch (schedule) {
      case 'daily': return 'bg-blue-100 text-blue-800';
      case 'weekly': return 'bg-green-100 text-green-800';
      case 'monthly': return 'bg-purple-100 text-purple-800';
      case 'quarterly': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const columns = [
    {
      key: 'name',
      label: 'Title',
      sortable: true,
      render: (value: string, report: Report) => (
        <div className="flex items-center">
          <Icons.FileText className="w-4 h-4 text-gray-400 mr-2" />
          <span className="font-medium text-gray-900">{value}</span>
        </div>
      )
    },
    {
      key: 'reportType',
      label: 'Type',
      sortable: true,
      render: (value: string) => (
        <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
          {value ? value.charAt(0).toUpperCase() + value.slice(1).replace('-', ' ') : 'Unknown'}
        </span>
      )
    },
    {
      key: 'schedule',
      label: 'Schedule',
      sortable: true,
      render: (value: string) => (
        <span className={`flex items-center px-2 py-1 text-xs font-medium rounded-full ${getScheduleColor(value || '')}`}>
          <Icons.Clock className="w-3 h-3 mr-1" />
          {value ? value.charAt(0).toUpperCase() + value.slice(1) : 'Not set'}
        </span>
      )
    },
    {
      key: 'lastRun',
      label: 'Last Run',
      sortable: true,
      render: (value?: string) => (
        <div className="text-sm">
          {value && value !== 'null' && value !== 'undefined' ? (
            <div>
              <div className="text-gray-900">{new Date(value).toLocaleDateString()}</div>
              <div className="text-gray-500 text-xs">{new Date(value).toLocaleTimeString()}</div>
            </div>
          ) : (
            <span className="text-gray-500">Never</span>
          )}
        </div>
      )
    },
    {
      key: 'runCount',
      label: 'Runs',
      sortable: true,
      render: (value: number) => (
        <span className="text-sm font-medium text-gray-900">{value || 0}</span>
      )
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (value: string) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          value === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
        }`}>
          {value ? value.charAt(0).toUpperCase() + value.slice(1) : 'Unknown'}
        </span>
      )
    },
    {
      key: 'actions',
      label: 'Actions',
      sortable: false,
      render: (value: any, report: Report) => (
        <div className="flex space-x-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleReportClick(report);
            }}
            className="flex items-center px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            title="View Report"
          >
            <Icons.Eye className="w-3 h-3 mr-1" />
            View
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleRunReport(report.id);
            }}
            className="flex items-center px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
            title="Run Now"
          >
            <Icons.Play className="w-3 h-3 mr-1" />
            Run
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleEditClick(report);
            }}
            className="flex items-center px-2 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
            title="Edit Schedule"
          >
            <Icons.Edit className="w-3 h-3 mr-1" />
            Edit
          </button>
        </div>
      )
    }
  ];

  if (loading) {
    return (
      <div className="p-6">
        <PageHeader
          title="Scheduled Reports"
          subtitle="Reports with automated schedules"
          breadcrumbs={[{ name: 'Home', path: '/' }, { name: 'Reports', path: '/reports' }, { name: 'Scheduled' }]}
        />
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <PageHeader
          title="Scheduled Reports"
          subtitle="Reports with automated schedules"
          breadcrumbs={[{ name: 'Home', path: '/' }, { name: 'Reports', path: '/reports' }, { name: 'Scheduled' }]}
        />
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <Icons.AlertCircle className="h-12 w-12 text-red-500 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Scheduled Reports</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={fetchScheduledReports}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <PageHeader
        title="Scheduled Reports"
        subtitle="Reports with automated schedules"
        breadcrumbs={[{ name: 'Home', path: '/' }, { name: 'Reports', path: '/reports' }, { name: 'Scheduled' }]}
        actions={
          <div className="flex space-x-2">
            <button
              onClick={fetchScheduledReports}
              className="flex items-center px-3 py-2 text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              <Icons.RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </button>
          </div>
        }
      />

      {/* Schedule Summary Cards */}
      {scheduledReports.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <Icons.Calendar className="w-4 h-4 text-blue-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Total Scheduled</p>
                <p className="text-lg font-semibold text-gray-900">{scheduledReports.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <Icons.CheckCircle className="w-4 h-4 text-green-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Active</p>
                <p className="text-lg font-semibold text-gray-900">
                  {scheduledReports.filter(r => r.status === 'active' || r.status == null).length}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <Icons.Clock className="w-4 h-4 text-purple-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Daily</p>
                <p className="text-lg font-semibold text-gray-900">
                  {scheduledReports.filter(r => r.schedule === 'daily').length}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                <Icons.BarChart3 className="w-4 h-4 text-orange-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Total Runs</p>
                <p className="text-lg font-semibold text-gray-900">
                  {scheduledReports.reduce((sum, r) => sum + (r.runCount || 0), 0)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Scheduled Reports Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Scheduled Reports</h2>
        {scheduledReports.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Icons.Calendar className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Scheduled Reports</h3>
            <p className="text-gray-600 mb-4">Schedule reports from the All Reports page to see them here.</p>
            <button
              onClick={() => window.location.href = '/reports'}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Go to All Reports
            </button>
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={scheduledReports}
            onRowClick={handleReportClick}
          />
        )}
      </div>

      <ReportView
        isOpen={isReportViewOpen}
        onClose={() => setIsReportViewOpen(false)}
        reportId={selectedReportId}
        onFavoriteToggle={fetchScheduledReports}
      />

      <EditReportModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSuccess={fetchScheduledReports}
        report={selectedReport}
      />
    </div>
  );
};

export default ScheduledReports;
