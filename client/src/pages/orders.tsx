import { useHybridAuth } from '@/lib/hybrid-auth';
import { useData } from '@/lib/data';
import { useOrderNotifications } from '@/hooks/useOrderNotifications';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatPriceKSHS } from '@/lib/format';
import { 
  ShoppingBag, 
  Clock, 
  CheckCircle, 
  Package, 
  Truck,
  XCircle,
  Bell,
  Check
} from 'lucide-react';

export default function OrdersPage() {
  const { user } = useHybridAuth();
  const { orders } = useData();
  const { notifications, markNotificationAsRead, clearNotifications } = useOrderNotifications();

  // Filter orders based on user role
  const userOrders = user?.role === 'user' 
    ? orders.filter(order => order.user === user.name)
    : orders; // Admin/staff see all orders

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'Preparing':
        return <Package className="h-4 w-4 text-blue-500" />;
      case 'Ready':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'Delivered':
        return <Truck className="h-4 w-4 text-green-600" />;
      case 'Cancelled':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pending':
        return 'bg-yellow-500/15 text-yellow-800 dark:text-yellow-200';
      case 'Preparing':
        return 'bg-blue-500/15 text-blue-800 dark:text-blue-200';
      case 'Ready':
        return 'bg-green-500/15 text-green-800 dark:text-green-200';
      case 'Delivered':
        return 'bg-green-500/15 text-green-800 dark:text-green-200';
      case 'Cancelled':
        return 'bg-red-500/15 text-red-800 dark:text-red-200';
      default:
        return 'bg-muted text-foreground';
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Order Updates</h1>
            <p className="text-muted-foreground">
              {user?.role === 'user' 
                ? 'Track your orders and stay updated on their status'
                : 'View and manage all customer orders'
              }
            </p>
          </div>
          
          {notifications.length > 0 && (
            <Button 
              onClick={clearNotifications}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Bell className="h-4 w-4" />
              Clear All Notifications
            </Button>
          )}
        </div>

        {/* Notifications Section */}
        {notifications.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Recent Notifications
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 rounded-lg border transition-colors ${
                      notification.read 
                        ? 'bg-muted/30 border-border' 
                        : 'bg-primary/10 border-primary/20'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {getStatusIcon(notification.status)}
                          <span className="font-medium">{notification.message}</span>
                          {!notification.read && (
                            <Badge variant="default" className="text-xs">
                              New
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">
                          Order #{notification.orderId}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {(() => {
                            const date = new Date(notification.timestamp);
                            const isValid = !isNaN(date.getTime());
                            return isValid ? date.toLocaleString() : 'Invalid time';
                          })()}
                        </p>
                      </div>
                      {!notification.read && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => markNotificationAsRead(notification.id)}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Orders Section */}
        <div className="grid gap-6">
          {userOrders.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <ShoppingBag className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  {user?.role === 'user' ? 'No orders yet' : 'No orders found'}
                </h3>
                <p className="text-muted-foreground">
                  {user?.role === 'user' 
                    ? 'Start shopping to see your orders here'
                    : 'Orders will appear here when customers place them'
                  }
                </p>
              </CardContent>
            </Card>
          ) : (
            userOrders.map((order) => (
              <Card key={order.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">
                        Order #{order.id}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {(() => {
                          const date = new Date(order.date);
                          const isValid = !isNaN(date.getTime());
                          return isValid ? date.toLocaleDateString() : 'Invalid date';
                        })()} • {order.user}
                        {user?.role !== 'user' && order.userPhone && (
                          <span className="ml-2 text-primary">📞 {order.userPhone}</span>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(order.status)}
                      <Badge className={getStatusColor(order.status)}>
                        {order.status}
                      </Badge>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {order.items.map((item, index) => (
                      <div key={index} className="flex items-center justify-between py-2 border-b last:border-b-0">
                        <div className="flex items-center gap-3">
                          {item.item.image && (
                            <img
                              src={item.item.image}
                              alt={item.item.name}
                              className="w-12 h-12 object-cover rounded"
                            />
                          )}
                          <div>
                            <p className="font-medium">{item.item.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {item.item.category}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">
                            {formatPriceKSHS(item.item.price)}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Qty: {item.quantity}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 pt-4 border-t">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Total Amount</p>
                        <p className="text-2xl font-bold text-foreground">
                          {formatPriceKSHS(order.total)}
                        </p>
                      </div>
                      {order.location && (
                        <div className="text-right text-sm text-muted-foreground">
                          <p>📍 {order.location.address}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
