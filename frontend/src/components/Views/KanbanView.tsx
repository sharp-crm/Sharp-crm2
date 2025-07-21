import React, { useState } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragOverEvent,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  rectIntersection,
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

// Drop placeholder component
const DropPlaceholder: React.FC = () => (
  <div className="bg-gray-200 border-2 border-dashed border-gray-400 rounded-lg p-4 mb-3 min-h-[100px] flex items-center justify-center opacity-70">
    <div className="text-gray-500 text-sm font-medium">Drop here</div>
  </div>
);

const KanbanCard: React.FC<KanbanCardProps> = ({ item, type, dragOverlay = false, getUserName }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: item.id,
    data: {
      type: 'kanban-item',
      item
    }
  });

  const style = !dragOverlay
    ? {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.3 : 1,
        zIndex: isDragging ? 1000 : 'auto',
      }
    : {
        opacity: 0.9,
        boxShadow: '0 8px 25px rgba(0,0,0,0.3)',
        transform: 'rotate(3deg) scale(1.02)',
        zIndex: 1001,
      };

  const isDeal = type === 'deals';
  const dealItem = item as Deal;
  const taskItem = item as Task;

  return (
    <div
      ref={dragOverlay ? undefined : setNodeRef}
      style={style}
      {...(dragOverlay ? {} : attributes)}
      {...(dragOverlay ? {} : listeners)}
      className={`bg-white p-4 rounded-lg shadow-sm border border-gray-200 relative select-none ${
        dragOverlay ? 'cursor-grabbing shadow-2xl' : 'cursor-grab hover:shadow-md'
      } transition-all duration-150 ${isDragging ? 'shadow-lg' : ''}`}
    >
      {/* Card header */}
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
  isOver: boolean;
  canDrop: boolean;
}> = ({ id, children, isOver, canDrop }) => {
  const { setNodeRef } = useDroppable({ 
    id,
    data: {
      type: 'column',
      accepts: ['kanban-item']
    }
  });
  
  return (
    <div 
      ref={setNodeRef}
      className={`relative w-full min-h-[600px] transition-all duration-150 ${
        isOver && canDrop ? 'ring-2 ring-blue-400 ring-opacity-70' : ''
      } ${isOver && !canDrop ? 'ring-2 ring-red-400 ring-opacity-70' : ''}`}
      style={{ minHeight: '600px' }}
    >
      {/* Full column drop overlay */}
      <div className={`absolute inset-0 pointer-events-none transition-all duration-150 ${
        isOver && canDrop ? 'bg-blue-50 bg-opacity-30 rounded-lg' : ''
      }`} style={{ zIndex: 5 }} />
      
      {children}
    </div>
  );
};

const KanbanView: React.FC<KanbanViewProps> = ({ data, onItemMove, type, getUserName }) => {
  const stages = type === 'deals'
    ? [...DEAL_STAGES]
    : ['Open', 'In Progress', 'Follow Up', 'Completed'];

  const [activeItem, setActiveItem] = useState<Deal | Task | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  // Configure drag sensors to be more responsive
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 3, // Reduced distance for faster activation
      },
    })
  );

  // Enhanced collision detection
  const customCollisionDetection = (args: any) => {
    // When dragging, prioritize column detection over card detection
    const { active, droppableContainers } = args;
    
    if (!active) return [];

    // Filter to only column containers
    const columnContainers = Array.from(droppableContainers.values()).filter(
      (container: any) => container.data.current?.type === 'column'
    );

    // First try rectangle intersection with columns only
    const rectIntersectionCollisions = rectIntersection({
      ...args,
      droppableContainers: columnContainers
    });
    
    if (rectIntersectionCollisions.length > 0) {
      return rectIntersectionCollisions;
    }
    
    // Fallback to closest corners with columns only
    return closestCorners({
      ...args,
      droppableContainers: columnContainers
    });
  };

  const handleDragStart = (event: any) => {
    const dragged = data.find((d) => d.id === event.active.id);
    if (dragged) setActiveItem(dragged);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event;
    const newOverId = over ? over.id.toString() : null;
    
    // Only update if different to reduce re-renders
    if (newOverId !== overId) {
      setOverId(newOverId);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveItem(null);
    setOverId(null);

    if (!over) {
      console.log('No valid drop target');
      return;
    }

    const activeId = active.id;
    const overContainer = over.id.toString();

    // Validate that the drop target is a valid stage
    if (!stages.includes(overContainer as any)) {
      console.log('Invalid drop target:', overContainer);
      return;
    }

    if (activeId && overContainer) {
      const item = data.find((d) => d.id === activeId);
      if (!item) {
        console.log('Item not found:', activeId);
        return;
      }

      const currentStage = type === 'deals' ? (item as Deal).stage : (item as Task).status;

      if (currentStage !== overContainer) {
        console.log('Moving item:', activeId, 'from', currentStage, 'to', overContainer);
        onItemMove(activeId.toString(), overContainer as Deal['stage'] | Task['status']);
      }
    }
  };

  const handleDragCancel = () => {
    setActiveItem(null);
    setOverId(null);
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
        'Closed Lost': '#6B7280',
        'Closed Lost to Competition': '#EF4444'
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
      sensors={sensors}
      collisionDetection={customCollisionDetection}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="flex space-x-6 overflow-x-auto pb-4">
        {stages.map((stage) => {
          const stageItems = getItemsByStage(stage);
          const stageColor = getStageColor(stage);
          const isOver = overId === stage;
          const canDrop = activeItem !== null && stages.includes(stage as any);
          const currentStage = activeItem ? (type === 'deals' ? (activeItem as Deal).stage : (activeItem as Task).status) : null;
          const isDifferentStage = currentStage !== stage;

          return (
            <div key={stage} className="flex-shrink-0 w-80">
              <DroppableColumn id={stage} isOver={isOver} canDrop={canDrop && isDifferentStage}>
                <div className={`bg-gray-50 rounded-lg p-4 min-h-[600px] transition-all duration-150 relative ${
                  isOver && canDrop && isDifferentStage ? 'border-2 border-blue-300 shadow-lg' : 
                  isOver && !isDifferentStage ? 'border-2 border-yellow-300' :
                  'border-2 border-transparent'
                }`}>
                  <div className="flex items-center justify-between mb-4 relative z-20">
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
                      <div className="space-y-3 relative" style={{ zIndex: 10 }}>
                      {/* Show drop placeholder when dragging over this column */}
                      {isOver && canDrop && isDifferentStage && stageItems.length > 0 && (
                        <div className="relative z-20">
                          <DropPlaceholder />
                        </div>
                      )}
                      
                      {stageItems.map((item) => (
                        <KanbanCard key={item.id} item={item} type={type} getUserName={getUserName} />
                      ))}
                      
                      {/* Show placeholder at bottom if column is empty and being dragged over */}
                      {stageItems.length === 0 && isOver && canDrop && isDifferentStage && (
                        <div className="relative z-20">
                          <DropPlaceholder />
                        </div>
                      )}
                      
                      {/* Additional padding at bottom for easier dropping */}
                      <div className="h-20" />
                    </div>
                  </SortableContext>
                </div>
              </DroppableColumn>
            </div>
          );
        })}
      </div>

      <DragOverlay dropAnimation={null}>
        {activeItem ? (
          <KanbanCard item={activeItem} type={type} dragOverlay getUserName={getUserName} />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};

export default KanbanView;
