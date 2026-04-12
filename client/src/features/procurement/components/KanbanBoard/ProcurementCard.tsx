import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Truck, Eye, Ban } from 'lucide-react';
import { format } from 'date-fns';
import { KanbanItem } from '../../types';
import { formatPriceKSHS } from '@/lib/format';
import { cn } from '@/lib/utils';

interface ProcurementCardProps {
  item: KanbanItem;
  onSupplierClick: (supplierId: string) => void;
  onApprove?: () => void;
  onReject?: () => void;
  onConfirm?: () => void;
  onCancel?: () => void;
  onClick?: () => void;
}

export const ProcurementCard: React.FC<ProcurementCardProps> = ({
  item,
  onSupplierClick,
  onApprove,
  onReject,
  onConfirm,
  onCancel,
  onClick,
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const isRequest = item.type === 'request';
  const data = item.data as any;

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        'cursor-grab active:cursor-grabbing shadow-sm hover:shadow-md transition-shadow',
        isDragging && 'shadow-lg'
      )}
      onClick={onClick}
    >
      <CardContent className="p-3 space-y-2">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs font-mono">
                {isRequest ? `PR #${(item.id || '').slice(-6)}` : `PO #${data.poNumber}`}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {data.quantity} {data.unit}
              </Badge>
            </div>
            <p className="text-sm font-medium">{data.itemName}</p>
          </div>
        </div>

        <div className="text-xs text-muted-foreground space-y-0.5">
          {isRequest ? (
            <p>Requested: {format(new Date(data.requestDate), 'MMM d, yyyy')}</p>
          ) : (
            <>
              <p>Expected: {format(new Date(data.expectedDeliveryDate), 'MMM d, yyyy')}</p>
              <p>Total: {formatPriceKSHS(data.totalAmount)}</p>
            </>
          )}
        </div>

        {data.supplierId && (
          <Button
            variant="link"
            className="p-0 h-auto text-xs text-blue-600 dark:text-blue-400"
            onClick={(e) => {
              e.stopPropagation();
              onSupplierClick(data.supplierId);
            }}
          >
            <Eye className="h-3 w-3 mr-1" />
            {data.supplierName || 'View Supplier'}
          </Button>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2 border-t">
          {onApprove && (
            <Button
              size="sm"
              variant="default"
              className="h-7 text-xs flex-1"
              onClick={(e) => { e.stopPropagation(); onApprove(); }}
            >
              <CheckCircle className="h-3 w-3 mr-1" />
              Approve
            </Button>
          )}
          {onReject && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs flex-1"
              onClick={(e) => { e.stopPropagation(); onReject(); }}
            >
              <XCircle className="h-3 w-3 mr-1" />
              Reject
            </Button>
          )}
          {onConfirm && (
            <Button
              size="sm"
              variant="default"
              className="h-7 text-xs w-full"
              onClick={(e) => { e.stopPropagation(); onConfirm(); }}
            >
              <Truck className="h-3 w-3 mr-1" />
              Confirm PO
            </Button>
          )}
          {onCancel && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs w-full text-destructive"
              onClick={(e) => { e.stopPropagation(); onCancel(); }}
            >
              <Ban className="h-3 w-3 mr-1" />
              Cancel
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};