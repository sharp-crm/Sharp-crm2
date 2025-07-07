import React from 'react';
import { Report } from '../../types';
import { Star, Clock } from 'lucide-react';

const ReportCard: React.FC<{ report: Report }> = ({ report }) => {
  return (
    <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{report.title}</h3>
          <p className="text-sm text-gray-500">{report.module}</p>
        </div>
        {report.isFavorite && <Star className="w-4 h-4 text-yellow-500" />}
      </div>
      <p className="mt-2 text-sm text-gray-600">
        Created by {report.createdBy} on {new Date(report.createdAt).toLocaleDateString()}
      </p>
      {report.lastViewed && (
        <p className="text-xs text-gray-400 mt-1">
          Last viewed: {new Date(report.lastViewed).toLocaleDateString()}
        </p>
      )}
      {report.schedule && (
        <p className="text-xs text-blue-500 mt-1 flex items-center">
          <Clock className="w-3 h-3 mr-1" /> {report.schedule}
        </p>
      )}
    </div>
  );
};

export default ReportCard;
