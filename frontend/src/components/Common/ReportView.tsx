import React, { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import * as Icons from 'lucide-react';
import { reportsApi, Report } from '../../api/services';
import API from '../../api/client';

interface ReportViewProps {
  isOpen: boolean;
  onClose: () => void;
  reportId: string | null;
  onFavoriteToggle?: () => void;
}

const ReportView: React.FC<ReportViewProps> = ({ isOpen, onClose, reportId, onFavoriteToggle }) => {
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFavoriting, setIsFavoriting] = useState(false);

  useEffect(() => {
    if (isOpen && reportId) {
      fetchReport();
    }
  }, [isOpen, reportId]);

  const fetchReport = async () => {
    if (!reportId) return;
    
    try {
      setLoading(true);
      setError(null);
      const reportData = await reportsApi.getById(reportId);
      
      if (reportData) {
        // If report doesn't have data, run it to generate data
        if (!reportData.data || (!reportData.data.results && !reportData.data.pipelineData && !reportData.data.summary && !reportData.data.forecast)) {
          console.log('Report has no data, running report to generate data...');
          await runReport(reportData);
        } else {
          setReport(reportData);
        }
      }
    } catch (err) {
      setError('Failed to load report. Please try again.');
      console.error('Error fetching report:', err);
    } finally {
      setLoading(false);
    }
  };

  const runReport = async (reportToRun: Report) => {
    try {
      setLoading(true);
      const response = await API.post(`/reports/${reportToRun.id}/run`);
      
      // The run response contains the report data
      const updatedReportData = {
        ...reportToRun,
        data: response.data.data,
        lastRun: new Date().toISOString(),
        runCount: (reportToRun.runCount || 0) + 1
      };
      
      setReport(updatedReportData);
    } catch (err) {
      setError('Failed to generate report data. Please try again.');
      console.error('Error running report:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFavoriteToggle = async () => {
    if (!report) return;
    
    try {
      setIsFavoriting(true);
      await reportsApi.toggleFavorite(report.id, !report.isFavorite);
      setReport({ ...report, isFavorite: !report.isFavorite });
      onFavoriteToggle?.();
    } catch (err) {
      console.error('Error toggling favorite:', err);
    } finally {
      setIsFavoriting(false);
    }
  };

  const renderReportData = () => {
    if (!report?.data) return null;

    // Handle both data structures: direct data or wrapped in results
    const results = report.data.results || report.data;
    if (!results) return null;

    switch (report.reportType) {
      case 'deals-pipeline':
        if (!results.pipelineData) {
          return <div className="text-gray-500">No pipeline data available.</div>;
        }
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-900">Total Deals</h4>
                <p className="text-2xl font-bold text-blue-600">{results.totalDeals || 0}</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <h4 className="font-medium text-green-900">Total Value</h4>
                <p className="text-2xl font-bold text-green-600">${(results.totalValue || 0).toLocaleString()}</p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <h4 className="font-medium text-purple-900">Avg Deal Size</h4>
                <p className="text-2xl font-bold text-purple-600">
                  ${(results.totalDeals || 0) > 0 ? ((results.totalValue || 0) / (results.totalDeals || 1)).toLocaleString() : '0'}
                </p>
              </div>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-900 mb-4">Pipeline by Stage</h4>
              <div className="space-y-3">
                {(results.pipelineData || []).map((stage: any, index: number) => (
                  <div key={index} className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium text-gray-900">{stage.stage || 'Unknown'}</span>
                      <span className="text-sm text-gray-500">{stage.count || 0} deals</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-bold text-gray-900">${(stage.value || 0).toLocaleString()}</span>
                      <span className="text-sm text-gray-500">
                        {(results.totalValue || 0) > 0 ? (((stage.value || 0) / (results.totalValue || 1)) * 100).toFixed(1) : '0'}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'sales-forecast':
        if (!results.forecast || !results.timeline) {
          return <div className="text-gray-500">No forecast data available.</div>;
        }
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-900">Total Pipeline</h4>
                <p className="text-2xl font-bold text-blue-600">${(results.forecast.totalPipeline || 0).toLocaleString()}</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <h4 className="font-medium text-green-900">Weighted Forecast</h4>
                <p className="text-2xl font-bold text-green-600">${(results.forecast.weightedPipeline || 0).toLocaleString()}</p>
              </div>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-900 mb-4">Monthly Timeline</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h5 className="font-medium text-gray-900">This Month</h5>
                  <p className="text-xl font-bold text-gray-600">${(results.timeline.thisMonth || 0).toLocaleString()}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h5 className="font-medium text-gray-900">Next Month</h5>
                  <p className="text-xl font-bold text-gray-600">${(results.timeline.nextMonth || 0).toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>
        );

      case 'lead-conversion':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-900">Total Leads</h4>
                <p className="text-2xl font-bold text-blue-600">{results.summary.totalLeads}</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <h4 className="font-medium text-green-900">Converted</h4>
                <p className="text-2xl font-bold text-green-600">{results.summary.convertedLeads}</p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <h4 className="font-medium text-purple-900">Conversion Rate</h4>
                <p className="text-2xl font-bold text-purple-600">
                  {results.summary.totalLeads > 0 ? 
                    ((results.summary.convertedLeads / results.summary.totalLeads) * 100).toFixed(1) : 0}%
                </p>
              </div>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-900 mb-4">Lead Sources</h4>
              <div className="space-y-3">
                {Object.entries(results.bySource).map(([source, data]: [string, any]) => (
                  <div key={source} className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium text-gray-900">{source}</span>
                      <span className="text-sm text-gray-500">{data.total} leads</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-bold text-gray-900">{data.converted} converted</span>
                      <span className="text-sm text-gray-500">
                        {data.total > 0 ? ((data.converted / data.total) * 100).toFixed(1) : 0}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'task-completion':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-900">Total Tasks</h4>
                <p className="text-2xl font-bold text-blue-600">{results.summary.totalTasks}</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <h4 className="font-medium text-green-900">Completed</h4>
                <p className="text-2xl font-bold text-green-600">{results.summary.completedTasks}</p>
              </div>
              <div className="bg-red-50 p-4 rounded-lg">
                <h4 className="font-medium text-red-900">Overdue</h4>
                <p className="text-2xl font-bold text-red-600">{results.summary.overdueTasks}</p>
              </div>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-900 mb-4">Tasks by Type</h4>
              <div className="space-y-3">
                {Object.entries(results.byType).map(([type, data]: [string, any]) => (
                  <div key={type} className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium text-gray-900">{type}</span>
                      <span className="text-sm text-gray-500">{data.total} tasks</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-bold text-gray-900">{data.completed} completed</span>
                      <span className="text-sm text-gray-500">
                        {data.total > 0 ? ((data.completed / data.total) * 100).toFixed(1) : 0}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'contact-engagement':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-900">Total Contacts</h4>
                <p className="text-2xl font-bold text-blue-600">{results.summary.totalContacts}</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <h4 className="font-medium text-green-900">Active Contacts</h4>
                <p className="text-2xl font-bold text-green-600">{results.summary.activeContacts}</p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <h4 className="font-medium text-purple-900">Total Interactions</h4>
                <p className="text-2xl font-bold text-purple-600">{results.summary.totalInteractions}</p>
              </div>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-900 mb-4">Engagement by Source</h4>
              <div className="space-y-3">
                {Object.entries(results.bySource).map(([source, data]: [string, any]) => (
                  <div key={source} className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium text-gray-900">{source}</span>
                      <span className="text-sm text-gray-500">{data.total} contacts</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-bold text-gray-900">{data.withTasks} with tasks</span>
                      <span className="text-sm text-gray-500">{data.taskCount} interactions</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      default:
        return <div className="text-gray-500">No data available for this report type.</div>;
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center space-x-4">
              <Dialog.Title className="text-xl font-semibold text-gray-900">
                {report?.name || 'Report'}
              </Dialog.Title>
              {report && (
                <button
                  onClick={handleFavoriteToggle}
                  disabled={isFavoriting}
                  className={`p-2 rounded-lg transition-colors ${
                    report.isFavorite 
                      ? 'bg-yellow-100 text-yellow-600 hover:bg-yellow-200' 
                      : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                  }`}
                  title={report.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                >
                  {isFavoriting ? (
                    <Icons.Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Icons.Star className={`w-5 h-5 ${report.isFavorite ? 'fill-current' : ''}`} />
                  )}
                </button>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Icons.X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          <div className="p-6">
            {loading && (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            )}

            {error && (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <Icons.AlertCircle className="h-12 w-12 text-red-500 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Report</h3>
                <p className="text-gray-600 mb-4">{error}</p>
                <button
                  onClick={fetchReport}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Try Again
                </button>
              </div>
            )}

            {!loading && !error && report && (
              <div className="space-y-6">
                {/* Report Info */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Report Type:</span>
                      <p className="font-medium text-gray-900 capitalize">{report.reportType.replace('-', ' ')}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Created:</span>
                      <p className="font-medium text-gray-900">{new Date(report.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Last Run:</span>
                      <p className="font-medium text-gray-900">
                        {report.lastRun ? new Date(report.lastRun).toLocaleDateString() : 'Never'}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500">Views:</span>
                      <p className="font-medium text-gray-900">{report.runCount}</p>
                    </div>
                  </div>
                  {report.description && (
                    <div className="mt-4">
                      <span className="text-gray-500">Description:</span>
                      <p className="font-medium text-gray-900 mt-1">{report.description}</p>
                    </div>
                  )}
                </div>

                {/* Report Data */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Report Data</h3>
                  {renderReportData()}
                </div>
              </div>
            )}
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};

export default ReportView; 