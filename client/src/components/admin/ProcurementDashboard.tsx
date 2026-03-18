import React, { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from 'recharts';
import { apiFetch } from '@/lib/api';
import {
  CheckCircle,
  AlertCircle,
  Package,
  Truck,
  PhoneCall,
  ClipboardList,
  Star,
  AlertTriangle,
  FileText,
  Send,
  Users,
  ShoppingCart,
  RefreshCw,
  ChevronRight,
  Timer,
  Zap,
  CheckSquare,
} from 'lucide-react';
import { InsightActionCard, InsightItem } from '@/components/ui/InsightActionCard';
import { useToast } from '@/hooks/use-toast';

interface PurchaseOrder {
  _id: string;
  poNumber: string;
  status: 'draft' | 'submitted' | 'confirmed' | 'partially_received' | 'in_transit' | 'received' | 'cancelled';
  totalAmount: number;
  grandTotal?: number;
  supplierName: string;
  supplierId?: any;
  orderDate: string;
  expectedDeliveryDate: string;
  confirmedDate?: string;
  receivedDate?: string;
  items: Array<{
    productName: string;
    quantity: number;
    unitPrice: number;
    totalPrice?: number;
  }>;
}

interface PurchaseRequest {
  _id: string;
  requestNumber: string;
  productName: string;
  sku: string;
  currentStock: number;
  minimumStock: number;
  requestedQuantity: number;
  status: 'pending_approval' | 'approved' | 'rejected' | 'converted_to_po';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  requestDate: string;
  notes?: string;
}

interface ProcurementStats {
  totalOrders: number;
  pendingOrders: number;
  completedOrders: number;
  totalSpent: number;
  averageOrderValue: number;
}

interface SupplierPerformance {
  _id?: string;
  name: string;
  ordersCount: number;
  onTimeDelivery: number;
  totalSpent: number;
  rating?: number;
  leadTime?: number;
  avgUnitPrice?: number;
  categories?: string[];
}

// ─── Pipeline stage type ─────────────────────────────────────────────
type PipelineStage = 'request' | 'rfq' | 'supplier_selection' | 'po' | 'delivery' | 'completed';

const PIPELINE_STAGES: { key: PipelineStage; label: string; icon: React.ElementType }[] = [
  { key: 'request', label: 'Request', icon: FileText },
  { key: 'rfq', label: 'RFQ', icon: Send },
  { key: 'supplier_selection', label: 'Supplier', icon: Users },
  { key: 'po', label: 'PO', icon: ShoppingCart },
  { key: 'delivery', label: 'Delivery', icon: Truck },
  { key: 'completed', label: 'Completed', icon: CheckCircle },
];

export default function ProcurementDashboard() {
  const { toast } = useToast();
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [purchaseRequests, setPurchaseRequests] = useState<PurchaseRequest[]>([]);
  const [stats, setStats] = useState<ProcurementStats | null>(null);
  const [suppliers, setSuppliers] = useState<SupplierPerformance[]>([]);
  const [orderTrends, setOrderTrends] = useState<Array<{ date: string; value: number }>>([]);
  const [statusDistribution, setStatusDistribution] = useState<Array<{ name: string; value: number }>>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [supplierDetailOpen, setSupplierDetailOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<SupplierPerformance | null>(null);

  useEffect(() => {
    fetchProcurementData();
  }, []);

  const fetchProcurementData = async () => {
    try {
      const [ordersRes, statsRes, suppliersRes, trendsRes, prRes] = await Promise.all([
        apiFetch('/api/procurement/purchase-orders?page=1&limit=100'),
        apiFetch('/api/procurement/stats'),
        apiFetch('/api/procurement/suppliers/performance'),
        apiFetch('/api/procurement/trends?days=30'),
        apiFetch('/api/procurement/purchase-requests?page=1&limit=100'),
      ]);

      let ordersList: PurchaseOrder[] = [];
      if (ordersRes.ok) {
        const data = await ordersRes.json();
        ordersList = data.data?.orders || data.data || [];
        setOrders(ordersList);
      }

      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data.data);
      }

      if (suppliersRes.ok) {
        const data = await suppliersRes.json();
        setSuppliers(data.data || []);
      }

      if (trendsRes.ok) {
        const data = await trendsRes.json();
        setOrderTrends(data.data || []);
      }

      if (prRes.ok) {
        const data = await prRes.json();
        setPurchaseRequests(data.data?.requests || data.data || []);
      }

      // Calculate status distribution from fetched orders
      const statusCount: Record<string, number> = {};
      ordersList.forEach((order: PurchaseOrder) => {
        statusCount[order.status] = (statusCount[order.status] || 0) + 1;
      });

      const statusData = Object.entries(statusCount).map(([name, count]) => ({
        name: name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        value: count,
      }));
      setStatusDistribution(statusData);
    } catch (error) {
      console.error('Failed to fetch procurement data:', error);
    }
  };

  // ─── Computed lists ────────────────────────────────────────────────────

  const pendingRequests = useMemo(() =>
    purchaseRequests.filter(pr => pr.status === 'pending_approval'),
    [purchaseRequests]
  );

  const approvedRequests = useMemo(() =>
    purchaseRequests.filter(pr => pr.status === 'approved'),
    [purchaseRequests]
  );

  const activeOrders = useMemo(() =>
    orders.filter(o => ['draft', 'submitted', 'confirmed', 'in_transit', 'partially_received'].includes(o.status)),
    [orders]
  );

  const lateDeliveries = useMemo(() =>
    orders.filter(o => {
      if (o.status === 'received' || o.status === 'cancelled') return false;
      return new Date(o.expectedDeliveryDate) < new Date();
    }),
    [orders]
  );

  const draftOrders = useMemo(() => orders.filter(o => o.status === 'draft'), [orders]);
  const lowPerformanceSuppliers = useMemo(() => suppliers.filter(s => s.onTimeDelivery < 80), [suppliers]);

  // ─── Pipeline counts ──────────────────────────────────────────────────

  const pipelineCounts = useMemo(() => ({
    request: pendingRequests.length,
    rfq: approvedRequests.length,
    supplier_selection: draftOrders.length,
    po: orders.filter(o => o.status === 'submitted' || o.status === 'confirmed').length,
    delivery: orders.filter(o => o.status === 'in_transit' || o.status === 'partially_received').length,
    completed: orders.filter(o => o.status === 'received').length,
  }), [pendingRequests, approvedRequests, draftOrders, orders]);

  // ─── Days until delivery helper ────────────────────────────────────────

  const getDaysUntilDelivery = (order: PurchaseOrder) => {
    const now = new Date();
    const expected = new Date(order.expectedDeliveryDate);
    const diff = Math.ceil((expected.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  // ─── Filtering & Sorting ──────────────────────────────────────────────

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchesSearch =
        order.poNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.supplierName.toLowerCase().includes(searchTerm.toLowerCase());

      if (filterStatus === 'all') return matchesSearch;
      if (filterStatus === 'delayed') {
        return matchesSearch && new Date(order.expectedDeliveryDate) < new Date() && order.status !== 'received' && order.status !== 'cancelled';
      }
      return matchesSearch && order.status === filterStatus;
    });
  }, [orders, searchTerm, filterStatus]);

  // ─── Status helpers ────────────────────────────────────────────────────

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-800 border-gray-200',
      submitted: 'bg-indigo-100 text-indigo-800 border-indigo-200',
      confirmed: 'bg-blue-100 text-blue-800 border-blue-200',
      in_transit: 'bg-purple-100 text-purple-800 border-purple-200',
      partially_received: 'bg-amber-100 text-amber-800 border-amber-200',
      received: 'bg-green-100 text-green-800 border-green-200',
      cancelled: 'bg-red-100 text-red-800 border-red-200',
    };
    return variants[status] || variants.draft;
  };

  const getStatusIcon = (status: string) => {
    const icons: Record<string, React.ReactNode> = {
      draft: <AlertCircle size={14} />,
      submitted: <Send size={14} />,
      confirmed: <CheckCircle size={14} />,
      in_transit: <Truck size={14} />,
      partially_received: <Package size={14} />,
      received: <CheckCircle size={14} />,
      cancelled: <AlertCircle size={14} />,
    };
    return icons[status];
  };

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  // ─── Star rating component ────────────────────────────────────────────

  const StarRating = ({ rating }: { rating: number }) => (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} className={`h-3 w-3 ${i <= rating ? 'text-amber-400 fill-amber-400' : 'text-gray-300'}`} />
      ))}
      <span className="text-xs text-muted-foreground ml-1">{rating.toFixed(1)}</span>
    </div>
  );

  // ─── Smart Actions ─────────────────────────────────────────────────────

  const handleApproveRequest = async (pr: PurchaseRequest) => {
    try {
      const res = await apiFetch(`/api/procurement/purchase-requests/${pr._id}/approve`, { method: 'PATCH' });
      if (res.ok) {
        toast({ title: 'Request Approved', description: `PR ${pr.requestNumber} approved` });
        fetchProcurementData();
      } else {
        toast({ title: 'Approval Failed', description: 'Could not approve request', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Network error', variant: 'destructive' });
    }
  };

  const handleConfirmOrder = async (order: PurchaseOrder) => {
    try {
      const res = await apiFetch(`/api/procurement/purchase-orders/${order._id}/confirm`, { method: 'PATCH' });
      if (res.ok) {
        toast({ title: 'Order Confirmed', description: `PO ${order.poNumber} confirmed` });
        fetchProcurementData();
      } else {
        toast({ title: 'Confirmation Failed', description: 'Could not confirm order', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Network error', variant: 'destructive' });
    }
  };

  // ─── Supplier price comparison data ────────────────────────────────────

  const supplierComparisonData = useMemo(() => {
    if (suppliers.length === 0) return [];
    return suppliers
      .filter(s => s.totalSpent > 0)
      .sort((a, b) => (a.totalSpent / Math.max(1, a.ordersCount)) - (b.totalSpent / Math.max(1, b.ordersCount)))
      .slice(0, 8)
      .map(s => ({
        name: s.name.length > 12 ? s.name.slice(0, 12) + '...' : s.name,
        avgCost: Math.round(s.totalSpent / Math.max(1, s.ordersCount)),
        rating: s.rating ?? 3,
        leadTime: s.leadTime ?? 0,
      }));
  }, [suppliers]);

  // ─── Insights ──────────────────────────────────────────────────────────

  const procurementInsights: InsightItem[] = [];

  if (lateDeliveries.length > 0) {
    const lateTotal = lateDeliveries.reduce((sum, o) => sum + o.totalAmount, 0);
    procurementInsights.push({
      id: 'late-deliveries',
      severity: 'critical',
      title: 'Delayed Deliveries',
      metric: `${lateDeliveries.length} orders (KES ${lateTotal.toLocaleString()})`,
      description: `${lateDeliveries.slice(0, 2).map(o => o.supplierName).join(', ')} have overdue deliveries`,
      action: {
        label: 'Contact Suppliers',
        onClick: () => setFilterStatus('delayed'),
        icon: PhoneCall,
      },
    });
  }

  if (pendingRequests.length > 0) {
    const urgentCount = pendingRequests.filter(pr => pr.priority === 'urgent' || pr.priority === 'high').length;
    procurementInsights.push({
      id: 'pending-requests',
      severity: urgentCount > 0 ? 'critical' : 'warning',
      title: 'Pending Approvals',
      metric: `${pendingRequests.length} requests${urgentCount > 0 ? ` (${urgentCount} urgent)` : ''}`,
      description: `${pendingRequests.slice(0, 2).map(pr => pr.productName).join(', ')} awaiting approval`,
      action: {
        label: 'Review Requests',
        onClick: () => setFilterStatus('all'),
        icon: ClipboardList,
      },
    });
  }

  if (draftOrders.length > 0) {
    procurementInsights.push({
      id: 'draft-orders',
      severity: 'warning',
      title: 'Unconfirmed Orders',
      metric: `${draftOrders.length} drafts`,
      description: 'Purchase orders waiting to be confirmed and sent to suppliers',
      action: {
        label: 'Review & Confirm',
        onClick: () => setFilterStatus('draft'),
        icon: ClipboardList,
      },
    });
  }

  if (lowPerformanceSuppliers.length > 0) {
    procurementInsights.push({
      id: 'low-perf-suppliers',
      severity: 'warning',
      title: 'Underperforming Suppliers',
      metric: `${lowPerformanceSuppliers.length} suppliers`,
      description: `${lowPerformanceSuppliers.slice(0, 2).map(s => s.name).join(', ')} have on-time delivery below 80%`,
      action: {
        label: 'Review Suppliers',
        onClick: () => setFilterStatus('all'),
        icon: Truck,
        variant: 'outline',
      },
    });
  }

  if (procurementInsights.length === 0 && stats && stats.totalOrders > 0) {
    procurementInsights.push({
      id: 'procurement-healthy',
      severity: 'success',
      title: 'Procurement On Track',
      metric: `${stats.completedOrders}/${stats.totalOrders} completed`,
      description: 'All orders and deliveries are running on schedule',
      action: {
        label: 'View All Orders',
        onClick: () => setFilterStatus('all'),
        variant: 'outline',
      },
    });
  }

  return (
    <div className="w-full space-y-6">
      {/* ═══════════════════════════════════════════════════════════════════
          SMART CARDS
          ═══════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Pending Requests */}
        <Card
          className={`border shadow-sm hover:shadow-md transition-all cursor-pointer ${pendingRequests.length > 0 ? 'border-amber-200 bg-amber-50/50' : ''}`}
          onClick={() => setFilterStatus('all')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground">Pending Requests</CardTitle>
            <ClipboardList className={`h-4 w-4 ${pendingRequests.length > 0 ? 'text-amber-500' : 'text-muted-foreground'}`} />
          </CardHeader>
          <CardContent className="pb-3">
            <div className={`text-2xl font-bold ${pendingRequests.length > 0 ? 'text-amber-700' : ''}`}>
              {pendingRequests.length}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              {pendingRequests.filter(pr => pr.priority === 'urgent').length > 0
                ? `${pendingRequests.filter(pr => pr.priority === 'urgent').length} urgent`
                : 'Awaiting approval'}
            </p>
          </CardContent>
        </Card>

        {/* Active Orders */}
        <Card className="border shadow-sm hover:shadow-md transition-all cursor-pointer" onClick={() => setFilterStatus('all')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground">Active Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent className="pb-3">
            <div className="text-2xl font-bold">{activeOrders.length}</div>
            <p className="text-[10px] text-muted-foreground mt-1">
              KES {activeOrders.reduce((s, o) => s + o.totalAmount, 0).toLocaleString()} in pipeline
            </p>
          </CardContent>
        </Card>

        {/* Delayed Deliveries */}
        <Card
          className={`border shadow-sm hover:shadow-md transition-all cursor-pointer ${lateDeliveries.length > 0 ? 'border-red-200 bg-red-50/50' : ''}`}
          onClick={() => setFilterStatus('delayed')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground">Delayed</CardTitle>
            <AlertTriangle className={`h-4 w-4 ${lateDeliveries.length > 0 ? 'text-red-500 animate-pulse' : 'text-muted-foreground'}`} />
          </CardHeader>
          <CardContent className="pb-3">
            <div className={`text-2xl font-bold ${lateDeliveries.length > 0 ? 'text-red-700' : ''}`}>
              {lateDeliveries.length}
            </div>
            <p className="text-[10px] text-red-600 mt-1">
              {lateDeliveries.length > 0 ? 'Past expected delivery' : 'No delays'}
            </p>
          </CardContent>
        </Card>

        {/* Total Spent */}
        <Card className="border shadow-sm hover:shadow-md transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground">Total Spent</CardTitle>
            <Package className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent className="pb-3">
            <div className="text-2xl font-bold">KES {((stats?.totalSpent ?? 0) / 1000).toFixed(0)}K</div>
            <p className="text-[10px] text-muted-foreground mt-1">
              Avg KES {(stats?.averageOrderValue ?? 0).toLocaleString()} / order
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          WORKFLOW PIPELINE VISUALIZATION
          ═══════════════════════════════════════════════════════════════════ */}
      <Card className="border shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Procurement Pipeline</CardTitle>
          <CardDescription>Current workflow status across all stages</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between overflow-x-auto pb-2">
            {PIPELINE_STAGES.map((stage, idx) => {
              const count = pipelineCounts[stage.key];
              const StageIcon = stage.icon;
              const isActive = count > 0;
              const isLast = idx === PIPELINE_STAGES.length - 1;

              return (
                <React.Fragment key={stage.key}>
                  <div className={`flex flex-col items-center gap-1.5 min-w-20 ${isActive ? '' : 'opacity-50'}`}>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                      isActive
                        ? 'bg-primary/10 border-primary text-primary'
                        : 'bg-muted border-muted-foreground/20 text-muted-foreground'
                    }`}>
                      <StageIcon className="h-4 w-4" />
                    </div>
                    <span className="text-[10px] font-medium text-center">{stage.label}</span>
                    <Badge
                      variant={isActive ? 'default' : 'outline'}
                      className={`text-[10px] px-1.5 py-0 h-4 ${isActive ? '' : 'opacity-60'}`}
                    >
                      {count}
                    </Badge>
                  </div>
                  {!isLast && (
                    <div className="flex items-center px-1 -mt-6">
                      <div className={`h-0.5 w-6 sm:w-10 ${count > 0 ? 'bg-primary/40' : 'bg-muted-foreground/15'}`} />
                      <ChevronRight className={`h-3 w-3 shrink-0 ${count > 0 ? 'text-primary/50' : 'text-muted-foreground/20'}`} />
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Data -> Insight -> Action Panel */}
      <InsightActionCard insights={procurementInsights} title="Procurement Alerts" />

      {/* ═══════════════════════════════════════════════════════════════════
          ACTION TOOLBAR
          ═══════════════════════════════════════════════════════════════════ */}
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => fetchProcurementData()} className="gap-1.5">
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </Button>
        {pendingRequests.length > 0 && (
          <Button size="sm" className="gap-1.5" onClick={() => {
            pendingRequests.forEach(pr => handleApproveRequest(pr));
          }}>
            <CheckSquare className="h-3.5 w-3.5" />
            Approve All ({pendingRequests.length})
          </Button>
        )}
        {draftOrders.length > 0 && (
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => {
            draftOrders.forEach(o => handleConfirmOrder(o));
          }}>
            <Send className="h-3.5 w-3.5" />
            Confirm Drafts ({draftOrders.length})
          </Button>
        )}
        <div className="ml-auto text-xs text-muted-foreground">
          {orders.length} orders &middot; {purchaseRequests.length} requests &middot; {suppliers.length} suppliers
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          PURCHASE REQUESTS (Pending Approvals)
          ═══════════════════════════════════════════════════════════════════ */}
      {pendingRequests.length > 0 && (
        <Card className="border shadow-sm border-amber-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-amber-500" />
              Purchase Requests Awaiting Approval
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {pendingRequests.slice(0, 5).map(pr => (
                <div key={pr._id} className="flex items-center justify-between gap-3 p-2 rounded-lg bg-muted/40 hover:bg-muted/60 transition-colors">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{pr.productName}</span>
                      <Badge variant="outline" className={`text-[10px] px-1 py-0 ${
                        pr.priority === 'urgent' ? 'border-red-300 text-red-700 bg-red-50' :
                        pr.priority === 'high' ? 'border-orange-300 text-orange-700 bg-orange-50' :
                        'border-gray-200'
                      }`}>
                        {pr.priority}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {pr.requestNumber} &middot; SKU: {pr.sku} &middot; Qty: {pr.requestedQuantity} &middot; Stock: {pr.currentStock}/{pr.minimumStock}
                    </div>
                  </div>
                  <Button size="sm" className="h-7 gap-1 shrink-0" onClick={() => handleApproveRequest(pr)}>
                    <CheckCircle className="h-3 w-3" />
                    Approve
                  </Button>
                </div>
              ))}
              {pendingRequests.length > 5 && (
                <p className="text-xs text-muted-foreground text-center">+{pendingRequests.length - 5} more requests</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          CHARTS + SUPPLIER PRICE COMPARISON
          ═══════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Order Trends */}
        <Card className="border shadow-sm lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Order Trends</CardTitle>
            <CardDescription>30-day procurement value</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={orderTrends}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" fontSize={10} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis fontSize={10} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))' }} />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#3b82f6"
                  fillOpacity={1}
                  fill="url(#colorValue)"
                  name="Order Value (KES)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Supplier Price Comparison */}
        <Card className="border shadow-sm lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Supplier Avg Cost</CardTitle>
            <CardDescription>Average order value by supplier</CardDescription>
          </CardHeader>
          <CardContent>
            {supplierComparisonData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={supplierComparisonData} layout="vertical" margin={{ left: 0, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" fontSize={10} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis type="category" dataKey="name" fontSize={10} width={80} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))' }} />
                  <Bar dataKey="avgCost" fill="#10b981" radius={[0, 4, 4, 0]} name="Avg Cost (KES)" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-sm text-muted-foreground">No supplier data</div>
            )}
          </CardContent>
        </Card>

        {/* Status Distribution */}
        <Card className="border shadow-sm lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Order Status</CardTitle>
            <CardDescription>Distribution of order statuses</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={statusDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={75}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusDistribution.map((_: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          SUPPLIER INTELLIGENCE TABLE
          ═══════════════════════════════════════════════════════════════════ */}
      <Card className="border shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Supplier Intelligence</CardTitle>
          <CardDescription>Ratings, delivery performance, and cost analysis</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead className="text-right">Orders</TableHead>
                  <TableHead>On-Time</TableHead>
                  <TableHead>Lead Time</TableHead>
                  <TableHead className="text-right">Avg Cost/Order</TableHead>
                  <TableHead className="text-right">Total Spent</TableHead>
                  <TableHead className="w-10">Best?</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {suppliers.length > 0 ? (
                  [...suppliers]
                    .sort((a, b) => (b.rating ?? 3) - (a.rating ?? 3))
                    .map((supplier, idx) => {
                      const avgCost = Math.round(supplier.totalSpent / Math.max(1, supplier.ordersCount));
                      const isCheapest = supplierComparisonData.length > 0 && supplierComparisonData[0]?.name.startsWith(supplier.name.slice(0, 12));

                      return (
                        <TableRow
                          key={supplier.name}
                          className="cursor-pointer hover:bg-muted/40"
                          onClick={() => { setSelectedSupplier(supplier); setSupplierDetailOpen(true); }}
                        >
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {idx === 0 && <Zap className="h-3.5 w-3.5 text-amber-500" />}
                              <span className="font-medium text-sm">{supplier.name}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <StarRating rating={supplier.rating ?? 3} />
                          </TableCell>
                          <TableCell className="text-right text-sm">{supplier.ordersCount}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              <div className={`w-2 h-2 rounded-full ${
                                supplier.onTimeDelivery >= 95 ? 'bg-green-500' :
                                supplier.onTimeDelivery >= 80 ? 'bg-orange-500' : 'bg-red-500'
                              }`} />
                              <span className="text-sm">{supplier.onTimeDelivery}%</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {supplier.leadTime ? (
                              <span className="text-sm flex items-center gap-1">
                                <Timer className="h-3 w-3 text-muted-foreground" />
                                {supplier.leadTime}d
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right text-sm font-mono">
                            {avgCost.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right text-sm font-mono">
                            {supplier.totalSpent.toLocaleString()}
                          </TableCell>
                          <TableCell>
                            {isCheapest && (
                              <Badge variant="outline" className="text-[9px] px-1 py-0 bg-emerald-50 text-emerald-700 border-emerald-200">
                                Cheapest
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No supplier data available
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Supplier Detail Dialog */}
      <Dialog open={supplierDetailOpen} onOpenChange={setSupplierDetailOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedSupplier?.name}</DialogTitle>
            <DialogDescription>Supplier performance details</DialogDescription>
          </DialogHeader>
          {selectedSupplier && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Rating</div>
                  <StarRating rating={selectedSupplier.rating ?? 3} />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">On-Time Delivery</div>
                  <div className="flex items-center gap-2">
                    <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${selectedSupplier.onTimeDelivery >= 95 ? 'bg-green-500' : selectedSupplier.onTimeDelivery >= 80 ? 'bg-orange-500' : 'bg-red-500'}`}
                        style={{ width: `${selectedSupplier.onTimeDelivery}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium">{selectedSupplier.onTimeDelivery}%</span>
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Lead Time</div>
                  <div className="text-sm font-medium">{selectedSupplier.leadTime ? `${selectedSupplier.leadTime} days` : '—'}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Total Orders</div>
                  <div className="text-sm font-medium">{selectedSupplier.ordersCount}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Avg Order Value</div>
                  <div className="text-sm font-medium font-mono">
                    KES {Math.round(selectedSupplier.totalSpent / Math.max(1, selectedSupplier.ordersCount)).toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Total Spent</div>
                  <div className="text-sm font-medium font-mono">KES {selectedSupplier.totalSpent.toLocaleString()}</div>
                </div>
              </div>
              {selectedSupplier.categories && selectedSupplier.categories.length > 0 && (
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Categories</div>
                  <div className="flex flex-wrap gap-1">
                    {selectedSupplier.categories.map(cat => (
                      <Badge key={cat} variant="outline" className="text-[10px]">{cat}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════════════
          PURCHASE ORDERS TABLE (Enhanced)
          ═══════════════════════════════════════════════════════════════════ */}
      <Card className="border shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Purchase Orders</CardTitle>
          <CardDescription>Track delivery status and manage orders</CardDescription>
          <div className="flex flex-wrap gap-3 mt-4">
            <Input
              placeholder="Search by PO number or supplier..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-xs h-9"
            />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="h-9 px-3 border rounded-lg text-sm bg-background"
            >
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="submitted">Submitted</option>
              <option value="confirmed">Confirmed</option>
              <option value="in_transit">In Transit</option>
              <option value="partially_received">Partially Received</option>
              <option value="received">Received</option>
              <option value="cancelled">Cancelled</option>
              <option value="delayed">Delayed</option>
            </select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>PO Number</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Ordered</TableHead>
                  <TableHead>Delivery</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead className="w-20">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.length > 0 ? (
                  filteredOrders.map((order) => {
                    const daysLeft = getDaysUntilDelivery(order);
                    const isLate = daysLeft < 0 && order.status !== 'received' && order.status !== 'cancelled';

                    return (
                      <TableRow key={order._id} className={isLate ? 'bg-red-50/50' : ''}>
                        <TableCell className="font-mono text-xs font-medium">
                          {order.poNumber}
                        </TableCell>
                        <TableCell className="text-sm">{order.supplierName}</TableCell>
                        <TableCell className="text-right text-sm font-mono">
                          {(order.grandTotal || order.totalAmount).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(order.orderDate).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-0.5">
                            <div className="text-xs">{new Date(order.expectedDeliveryDate).toLocaleDateString()}</div>
                            {order.status !== 'received' && order.status !== 'cancelled' && (
                              <div className={`text-[10px] font-medium ${isLate ? 'text-red-600' : daysLeft <= 2 ? 'text-orange-600' : 'text-muted-foreground'}`}>
                                {isLate ? `${Math.abs(daysLeft)}d overdue` : `${daysLeft}d left`}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${getStatusBadge(order.status)}`}>
                            {getStatusIcon(order.status)}
                            <span className="ml-1">{order.status.replace(/_/g, ' ')}</span>
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                        </TableCell>
                        <TableCell>
                          {order.status === 'draft' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs gap-1"
                              onClick={() => handleConfirmOrder(order)}
                            >
                              <Send className="h-3 w-3" /> Confirm
                            </Button>
                          )}
                          {isLate && (
                            <Badge variant="outline" className="text-[9px] px-1 py-0 border-red-300 text-red-600 bg-red-50">
                              Late
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      <Package className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      No purchase orders found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
