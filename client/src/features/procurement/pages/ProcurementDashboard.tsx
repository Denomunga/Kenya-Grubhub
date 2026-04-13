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
import { 
  LayoutGrid, 
  BarChart3, 
  Truck, 
  ClipboardList, 
  Plus, 
  CheckCircle, 
  XCircle, 
  FileText,
  UserPlus,
  Package,
  MoreHorizontal,
  Eye,
  Ban,
  ArrowRight,
  RefreshCw
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  useApproveRequest, 
  useRejectRequest, 
  useConfirmPO, 
  useCancelPO, 
  useCreateSupplier, 
  useCreatePurchaseRequest, 
  useCreatePurchaseOrder, 
  useSuppliers, 
  useLowStockItems 
} from '../hooks/useProcurementData';
import { formatPriceKSHS } from '@/lib/format';
import { apiFetch } from '@/lib/api';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// Helper to map API statuses to Kanban statuses
const mapRequestToKanban = (req: any): ProcurementStatus => {
  switch (req.status) {
    case 'PENDING': case 'pending_approval': return 'PENDING_APPROVAL';
    case 'APPROVED': case 'approved': return 'APPROVED';
    case 'REJECTED': case 'rejected': return 'REJECTED';
    default: return 'PENDING_APPROVAL';
  }
};

const mapOrderToKanban = (order: any): ProcurementStatus => {
  switch (order.status) {
    case 'DRAFT': case 'draft': return 'PO_CREATED';
    case 'SENT': case 'sent': return 'PO_CREATED';
    case 'CONFIRMED': case 'confirmed': return 'AWAITING_DELIVERY';
    case 'SHIPPED': case 'shipped': return 'AWAITING_DELIVERY';
    case 'DELIVERED': case 'delivered': return 'INSPECTION';
    case 'CANCELLED': case 'cancelled': return 'CANCELLED';
    default: return 'PO_CREATED';
  }
};

export const ProcurementDashboard: React.FC = () => {
  const permissions = useProcurementPermissions();
  const { data: requests, isLoading: requestsLoading } = usePurchaseRequests();
  const { data: orders, isLoading: ordersLoading } = usePurchaseOrders();
  const { data: suppliers } = useSuppliers();
  const { data: lowStockItems, isLoading: lowStockLoading } = useLowStockItems();
  
  const createSupplierMutation = useCreateSupplier();
  const createRequestMutation = useCreatePurchaseRequest();
  const [supplierDialogOpen, setSupplierDialogOpen] = React.useState(false);
  const [requestDialogOpen, setRequestDialogOpen] = React.useState(false);
  const [supplierForm, setSupplierForm] = React.useState({ 
    name: '', 
    email: '', 
    phone: '', 
    address: '', 
    city: '', 
    state: '', 
    zipCode: '', 
    country: 'Kenya', 
    contactPerson: '', 
    contactEmail: '', 
    contactPhone: '', 
    paymentTerms: 'net30' 
  });
  const [requestForm, setRequestForm] = React.useState({ 
    inventoryItemId: '', 
    requestedQuantity: 1, 
    priority: 'medium', 
    notes: '' 
  });
  const [inventoryItems, setInventoryItems] = React.useState<any[]>([]);

  React.useEffect(() => {
    apiFetch('/api/menu').then(res => res.json()).then((r: any) => {
      const items = r.menu ?? [];
      setInventoryItems(items);
    }).catch(() => {});
  }, []);

  const approveRequestMutation = useApproveRequest();
  const rejectRequestMutation = useRejectRequest();
  const confirmPOMutation = useConfirmPO();
  const cancelPOMutation = useCancelPO();
  const createPOMutation = useCreatePurchaseOrder();
  const [createPODialogOpen, setCreatePODialogOpen] = React.useState(false);
  const [selectedRequestForPO, setSelectedRequestForPO] = React.useState<any>(null);
  const [poSupplierId, setPoSupplierId] = React.useState('');

  const [selectedSupplierId, setSelectedSupplierId] = React.useState<string | null>(null);
  const [activeTab, setActiveTab] = React.useState('kanban');

  // Combine data into Kanban items
  const kanbanItems: KanbanItem[] = React.useMemo(() => {
    const items: KanbanItem[] = [];
    
    // Add low stock alerts first
    if (Array.isArray(lowStockItems)) {
      lowStockItems.forEach((item: any) => {
        items.push({
          id: item._id || item.id,
          type: 'alert',
          status: 'LOW_STOCK_ALERT',
          data: {
            ...item,
            requestDate: new Date(),
            quantity: item.currentStock || item.stock,
            itemName: item.productName || item.name,
          },
        });
      });
    }
    
    if (Array.isArray(requests)) {
      requests.forEach((req: any) => {
        if (req.status !== 'CONVERTED' && req.status !== 'converted_to_po') {
          items.push({
            id: req._id || req.id,
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
          id: order._id || order.id,
          type: 'order',
          status: mapOrderToKanban(order),
          data: order,
        });
      });
    }
    
    return items;
  }, [requests, orders, lowStockItems]);

  const loading = requestsLoading || ordersLoading || lowStockLoading;

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
    <TooltipProvider>
      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-linear-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Procurement
            </h1>
            <p className="text-muted-foreground mt-1">Manage suppliers, purchase requests, and orders</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {permissions.canManageSuppliers && (
              <Dialog open={supplierDialogOpen} onOpenChange={setSupplierDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2 border-primary/30 hover:border-primary/60 hover:bg-primary/5 transition-all">
                    <UserPlus className="h-4 w-4" />
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
                    <Button disabled={!supplierForm.name || !supplierForm.email || createSupplierMutation.isPending} onClick={() => { createSupplierMutation.mutate(supplierForm, { onSuccess: () => { setSupplierDialogOpen(false); setSupplierForm({ name: '', email: '', phone: '', address: '', city: '', state: '', zipCode: '', country: 'Kenya', contactPerson: '', contactEmail: '', contactPhone: '', paymentTerms: 'net30' }); } }); }}>
                      {createSupplierMutation.isPending ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Creating...
                        </>
                      ) : 'Create Supplier'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
            <Dialog open={requestDialogOpen} onOpenChange={setRequestDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-2 bg-primary hover:bg-primary/90 shadow-sm">
                  <ClipboardList className="h-4 w-4" />
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
                          <SelectItem key={item.id} value={item.id}>
                            <span className="font-medium">{item.name}</span>
                            <span className="ml-2 text-xs text-muted-foreground">
                              Stock: {item.stock}
                            </span>
                          </SelectItem>
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
                  <Button disabled={!requestForm.inventoryItemId || createRequestMutation.isPending} onClick={() => { createRequestMutation.mutate(requestForm, { onSuccess: () => { setRequestDialogOpen(false); setRequestForm({ inventoryItemId: '', requestedQuantity: 1, priority: 'medium', notes: '' }); setActiveTab('requests'); } }); }}>
                    {createRequestMutation.isPending ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Submitting...
                      </>
                    ) : 'Submit Request'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats Cards */}
        <StatsCards requests={requests} orders={orders} />

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <div className="flex items-center gap-2">
            <TabsList className="bg-muted/50 p-1">
              <TabsTrigger value="kanban" className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <LayoutGrid className="h-4 w-4" />
                Kanban Board
              </TabsTrigger>
            </TabsList>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <MoreHorizontal className="h-4 w-4" />
                  More
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={() => setActiveTab('requests')}>
                  <ClipboardList className="h-4 w-4 mr-2" />
                  Purchase Requests
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab('orders')}>
                  <Truck className="h-4 w-4 mr-2" />
                  Purchase Orders
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab('analytics')}>
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Analytics
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <TabsContent value="kanban" className="space-y-4">
            {loading ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <RefreshCw className="h-8 w-8 mx-auto mb-4 animate-spin text-muted-foreground" />
                  <p className="text-muted-foreground">Loading procurement data...</p>
                </CardContent>
              </Card>
            ) : (
              <KanbanBoard
                items={kanbanItems}
                onSupplierClick={setSelectedSupplierId}
                onCreatePO={(item) => { setSelectedRequestForPO(item.data); setCreatePODialogOpen(true); }}
                onCreateRequest={(item: any) => {
                  setRequestForm({
                    inventoryItemId: item.id || item._id,
                    requestedQuantity: Math.max(10 - (item.currentStock || item.data?.currentStock || 0), 10),
                    priority: 'high',
                    notes: 'Auto-created from low stock alert'
                  });
                  setRequestDialogOpen(true);
                }}
                onItemClick={(item) => {
                  if (item.type === 'request') setActiveTab('requests');
                  else setActiveTab('orders');
                }}
              />
            )}
          </TabsContent>

          <TabsContent value="requests">
            <Card className="border shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div>
                  <CardTitle>Purchase Requests</CardTitle>
                  <CardDescription>Manage and approve purchase requests</CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => window.location.reload()}
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent>
                {requestsLoading ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Loading requests...</p>
                ) : !Array.isArray(requests) || requests.length === 0 ? (
                  <div className="text-center py-12">
                    <Package className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                    <p className="text-sm text-muted-foreground">No purchase requests found.</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-4 gap-2"
                      onClick={() => setRequestDialogOpen(true)}
                    >
                      <Plus className="h-4 w-4" />
                      Create Request
                    </Button>
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/30">
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
                          <TableRow key={req._id || req.id} className="hover:bg-muted/20">
                            <TableCell className="font-medium">{req.requestNumber || (req._id || req.id || '').slice(-8)}</TableCell>
                            <TableCell>{req.productName || req.itemName}</TableCell>
                            <TableCell>{req.sku}</TableCell>
                            <TableCell>{req.requestedQuantity || req.quantity}</TableCell>
                            <TableCell>
                              <Badge 
                                variant={
                                  req.priority === 'urgent' ? 'destructive' : 
                                  req.priority === 'high' ? 'default' : 
                                  'secondary'
                                }
                                className="capitalize"
                              >
                                {req.priority}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge 
                                variant={
                                  req.status === 'approved' ? 'default' : 
                                  req.status === 'rejected' ? 'destructive' : 
                                  'outline'
                                }
                                className="capitalize"
                              >
                                {(req.status || '').replace(/_/g, ' ')}
                              </Badge>
                            </TableCell>
                            <TableCell>{req.requestDate ? new Date(req.requestDate).toLocaleDateString() : '-'}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                {permissions.canApproveRequest && req.status === 'pending_approval' && (
                                  <>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button 
                                          size="icon" 
                                          variant="ghost" 
                                          className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                                          onClick={() => approveRequestMutation.mutate({ id: String(req._id || req.id || '') })}
                                          disabled={approveRequestMutation.isPending}
                                        >
                                          <CheckCircle className="h-4 w-4" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>Approve</TooltipContent>
                                    </Tooltip>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button 
                                          size="icon" 
                                          variant="ghost" 
                                          className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                                          onClick={() => rejectRequestMutation.mutate({ id: String(req._id || req.id || ''), reason: 'Rejected by manager' })}
                                          disabled={rejectRequestMutation.isPending}
                                        >
                                          <XCircle className="h-4 w-4" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>Reject</TooltipContent>
                                    </Tooltip>
                                  </>
                                )}
                                {req.status === 'approved' && (
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    className="gap-2 border-primary/30 hover:border-primary/60 hover:bg-primary/5"
                                    onClick={() => { setSelectedRequestForPO(req); setCreatePODialogOpen(true); }}
                                  >
                                    <FileText className="h-3.5 w-3.5" />
                                    Create PO
                                    <ArrowRight className="h-3 w-3 ml-1 opacity-70" />
                                  </Button>
                                )}
                                {req.status !== 'pending_approval' && req.status !== 'approved' && (
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-8 w-8"
                                    onClick={() => {}}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
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
            <Card className="border shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div>
                  <CardTitle>Purchase Orders</CardTitle>
                  <CardDescription>View and manage purchase orders</CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => window.location.reload()}
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent>
                {ordersLoading ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Loading orders...</p>
                ) : !Array.isArray(orders) || orders.length === 0 ? (
                  <div className="text-center py-12">
                    <Truck className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                    <p className="text-sm text-muted-foreground">No purchase orders found.</p>
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/30">
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
                          <TableRow key={order._id || order.id} className="hover:bg-muted/20">
                            <TableCell className="font-medium">{order.poNumber || (order._id || order.id || '').slice(-8)}</TableCell>
                            <TableCell>{order.supplierId?.name || order.supplierId || '-'}</TableCell>
                            <TableCell>{order.items?.length || 0} item(s)</TableCell>
                            <TableCell>{formatPriceKSHS(order.grandTotal || order.totalAmount || 0)}</TableCell>
                            <TableCell>
                              <Badge 
                                variant={
                                  order.status === 'received' ? 'default' : 
                                  order.status === 'cancelled' ? 'destructive' : 
                                  'outline'
                                }
                                className="capitalize"
                              >
                                {(order.status || '').replace(/_/g, ' ')}
                              </Badge>
                            </TableCell>
                            <TableCell>{order.expectedDeliveryDate ? new Date(order.expectedDeliveryDate).toLocaleDateString() : '-'}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-8 w-8"
                                      onClick={() => {}}
                                    >
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>View Details</TooltipContent>
                                </Tooltip>
                                
                                {permissions.canConfirmPO && order.status === 'draft' && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button 
                                        size="icon" 
                                        variant="ghost" 
                                        className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                                        onClick={() => confirmPOMutation.mutate(String(order._id || order.id || ''))}
                                        disabled={confirmPOMutation.isPending}
                                      >
                                        <CheckCircle className="h-4 w-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Confirm Order</TooltipContent>
                                  </Tooltip>
                                )}
                                
                                {permissions.canConfirmPO && !['received', 'cancelled'].includes(order.status) && order.status !== 'draft' && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button 
                                        size="icon" 
                                        variant="ghost" 
                                        className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                                        onClick={() => cancelPOMutation.mutate({ id: String(order._id || order.id || ''), reason: 'Cancelled by manager' })}
                                        disabled={cancelPOMutation.isPending}
                                      >
                                        <Ban className="h-4 w-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Cancel Order</TooltipContent>
                                  </Tooltip>
                                )}
                                
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                    <DropdownMenuItem onClick={() => setSelectedSupplierId(String(order.supplierId?._id || order.supplierId || ''))}>
                                      <Eye className="h-4 w-4 mr-2" />
                                      View Supplier
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => {}}>
                                      <FileText className="h-4 w-4 mr-2" />
                                      Download PDF
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem className="text-red-600" onClick={() => {}}>
                                      <Ban className="h-4 w-4 mr-2" />
                                      Cancel Order
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
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
              <Card className="border shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                    Spend by Order Status
                  </CardTitle>
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

              <Card className="border shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <ClipboardList className="h-4 w-4 text-muted-foreground" />
                    Requests by Priority
                  </CardTitle>
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
                                className={`h-full rounded-full transition-all ${
                                  priority === 'urgent' ? 'bg-red-500' : 
                                  priority === 'high' ? 'bg-orange-500' : 
                                  priority === 'medium' ? 'bg-yellow-500' : 
                                  'bg-green-500'
                                }`}
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

              <Card className="border shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                    Monthly Spend
                  </CardTitle>
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

              <Card className="border shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    Summary
                  </CardTitle>
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

        {/* Create Purchase Order Dialog */}
        <Dialog open={createPODialogOpen} onOpenChange={setCreatePODialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Create Purchase Order</DialogTitle>
              <DialogDescription>
                Create a purchase order from request: <span className="font-medium">{selectedRequestForPO?.requestNumber || ''}</span>
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-3 py-4">
              <div className="space-y-1">
                <Label>Product</Label>
                <p className="text-sm font-medium">{selectedRequestForPO?.productName || '-'}</p>
              </div>
              <div className="space-y-1">
                <Label>Quantity</Label>
                <p className="text-sm font-medium">{selectedRequestForPO?.requestedQuantity || '-'}</p>
              </div>
              <div className="space-y-1">
                <Label htmlFor="po-supplier">Supplier *</Label>
                <Select value={poSupplierId} onValueChange={setPoSupplierId}>
                  <SelectTrigger id="po-supplier"><SelectValue placeholder="Select a supplier..." /></SelectTrigger>
                  <SelectContent>
                    {(suppliers || []).map((s: any) => (
                      <SelectItem key={s._id || s.id} value={String(s._id || s.id)}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreatePODialogOpen(false)}>Cancel</Button>
              <Button 
                disabled={!poSupplierId || createPOMutation.isPending} 
                className="gap-2"
                onClick={() => {
                  createPOMutation.mutate(
                    { purchaseRequestId: String(selectedRequestForPO?._id || selectedRequestForPO?.id || ''), supplierId: poSupplierId },
                    { onSuccess: () => { setCreatePODialogOpen(false); setPoSupplierId(''); setSelectedRequestForPO(null); } }
                  );
                }}
              >
                {createPOMutation.isPending ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    Create Purchase Order
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Supplier Drawer */}
        <SupplierDrawer
          supplierId={selectedSupplierId}
          open={!!selectedSupplierId}
          onClose={() => setSelectedSupplierId(null)}
        />
      </div>
    </TooltipProvider>
  );
};