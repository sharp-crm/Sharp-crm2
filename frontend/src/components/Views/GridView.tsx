import React from 'react';
import * as Icons from 'lucide-react';
import { Deal, Task } from '../../types';
import StatusBadge from '../Common/StatusBadge';

interface GridViewProps {
  data: (Deal | Task)[];
  type: 'deals' | 'tasks';
  onItemClick?: (item: Deal | Task) => void;
}

const GridView: React.FC<GridViewProps> = ({ data, type, onItemClick }) => {
  const isDeal = type === 'deals';

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {data.map((item) => {
        const dealItem = item as Deal;
        const taskItem = item as Task;

        return (
          <div
            key={item.id}
            onClick={() => onItemClick?.(item)}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-1">
                  {isDeal ? dealItem.name : taskItem.title}
                </h3>
                {isDeal ? (
                  <p className="text-sm text-gray-600">{dealItem.account}</p>
                ) : (
                  <p className="text-sm text-gray-600 line-clamp-2">{taskItem.description}</p>
                )}
              </div>
              <div className="ml-2">
                {isDeal ? (
                  <Icons.Target className="w-5 h-5 text-orange-500" />
                ) : (
                  <Icons.CheckSquare className="w-5 h-5 text-blue-500" />
                )}
              </div>
            </div>

            <div className="space-y-3">
              {isDeal ? (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Value</span>
                    <span className="font-semibold text-green-600">
                      ${dealItem.value.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Stage</span>
                    <StatusBadge status={dealItem.stage} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Probability</span>
                    <span className="text-sm font-medium">{dealItem.probability}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Close Date</span>
                    <span className="text-sm text-gray-900">
                      {new Date(dealItem.closeDate).toLocaleDateString()}
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Priority</span>
                    <StatusBadge status={taskItem.priority} variant="warning" />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Status</span>
                    <StatusBadge status={taskItem.status} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Type</span>
                    <span className="text-sm text-gray-900">{taskItem.type}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Due Date</span>
                    <span className="text-sm text-gray-900">
                      {new Date(taskItem.dueDate).toLocaleDateString()}
                    </span>
                  </div>
                </>
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="flex items-center text-sm text-gray-500">
                <Icons.User className="w-4 h-4 mr-1" />
                {isDeal ? dealItem.owner : taskItem.assignee}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default GridView;