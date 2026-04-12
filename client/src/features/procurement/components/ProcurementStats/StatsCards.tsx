import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ClipboardList, Truck, Package, DollarSign, Clock } from 'lucide-react';
import { formatPriceKSHS } from '@/lib/format';

interface StatsCardsProps {
  requests?: any[];
  orders?: any[];
}

export const StatsCards: React.FC<StatsCardsProps> = ({ requests = [], orders = [] }) => {
  const pendingRequests = requests.filter(r => r.status === 'PENDING').length;
  const pendingOrders = orders.filter(o => o.status === 'DRAFT' || o.status === 'SENT').length;
  const awaitingDelivery = orders.filter(o => o.status === 'CONFIRMED' || o.status === 'SHIPPED').length;
  const totalSpendThisMonth = React.useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    return orders
      .filter(o => new Date(o.orderDate) >= startOfMonth)
      .reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  }, [orders]);

  const avgLeadTime = React.useMemo(() => {
    const delivered = orders.filter(o => o.status === 'DELIVERED' && o.orderDate && o.expectedDeliveryDate);
    if (delivered.length === 0) return 'N/A';
    const totalDays = delivered.reduce((sum, o) => {
      const orderDate = new Date(o.orderDate);
      const deliveryDate = new Date(o.expectedDeliveryDate);
      return sum + (deliveryDate.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24);
    }, 0);
    return `${Math.round(totalDays / delivered.length)} days`;
  }, [orders]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
          <ClipboardList className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{pendingRequests}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
          <Truck className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{pendingOrders}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Awaiting Delivery</CardTitle>
          <Package className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{awaitingDelivery}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Month Spend</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatPriceKSHS(totalSpendThisMonth)}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Avg Lead Time</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{avgLeadTime}</div>
        </CardContent>
      </Card>
    </div>
  );
};