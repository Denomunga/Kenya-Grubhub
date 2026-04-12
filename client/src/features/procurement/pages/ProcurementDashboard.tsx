import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePurchaseRequests, usePurchaseOrders } from '../hooks/useProcurementData';
import { useProcurementPermissions } from '../hooks/useProcurementPermissions';
import { KanbanBoard } from '../components/KanbanBoard/KanbanBoard';
import { SupplierDrawer } from '../components/SupplierDrawer/SupplierDrawer';
import { StatsCards } from '@/features/procurement/components/ProcurementStats/StatsCards';
import { KanbanItem, ProcurementStatus } from '../types';
import { LayoutGrid, BarChart3, Truck, ClipboardList, Plus, CheckCircle, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useApproveRequest, useRejectRequest, useConfirmPO, useCancelPO, useCreateSupplier, useCreatePurchaseRequest } from '../hooks/useProcurementData';
import { formatPriceKSHS } from '@/lib/format';
import { apiFetch } from '@/lib/api';

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
  
  const createSupplierMutation = useCreateSupplier();
  const createRequestMutation = useCreatePurchaseRequest();
  const [supplierDialogOpen, setSupplierDialogOpen] = React.useState(false);
  const [requestDialogOpen, setRequestDialogOpen] = React.useState(false);
  const [supplierForm, setSupplierForm] = React.useState({ name: '', email: '', phone: '', address: '', city: '', state: '', zipCode: '', country: 'Kenya', contactPerson: '', contactEmail: '', contactPhone: '', paymentTerms: 'net30' });
  const [requestForm, setRequestForm] = React.useState({ inventoryItemId: '', requestedQuantity: 1, priority: 'medium', notes: '' });
  const [inventoryItems, setInventoryItems] = React.useState<any[]>([]);

  React.useEffect(() => {
    apiFetch('/api/products?limit=200').then(res => res.json()).then((r: any) => {
      const items = Array.isArray(r) ? r : (r.products ?? r.data ?? []);
      setInventoryItems(items);
    }).catch(() => {});
  }, []);

  const approveRequestMutation = useApproveRequest();
  const rejectRequestMutation = useRejectRequest();
  const confirmPOMutation = useConfirmPO();
  const cancelPOMutation = useCancelPO();

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
            <Dialog open={supplierDialogOpen} onOpenChange={setSupplierDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  New Supplier
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Add New Supplier</DialogTitle>
                  <DialogDescription>Enter supplier details to register them in the system.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-3 py-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="s-name">Company Name *</Label>
                      <Input id="s-name" value={supplierForm.name} onChange={e => setSupplierForm(f => ({ ...f, name: e.target.value }))} />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="s-email">Email *</Label>
                      <Input id="s-email" type="email" value={supplierForm.email} onChange={e => setSupplierForm(f => ({ ...f, email: e.target.value }))} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="s-phone">Phone *</Label>
                      <Input id="s-phone" value={supplierForm.phone} onChange={e => setSupplierForm(f => ({ ...f, phone: e.target.value }))} />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="s-payment">Payment Terms</Label>
                      <Select value={supplierForm.paymentTerms} onValueChange={v => setSupplierForm(f => ({ ...f, paymentTerms: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="immediate">Immediate</SelectItem>
                          <SelectItem value="net30">Net 30</SelectItem>
                          <SelectItem value="net60">Net 60</SelectItem>
                          <SelectItem value="net90">Net 90</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="s-address">Address *</Label>
                    <Input id="s-address" value={supplierForm.address} onChange={e => setSupplierForm(f => ({ ...f, address: e.target.value }))} />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="s-city">City *</Label>
                      <Input id="s-city" value={supplierForm.city} onChange={e => setSupplierForm(f => ({ ...f, city: e.target.value }))} />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="s-state">State/County *</Label>
                      <Input id="s-state" value={supplierForm.state} onChange={e => setSupplierForm(f => ({ ...f, state: e.target.value }))} />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="s-zip">ZIP Code *</Label>
                      <Input id="s-zip" value={supplierForm.zipCode} onChange={e => setSupplierForm(f => ({ ...f, zipCode: e.target.value }))} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="s-cp">Contact Person *</Label>
                      <Input id="s-cp" value={supplierForm.contactPerson} onChange={e => setSupplierForm(f => ({ ...f, contactPerson: e.target.value }))} />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="s-ce">Contact Email *</Label>
                      <Input id="s-ce" type="email" value={supplierForm.contactEmail} onChange={e => setSupplierForm(f => ({ ...f, contactEmail: e.target.value }))} />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="s-cphone">Contact Phone *</Label>
                    <Input id="s-cphone" value={supplierForm.contactPhone} onChange={e => setSupplierForm(f => ({ ...f, contactPhone: e.target.value }))} />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setSupplierDialogOpen(false)}>Cancel</Button>
                  <Button disabled={!supplierForm.name || !supplierForm.email || createSupplierMutation.isPending} onClick={() => { createSupplierMutation.mutate(supplierForm, { onSuccess: () => { setSupplierDialogOpen(false); setSupplierForm({ name: '', email: '', phone: '', address: '', city: '', state: '', zipCode: '', country: 'Kenya', contactPerson: '', contactEmail: '', contactPhone: '', paymentTerms: 'net30' }); } }); }}>{createSupplierMutation.isPending ? 'Creating...' : 'Create Supplier'}</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
          <Dialog open={requestDialogOpen} onOpenChange={setRequestDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <ClipboardList className="h-4 w-4 mr-2" />
                New Request
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Create Purchase Request</DialogTitle>
                <DialogDescription>Submit a request to replenish inventory stock.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-3 py-4">
                <div className="space-y-1">
                  <Label htmlFor="r-item">Product *</Label>
                  <Select value={requestForm.inventoryItemId} onValueChange={v => setRequestForm(f => ({ ...f, inventoryItemId: v }))}>
                    <SelectTrigger id="r-item"><SelectValue placeholder="Select a product..." /></SelectTrigger>
                    <SelectContent>
                      {inventoryItems.map((item: any) => (
                        <SelectItem key={item._id} value={item._id}>{item.productName} ({item.sku}) - Stock: {item.currentStock}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="r-qty">Requested Quantity *</Label>
                    <Input id="r-qty" type="number" min={1} value={requestForm.requestedQuantity} onChange={e => setRequestForm(f => ({ ...f, requestedQuantity: Number(e.target.value) || 1 }))} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="r-priority">Priority</Label>
                    <Select value={requestForm.priority} onValueChange={v => setRequestForm(f => ({ ...f, priority: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="r-notes">Notes</Label>
                  <Textarea id="r-notes" placeholder="Optional notes..." value={requestForm.notes} onChange={e => setRequestForm(f => ({ ...f, notes: e.target.value }))} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setRequestDialogOpen(false)}>Cancel</Button>
                <Button disabled={!requestForm.inventoryItemId || createRequestMutation.isPending} onClick={() => { createRequestMutation.mutate(requestForm, { onSuccess: () => { setRequestDialogOpen(false); setRequestForm({ inventoryItemId: '', requestedQuantity: 1, priority: 'medium', notes: '' }); setActiveTab('requests'); } }); }}>{createRequestMutation.isPending ? 'Submitting...' : 'Submit Request'}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
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
              {requestsLoading ? (
                <p className="text-sm text-muted-foreground text-center py-8">Loading requests...</p>
              ) : !Array.isArray(requests) || requests.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No purchase requests found.</p>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Request #</TableHead>
                        <TableHead>Item</TableHead>
                        <TableHead>SKU</TableHead>
                        <TableHead>Qty</TableHead>
                        <TableHead>Priority</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {requests.map((req) => (
                        <TableRow key={req._id || req.id}>
                          <TableCell className="font-medium">{req.requestNumber || (req._id || '').slice(-8)}</TableCell>
                          <TableCell>{req.productName || req.itemName}</TableCell>
                          <TableCell>{req.sku}</TableCell>
                          <TableCell>{req.requestedQuantity || req.quantity}</TableCell>
                          <TableCell>
                            <Badge variant={req.priority === 'urgent' ? 'destructive' : req.priority === 'high' ? 'default' : 'secondary'}>
                              {req.priority}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={req.status === 'approved' ? 'default' : req.status === 'rejected' ? 'destructive' : 'outline'}>
                              {(req.status || '').replace(/_/g, ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell>{req.requestDate ? new Date(req.requestDate).toLocaleDateString() : '-'}</TableCell>
                          <TableCell className="text-right">
                            {permissions.canApproveRequest && req.status === 'pending_approval' && (
                              <div className="flex gap-1 justify-end">
                                <Button size="sm" variant="ghost" onClick={() => approveRequestMutation.mutate({ id: req._id || req.id })}>
                                  <CheckCircle className="h-4 w-4 text-green-600" />
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => rejectRequestMutation.mutate({ id: req._id || req.id, reason: 'Rejected by manager' })}>
                                  <XCircle className="h-4 w-4 text-red-600" />
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
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
              {ordersLoading ? (
                <p className="text-sm text-muted-foreground text-center py-8">Loading orders...</p>
              ) : !Array.isArray(orders) || orders.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No purchase orders found.</p>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>PO #</TableHead>
                        <TableHead>Supplier</TableHead>
                        <TableHead>Items</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Expected Delivery</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orders.map((order) => (
                        <TableRow key={order._id || order.id}>
                          <TableCell className="font-medium">{order.poNumber || (order._id || '').slice(-8)}</TableCell>
                          <TableCell>{order.supplierId?.name || order.supplierId || '-'}</TableCell>
                          <TableCell>{order.items?.length || 0} item(s)</TableCell>
                          <TableCell>{formatPriceKSHS(order.grandTotal || order.totalAmount || 0)}</TableCell>
                          <TableCell>
                            <Badge variant={order.status === 'received' ? 'default' : order.status === 'cancelled' ? 'destructive' : 'outline'}>
                              {(order.status || '').replace(/_/g, ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell>{order.expectedDeliveryDate ? new Date(order.expectedDeliveryDate).toLocaleDateString() : '-'}</TableCell>
                          <TableCell className="text-right">
                            {permissions.canConfirmPO && order.status === 'draft' && (
                              <Button size="sm" variant="ghost" onClick={() => confirmPOMutation.mutate(order._id || order.id)}>
                                <CheckCircle className="h-4 w-4 text-green-600" />
                              </Button>
                            )}
                            {permissions.canConfirmPO && !['received', 'cancelled'].includes(order.status) && order.status !== 'draft' && (
                              <Button size="sm" variant="ghost" onClick={() => cancelPOMutation.mutate({ id: order._id || order.id, reason: 'Cancelled by manager' })}>
                                <XCircle className="h-4 w-4 text-red-600" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Spend by Order Status</CardTitle>
              </CardHeader>
              <CardContent>
                {Array.isArray(orders) && orders.length > 0 ? (
                  <div className="space-y-3">
                    {['draft', 'confirmed', 'partially_received', 'received', 'cancelled'].map(status => {
                      const filtered = orders.filter(o => o.status === status);
                      const total = filtered.reduce((sum, o) => sum + (o.grandTotal || o.totalAmount || 0), 0);
                      if (filtered.length === 0) return null;
                      return (
                        <div key={status} className="flex items-center justify-between">
                          <span className="text-sm capitalize">{status.replace(/_/g, ' ')}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">{filtered.length} order(s)</span>
                            <span className="text-sm font-medium">{formatPriceKSHS(total)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">No order data available</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Requests by Priority</CardTitle>
              </CardHeader>
              <CardContent>
                {Array.isArray(requests) && requests.length > 0 ? (
                  <div className="space-y-3">
                    {['urgent', 'high', 'medium', 'low'].map(priority => {
                      const filtered = requests.filter(r => r.priority === priority);
                      if (filtered.length === 0) return null;
                      const pct = Math.round((filtered.length / requests.length) * 100);
                      return (
                        <div key={priority} className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="capitalize">{priority}</span>
                            <span>{filtered.length} ({pct}%)</span>
                          </div>
                          <div className="h-2 rounded-full bg-muted overflow-hidden">
                            <div
                              className={"h-full rounded-full " + (priority === 'urgent' ? 'bg-red-500' : priority === 'high' ? 'bg-orange-500' : priority === 'medium' ? 'bg-yellow-500' : 'bg-green-500')}
                              style={{ width: pct + '%' }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">No request data available</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Monthly Spend</CardTitle>
              </CardHeader>
              <CardContent>
                {Array.isArray(orders) && orders.length > 0 ? (() => {
                  const monthlySpend: Record<string, number> = {};
                  orders.forEach(o => {
                    const d = o.orderDate ? new Date(o.orderDate) : new Date();
                    const key = d.toLocaleString('default', { month: 'short' }) + ' ' + d.getFullYear();
                    monthlySpend[key] = (monthlySpend[key] || 0) + (o.grandTotal || o.totalAmount || 0);
                  });
                  const maxSpend = Math.max(...Object.values(monthlySpend), 1);
                  return (
                    <div className="space-y-2">
                      {Object.entries(monthlySpend).map(([month, spend]) => (
                        <div key={month} className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span>{month}</span>
                            <span>{formatPriceKSHS(spend)}</span>
                          </div>
                          <div className="h-2 rounded-full bg-muted overflow-hidden">
                            <div className="h-full rounded-full bg-blue-500" style={{ width: Math.round((spend / maxSpend) * 100) + '%' }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })() : (
                  <p className="text-sm text-muted-foreground text-center py-4">No order data available</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Requests</span>
                    <span className="font-medium">{Array.isArray(requests) ? requests.length : 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Orders</span>
                    <span className="font-medium">{Array.isArray(orders) ? orders.length : 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Spend</span>
                    <span className="font-medium">{formatPriceKSHS(Array.isArray(orders) ? orders.reduce((s, o) => s + (o.grandTotal || o.totalAmount || 0), 0) : 0)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Pending Approval</span>
                    <span className="font-medium">{Array.isArray(requests) ? requests.filter(r => r.status === 'pending_approval').length : 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Awaiting Delivery</span>
                    <span className="font-medium">{Array.isArray(orders) ? orders.filter(o => o.status === 'confirmed' || o.status === 'shipped').length : 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
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