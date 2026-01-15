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
  day: string;
  orders: number;
  revenue: number;
}

interface AnimatedChartsProps {
  posTotalRevenue?: number;
}

const AnimatedCharts: React.FC<AnimatedChartsProps> = ({ posTotalRevenue = 0 }) => {
  const { orders, kpis } = useData();
  const [animatedValues, setAnimatedValues] = useState<{ [key: string]: number }>({});
  const [localPosRevenue, setLocalPosRevenue] = useState(0);
  const [trendsData, setTrendsData] = useState<any>(null);

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

    const fetchTrendsData = async () => {
      try {
        const response = await apiFetch('/api/pos/reports/trends-comparison');
        if (response.ok) {
          const data = await response.json();
          setTrendsData(data);
        }
      } catch (error) {
        console.error('Failed to fetch trends comparison:', error);
      }
    };

    fetchPOSTotal();
    fetchTrendsData();
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

      const fetchTrendsData = async () => {
        try {
          const response = await apiFetch('/api/pos/reports/trends-comparison');
          if (response.ok) {
            const data = await response.json();
            setTrendsData(data);
          }
        } catch (error) {
          console.error('Failed to fetch trends comparison:', error);
        }
      };

      fetchPOSTotal();
      fetchTrendsData();
    }, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Animate counter values
  useEffect(() => {
    const orderRevenue = orders.reduce((sum, o) => sum + o.total, 0);
    const posRevenueToUse = posTotalRevenue || localPosRevenue;
    const totalRevenue = (kpis?.totalRevenue && kpis.totalRevenue > 0)
      ? kpis.totalRevenue
      : (orderRevenue + posRevenueToUse);
    
    const targets = {
      totalRevenue,
      activeOrders: kpis?.activeOrders ?? orders.filter(o => o.status !== 'Delivered').length,
      totalOrders: orders.length,
      avgOrderValue: orders.length > 0 ? Math.round(orderRevenue / orders.length) : 0
    };

    const timers: number[] = [];

    Object.entries(targets).forEach(([key, target]) => {
      let current = animatedValues[key] || 0;
      const safeTarget = Number.isFinite(target) ? target : 0;
      const increment = safeTarget <= 0 ? 0 : safeTarget / 50;
      const timer = window.setInterval(() => {
        current += increment;
        if (current >= target) {
          current = target;
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
  }, [orders, kpis, posTotalRevenue, localPosRevenue]);

  const orderTrends: OrderTrend[] = useMemo(() => {
    const buckets: Record<string, { orders: number; revenue: number }> = {};
    const now = new Date();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - 29);

    for (let i = 0; i < 30; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      buckets[key] = { orders: 0, revenue: 0 };
    }

    (orders || []).forEach((o: any) => {
      if (o?.status === 'Cancelled') return;
      const d = new Date(o?.date);
      if (isNaN(d.getTime())) return;
      d.setHours(0, 0, 0, 0);
      const key = d.toISOString().slice(0, 10);
      if (!buckets[key]) return;
      buckets[key].orders += 1;
      buckets[key].revenue += o?.total || 0;
    });

    return Object.entries(buckets).map(([iso, v]) => {
      const d = new Date(iso);
      const day = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      return { day, orders: v.orders, revenue: v.revenue };
    });
  }, [orders]);

  const hasTrendData = useMemo(() => {
    return orderTrends.some((d) => d.orders > 0 || d.revenue > 0);
  }, [orderTrends]);

  const kpiItems = useMemo(() => {
    const revenueDelta = Number(trendsData?.percentages?.revenue || 0);
    const ordersDelta = Number(trendsData?.percentages?.orders || 0);
    const aovDelta = Number(trendsData?.percentages?.avgOrderValue || 0);

    return [
      {
        key: 'totalRevenue',
        label: 'Total revenue',
        value: formatPriceKSHS(animatedValues.totalRevenue || 0),
        delta: revenueDelta,
      },
      {
        key: 'activeOrders',
        label: 'Active orders',
        value: (animatedValues.activeOrders || 0).toLocaleString(),
        delta: ordersDelta,
      },
      {
        key: 'totalOrders',
        label: 'Total orders',
        value: (animatedValues.totalOrders || 0).toLocaleString(),
        delta: ordersDelta,
      },
      {
        key: 'avgOrderValue',
        label: 'Avg order value',
        value: formatPriceKSHS(animatedValues.avgOrderValue || 0),
        delta: aovDelta,
      },
    ];
  }, [animatedValues, trendsData]);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-semibold text-foreground">Analytics</h2>
        <p className="text-sm text-muted-foreground">Trends and KPIs for the last 30 days (orders data).</p>
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
                No order activity in the last 30 days.
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card className="border shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Revenue trend</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  className="h-64 w-full"
                  config={{
                    revenue: { label: 'Revenue', color: 'hsl(var(--primary))' },
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
                          nameKey="revenue"
                          formatter={(value) => (
                            <div className="flex w-full items-center justify-between gap-6">
                              <span className="text-muted-foreground">Revenue</span>
                              <span className="font-mono font-medium tabular-nums">{formatPriceKSHS(Number(value) || 0)}</span>
                            </div>
                          )}
                        />
                      }
                    />
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      stroke="var(--color-revenue)"
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
                <CardTitle className="text-base font-semibold">Orders volume</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  className="h-64 w-full"
                  config={{
                    orders: { label: 'Orders', color: 'hsl(var(--secondary))' },
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
                          nameKey="orders"
                          formatter={(value) => (
                            <div className="flex w-full items-center justify-between gap-6">
                              <span className="text-muted-foreground">Orders</span>
                              <span className="font-mono font-medium tabular-nums">{Number(value || 0).toLocaleString()}</span>
                            </div>
                          )}
                        />
                      }
                    />
                    <Bar dataKey="orders" fill="var(--color-orders)" radius={[4, 4, 0, 0]} />
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
