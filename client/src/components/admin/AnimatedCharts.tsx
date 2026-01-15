import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingDown, TrendingUp } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { useData } from '@/lib/data';
import { apiFetch } from '@/lib/api';
import { formatPriceKSHS } from '@/lib/format';

interface OrderTrend {
  iso: string;
  day: string;
  ordersOnline: number;
  revenueOnline: number;
  ordersPos: number;
  revenuePos: number;
  ordersTotal: number;
  revenueTotal: number;
}

interface AnimatedChartsProps {
  posTotalRevenue?: number;
}

const AnimatedCharts: React.FC<AnimatedChartsProps> = ({ posTotalRevenue = 0 }) => {
  const { orders, kpis } = useData();
  const [animatedValues, setAnimatedValues] = useState<{ [key: string]: number }>({});
  const [localPosRevenue, setLocalPosRevenue] = useState(0);
  const [posTrends, setPosTrends] = useState<any>(null);

  // Fetch POS total revenue (all-time) for accurate total calculation
  useEffect(() => {
    const fetchPOSTotal = async () => {
      try {
        const response = await apiFetch('/api/pos/sales/total');
        if (response.ok) {
          const data = await response.json();
          setLocalPosRevenue(data.totalRevenue || 0);
        }
      } catch (error) {
        console.error('Failed to fetch POS total revenue:', error);
      }
    };

    const fetchPosDailyTrends = async () => {
      try {
        const response = await apiFetch('/api/pos/reports/trends?days=30');
        if (response.ok) {
          const data = await response.json();
          setPosTrends(data);
        }
      } catch (error) {
        console.error('Failed to fetch POS trends:', error);
      }
    };

    fetchPOSTotal();
    fetchPosDailyTrends();
  }, []);

  // Refresh every 2 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      const fetchPOSTotal = async () => {
        try {
          const response = await apiFetch('/api/pos/sales/total');
          if (response.ok) {
            const data = await response.json();
            setLocalPosRevenue(data.totalRevenue || 0);
          }
        } catch (error) {
          console.error('Failed to fetch POS total revenue:', error);
        }
      };

      const fetchPosDailyTrends = async () => {
        try {
          const response = await apiFetch('/api/pos/reports/trends?days=30');
          if (response.ok) {
            const data = await response.json();
            setPosTrends(data);
          }
        } catch (error) {
          console.error('Failed to fetch POS trends:', error);
        }
      };

      fetchPOSTotal();
      fetchPosDailyTrends();
    }, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  function calculatePercentage(current: number, previous: number) {
    if (!Number.isFinite(current) || !Number.isFinite(previous)) return 0;
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  }

  const orderTrends: OrderTrend[] = useMemo(() => {
    const onlineBuckets: Record<string, { orders: number; revenue: number }> = {};
    const now = new Date();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - 29);

    for (let i = 0; i < 30; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      onlineBuckets[key] = { orders: 0, revenue: 0 };
    }

    (orders || []).forEach((o: any) => {
      if (o?.status === 'Cancelled') return;
      const d = new Date(o?.date);
      if (isNaN(d.getTime())) return;
      d.setHours(0, 0, 0, 0);
      const key = d.toISOString().slice(0, 10);
      if (!onlineBuckets[key]) return;
      onlineBuckets[key].orders += 1;
      onlineBuckets[key].revenue += o?.total || 0;
    });

    const posBuckets: Record<string, { orders: number; revenue: number }> = {};
    for (let i = 0; i < 30; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      posBuckets[key] = { orders: 0, revenue: 0 };
    }

    const dailySales = Array.isArray(posTrends?.dailySales) ? posTrends.dailySales : [];
    dailySales.forEach((row: any) => {
      const key = String(row?._id || '');
      if (!key || !(key in posBuckets)) return;
      posBuckets[key].orders = Number(row?.count || 0);
      posBuckets[key].revenue = Number(row?.total || 0);
    });

    return Object.entries(onlineBuckets).map(([iso, v]) => {
      const d = new Date(iso);
      const day = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const pos = posBuckets[iso] || { orders: 0, revenue: 0 };
      const ordersOnline = v.orders;
      const revenueOnline = v.revenue;
      const ordersPos = pos.orders;
      const revenuePos = pos.revenue;
      return {
        iso,
        day,
        ordersOnline,
        revenueOnline,
        ordersPos,
        revenuePos,
        ordersTotal: ordersOnline + ordersPos,
        revenueTotal: revenueOnline + revenuePos,
      };
    });
  }, [orders, posTrends]);

  const periodMetrics = useMemo(() => {
    // Trend array is constructed oldest -> newest
    const last7 = orderTrends.slice(-7);
    const prev7 = orderTrends.slice(-14, -7);

    const sum = (rows: OrderTrend[]) => {
      return rows.reduce(
        (acc, r) => {
          acc.revenue += r.revenueTotal;
          acc.orders += r.ordersTotal;
          return acc;
        },
        { revenue: 0, orders: 0 }
      );
    };

    const current = sum(last7);
    const previous = sum(prev7);
    const avgOrderValueCurrent = current.orders > 0 ? current.revenue / current.orders : 0;
    const avgOrderValuePrevious = previous.orders > 0 ? previous.revenue / previous.orders : 0;

    return {
      current,
      previous,
      deltas: {
        revenue: calculatePercentage(current.revenue, previous.revenue),
        orders: calculatePercentage(current.orders, previous.orders),
        avgOrderValue: calculatePercentage(avgOrderValueCurrent, avgOrderValuePrevious),
      },
      avgOrderValueCurrent,
    };
  }, [orderTrends]);

  // Animate KPI values (based on last 7 days totals) + live active orders
  useEffect(() => {
    const targets = {
      revenue7d: periodMetrics.current.revenue,
      orders7d: periodMetrics.current.orders,
      avgOrderValue7d: periodMetrics.avgOrderValueCurrent,
      activeOrders: kpis?.activeOrders ?? orders.filter(o => o.status !== 'Delivered').length,
    };

    const timers: number[] = [];

    Object.entries(targets).forEach(([key, target]) => {
      let current = animatedValues[key] || 0;
      const safeTarget = Number.isFinite(target) ? target : 0;
      const increment = safeTarget <= 0 ? 0 : safeTarget / 50;
      const timer = window.setInterval(() => {
        current += increment;
        if (current >= safeTarget) {
          current = safeTarget;
          clearInterval(timer);
        }
        setAnimatedValues(prev => ({ ...prev, [key]: Math.floor(current) }));
      }, 20);

      timers.push(timer);
    });

    return () => {
      timers.forEach((t) => {
        try {
          clearInterval(t);
        } catch {
          // ignore
        }
      });
    };
  }, [orders, kpis, periodMetrics, posTotalRevenue, localPosRevenue]);

  const hasTrendData = useMemo(() => {
    return orderTrends.some((d) => d.ordersTotal > 0 || d.revenueTotal > 0);
  }, [orderTrends]);

  const kpiItems = useMemo(() => {
    return [
      {
        key: 'revenue7d',
        label: 'Revenue (7d)',
        value: formatPriceKSHS(animatedValues.revenue7d || 0),
        delta: periodMetrics.deltas.revenue,
      },
      {
        key: 'activeOrders',
        label: 'Active orders',
        value: (animatedValues.activeOrders || 0).toLocaleString(),
        delta: periodMetrics.deltas.orders,
      },
      {
        key: 'orders7d',
        label: 'Orders (7d)',
        value: (animatedValues.orders7d || 0).toLocaleString(),
        delta: periodMetrics.deltas.orders,
      },
      {
        key: 'avgOrderValue7d',
        label: 'Avg order value (7d)',
        value: formatPriceKSHS(animatedValues.avgOrderValue7d || 0),
        delta: periodMetrics.deltas.avgOrderValue,
      },
    ];
  }, [animatedValues, periodMetrics]);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-semibold text-foreground">Analytics</h2>
        <p className="text-sm text-muted-foreground">Trends and KPIs for the last 30 days (Online orders + POS).</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiItems.map((kpi) => {
          const delta = Number.isFinite(kpi.delta) ? kpi.delta : 0;
          const isUp = delta >= 0;
          return (
            <Card key={kpi.key} className="border shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{kpi.label}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold tabular-nums">{kpi.value}</div>
                <div className="mt-2 flex items-center gap-2">
                  {isUp ? (
                    <TrendingUp className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-rose-600" />
                  )}
                  <Badge variant={isUp ? 'secondary' : 'destructive'} className="text-xs">
                    {isUp ? '+' : '-'}{Math.abs(delta).toFixed(1)}%
                  </Badge>
                  <span className="text-xs text-muted-foreground">vs previous period</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {!hasTrendData ? (
          <Card className="border shadow-sm lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">
                No activity in the last 30 days.
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card className="border shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Revenue trend (Online + POS)</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  className="h-64 w-full"
                  config={{
                    revenueTotal: { label: 'Revenue', color: 'hsl(var(--primary))' },
                  }}
                >
                  <LineChart data={orderTrends} margin={{ left: 8, right: 8, top: 8, bottom: 0 }}>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="day" tickLine={false} axisLine={false} minTickGap={16} />
                    <YAxis tickLine={false} axisLine={false} width={56} tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`} />
                    <ChartTooltip
                      cursor={{ stroke: 'hsl(var(--border))' }}
                      content={
                        <ChartTooltipContent
                          nameKey="revenueTotal"
                          formatter={(value, _name, item) => {
                            const payload: any = item?.payload;
                            const online = Number(payload?.revenueOnline || 0);
                            const pos = Number(payload?.revenuePos || 0);
                            return (
                              <div className="grid gap-1">
                                <div className="flex w-full items-center justify-between gap-6">
                                  <span className="text-muted-foreground">Total</span>
                                  <span className="font-mono font-medium tabular-nums">{formatPriceKSHS(Number(value) || 0)}</span>
                                </div>
                                <div className="flex w-full items-center justify-between gap-6">
                                  <span className="text-muted-foreground">Online</span>
                                  <span className="font-mono tabular-nums">{formatPriceKSHS(online)}</span>
                                </div>
                                <div className="flex w-full items-center justify-between gap-6">
                                  <span className="text-muted-foreground">POS</span>
                                  <span className="font-mono tabular-nums">{formatPriceKSHS(pos)}</span>
                                </div>
                              </div>
                            );
                          }}
                        />
                      }
                    />
                    <Line
                      type="monotone"
                      dataKey="revenueTotal"
                      stroke="var(--color-revenueTotal)"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4 }}
                    />
                  </LineChart>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card className="border shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Orders volume (Online + POS)</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  className="h-64 w-full"
                  config={{
                    ordersTotal: { label: 'Orders', color: 'hsl(var(--secondary))' },
                  }}
                >
                  <BarChart data={orderTrends} margin={{ left: 8, right: 8, top: 8, bottom: 0 }}>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="day" tickLine={false} axisLine={false} minTickGap={16} />
                    <YAxis tickLine={false} axisLine={false} width={40} allowDecimals={false} />
                    <ChartTooltip
                      cursor={{ fill: 'hsl(var(--muted))' }}
                      content={
                        <ChartTooltipContent
                          nameKey="ordersTotal"
                          formatter={(value, _name, item) => {
                            const payload: any = item?.payload;
                            const online = Number(payload?.ordersOnline || 0);
                            const pos = Number(payload?.ordersPos || 0);
                            return (
                              <div className="grid gap-1">
                                <div className="flex w-full items-center justify-between gap-6">
                                  <span className="text-muted-foreground">Total</span>
                                  <span className="font-mono font-medium tabular-nums">{Number(value || 0).toLocaleString()}</span>
                                </div>
                                <div className="flex w-full items-center justify-between gap-6">
                                  <span className="text-muted-foreground">Online</span>
                                  <span className="font-mono tabular-nums">{online.toLocaleString()}</span>
                                </div>
                                <div className="flex w-full items-center justify-between gap-6">
                                  <span className="text-muted-foreground">POS</span>
                                  <span className="font-mono tabular-nums">{pos.toLocaleString()}</span>
                                </div>
                              </div>
                            );
                          }}
                        />
                      }
                    />
                    <Bar dataKey="ordersTotal" fill="var(--color-ordersTotal)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
};

export default AnimatedCharts;
