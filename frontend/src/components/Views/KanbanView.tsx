import React, { useState } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  closestCenter,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import * as Icons from 'lucide-react';
import { Deal, Task, DEAL_STAGES } from '../../types';
import StatusBadge from '../Common/StatusBadge';

interface KanbanViewProps {
  data: (Deal | Task)[];
  onItemMove: (itemId: string, newStage: Deal['stage'] | Task['status']) => void;
  type: 'deals' | 'tasks';
  getUserName?: (userId: string) => string;
}

interface KanbanCardProps {
  item: Deal | Task;
  type: 'deals' | 'tasks';
  dragOverlay?: boolean;
  getUserName?: (userId: string) => string;
}

const KanbanCard: React.FC<KanbanCardProps> = ({ item, type, dragOverlay = false, getUserName }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = !dragOverlay
    ? {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
      }
    : {
        opacity: 0.8,
        boxShadow: '0 4px 14px rgba(0,0,0,0.2)',
      };

  const isDeal = type === 'deals';
  const dealItem = item as Deal;
  const taskItem = item as Task;

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <div
      ref={dragOverlay ? undefined : setNodeRef}
      style={style}
      {...(dragOverlay ? {} : attributes)}
      {...(dragOverlay ? {} : listeners)}
      onClick={handleClick}
      className={`bg-white p-4 rounded-lg shadow-sm border border-gray-200 ${
        dragOverlay ? 'cursor-grabbing' : 'cursor-grab hover:shadow-md'
      } transition-shadow`}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
        <h4 className="font-medium text-gray-900 text-sm">
          {isDeal ? dealItem.name : taskItem.title}
        </h4>
          <p className="text-sm text-gray-600 mt-1 line-clamp-2">
            {isDeal ? dealItem.dealName : taskItem.description}
          </p>
        </div>
        <Icons.GripVertical className="w-4 h-4 text-gray-400 flex-shrink-0 ml-2" />
      </div>

      {isDeal ? (
        <>
          <div className="flex items-center justify-between mt-3">
            <span className="font-semibold text-green-600">
              ${dealItem.value?.toLocaleString()}
            </span>
            <span className="text-xs text-gray-500">{dealItem.probability}%</span>
          </div>
          <div className="mt-2 text-xs text-gray-500">
            Close: {new Date(dealItem.closeDate || '').toLocaleDateString()}
          </div>
        </>
      ) : (
        <>
          <div className="flex items-center gap-2 mt-3">
            <StatusBadge status={taskItem.priority} variant="warning" />
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
              {taskItem.type}
            </span>
          </div>
          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center text-xs text-gray-500">
              <Icons.Calendar className="w-3 h-3 mr-1" />
              {new Date(taskItem.dueDate).toLocaleDateString()}
            </div>
            <div className="flex items-center text-xs text-gray-500">
              <Icons.User className="w-3 h-3 mr-1" />
              {getUserName ? getUserName(taskItem.assignee) : taskItem.assignee}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

const DroppableColumn: React.FC<{
  id: string;
  children: React.ReactNode;
}> = ({ id, children }) => {
  const { setNodeRef } = useDroppable({ id });
  return <div ref={setNodeRef}>{children}</div>;
};

const KanbanView: React.FC<KanbanViewProps> = ({ data, onItemMove, type, getUserName }) => {
  const stages = type === 'deals'
    ? ['Needs Analysis', 'Value Proposition', 'Identify Decision Makers', 'Negotiation/Review', 'Closed Won', 'Closed Lost']
    : ['Open', 'In Progress', 'Follow Up', 'Completed'] as const;

  const [activeItem, setActiveItem] = useState<Deal | Task | null>(null);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveItem(null);

    if (!over) return;

    const activeId = active.id;
    const overContainer = over.id;

    if (activeId && overContainer && typeof overContainer === 'string') {
      const item = data.find((d) => d.id === activeId);
      const currentStage = type === 'deals' ? (item as Deal).stage : (item as Task).status;

      if (currentStage !== overContainer) {
        onItemMove(activeId.toString(), overContainer as Deal['stage'] | Task['status']);
      }
    }
  };

  const getItemsByStage = (stage: string) => {
    return data.filter(item => {
      if (type === 'deals') {
        return (item as Deal).stage === stage;
      } else {
        return (item as Task).status === stage;
      }
    });
  };

  const getStageColor = (stage: string) => {
    if (type === 'deals') {
      const colors: Record<string, string> = {
        'Needs Analysis': '#3B82F6',
        'Value Proposition': '#8B5CF6',
        'Identify Decision Makers': '#F59E0B',
        'Negotiation/Review': '#10B981',
        'Closed Won': '#22C55E',
        'Closed Lost': '#6B7280'
      };
      return colors[stage] || '#6B7280';
    } else {
      const colors: Record<string, string> = {
        'Open': '#3B82F6',
        'In Progress': '#F59E0B',
        'Follow Up': '#8B5CF6',
        'Completed': '#10B981'
      };
      return colors[stage] || '#6B7280';
    }
  };

  return (
    <DndContext
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
      onDragStart={(event) => {
        const dragged = data.find((d) => d.id === event.active.id);
        if (dragged) setActiveItem(dragged);
      }}
    >
      <div className="flex space-x-6 overflow-x-auto pb-4">
        {stages.map((stage) => {
          const stageItems = getItemsByStage(stage);
          const stageColor = getStageColor(stage);

          return (
            <DroppableColumn key={stage} id={stage}>
              <div className="flex-shrink-0 w-80">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                      <div 
                        className="w-3 h-3 rounded-full mr-2" 
                        style={{ backgroundColor: stageColor }}
                      />
                    <h3 className="font-semibold text-gray-900">{stage}</h3>
                    </div>
                    <span className="bg-gray-200 text-gray-700 px-2 py-1 rounded-full text-xs">
                      {stageItems.length}
                    </span>
                  </div>

                  <SortableContext items={stageItems.map(item => item.id)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-3 min-h-[200px]">
                      {stageItems.map((item) => (
                        <KanbanCard key={item.id} item={item} type={type} getUserName={getUserName} />
                      ))}
                    </div>
                  </SortableContext>
                </div>
              </div>
            </DroppableColumn>
          );
        })}
      </div>

      <DragOverlay>
        {activeItem ? (
          <KanbanCard item={activeItem} type={type} dragOverlay getUserName={getUserName} />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};

export default KanbanView;
