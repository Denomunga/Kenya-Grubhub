import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { usePurchaseRequests, usePurchaseOrders } from '../hooks/useProcurementData';
import { useProcurementPermissions } from '../hooks/useProcurementPermissions';
import { KanbanBoard } from '../components/KanbanBoard/KanbanBoard';
import { SupplierDrawer } from '../components/SupplierDrawer/SupplierDrawer';
import { StatsCards } from '@/features/procurement/components/ProcurementStats/StatsCards';
import { KanbanItem, ProcurementStatus } from '../types';
import { LayoutGrid, BarChart3, Truck, ClipboardList, Plus } from 'lucide-react';

// Helper to map API statuses to Kanban statuses
const mapRequestToKanban = (req: any): ProcurementStatus => {
  switch (req.status) {
    case 'PENDING': return 'PENDING_APPROVAL';
    case 'APPROVED': return 'APPROVED';
    case 'REJECTED': return 'REJECTED';
    default: return 'PENDING_APPROVAL';
  }
};

const mapOrderToKanban = (order: any): ProcurementStatus => {
  switch (order.status) {
    case 'DRAFT': return 'PO_CREATED';
    case 'SENT': return 'PO_CREATED';
    case 'CONFIRMED': return 'AWAITING_DELIVERY';
    case 'SHIPPED': return 'AWAITING_DELIVERY';
    case 'DELIVERED': return 'INSPECTION';
    case 'CANCELLED': return 'CANCELLED';
    default: return 'PO_CREATED';
  }
};

export const ProcurementDashboard: React.FC = () => {
  const permissions = useProcurementPermissions();
  const { data: requests, isLoading: requestsLoading } = usePurchaseRequests();
  const { data: orders, isLoading: ordersLoading } = usePurchaseOrders();
  
  const [selectedSupplierId, setSelectedSupplierId] = React.useState<string | null>(null);
  const [activeTab, setActiveTab] = React.useState('kanban');

  // Combine data into Kanban items
  const kanbanItems: KanbanItem[] = React.useMemo(() => {
    const items: KanbanItem[] = [];
    
    if (Array.isArray(requests)) {
      requests.forEach((req: any) => {
        // Only show pending/approved requests that aren't converted yet
        if (req.status !== 'CONVERTED') {
          items.push({
            id: req.id,
            type: 'request',
            status: mapRequestToKanban(req),
            data: req,
          });
        }
      });
    }
    
    if (Array.isArray(orders)) {
      orders.forEach((order: any) => {
        items.push({
          id: order.id,
          type: 'order',
          status: mapOrderToKanban(order),
          data: order,
        });
      });
    }
    
    return items;
  }, [requests, orders]);

  const loading = requestsLoading || ordersLoading;

  if (!permissions.canViewProcurement) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="py-12 text-center">
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-muted-foreground">You don't have permission to view procurement data.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Procurement</h1>
          <p className="text-muted-foreground">Manage suppliers, purchase requests, and orders</p>
        </div>
        <div className="flex gap-2">
          {permissions.canManageSuppliers && (
            <Button variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              New Supplier
            </Button>
          )}
          <Button size="sm" onClick={() => setActiveTab('requests')}>
            <ClipboardList className="h-4 w-4 mr-2" />
            New Request
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <StatsCards requests={requests} orders={orders} />

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="kanban">
            <LayoutGrid className="h-4 w-4 mr-2" />
            Kanban Board
          </TabsTrigger>
          <TabsTrigger value="requests">
            <ClipboardList className="h-4 w-4 mr-2" />
            Purchase Requests
          </TabsTrigger>
          <TabsTrigger value="orders">
            <Truck className="h-4 w-4 mr-2" />
            Purchase Orders
          </TabsTrigger>
          <TabsTrigger value="analytics">
            <BarChart3 className="h-4 w-4 mr-2" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="kanban" className="space-y-4">
          {loading ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">Loading procurement data...</p>
              </CardContent>
            </Card>
          ) : (
            <KanbanBoard
              items={kanbanItems}
              onSupplierClick={setSelectedSupplierId}
              onItemClick={(item) => {
                if (item.type === 'request') setActiveTab('requests');
                else setActiveTab('orders');
              }}
            />
          )}
        </TabsContent>

        <TabsContent value="requests">
          <Card>
            <CardHeader>
              <CardTitle>Purchase Requests</CardTitle>
              <CardDescription>Manage and approve purchase requests</CardDescription>
            </CardHeader>
            <CardContent>
              {/* You can add a table view for requests here */}
              <p className="text-sm text-muted-foreground">Request list view coming soon.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="orders">
          <Card>
            <CardHeader>
              <CardTitle>Purchase Orders</CardTitle>
              <CardDescription>View and manage purchase orders</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Order list view coming soon.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <Card>
            <CardHeader>
              <CardTitle>Procurement Analytics</CardTitle>
              <CardDescription>Spend analysis and supplier performance</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Analytics charts coming soon.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Supplier Drawer */}
      <SupplierDrawer
        supplierId={selectedSupplierId}
        open={!!selectedSupplierId}
        onClose={() => setSelectedSupplierId(null)}
      />
    </div>
  );
};