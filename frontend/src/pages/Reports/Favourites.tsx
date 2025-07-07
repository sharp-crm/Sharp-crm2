// src/Pages/Reports/Favourites.tsx
import React, { useState, useEffect } from 'react';
import PageHeader from '../../components/Common/PageHeader';
import DataTable from '../../components/Common/DataTable';
import { reportsApi, Report } from '../../api/services';
import ReportView from '../../components/Common/ReportView';
import { Star, AlertCircle, Eye } from 'lucide-react';

const Favourites: React.FC = () => {
  const [favoriteReports, setFavoriteReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isReportViewOpen, setIsReportViewOpen] = useState(false);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);

  useEffect(() => {
    fetchFavoriteReports();
  }, []);

  const fetchFavoriteReports = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await reportsApi.getFavorites();
      setFavoriteReports(data);
    } catch (err) {
      setError('Failed to load favorite reports. Please try again.');
      console.error('Error fetching favorite reports:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleReportClick = (report: Report) => {
    setSelectedReportId(report.id);
    setIsReportViewOpen(true);
  };

  const handleFavoriteToggle = async (reportId: string, isFavorite: boolean) => {
    try {
      await reportsApi.toggleFavorite(reportId, isFavorite);
      fetchFavoriteReports(); // Refresh the favorites list
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
      label: 'Type',
      sortable: true,
      render: (value: string) => value.charAt(0).toUpperCase() + value.slice(1).replace('-', ' ')
    },
    {
      key: 'createdAt',
      label: 'Created',
      sortable: true,
      render: (value: string) => new Date(value).toLocaleDateString()
    },
    {
      key: 'lastRun',
      label: 'Last Run',
      sortable: true,
      render: (value?: string) => value ? new Date(value).toLocaleDateString() : 'Never'
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
        <div className="flex items-center space-x-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleReportClick(report);
            }}
            className="flex items-center px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            <Eye className="w-3 h-3 mr-1" />
            View
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleFavoriteToggle(report.id, false);
            }}
            className="p-1 text-yellow-500 hover:text-yellow-600 transition-colors"
            title="Remove from favorites"
          >
            <Star className="w-4 h-4 fill-current" />
          </button>
        </div>
      )
    }
  ];

  if (loading) {
    return (
      <div className="p-6">
        <PageHeader
          title="Favourite Reports"
          subtitle="Your starred reports"
          breadcrumbs={[{ name: 'Home', path: '/' }, { name: 'Reports', path: '/reports' }, { name: 'Favourites' }]}
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
          title="Favourite Reports"
          subtitle="Your starred reports"
          breadcrumbs={[{ name: 'Home', path: '/' }, { name: 'Reports', path: '/reports' }, { name: 'Favourites' }]}
        />
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Favourite Reports</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={fetchFavoriteReports}
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
        title="Favourite Reports"
        subtitle="Your starred reports"
        breadcrumbs={[{ name: 'Home', path: '/' }, { name: 'Reports', path: '/reports' }, { name: 'Favourites' }]}
      />

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        {favoriteReports.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <Star className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Favourite Reports</h3>
            <p className="text-gray-600 mb-4">Star reports from the All Reports page to see them here.</p>
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={favoriteReports}
            onRowClick={handleReportClick}
          />
        )}
      </div>

      <ReportView
        isOpen={isReportViewOpen}
        onClose={() => setIsReportViewOpen(false)}
        reportId={selectedReportId}
        onFavoriteToggle={fetchFavoriteReports}
      />
    </div>
  );
};

export default Favourites;
