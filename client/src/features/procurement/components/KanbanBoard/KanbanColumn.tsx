import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface KanbanColumnProps {
  id: string;
  title: string;
  color: string;
  count: number;
  children: React.ReactNode;
}

export const KanbanColumn: React.FC<KanbanColumnProps> = ({ id, title, color, count, children }) => {
  const { setNodeRef } = useDroppable({ id });

  const childArray = React.Children.toArray(children);
  const ids = childArray.map((child: any) => child.props.item.id);

  return (
    <Card className={cn('w-80 shrink-0 border shadow-sm', color)}>
      <CardHeader className="p-4 pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold">{title}</CardTitle>
          <Badge variant="secondary" className="text-xs">
            {count}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-2" ref={setNodeRef}>
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          <div className="space-y-2 min-h-[200px]">
            {children}
          </div>
        </SortableContext>
      </CardContent>
    </Card>
  );
};