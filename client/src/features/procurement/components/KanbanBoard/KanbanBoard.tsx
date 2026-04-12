import React from 'react';
import { DndContext, closestCorners, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { KanbanColumn } from './KanbanColumn';
import { ProcurementCard } from './ProcurementCard';
import { KanbanItem, ProcurementStatus } from '../../types';
import { useProcurementPermissions } from '../../hooks/useProcurementPermissions';
import { useApproveRequest, useRejectRequest, useConfirmPO, useCancelPO } from '../../hooks/useProcurementData';

interface KanbanBoardProps {
  items: KanbanItem[];
  onSupplierClick: (supplierId: string) => void;
  onItemClick?: (item: KanbanItem) => void;
  onCreatePO?: (item: KanbanItem) => void;
}

const COLUMNS: { id: ProcurementStatus; title: string; color: string }[] = [
  { id: 'LOW_STOCK_ALERT', title: 'Low Stock Alert', color: 'bg-red-50 dark:bg-red-950/20' },
  { id: 'PENDING_APPROVAL', title: 'Pending Approval', color: 'bg-yellow-50 dark:bg-yellow-950/20' },
  { id: 'APPROVED', title: 'Approved', color: 'bg-blue-50 dark:bg-blue-950/20' },
  { id: 'PO_CREATED', title: 'PO Created', color: 'bg-indigo-50 dark:bg-indigo-950/20' },
  { id: 'AWAITING_DELIVERY', title: 'Awaiting Delivery', color: 'bg-purple-50 dark:bg-purple-950/20' },
  { id: 'INSPECTION', title: 'Inspection', color: 'bg-orange-50 dark:bg-orange-950/20' },
  { id: 'COMPLETED', title: 'Completed', color: 'bg-green-50 dark:bg-green-950/20' },
];

export const KanbanBoard: React.FC<KanbanBoardProps> = ({ items, onSupplierClick, onItemClick }) => {
  const permissions = useProcurementPermissions();
  const approveMutation = useApproveRequest();
  const rejectMutation = useRejectRequest();
  const confirmMutation = useConfirmPO();
  const cancelMutation = useCancelPO();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    const itemId = active.id as string;
    const newStatus = over.id as ProcurementStatus;
    console.log(`Move ${itemId} to ${newStatus}`);
    // Implement status update logic here based on item type
  };

  const getColumnItems = (columnId: ProcurementStatus) => {
    return items.filter(item => item.status === columnId);
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4 px-1">
        <SortableContext items={COLUMNS.map(c => c.id)} strategy={horizontalListSortingStrategy}>
          {COLUMNS.map(column => (
            <KanbanColumn
              key={column.id}
              id={column.id}
              title={column.title}
              color={column.color}
              count={getColumnItems(column.id).length}
            >
              {getColumnItems(column.id).map(item => (
                <ProcurementCard
                  key={item.id}
                  item={item}
                  onSupplierClick={onSupplierClick}
                  onApprove={
                    permissions.canApproveRequest && item.status === 'PENDING_APPROVAL' && item.type === 'request'
                      ? () => approveMutation.mutate({ id: item.id })
                      : undefined
                  }
                  onReject={
                    permissions.canRejectRequest && item.status === 'PENDING_APPROVAL' && item.type === 'request'
                      ? () => rejectMutation.mutate({ id: item.id, reason: 'Rejected from dashboard' })
                      : undefined
                  }
                  onConfirm={
                    permissions.canConfirmPO && item.status === 'PO_CREATED' && item.type === 'order'
                      ? () => confirmMutation.mutate(item.id)
                      : undefined
                  }
                  onCancel={
                    permissions.canConfirmPO && item.type === 'order' && item.status !== 'CANCELLED'
                      ? () => cancelMutation.mutate({ id: item.id, reason: 'Cancelled from dashboard' })
                      : undefined
                  }
                  onClick={() => onItemClick?.(item)}
                />
              ))}
            </KanbanColumn>
          ))}
        </SortableContext>
      </div>
    </DndContext>
  );
};