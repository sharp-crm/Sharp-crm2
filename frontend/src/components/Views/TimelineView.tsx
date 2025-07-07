import React from 'react';
import * as Icons from 'lucide-react';
import { Deal, Task } from '../../types';
import StatusBadge from '../Common/StatusBadge';

interface TimelineViewProps {
  data: (Deal | Task)[];
  type: 'deals' | 'tasks';
}

const TimelineView: React.FC<TimelineViewProps> = ({ data, type }) => {
  const sortedData = [...data].sort((a, b) => {
    const dateA = type === 'deals' ? (a as Deal).closeDate : (a as Task).dueDate;
    const dateB = type === 'deals' ? (b as Deal).closeDate : (b as Task).dueDate;
    return new Date(dateA).getTime() - new Date(dateB).getTime();
  });

  const groupedData = sortedData.reduce((groups, item) => {
    const date = type === 'deals' ? (item as Deal).closeDate : (item as Task).dueDate;
    const monthYear = new Date(date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    
    if (!groups[monthYear]) {
      groups[monthYear] = [];
    }
    groups[monthYear].push(item);
    return groups;
  }, {} as Record<string, (Deal | Task)[]>);

  return (
    <div className="space-y-8">
      {Object.entries(groupedData).map(([monthYear, items]) => (
        <div key={monthYear} className="relative">
          <div className="sticky top-0 bg-white z-10 pb-4">
            <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
              {monthYear}
            </h3>
          </div>
          
          <div className="relative">
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200"></div>
            
            <div className="space-y-6">
              {items.map((item, index) => {
                const isDeal = type === 'deals';
                const dealItem = item as Deal;
                const taskItem = item as Task;
                const date = isDeal ? dealItem.closeDate : taskItem.dueDate;
                
                return (
                  <div key={item.id} className="relative flex items-start">
                    <div className="absolute left-2 w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow"></div>
                    
                    <div className="ml-10 bg-white rounded-lg shadow-sm border border-gray-200 p-4 flex-1">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900 mb-1">
                            {isDeal ? dealItem.name : taskItem.title}
                          </h4>
                          <p className="text-sm text-gray-600 mb-2">
                            {isDeal ? dealItem.account : taskItem.description}
                          </p>
                          
                          <div className="flex items-center space-x-4 text-sm">
                            <div className="flex items-center text-gray-500">
                              <Icons.Calendar className="w-4 h-4 mr-1" />
                              {new Date(date).toLocaleDateString()}
                            </div>
                            <div className="flex items-center text-gray-500">
                              <Icons.User className="w-4 h-4 mr-1" />
                              {isDeal ? dealItem.owner : taskItem.assignee}
                            </div>
                          </div>
                        </div>
                        
                        <div className="ml-4 text-right">
                          {isDeal ? (
                            <>
                              <div className="font-semibold text-green-600 mb-1">
                                ${dealItem.value.toLocaleString()}
                              </div>
                              <StatusBadge status={dealItem.stage} />
                            </>
                          ) : (
                            <>
                              <StatusBadge status={taskItem.priority} variant="warning" />
                              <div className="mt-1">
                                <StatusBadge status={taskItem.status} />
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default TimelineView;