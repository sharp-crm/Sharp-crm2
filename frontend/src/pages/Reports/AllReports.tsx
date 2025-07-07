// src/Pages/Reports/AllReports.tsx
import React, { useState, useEffect } from 'react';
import * as Icons from 'lucide-react';
import PageHeader from '../../components/Common/PageHeader';
import DataTable from '../../components/Common/DataTable';
import { reportsApi, Report, dealsApi, leadsApi, contactsApi, tasksApi } from '../../api/services';
import GenerateReportModal from '../../components/Common/GenerateReportModal';
import ReportView from '../../components/Common/ReportView';
import EditReportModal from '../../components/EditReportModal';

interface ModuleStats {
  deals: {
    total: number;
    totalValue: number;
    byStage: Record<string, number>;
  };
  leads: {
    total: number;
    activeLeads: number;
    convertedLeads: number;
  };
  contacts: {
    total: number;
    activeContacts: number;
  };
  tasks: {
    total: number;
    completed: number;
    pending: number;
  };
}

const AllReports: React.FC = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<ModuleStats | null>(null);
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [isReportViewOpen, setIsReportViewOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);

  useEffect(() => {
    fetchReports();
    fetchModuleStats();
  }, []);

  const fetchModuleStats = async () => {
    try {
      const [dealsStats, leadsData, contactsData, tasksData] = await Promise.all([
        dealsApi.getStats(),
        leadsApi.getAll(),
        contactsApi.getAll(),
        tasksApi.getAll()
      ]);

      setStats({
        deals: dealsStats,
        leads: {
          total: leadsData.length,
          activeLeads: leadsData.filter(l => l.status === 'Active').length,
          convertedLeads: leadsData.filter(l => l.status === 'Converted').length
        },
        contacts: {
          total: contactsData.length,
          activeContacts: contactsData.filter(c => !c.isDeleted).length
        },
        tasks: {
          total: tasksData.length,
          completed: tasksData.filter(t => t.status === 'Completed').length,
          pending: tasksData.filter(t => t.status !== 'Completed').length
        }
      });
    } catch (err) {
      console.error('Error fetching module stats:', err);
    }
  };

  const fetchReports = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await reportsApi.getAll();
      setReports(data);
    } catch (err) {
      setError('Failed to load reports. Please try again.');
      console.error('Error fetching reports:', err);
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

  const handleEditSuccess = async () => {
    // Close the modal first
    setIsEditModalOpen(false);
    setSelectedReport(null);
    // Then refresh the reports list
    await fetchReports();
  };

  const handleFavoriteToggle = async (reportId: string, isFavorite: boolean) => {
    try {
      await reportsApi.toggleFavorite(reportId, isFavorite);
      fetchReports(); // Refresh the reports list
    } catch (err) {
      console.error('Error toggling favorite:', err);
    }
  };

  const columns = [
    {
      key: 'name',
      label: 'Title',
      sortable: true
    },
    {
      key: 'reportType',
      label: 'Module',
      sortable: true,
      render: (value: string) => value.charAt(0).toUpperCase() + value.slice(1).replace('-', ' ')
    },
    {
      key: 'createdBy',
      label: 'Created By',
      sortable: true
    },
    {
      key: 'createdAt',
      label: 'Created On',
      sortable: true,
      render: (value: string) => new Date(value).toLocaleDateString()
    },
    {
      key: 'lastRun',
      label: 'Last Viewed',
      sortable: true,
      render: (value?: string) => value ? new Date(value).toLocaleDateString() : '—'
    },
    {
      key: 'isFavorite',
      label: 'Favorite',
      sortable: false,
      render: (value: boolean, report: Report) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleFavoriteToggle(report.id, !value);
          }}
          className={`p-1 rounded transition-colors ${
            value 
              ? 'text-yellow-500 hover:text-yellow-600' 
              : 'text-gray-300 hover:text-gray-400'
          }`}
          title={value ? 'Remove from favorites' : 'Add to favorites'}
        >
          <Icons.Star className={`w-4 h-4 ${value ? 'fill-current' : ''}`} />
        </button>
      )
    },
    {
      key: 'schedule',
      label: 'Schedule',
      sortable: false,
      render: (value?: string) =>
        value ? (
          <span className="flex items-center text-blue-600 text-sm">
            <Icons.Clock className="w-3 h-3 mr-1" /> {value}
          </span>
        ) : '—'
    },
    {
      key: 'runCount',
      label: 'Views',
      sortable: true
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
            className="flex items-center px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            title="View Report"
          >
            <Icons.Eye className="w-3 h-3 mr-1" />
            View
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleEditClick(report);
            }}
            className="flex items-center px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
            title="Edit Report Settings"
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
          title="Reports Dashboard"
          subtitle="Overview of all modules and metrics"
          breadcrumbs={[{ name: 'Home', path: '/' }, { name: 'Reports' }]}
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
          title="Reports Dashboard"
          subtitle="Overview of all modules and metrics"
          breadcrumbs={[{ name: 'Home', path: '/' }, { name: 'Reports' }]}
        />
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <Icons.AlertCircle className="h-12 w-12 text-red-500 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Reports</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={fetchReports}
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
        title="Reports Dashboard"
        subtitle="Overview of all modules and metrics"
        breadcrumbs={[{ name: 'Home', path: '/' }, { name: 'Reports' }]}
        actions={
          <button
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            onClick={() => setIsGenerateModalOpen(true)}
          >
            <Icons.Plus className="w-4 h-4 mr-2" />
            Generate Report
          </button>
        }
      />

      {/* Module Stats Grid */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Deals Stats */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Icons.Target className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-gray-900">Deals</h3>
                <p className="text-sm text-gray-500">Total Value: ${stats.deals.totalValue.toLocaleString()}</p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Total Deals</span>
                <span className="font-medium text-gray-900">{stats.deals.total}</span>
              </div>
              {Object.entries(stats.deals.byStage).map(([stage, count]) => (
                <div key={stage} className="flex justify-between text-sm">
                  <span className="text-gray-600">{stage}</span>
                  <span className="font-medium text-gray-900">{count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Leads Stats */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Icons.Users className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-gray-900">Leads</h3>
                <p className="text-sm text-gray-500">Conversion Rate: {((stats.leads.convertedLeads / stats.leads.total) * 100).toFixed(1)}%</p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Total Leads</span>
                <span className="font-medium text-gray-900">{stats.leads.total}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Active Leads</span>
                <span className="font-medium text-gray-900">{stats.leads.activeLeads}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Converted</span>
                <span className="font-medium text-gray-900">{stats.leads.convertedLeads}</span>
              </div>
            </div>
          </div>

          {/* Contacts Stats */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Icons.BookOpen className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-gray-900">Contacts</h3>
                <p className="text-sm text-gray-500">Active Rate: {((stats.contacts.activeContacts / stats.contacts.total) * 100).toFixed(1)}%</p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Total Contacts</span>
                <span className="font-medium text-gray-900">{stats.contacts.total}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Active Contacts</span>
                <span className="font-medium text-gray-900">{stats.contacts.activeContacts}</span>
              </div>
            </div>
          </div>

          {/* Tasks Stats */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <Icons.CheckSquare className="w-6 h-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-gray-900">Tasks</h3>
                <p className="text-sm text-gray-500">Completion Rate: {((stats.tasks.completed / stats.tasks.total) * 100).toFixed(1)}%</p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Total Tasks</span>
                <span className="font-medium text-gray-900">{stats.tasks.total}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Completed</span>
                <span className="font-medium text-gray-900">{stats.tasks.completed}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Pending</span>
                <span className="font-medium text-gray-900">{stats.tasks.pending}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recent Reports */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Reports</h2>
      {reports.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-center">
            <Icons.FileText className="h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Reports Found</h3>
            <p className="text-gray-600 mb-4">Get started by generating your first report.</p>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={reports}
            onRowClick={handleReportClick}
          />
        )}
      </div>

      <GenerateReportModal
        isOpen={isGenerateModalOpen}
        onClose={() => setIsGenerateModalOpen(false)}
        onSuccess={fetchReports}
      />

      <ReportView
        isOpen={isReportViewOpen}
        onClose={() => setIsReportViewOpen(false)}
        reportId={selectedReportId}
        onFavoriteToggle={fetchReports}
      />

      <EditReportModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSuccess={handleEditSuccess}
        report={selectedReport}
      />
    </div>
  );
};

export default AllReports;
