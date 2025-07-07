import React from 'react';
import * as Icons from 'lucide-react';
import { ViewType } from '../../types';

interface ViewToggleProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
  availableViews?: ViewType[];
}

const ViewToggle: React.FC<ViewToggleProps> = ({ 
  currentView, 
  onViewChange, 
  availableViews = ['list', 'kanban', 'grid', 'timeline', 'chart'] 
}) => {
  const viewConfig = {
    list: { icon: 'List', label: 'List' },
    kanban: { icon: 'Columns', label: 'Kanban' },
    grid: { icon: 'Grid3X3', label: 'Grid' },
    timeline: { icon: 'Calendar', label: 'Timeline' },
    chart: { icon: 'BarChart3', label: 'Chart' }
  };

  return (
    <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
      {availableViews.map((view) => {
        const config = viewConfig[view];
        const Icon = Icons[config.icon as keyof typeof Icons] as any;
        
        return (
          <button
            key={view}
            onClick={() => onViewChange(view)}
            className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              currentView === view
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
            title={config.label}
          >
            <Icon className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">{config.label}</span>
          </button>
        );
      })}
    </div>
  );
};

export default ViewToggle;