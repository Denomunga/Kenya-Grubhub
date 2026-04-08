import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  DollarSign,
  ShoppingBag,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Users,
  Activity,
  Bell,
  ExternalLink,
  Package,
  RefreshCw,
} from 'lucide-react';
import { formatPriceKSHS } from '@/lib/format';

// ─── Mini Sparkline ─────────────────────────────────────────────────────────
function MiniSparkline({ data, color = 'currentColor', height = 32, width = 80 }: {
  data: number[];
  color?: string;
  height?: number;
  width?: number;
}) {
  if (data.length < 2) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const stepX = width / (data.length - 1);

  const points = data.map((v, i) => {
    const x = i * stepX;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  }).join(' ');

  const areaPoints = `0,${height} ${points} ${width},${height}`;

  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline
        points={areaPoints}
        fill={color}
        fillOpacity={0.1}
        stroke="none"
      />
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ─── Types ──────────────────────────────────────────────────────────────────
type ActivityItem = {
  id: string;
  ts: number;
  label: string;
  meta?: string;
  tone?: 'info' | 'success' | 'warning';
  tab?: string;
  orderId?: string;
};

interface Order {
  id: string;
  user: string;
  userEmail?: string;
  userPhone?: string;
  total: number;
  status: string;
  date: string;
  items: any[];
  location?: any;
}

export interface OverviewDashboardProps {
  // Data
  orders: Order[];
  menu: any[];
  allUsers: any[];
  activity: ActivityItem[];
  kpis: any;
  serverHealth: any;

  // Revenue data
  todayOrderRevenue: number;
  posTodayRevenue: number;
  posTodayCount: number;
  posTotalRevenue: number;
  currentRangeRevenue: number;
  revenueDeltaPct: number;
  posDailyRevenue: Record<string, number>;
  posTopSelling: any[];

  // Range
  rangeDays: number;
  rangeStart: Date;
  rangeEnd: Date;
  kpiRange: 'today' | '7d' | '30d' | 'custom';
  setKpiRange: (v: 'today' | '7d' | '30d' | 'custom') => void;
  customStart: string;
  customEnd: string;
  setCustomStart: (v: string) => void;
  setCustomEnd: (v: string) => void;

  // Navigation
  setActiveTab: (tab: string) => void;
  onOrderClick?: (order: Order) => void;
  onDrillDate?: (dateKey: string) => void;

  // Helpers
  isTodayLocal: (value: string) => boolean;
  toLocalDateKey: (value: Date) => string;
}

export default function OverviewDashboard(props: OverviewDashboardProps) {
  const {
    orders, menu, allUsers, activity, kpis, serverHealth,
    todayOrderRevenue, posTodayRevenue, posTodayCount, posTotalRevenue,
    currentRangeRevenue, revenueDeltaPct,
    posDailyRevenue, posTopSelling,
    rangeDays, rangeStart, kpiRange, setKpiRange,
    customStart, customEnd, setCustomStart, setCustomEnd,
    setActiveTab, onOrderClick,
    isTodayLocal, toLocalDateKey,
  } = props;

  const [salesTrendPeriod, setSalesTrendPeriod] = React.useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [autoRefreshCountdown, setAutoRefreshCountdown] = React.useState(300);
  
  // Chart drag-to-scroll state
  const chartScrollRef = React.useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = React.useState(false);
  const [dragStart, setDragStart] = React.useState(0);

  const handleChartMouseDown = (e: React.MouseEvent) => {
    if (!chartScrollRef.current) return;
    setIsDragging(true);
    setDragStart(e.clientX - (chartScrollRef.current.scrollLeft || 0));
  };

  const handleChartMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !chartScrollRef.current) return;
    e.preventDefault();
    const x = e.clientX - dragStart;
    chartScrollRef.current.scrollLeft = x;
  };

  const handleChartMouseUp = () => {
    setIsDragging(false);
  };

  React.useEffect(() => {
    document.addEventListener('mouseup', handleChartMouseUp);
    return () => document.removeEventListener('mouseup', handleChartMouseUp);
  }, []);

  // Auto-refresh countdown
  React.useEffect(() => {
    const timer = setInterval(() => {
      setAutoRefreshCountdown((prev) => (prev <= 1 ? 300 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // ─── Computed Data ──────────────────────────────────────────────────────

  const todayOrders = React.useMemo(() =>
    (orders || []).filter((o) => o.status !== 'Cancelled' && isTodayLocal(o.date)),
    [orders, isTodayLocal]
  );

  const yesterdayStart = React.useMemo(() => {
    const d = new Date(); d.setDate(d.getDate() - 1); d.setHours(0, 0, 0, 0); return d;
  }, []);
  const yesterdayEnd = React.useMemo(() => {
    const d = new Date(); d.setDate(d.getDate() - 1); d.setHours(23, 59, 59, 999); return d;
  }, []);

  const yesterdayOrders = React.useMemo(() =>
    (orders || []).filter((o) => {
      if (o.status === 'Cancelled') return false;
      const d = new Date(o.date);
      return d >= yesterdayStart && d <= yesterdayEnd;
    }),
    [orders, yesterdayStart, yesterdayEnd]
  );

  const yesterdayRevenue = React.useMemo(() => {
    const key = toLocalDateKey(yesterdayStart);
    const orderRev = yesterdayOrders.reduce((s, o) => s + (o.total || 0), 0);
    return orderRev + (posDailyRevenue[key] || 0);
  }, [yesterdayOrders, posDailyRevenue, yesterdayStart, toLocalDateKey]);

  const todayRevenue = todayOrderRevenue + posTodayRevenue;
  const revenueVsYesterday = React.useMemo(() => {
    if (yesterdayRevenue === 0) return todayRevenue > 0 ? 100 : 0;
    return ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100;
  }, [todayRevenue, yesterdayRevenue]);

  const ordersVsYesterday = React.useMemo(() => {
    const todayCount = todayOrders.length + posTodayCount;
    const yesterdayKey = toLocalDateKey(yesterdayStart);
    const yesterdayPosCount = posDailyRevenue[yesterdayKey] ? 1 : 0; // approximate
    const yesterdayCount = yesterdayOrders.length + yesterdayPosCount;
    if (yesterdayCount === 0) return todayCount > 0 ? 100 : 0;
    return ((todayCount - yesterdayCount) / yesterdayCount) * 100;
  }, [todayOrders, posTodayCount, yesterdayOrders, posDailyRevenue, yesterdayStart, toLocalDateKey]);

  const totalRevenue = React.useMemo(() => {
    return (kpis?.totalRevenue && kpis.totalRevenue > 0)
      ? kpis.totalRevenue
      : (orders.reduce((sum, o) => sum + o.total, 0) + posTotalRevenue);
  }, [kpis, orders, posTotalRevenue]);

  const activeOrders = React.useMemo(() =>
    orders.filter((o) => o.status !== 'Delivered' && o.status !== 'Cancelled'),
    [orders]
  );

  const criticalAlerts = React.useMemo(() => {
    let count = 0;
    // Pending orders older than 30 min
    const now = Date.now();
    activeOrders.forEach((o) => {
      const age = now - new Date(o.date).getTime();
      if (o.status === 'Pending' && age > 30 * 60 * 1000) count++;
    });
    // Server health issues
    if (serverHealth && serverHealth.memory?.rss > 500 * 1024 * 1024) count++;
    if (serverHealth && serverHealth.load?.[0] > 2) count++;
    return count;
  }, [activeOrders, serverHealth]);

  // ─── Sparkline data (last 7 days) ──────────────────────────────────────

  const last7DaysRevenue = React.useMemo(() => {
    const result: number[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = toLocalDateKey(d);
      const orderRev = (orders || [])
        .filter((o) => o.status !== 'Cancelled' && toLocalDateKey(new Date(o.date)) === key)
        .reduce((s, o) => s + (o.total || 0), 0);
      result.push(orderRev + (posDailyRevenue[key] || 0));
    }
    return result;
  }, [orders, posDailyRevenue, toLocalDateKey]);

  const last7DaysOrders = React.useMemo(() => {
    const result: number[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = toLocalDateKey(d);
      const count = (orders || [])
        .filter((o) => o.status !== 'Cancelled' && toLocalDateKey(new Date(o.date)) === key)
        .length;
      result.push(count);
    }
    return result;
  }, [orders, toLocalDateKey]);

  // ─── Sales Trend chart data ────────────────────────────────────────────

  const salesTrendData = React.useMemo(() => {
    // For "Today" + "Daily", show hourly breakdown
    if (kpiRange === 'today' && salesTrendPeriod === 'daily') {
      const hourlyBuckets: { label: string; revenue: number; key: string }[] = [];
      const today = new Date();
      const todayKey = toLocalDateKey(today);
      
      // Get all orders and POS sales for today
      const todayOrdersData = (orders || []).filter((o) => {
        if (o.status === 'Cancelled') return false;
        return toLocalDateKey(new Date(o.date)) === todayKey;
      });
      
      // Create 24 hourly buckets
      for (let hour = 0; hour < 24; hour++) {
        const hourRevenue = todayOrdersData
          .filter((o) => new Date(o.date).getHours() === hour)
          .reduce((s, o) => s + (o.total || 0), 0);
        
        // For POS revenue, we only have daily totals, so distribute evenly across hours with sales
        // or show all POS revenue in current hour if it's today
        const isPastHour = hour <= today.getHours();
        const posContribution = isPastHour ? (posDailyRevenue[todayKey] || 0) / (today.getHours() + 1) : 0;
        
        hourlyBuckets.push({
          label: `${hour.toString().padStart(2, '0')}:00`,
          revenue: hourRevenue + posContribution,
          key: `${todayKey}-${hour}`,
        });
      }
      
      return hourlyBuckets;
    }
    
    // For weekly/monthly views, use broader date ranges to show meaningful trends
    const trendRangeDays = salesTrendPeriod === 'daily' ? rangeDays : 
                          salesTrendPeriod === 'weekly' ? 42 : // 6 weeks
                          180; // ~6 months for monthly view
    
    const trendRangeStart = salesTrendPeriod === 'daily' ? rangeStart :
                            new Date(new Date().setDate(new Date().getDate() - trendRangeDays + 1));

    if (salesTrendPeriod === 'daily') {
      const buckets: { label: string; revenue: number; key: string }[] = [];
      for (let i = 0; i < trendRangeDays; i++) {
        const d = new Date(trendRangeStart);
        d.setDate(d.getDate() + i);
        const key = toLocalDateKey(d);
        const orderRev = (orders || [])
          .filter((o) => {
            if (o.status === 'Cancelled') return false;
            const od = new Date(o.date);
            return toLocalDateKey(od) === key;
          })
          .reduce((s, o) => s + (o.total || 0), 0);
        buckets.push({
          label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          revenue: orderRev + (posDailyRevenue[key] || 0),
          key,
        });
      }
      return buckets;
    }

    if (salesTrendPeriod === 'weekly') {
      const weeks: Record<string, number> = {};
      for (let i = 0; i < trendRangeDays; i++) {
        const d = new Date(trendRangeStart);
        d.setDate(d.getDate() + i);
        const weekStart = new Date(d);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        const wk = toLocalDateKey(weekStart);
        const key = toLocalDateKey(d);
        const orderRev = (orders || [])
          .filter((o) => o.status !== 'Cancelled' && toLocalDateKey(new Date(o.date)) === key)
          .reduce((s, o) => s + (o.total || 0), 0);
        weeks[wk] = (weeks[wk] || 0) + orderRev + (posDailyRevenue[key] || 0);
      }
      return Object.entries(weeks).map(([wk, rev]) => ({
        label: `Wk ${new Date(wk).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
        revenue: rev,
        key: wk,
      }));
    }

    // monthly
    const months: Record<string, number> = {};
    for (let i = 0; i < trendRangeDays; i++) {
      const d = new Date(trendRangeStart);
      d.setDate(d.getDate() + i);
      const mk = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const key = toLocalDateKey(d);
      const orderRev = (orders || [])
        .filter((o) => o.status !== 'Cancelled' && toLocalDateKey(new Date(o.date)) === key)
        .reduce((s, o) => s + (o.total || 0), 0);
      months[mk] = (months[mk] || 0) + orderRev + (posDailyRevenue[key] || 0);
    }
    return Object.entries(months).map(([mk, rev]) => {
      const [y, m] = mk.split('-');
      return {
        label: new Date(Number(y), Number(m) - 1).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        revenue: rev,
        key: mk,
      };
    });
  }, [orders, posDailyRevenue, rangeStart, rangeDays, salesTrendPeriod, kpiRange, toLocalDateKey]);

  // ─── Revenue vs Expenses (bar chart) ──────────────────────────────────

  const revenueVsExpenses = React.useMemo(() => {
    const result: { label: string; revenue: number; expenses: number }[] = [];
    for (let i = 0; i < rangeDays; i++) {
      const d = new Date(rangeStart);
      d.setDate(d.getDate() + i);
      const key = toLocalDateKey(d);
      const dayOrders = (orders || []).filter(
        (o) => o.status !== 'Cancelled' && toLocalDateKey(new Date(o.date)) === key
      );
      const revenue = dayOrders.reduce((s, o) => s + (o.total || 0), 0) + (posDailyRevenue[key] || 0);
      // Estimate expenses as ~40% of revenue (placeholder until real expense data is integrated)
      const expenses = Math.round(revenue * 0.4);
      if (i % Math.max(1, Math.floor(rangeDays / 7)) === 0 || rangeDays <= 7) {
        result.push({
          label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          revenue,
          expenses,
        });
      }
    }
    return result;
  }, [orders, posDailyRevenue, rangeDays, rangeStart, toLocalDateKey]);

  // ─── Top Products (horizontal bar) ────────────────────────────────────

  const topProducts = React.useMemo(() => {
    return (posTopSelling || []).slice(0, 8).map((x: any) => {
      const id = String(x?._id || '');
      const product = (menu || []).find((m: any) => String(m.id) === id);
      return {
        id,
        name: product?.name || id.slice(-6) || 'Product',
        revenue: Number(x?.revenue) || 0,
        sold: Number(x?.sold) || 0,
      };
    });
  }, [posTopSelling, menu]);

  // ─── Status color helper ──────────────────────────────────────────────

  const statusColor = (status: string) => {
    const map: Record<string, string> = {
      Pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      Preparing: 'bg-blue-100 text-blue-800 border-blue-200',
      OnRoute: 'bg-purple-100 text-purple-800 border-purple-200',
      Delivered: 'bg-green-100 text-green-800 border-green-200',
      Cancelled: 'bg-red-100 text-red-800 border-red-200',
    };
    return map[status] || 'bg-gray-100 text-gray-800';
  };

  // ─── Render ───────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Range selector */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4 text-muted-foreground animate-spin" style={{ animationDuration: '8s' }} />
          <span className="text-xs text-muted-foreground">
            Auto-refresh in {Math.floor(autoRefreshCountdown / 60)}:{String(autoRefreshCountdown % 60).padStart(2, '0')}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant={kpiRange === 'today' ? 'default' : 'outline'} size="sm" onClick={() => setKpiRange('today')}>Today</Button>
          <Button variant={kpiRange === '7d' ? 'default' : 'outline'} size="sm" onClick={() => setKpiRange('7d')}>7d</Button>
          <Button variant={kpiRange === '30d' ? 'default' : 'outline'} size="sm" onClick={() => setKpiRange('30d')}>30d</Button>
          <Button variant={kpiRange === 'custom' ? 'default' : 'outline'} size="sm" onClick={() => setKpiRange('custom')}>Custom</Button>
          {kpiRange === 'custom' && (
            <div className="flex flex-wrap gap-2">
              <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="h-9 w-[140px] rounded-md border px-2 text-sm" />
              <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="h-9 w-[140px] rounded-md border px-2 text-sm" />
            </div>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          KPI STRIP
          ═══════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Revenue Today */}
        <Card
          className="border shadow-sm hover:shadow-md transition-all cursor-pointer group"
          onClick={() => setActiveTab('accounting')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground">Revenue Today</CardTitle>
            <DollarSign className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent className="pb-3">
            <div className="text-xl font-bold">{formatPriceKSHS(todayRevenue)}</div>
            <div className="flex items-center justify-between mt-1">
              <div className={`flex items-center gap-1 text-xs font-medium ${revenueVsYesterday >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {revenueVsYesterday >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                {revenueVsYesterday >= 0 ? '+' : ''}{revenueVsYesterday.toFixed(1)}%
              </div>
              <MiniSparkline data={last7DaysRevenue} color="#10b981" />
            </div>
            <p className="text-[10px] text-muted-foreground mt-1 opacity-0 group-hover:opacity-100 transition-opacity">Click for financial report</p>
          </CardContent>
        </Card>

        {/* Orders Today */}
        <Card
          className="border shadow-sm hover:shadow-md transition-all cursor-pointer group"
          onClick={() => setActiveTab('orders')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground">Orders Today</CardTitle>
            <ShoppingBag className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent className="pb-3">
            <div className="text-xl font-bold">{todayOrders.length + posTodayCount}</div>
            <div className="flex items-center justify-between mt-1">
              <div className={`flex items-center gap-1 text-xs font-medium ${ordersVsYesterday >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {ordersVsYesterday >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                {ordersVsYesterday >= 0 ? '+' : ''}{ordersVsYesterday.toFixed(1)}%
              </div>
              <MiniSparkline data={last7DaysOrders} color="#3b82f6" />
            </div>
            <p className="text-[10px] text-muted-foreground mt-1 opacity-0 group-hover:opacity-100 transition-opacity">Click to view orders</p>
          </CardContent>
        </Card>

        {/* Net Profit */}
        <Card className="border shadow-sm hover:shadow-md transition-all cursor-pointer" onClick={() => setActiveTab('accounting')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground">Net Profit</CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent className="pb-3">
            <div className="text-xl font-bold text-emerald-600">
              {formatPriceKSHS(Math.round(totalRevenue * 0.6))}
            </div>
            <div className="flex items-center gap-1 mt-1">
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">~60% margin</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Expenses */}
        <Card className="border shadow-sm hover:shadow-md transition-all cursor-pointer" onClick={() => setActiveTab('accounting')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground">Expenses</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent className="pb-3">
            <div className="text-xl font-bold text-red-600">
              {formatPriceKSHS(Math.round(totalRevenue * 0.4))}
            </div>
            <div className="flex items-center gap-1 mt-1">
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">~40% of revenue</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Critical Alerts */}
        <Card className={`border shadow-sm hover:shadow-md transition-all cursor-pointer ${criticalAlerts > 0 ? 'border-red-200 bg-red-50/50' : 'border-green-200 bg-green-50/50'}`}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground">Critical Alerts</CardTitle>
            <AlertTriangle className={`h-4 w-4 ${criticalAlerts > 0 ? 'text-red-500 animate-pulse' : 'text-green-500'}`} />
          </CardHeader>
          <CardContent className="pb-3">
            <div className={`text-xl font-bold ${criticalAlerts > 0 ? 'text-red-700' : 'text-green-700'}`}>
              {criticalAlerts}
            </div>
            <div className="flex items-center gap-1 mt-1">
              {criticalAlerts > 0 ? (
                <span className="text-xs text-red-600">Needs attention</span>
              ) : (
                <span className="text-xs text-green-600">All systems normal</span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Range Revenue Summary */}
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="gap-1.5">
          <DollarSign className="h-3 w-3" />
          Range Total: {formatPriceKSHS(currentRangeRevenue)}
          <span className={`font-semibold ${revenueDeltaPct >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            ({revenueDeltaPct >= 0 ? '+' : ''}{revenueDeltaPct.toFixed(1)}%)
          </span>
        </Badge>
        <Badge variant="outline" className="gap-1.5">
          <Activity className="h-3 w-3" />
          Active: {activeOrders.length}
        </Badge>
        <Badge variant="outline" className="gap-1.5">
          <Users className="h-3 w-3" />
          Users: {allUsers.length}
        </Badge>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          ANALYTICS ZONE
          ═══════════════════════════════════════════════════════════════════ */}
      <div className="space-y-6">
        {/* Sales Trend */}
        <Card className="border shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Sales Trend</CardTitle>
                <CardDescription>Revenue over time</CardDescription>
              </div>
              <div className="flex gap-1">
                {(['daily', 'weekly', 'monthly'] as const).map((p) => (
                  <Button
                    key={p}
                    variant={salesTrendPeriod === p ? 'default' : 'ghost'}
                    size="sm"
                    className="h-7 px-2.5 text-xs capitalize"
                    onClick={() => setSalesTrendPeriod(p)}
                  >
                    {p}
                  </Button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div 
              ref={chartScrollRef}
              className={`overflow-x-auto -mx-4 px-4 ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
              onMouseDown={handleChartMouseDown}
              onMouseMove={handleChartMouseMove}
              style={{ userSelect: 'none' }}
            >
              <div style={{ minWidth: Math.max(100, salesTrendData.length * 60) + 'px' }}>
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={salesTrendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="label" fontSize={11} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis fontSize={11} tick={{ fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip
                      formatter={(value: number) => [formatPriceKSHS(value), 'Revenue']}
                      contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
                    />
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2.5}
                      dot={{ r: 3, fill: 'hsl(var(--primary))' }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue vs Expenses */}
          <Card className="border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Revenue vs Expenses</CardTitle>
              <CardDescription>Comparison over the selected range</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={revenueVsExpenses}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" fontSize={11} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis fontSize={11} tick={{ fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    formatter={(value: number, name: string) => [formatPriceKSHS(value), name === 'revenue' ? 'Revenue' : 'Expenses']}
                    contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
                  />
                  <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} name="Revenue" />
                  <Bar dataKey="expenses" fill="#ef4444" radius={[4, 4, 0, 0]} name="Expenses" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Top Products (Horizontal Bar) */}
          <Card className="border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Top Products</CardTitle>
              <CardDescription>Best sellers by revenue</CardDescription>
            </CardHeader>
            <CardContent>
              {topProducts.length === 0 ? (
                <div className="flex items-center justify-center h-[260px] text-sm text-muted-foreground">
                  <Package className="h-5 w-5 mr-2 opacity-50" />
                  No sales data yet
                </div>
              ) : (
                <div className="space-y-3">
                  {topProducts.map((product, idx) => {
                    const maxRev = topProducts[0]?.revenue || 1;
                    const pct = Math.round((product.revenue / maxRev) * 100);
                    return (
                      <button
                        key={product.id}
                        className="w-full text-left group hover:bg-muted/30 rounded-lg p-2 -mx-2 transition-colors"
                        onClick={() => setActiveTab('menu')}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium truncate flex-1">
                            <span className="text-muted-foreground mr-1.5">#{idx + 1}</span>
                            {product.name}
                          </span>
                          <span className="text-sm font-mono font-semibold ml-2">{formatPriceKSHS(product.revenue)}</span>
                          <ExternalLink className="h-3 w-3 ml-1.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary/70 rounded-full transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">{product.sold} sold</div>
                      </button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          OPERATIONS PANEL
          ═══════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Orders */}
        <Card className="border shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Recent Orders</CardTitle>
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setActiveTab('orders')}>
                View All <ExternalLink className="h-3 w-3 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
              {(orders || []).slice(0, 10).map((order) => (
                <button
                  key={order.id}
                  className="w-full text-left rounded-lg border px-3 py-2.5 hover:bg-muted/30 transition-colors"
                  onClick={() => onOrderClick?.(order)}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-mono font-medium">#{String(order.id).slice(-6)}</span>
                    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${statusColor(order.status)}`}>
                      {order.status}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-muted-foreground truncate">{order.user}</span>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
                      <Clock className="h-3 w-3" />
                      {new Date(order.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  <div className="text-xs font-medium mt-0.5">{formatPriceKSHS(order.total)}</div>
                </button>
              ))}
              {(!orders || orders.length === 0) && (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  <ShoppingBag className="h-8 w-8 mx-auto mb-2 opacity-20" />
                  No orders yet
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Staff Activity */}
        <Card className="border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Staff Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
              {activity.filter((a) => a.tone === 'success' || a.tone === 'info').slice(0, 12).map((a) => (
                <div
                  key={a.id}
                  className="flex items-start gap-3 rounded-lg border px-3 py-2.5 cursor-pointer hover:bg-muted/30 transition-colors"
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    if (a.tab) setActiveTab(a.tab);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && a.tab) setActiveTab(a.tab);
                  }}
                >
                  <div className={`mt-0.5 h-2 w-2 rounded-full shrink-0 ${
                    a.tone === 'success' ? 'bg-emerald-500' :
                    a.tone === 'warning' ? 'bg-amber-500' : 'bg-blue-500'
                  }`} />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{a.label}</div>
                    {a.meta && <div className="text-xs text-muted-foreground">{a.meta}</div>}
                  </div>
                  <div className="text-[10px] text-muted-foreground shrink-0">
                    {new Date(a.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              ))}
              {activity.length === 0 && (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-20" />
                  No staff activity yet
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Notifications Feed */}
        <Card className="border shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Notifications</CardTitle>
              <Bell className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
              {activity.slice(0, 15).map((a) => (
                <div
                  key={a.id}
                  className="flex items-start gap-3 rounded-lg px-3 py-2.5 bg-muted/20 hover:bg-muted/40 transition-colors cursor-pointer"
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    if (a.tab) setActiveTab(a.tab);
                    if (a.tab === 'orders' && a.orderId) {
                      const o = orders.find((x) => String(x.id) === String(a.orderId));
                      if (o) onOrderClick?.(o);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && a.tab) setActiveTab(a.tab);
                  }}
                >
                  <div className={`mt-1 p-1 rounded-full shrink-0 ${
                    a.tone === 'success' ? 'bg-emerald-100 text-emerald-600' :
                    a.tone === 'warning' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'
                  }`}>
                    {a.tone === 'success' ? <TrendingUp className="h-3 w-3" /> :
                     a.tone === 'warning' ? <AlertTriangle className="h-3 w-3" /> :
                     <Bell className="h-3 w-3" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium">{a.label}</div>
                    {a.meta && <div className="text-xs text-muted-foreground">{a.meta}</div>}
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      {new Date(a.ts).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))}
              {activity.length === 0 && (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  <Bell className="h-8 w-8 mx-auto mb-2 opacity-20" />
                  No notifications yet
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
