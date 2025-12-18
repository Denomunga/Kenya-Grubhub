import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, DollarSign, ShoppingBag, Users, BarChart3 } from 'lucide-react';
import { useData } from '@/lib/data';

interface ChartData {
  label: string;
  value: number;
  trend: 'up' | 'down';
  percentage: number;
}

interface OrderTrend {
  date: string;
  orders: number;
  revenue: number;
}

const AnimatedCharts: React.FC = () => {
  const { orders, kpis } = useData();
  const [animatedValues, setAnimatedValues] = useState<{ [key: string]: number }>({});
  const [orderTrends, setOrderTrends] = useState<OrderTrend[]>([]);

  // Generate mock trend data
  useEffect(() => {
    const trends: OrderTrend[] = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      trends.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        orders: Math.floor(Math.random() * 50) + 10,
        revenue: Math.floor(Math.random() * 50000) + 10000
      });
    }
    setOrderTrends(trends);
  }, [orders]);

  // Animate counter values
  useEffect(() => {
    const targets = {
      totalRevenue: kpis?.totalRevenue ?? orders.reduce((sum, o) => sum + o.total, 0),
      activeOrders: kpis?.activeOrders ?? orders.filter(o => o.status !== 'Delivered').length,
      totalOrders: orders.length,
      avgOrderValue: orders.length > 0 ? Math.round(orders.reduce((sum, o) => sum + o.total, 0) / orders.length) : 0
    };

    Object.entries(targets).forEach(([key, target]) => {
      let current = animatedValues[key] || 0;
      const increment = target / 50;
      const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
          current = target;
          clearInterval(timer);
        }
        setAnimatedValues(prev => ({ ...prev, [key]: Math.floor(current) }));
      }, 20);
    });
  }, [orders, kpis]);

  const chartData: ChartData[] = [
    {
      label: 'Total Revenue',
      value: animatedValues.totalRevenue || 0,
      trend: 'up',
      percentage: 23.5
    },
    {
      label: 'Active Orders',
      value: animatedValues.activeOrders || 0,
      trend: 'up',
      percentage: 12.3
    },
    {
      label: 'Total Orders',
      value: animatedValues.totalOrders || 0,
      trend: 'down',
      percentage: 5.2
    },
    {
      label: 'Avg Order Value',
      value: animatedValues.avgOrderValue || 0,
      trend: 'up',
      percentage: 8.7
    }
  ];

  const maxRevenue = Math.max(...orderTrends.map(t => t.revenue));
  const maxOrders = Math.max(...orderTrends.map(t => t.orders));

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-holographic mb-2">Live Analytics Dashboard</h2>
        <p className="text-muted-foreground">Real-time business insights with animated visualizations</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {chartData.map((data, index) => (
          <Card 
            key={data.label} 
            className="card-3d border-animated-gradient depth-layer-3 hover-lift liquid-transition-slow"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{data.label}</CardTitle>
              <div className="p-2 rounded-full bg-primary/10">
                {data.label.includes('Revenue') && <DollarSign className="h-4 w-4 text-primary" />}
                {data.label.includes('Orders') && <ShoppingBag className="h-4 w-4 text-primary" />}
                {data.label.includes('Value') && <BarChart3 className="h-4 w-4 text-primary" />}
                {!data.label.includes('Revenue') && !data.label.includes('Orders') && !data.label.includes('Value') && <Users className="h-4 w-4 text-primary" />}
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gradient">
                {data.value.toLocaleString()} KSHS
              </div>
              <div className="flex items-center gap-2 mt-2">
                {data.trend === 'up' ? (
                  <TrendingUp className="h-4 w-4 text-green-500" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-500" />
                )}
                <Badge 
                  variant={data.trend === 'up' ? 'default' : 'destructive'}
                  className="text-xs"
                >
                  {data.trend === 'up' ? '+' : '-'}{data.percentage}%
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Order Trends Chart */}
      <Card className="border-animated-gradient depth-layer-4">
        <CardHeader>
          <CardTitle className="text-holographic">30-Day Order Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Revenue Chart */}
            <div>
              <h4 className="text-sm font-medium mb-3 text-muted-foreground">Revenue Trend</h4>
              <div className="relative h-32">
                <div className="absolute inset-0 flex items-end justify-between gap-1">
                  {orderTrends.map((trend, index) => (
                    <div
                      key={`revenue-${index}`}
                      className="flex-1 bg-linear-to-t from-primary to-primary/50 rounded-t-sm animate-slide-in-up liquid-transition"
                      style={{
                        height: `${(trend.revenue / maxRevenue) * 100}%`,
                        animationDelay: `${index * 50}ms`
                      }}
                      title={`${trend.date}: ${trend.revenue.toLocaleString()} KSHS`}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Order Volume Chart */}
            <div>
              <h4 className="text-sm font-medium mb-3 text-muted-foreground">Order Volume</h4>
              <div className="relative h-32">
                <div className="absolute inset-0 flex items-end justify-between gap-1">
                  {orderTrends.map((trend, index) => (
                    <div
                      key={`orders-${index}`}
                      className="flex-1 bg-linear-to-t from-secondary to-secondary/50 rounded-t-sm animate-slide-in-up liquid-transition"
                      style={{
                        height: `${(trend.orders / maxOrders) * 100}%`,
                        animationDelay: `${index * 50}ms`
                      }}
                      title={`${trend.date}: ${trend.orders} orders`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="flex justify-center gap-6 mt-6">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-primary rounded-sm"></div>
              <span className="text-xs text-muted-foreground">Revenue</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-secondary rounded-sm"></div>
              <span className="text-xs text-muted-foreground">Orders</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Heat Map - Popular Items */}
      <Card className="border-animated-gradient depth-layer-4">
        <CardHeader>
          <CardTitle className="text-holographic">Popular Menu Items Heat Map</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
            {Array.from({ length: 32 }, (_, i) => {
              const intensity = Math.random();
              return (
                <div
                  key={i}
                  className="aspect-square rounded-sm animate-bounce-in liquid-transition"
                  style={{
                    backgroundColor: `hsl(var(--primary) / ${intensity})`,
                    animationDelay: `${i * 30}ms`
                  }}
                  title={`Item ${i + 1}: ${Math.round(intensity * 100)} orders`}
                />
              );
            })}
          </div>
          <div className="flex justify-between items-center mt-4">
            <span className="text-xs text-muted-foreground">Less Popular</span>
            <span className="text-xs text-muted-foreground">Most Popular</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AnimatedCharts;
