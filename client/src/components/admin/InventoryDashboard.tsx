import { useEffect, useState, useMemo, useCallback } from 'react';
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
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { apiFetch } from '@/lib/api';
import {
  TrendingDown,
  AlertTriangle,
  ShoppingCart,
  PackageSearch,
  RotateCcw,
  Package,
  XCircle,
  Flame,
  Download,
  RefreshCw,
  ArrowUpDown,
  Truck,
  Calendar,
  BarChart3,
} from 'lucide-react';
import { InsightActionCard, InsightItem } from '@/components/ui/InsightActionCard';
import { useToast } from '@/hooks/use-toast';

interface InventoryItem {
  id: string;
  _id?: string;
  sku: string;
  productName: string;
  currentStock: number;
  minimumStock: number;
  maximumStock: number;
  unit: string;
  costPrice: number;
  sellingPrice?: number;
  category: string;
  reorderStatus: 'normal' | 'low' | 'critical';
  status?: 'active' | 'discontinued' | 'out_of_stock';
  lastUpdated: string;
  lastRestockedAt?: string;
  supplierId?: { _id: string; name: string; contact?: string } | string;
  location?: string;
}

interface InventoryStats {
  totalItems: number;
  totalValue: number;
  lowStockItems: number;
  criticalStockItems: number;
  outOfStockItems?: number;
  averageStockLevel: number;
}

interface StockTrend {
  date: string;
  totalItems: number;
  totalValue: number;
}

type FilterStatus = 'all' | 'low' | 'critical' | 'out_of_stock' | 'overstock';

export default function InventoryDashboard() {
  const { toast } = useToast();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [stats, setStats] = useState<InventoryStats | null>(null);
  const [trends, setTrends] = useState<StockTrend[]>([]);
  const [categoryDistribution, setCategoryDistribution] = useState<Array<{ name: string; value: number }>>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [bulkQuantity, setBulkQuantity] = useState('');
  const [bulkOperation, setBulkOperation] = useState<'add' | 'subtract' | 'set'>('add');
  const [bulkLoading, setBulkLoading] = useState(false);
  const [sortField, setSortField] = useState<'productName' | 'currentStock' | 'lastRestockedAt' | 'category'>('productName');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    fetchInventoryData();
  }, []);

  const fetchInventoryData = async () => {
    try {
      const [inventoryRes, statsRes, trendsRes] = await Promise.all([
        apiFetch('/api/inventory?page=1&limit=100'),
        apiFetch('/api/inventory/stats'),
        apiFetch('/api/inventory/trends?days=30'),
      ]);

      let items: InventoryItem[] = [];
      if (inventoryRes.ok) {
        const data = await inventoryRes.json();
        items = data.data || [];
        setInventory(items);
      }

      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data.data);
      }

      if (trendsRes.ok) {
        const data = await trendsRes.json();
        setTrends(data.data || []);
      }

      // Group by category for pie chart
      const categoryCount: Record<string, number> = {};
      items.forEach((item: InventoryItem) => {
        categoryCount[item.category] = (categoryCount[item.category] || 0) + 1;
      });

      const categoryData = Object.entries(categoryCount).map(([name, count]) => ({
        name,
        value: count,
      }));
      setCategoryDistribution(categoryData);
    } catch (error) {
      console.error('Failed to fetch inventory data:', error);
    }
  };

  // ─── Computed lists ───────────────────────────────────────────────────

  const lowStockItems = useMemo(() =>
    inventory.filter(i => i.reorderStatus === 'low'),
    [inventory]
  );
  const criticalStockItems = useMemo(() =>
    inventory.filter(i => i.reorderStatus === 'critical'),
    [inventory]
  );
  const outOfStockItems = useMemo(() =>
    inventory.filter(i => i.currentStock === 0 || i.status === 'out_of_stock'),
    [inventory]
  );
  const overstockItems = useMemo(() =>
    inventory.filter(i => i.maximumStock > 0 && i.currentStock > i.maximumStock * 1.2),
    [inventory]
  );

  // ─── Avg daily usage (AI-ready placeholder based on stock changes) ────

  const getAvgDailyUsage = useCallback((item: InventoryItem) => {
    if (!item.lastRestockedAt) return null;
    const daysSinceRestock = Math.max(1, Math.floor(
      (Date.now() - new Date(item.lastRestockedAt).getTime()) / (1000 * 60 * 60 * 24)
    ));
    const consumed = Math.max(0, item.maximumStock - item.currentStock);
    return Math.round((consumed / daysSinceRestock) * 10) / 10;
  }, []);

  const getDaysUntilStockout = useCallback((item: InventoryItem) => {
    const usage = getAvgDailyUsage(item);
    if (!usage || usage === 0) return null;
    return Math.floor(item.currentStock / usage);
  }, [getAvgDailyUsage]);

  // ─── Supplier name helper ─────────────────────────────────────────────

  const getSupplierName = (item: InventoryItem) => {
    if (!item.supplierId) return '—';
    if (typeof item.supplierId === 'object' && item.supplierId.name) return item.supplierId.name;
    return String(item.supplierId).slice(-6);
  };

  // ─── Filtering & Sorting ──────────────────────────────────────────────

  const filteredInventory = useMemo(() => {
    let result = inventory.filter((item) => {
      const matchesSearch =
        item.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.sku.toLowerCase().includes(searchTerm.toLowerCase());

      if (filterStatus === 'low') return matchesSearch && item.reorderStatus === 'low';
      if (filterStatus === 'critical') return matchesSearch && item.reorderStatus === 'critical';
      if (filterStatus === 'out_of_stock') return matchesSearch && (item.currentStock === 0 || item.status === 'out_of_stock');
      if (filterStatus === 'overstock') return matchesSearch && item.maximumStock > 0 && item.currentStock > item.maximumStock * 1.2;
      return matchesSearch;
    });

    result.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'productName') cmp = a.productName.localeCompare(b.productName);
      else if (sortField === 'currentStock') cmp = a.currentStock - b.currentStock;
      else if (sortField === 'category') cmp = a.category.localeCompare(b.category);
      else if (sortField === 'lastRestockedAt') {
        const da = a.lastRestockedAt ? new Date(a.lastRestockedAt).getTime() : 0;
        const db = b.lastRestockedAt ? new Date(b.lastRestockedAt).getTime() : 0;
        cmp = da - db;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [inventory, searchTerm, filterStatus, sortField, sortDir]);

  // ─── Stock status helpers ─────────────────────────────────────────────

  const getStockHealth = (item: InventoryItem): 'critical' | 'low' | 'overstock' | 'healthy' => {
    if (item.currentStock === 0) return 'critical';
    if (item.reorderStatus === 'critical') return 'critical';
    if (item.reorderStatus === 'low') return 'low';
    if (item.maximumStock > 0 && item.currentStock > item.maximumStock * 1.2) return 'overstock';
    return 'healthy';
  };

  const healthConfig = {
    critical: { color: 'bg-red-500', badge: 'bg-red-100 text-red-800 border-red-200', label: 'Critical', dot: 'bg-red-500' },
    low: { color: 'bg-orange-500', badge: 'bg-orange-100 text-orange-800 border-orange-200', label: 'Low', dot: 'bg-orange-500' },
    overstock: { color: 'bg-blue-500', badge: 'bg-blue-100 text-blue-800 border-blue-200', label: 'Overstock', dot: 'bg-blue-500' },
    healthy: { color: 'bg-green-500', badge: 'bg-green-100 text-green-800 border-green-200', label: 'Healthy', dot: 'bg-green-500' },
  };

  const getStockPercentage = (current: number, max: number) => {
    if (max === 0) return 0;
    return Math.round((current / max) * 100);
  };

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  // ─── Smart Actions ────────────────────────────────────────────────────

  const handleRestockNow = async (items: InventoryItem[]) => {
    try {
      const body = {
        items: items.map(i => ({
          inventoryItemId: i.id || i._id,
          productName: i.productName,
          sku: i.sku,
          quantityNeeded: Math.max(1, i.maximumStock - i.currentStock),
          unit: i.unit,
          supplierId: typeof i.supplierId === 'object' ? i.supplierId?._id : i.supplierId,
        })),
        priority: 'high',
        notes: 'Auto-generated restock request from inventory dashboard',
      };
      const res = await apiFetch('/api/procurement/purchase-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        toast({ title: 'Purchase Request Created', description: `Restock PR created for ${items.length} item(s)` });
      } else {
        toast({ title: 'PR Creation Failed', description: 'Could not auto-create purchase request. Try manually.', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Network error creating purchase request', variant: 'destructive' });
    }
  };

  const handleBulkUpdate = async () => {
    if (selectedIds.size === 0 || !bulkQuantity) return;
    setBulkLoading(true);
    try {
      const promises = Array.from(selectedIds).map(id =>
        apiFetch(`/api/inventory/${id}/stock`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ quantity: Number(bulkQuantity), operation: bulkOperation, reason: 'Bulk update from dashboard' }),
        })
      );
      await Promise.all(promises);
      toast({ title: 'Bulk Update Complete', description: `Updated ${selectedIds.size} item(s)` });
      setSelectedIds(new Set());
      setBulkDialogOpen(false);
      setBulkQuantity('');
      fetchInventoryData();
    } catch {
      toast({ title: 'Bulk Update Failed', description: 'Some items may not have been updated', variant: 'destructive' });
    } finally {
      setBulkLoading(false);
    }
  };

  const handleExportCSV = () => {
    const headers = ['SKU', 'Product Name', 'Category', 'Current Stock', 'Min Stock', 'Max Stock', 'Unit', 'Cost Price', 'Status', 'Supplier', 'Last Restocked', 'Avg Daily Usage'];
    const rows = filteredInventory.map(item => [
      item.sku,
      item.productName,
      item.category,
      item.currentStock,
      item.minimumStock,
      item.maximumStock,
      item.unit,
      item.costPrice,
      getStockHealth(item),
      getSupplierName(item),
      item.lastRestockedAt ? new Date(item.lastRestockedAt).toLocaleDateString() : '—',
      getAvgDailyUsage(item) ?? '—',
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${v}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventory_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Exported', description: `${filteredInventory.length} items exported to CSV` });
  };

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredInventory.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredInventory.map(i => i.id || i._id || '')));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // ─── Insights ─────────────────────────────────────────────────────────

  const inventoryInsights: InsightItem[] = [];

  if (criticalStockItems.length > 0) {
    inventoryInsights.push({
      id: 'critical-stock',
      severity: 'critical',
      title: 'Critical Stock',
      metric: `${criticalStockItems.length} items`,
      description: `${criticalStockItems.slice(0, 3).map(i => i.productName).join(', ')}${criticalStockItems.length > 3 ? '...' : ''} need immediate restocking`,
      action: {
        label: 'Create Purchase Request',
        onClick: () => handleRestockNow(criticalStockItems),
        icon: ShoppingCart,
      },
    });
  }

  if (outOfStockItems.length > 0) {
    inventoryInsights.push({
      id: 'out-of-stock',
      severity: 'critical',
      title: 'Out of Stock',
      metric: `${outOfStockItems.length} items`,
      description: `${outOfStockItems.slice(0, 3).map(i => i.productName).join(', ')}${outOfStockItems.length > 3 ? '...' : ''} have zero stock`,
      action: {
        label: 'Restock Now',
        onClick: () => { setFilterStatus('out_of_stock'); handleRestockNow(outOfStockItems); },
        icon: XCircle,
      },
    });
  }

  if (lowStockItems.length > 0) {
    inventoryInsights.push({
      id: 'low-stock',
      severity: 'warning',
      title: 'Low Stock Alert',
      metric: `${lowStockItems.length} items`,
      description: `${lowStockItems.slice(0, 3).map(i => i.productName).join(', ')}${lowStockItems.length > 3 ? '...' : ''} are below reorder threshold`,
      action: {
        label: 'Review & Reorder',
        onClick: () => setFilterStatus('low'),
        icon: RotateCcw,
        variant: 'outline',
      },
    });
  }

  if (overstockItems.length > 0) {
    inventoryInsights.push({
      id: 'overstock',
      severity: 'info' as any,
      title: 'Overstock Detected',
      metric: `${overstockItems.length} items`,
      description: `${overstockItems.slice(0, 3).map(i => i.productName).join(', ')}${overstockItems.length > 3 ? '...' : ''} exceed max by 20%+`,
      action: {
        label: 'Review Overstock',
        onClick: () => setFilterStatus('overstock'),
        icon: Flame,
        variant: 'outline',
      },
    });
  }

  if (stats && stats.totalItems > 0 && stats.averageStockLevel < 30) {
    inventoryInsights.push({
      id: 'avg-stock-low',
      severity: 'warning',
      title: 'Average Stock Level Low',
      metric: `${Math.round(stats.averageStockLevel)}%`,
      description: 'Overall inventory levels are running low across categories',
      action: {
        label: 'Audit Inventory',
        onClick: () => setFilterStatus('all'),
        icon: PackageSearch,
        variant: 'outline',
      },
    });
  }

  if (inventoryInsights.length === 0 && stats && stats.totalItems > 0) {
    inventoryInsights.push({
      id: 'all-good',
      severity: 'success',
      title: 'Stock Levels Healthy',
      metric: `${stats.totalItems} items`,
      description: 'All inventory items are within acceptable stock levels',
      action: {
        label: 'View All Items',
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
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Products */}
        <Card className="border shadow-sm hover:shadow-md transition-all cursor-pointer" onClick={() => setFilterStatus('all')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground">Total Products</CardTitle>
            <Package className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent className="pb-3">
            <div className="text-2xl font-bold">{stats?.totalItems ?? inventory.length}</div>
            <p className="text-[10px] text-muted-foreground mt-1">
              KES {(stats?.totalValue ?? 0).toLocaleString()} total value
            </p>
          </CardContent>
        </Card>

        {/* Low Stock */}
        <Card
          className={`border shadow-sm hover:shadow-md transition-all cursor-pointer ${lowStockItems.length > 0 ? 'border-orange-200 bg-orange-50/50' : ''}`}
          onClick={() => setFilterStatus('low')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground">Low Stock</CardTitle>
            <AlertTriangle className={`h-4 w-4 ${lowStockItems.length > 0 ? 'text-orange-500' : 'text-muted-foreground'}`} />
          </CardHeader>
          <CardContent className="pb-3">
            <div className={`text-2xl font-bold ${lowStockItems.length > 0 ? 'text-orange-700' : ''}`}>
              {lowStockItems.length}
            </div>
            <p className="text-[10px] text-orange-600 mt-1">
              {lowStockItems.length > 0 ? 'Below reorder threshold' : 'All above threshold'}
            </p>
          </CardContent>
        </Card>

        {/* Out of Stock */}
        <Card
          className={`border shadow-sm hover:shadow-md transition-all cursor-pointer ${outOfStockItems.length > 0 ? 'border-red-200 bg-red-50/50' : ''}`}
          onClick={() => setFilterStatus('out_of_stock')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground">Out of Stock</CardTitle>
            <XCircle className={`h-4 w-4 ${outOfStockItems.length > 0 ? 'text-red-500 animate-pulse' : 'text-muted-foreground'}`} />
          </CardHeader>
          <CardContent className="pb-3">
            <div className={`text-2xl font-bold ${outOfStockItems.length > 0 ? 'text-red-700' : ''}`}>
              {outOfStockItems.length}
            </div>
            <p className="text-[10px] text-red-600 mt-1">
              {outOfStockItems.length > 0 ? 'Immediate action needed' : 'No stockouts'}
            </p>
          </CardContent>
        </Card>

        {/* Overstock */}
        <Card
          className={`border shadow-sm hover:shadow-md transition-all cursor-pointer ${overstockItems.length > 0 ? 'border-blue-200 bg-blue-50/50' : ''}`}
          onClick={() => setFilterStatus('overstock')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground">Overstock</CardTitle>
            <Flame className={`h-4 w-4 ${overstockItems.length > 0 ? 'text-blue-500' : 'text-muted-foreground'}`} />
          </CardHeader>
          <CardContent className="pb-3">
            <div className={`text-2xl font-bold ${overstockItems.length > 0 ? 'text-blue-700' : ''}`}>
              {overstockItems.length}
            </div>
            <p className="text-[10px] text-blue-600 mt-1">
              {overstockItems.length > 0 ? 'Exceeding max by 20%+' : 'No overstock'}
            </p>
          </CardContent>
        </Card>

        {/* Avg Stock Health */}
        <Card className="border shadow-sm hover:shadow-md transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground">Avg Stock Level</CardTitle>
            <BarChart3 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent className="pb-3">
            <div className={`text-2xl font-bold ${(stats?.averageStockLevel ?? 0) < 30 ? 'text-red-600' : (stats?.averageStockLevel ?? 0) < 60 ? 'text-orange-600' : 'text-emerald-600'}`}>
              {Math.round(stats?.averageStockLevel ?? 0)}%
            </div>
            <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden mt-1.5">
              <div
                className={`h-full rounded-full transition-all ${(stats?.averageStockLevel ?? 0) < 30 ? 'bg-red-500' : (stats?.averageStockLevel ?? 0) < 60 ? 'bg-orange-500' : 'bg-emerald-500'}`}
                style={{ width: `${Math.min(stats?.averageStockLevel ?? 0, 100)}%` }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Data -> Insight -> Action Panel */}
      <InsightActionCard insights={inventoryInsights} title="Inventory Alerts" />

      {/* ═══════════════════════════════════════════════════════════════════
          SMART ACTIONS TOOLBAR
          ═══════════════════════════════════════════════════════════════════ */}
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => fetchInventoryData()} className="gap-1.5">
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </Button>
        {(criticalStockItems.length + outOfStockItems.length) > 0 && (
          <Button
            size="sm"
            className="gap-1.5 bg-red-600 hover:bg-red-700"
            onClick={() => handleRestockNow([...outOfStockItems, ...criticalStockItems])}
          >
            <ShoppingCart className="h-3.5 w-3.5" />
            Restock Now ({criticalStockItems.length + outOfStockItems.length})
          </Button>
        )}
        {selectedIds.size > 0 && (
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setBulkDialogOpen(true)}>
            <ArrowUpDown className="h-3.5 w-3.5" />
            Bulk Update ({selectedIds.size})
          </Button>
        )}
        <Button variant="outline" size="sm" className="gap-1.5" onClick={handleExportCSV}>
          <Download className="h-3.5 w-3.5" />
          Export CSV
        </Button>
        <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
          <span>{filteredInventory.length} of {inventory.length} items</span>
        </div>
      </div>

      {/* Bulk Update Dialog */}
      <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Stock Update</DialogTitle>
            <DialogDescription>Update stock for {selectedIds.size} selected item(s)</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium block mb-1">Operation</label>
              <select
                value={bulkOperation}
                onChange={(e) => setBulkOperation(e.target.value as any)}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              >
                <option value="add">Add stock</option>
                <option value="subtract">Subtract stock</option>
                <option value="set">Set to exact value</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Quantity</label>
              <Input
                type="number"
                value={bulkQuantity}
                onChange={(e) => setBulkQuantity(e.target.value)}
                placeholder="Enter quantity..."
                min={0}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setBulkDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleBulkUpdate} disabled={bulkLoading || !bulkQuantity}>
                {bulkLoading ? 'Updating...' : `Update ${selectedIds.size} Items`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════════════
          CHARTS
          ═══════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stock Trends */}
        <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Stock Trends (30 Days)</CardTitle>
            <CardDescription>Total inventory value over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trends}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" fontSize={11} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis fontSize={11} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))' }} />
                <Line
                  type="monotone"
                  dataKey="totalValue"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={false}
                  name="Inventory Value (KES)"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Category Distribution */}
        <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Items by Category</CardTitle>
            <CardDescription>Distribution of inventory items</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {categoryDistribution.map((_: any, index: number) => (
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
          ADVANCED INVENTORY TABLE
          ═══════════════════════════════════════════════════════════════════ */}
      <Card className="border shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Inventory Items</CardTitle>
          <CardDescription>Complete inventory listing with supply intelligence</CardDescription>
          <div className="flex flex-wrap gap-3 mt-4">
            <Input
              placeholder="Search by name or SKU..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-xs h-9"
            />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
              className="h-9 px-3 border rounded-lg text-sm bg-background"
            >
              <option value="all">All Items</option>
              <option value="low">Low Stock</option>
              <option value="critical">Critical</option>
              <option value="out_of_stock">Out of Stock</option>
              <option value="overstock">Overstock</option>
            </select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <input
                      type="checkbox"
                      checked={filteredInventory.length > 0 && selectedIds.size === filteredInventory.length}
                      onChange={toggleSelectAll}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                  </TableHead>
                  <TableHead>
                    <button className="flex items-center gap-1 hover:text-foreground" onClick={() => toggleSort('productName')}>
                      Product {sortField === 'productName' && <ArrowUpDown className="h-3 w-3" />}
                    </button>
                  </TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>
                    <button className="flex items-center gap-1 hover:text-foreground" onClick={() => toggleSort('category')}>
                      Category {sortField === 'category' && <ArrowUpDown className="h-3 w-3" />}
                    </button>
                  </TableHead>
                  <TableHead>
                    <button className="flex items-center gap-1 hover:text-foreground" onClick={() => toggleSort('currentStock')}>
                      Stock {sortField === 'currentStock' && <ArrowUpDown className="h-3 w-3" />}
                    </button>
                  </TableHead>
                  <TableHead>Health</TableHead>
                  <TableHead>
                    <span className="flex items-center gap-1">
                      <Truck className="h-3 w-3" /> Supplier
                    </span>
                  </TableHead>
                  <TableHead>
                    <button className="flex items-center gap-1 hover:text-foreground" onClick={() => toggleSort('lastRestockedAt')}>
                      <Calendar className="h-3 w-3" /> Restocked {sortField === 'lastRestockedAt' && <ArrowUpDown className="h-3 w-3" />}
                    </button>
                  </TableHead>
                  <TableHead>
                    <span className="flex items-center gap-1">
                      <TrendingDown className="h-3 w-3" /> Daily Use
                    </span>
                  </TableHead>
                  <TableHead className="text-right">Value</TableHead>
                  <TableHead className="w-10">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInventory.length > 0 ? (
                  filteredInventory.map((item) => {
                    const stockPercent = getStockPercentage(item.currentStock, item.maximumStock);
                    const itemValue = item.currentStock * item.costPrice;
                    const health = getStockHealth(item);
                    const hc = healthConfig[health];
                    const avgUsage = getAvgDailyUsage(item);
                    const daysLeft = getDaysUntilStockout(item);
                    const itemId = item.id || item._id || '';

                    return (
                      <TableRow key={itemId} className={health === 'critical' ? 'bg-red-50/50' : health === 'low' ? 'bg-orange-50/30' : ''}>
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={selectedIds.has(itemId)}
                            onChange={() => toggleSelect(itemId)}
                            className="h-4 w-4 rounded border-gray-300"
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full shrink-0 ${hc.dot}`} />
                            <span className="font-medium text-sm">{item.productName}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">{item.sku}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px]">{item.category}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="text-sm font-medium">
                              {item.currentStock} <span className="text-muted-foreground text-xs">/ {item.maximumStock} {item.unit}</span>
                            </div>
                            <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${hc.color}`}
                                style={{ width: `${Math.min(stockPercent, 100)}%` }}
                              />
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${hc.badge}`}>
                            {hc.label}
                          </Badge>
                          {daysLeft !== null && daysLeft <= 7 && (
                            <div className="text-[10px] text-red-600 mt-0.5 font-medium">
                              ~{daysLeft}d left
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{getSupplierName(item)}</span>
                        </TableCell>
                        <TableCell>
                          {item.lastRestockedAt ? (
                            <span className="text-xs text-muted-foreground">
                              {new Date(item.lastRestockedAt).toLocaleDateString()}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {avgUsage !== null ? (
                            <span className="text-sm font-mono">{avgUsage} <span className="text-muted-foreground text-xs">/{item.unit}/d</span></span>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right text-sm font-mono">
                          {itemValue.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          {(health === 'critical' || health === 'low') && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs"
                              onClick={() => handleRestockNow([item])}
                              title="Create purchase request"
                            >
                              <ShoppingCart className="h-3 w-3" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                      <PackageSearch className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      No inventory items found
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
