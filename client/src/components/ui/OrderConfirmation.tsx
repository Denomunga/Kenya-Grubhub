import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  MapPin, 
  Clock, 
  CheckCircle, 
  Package, 
  ChefHat, 
  Truck,
  Phone,
  MessageSquare,
  Mail
} from 'lucide-react';

interface OrderLocation {
  address: string;
  latitude: number;
  longitude: number;
  placeId?: string;
  instructions?: string;
}

interface OrderItem {
  item: {
    id: string;
    name: string;
    price: number;
    image?: string;
  };
  quantity: number;
}

interface OrderConfirmationProps {
  order: {
    id: string;
    items: OrderItem[];
    total: number;
    status: string;
    user: string;
    userEmail?: string;
    userPhone?: string;
    date: string;
    location?: OrderLocation;
    eta?: string;
  };
  onClose?: () => void;
  onTrackOrder?: () => void;
  onContactSupport?: () => void;
}

export default function OrderConfirmation({ 
  order, 
  onClose, 
  onTrackOrder, 
  onContactSupport 
}: OrderConfirmationProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Pending': return <Clock className="h-4 w-4" />;
      case 'Preparing': return <ChefHat className="h-4 w-4" />;
      case 'Ready': return <Package className="h-4 w-4" />;
      case 'Delivered': return <CheckCircle className="h-4 w-4" />;
      default: return <Package className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Preparing': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Ready': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'Delivered': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getEstimatedTime = () => {
    if (order.eta) return order.eta;
    
    switch (order.status) {
      case 'Pending': return '30-45 minutes';
      case 'Preparing': return '20-30 minutes';
      case 'Ready': return '10-20 minutes';
      case 'Delivered': return 'Delivered';
      default: return 'Processing...';
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Success Header */}
      <Card className="border-green-200 bg-green-50">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <CardTitle className="text-2xl text-green-800">Order Confirmed!</CardTitle>
          <p className="text-green-700">
            Thank you for your order. We're preparing it with care.
          </p>
        </CardHeader>
      </Card>

      {/* Order Details */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Order Details
            </CardTitle>
            <Badge className={getStatusColor(order.status)}>
              <span className="flex items-center gap-1">
                {getStatusIcon(order.status)}
                {order.status}
              </span>
            </Badge>
          </div>
          <div className="text-sm text-muted-foreground">
            Order #{order.id.slice(-6)} • {new Date(order.date).toLocaleString()}
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Items */}
          <div>
            <h4 className="font-medium mb-3">Order Items</h4>
            <div className="space-y-2">
              {order.items.map((item, index) => (
                <div key={index} className="flex justify-between items-center py-2 border-b last:border-b-0">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
                      {item.item.image ? (
                        <img 
                          src={item.item.image} 
                          alt={item.item.name}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      ) : (
                        <Package className="h-6 w-6 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{item.item.name}</p>
                      <p className="text-sm text-muted-foreground">KSHS {item.item.price} each</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">x{item.quantity}</p>
                    <p className="font-medium">KSHS {item.item.price * item.quantity}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Total */}
          <div className="flex justify-between items-center text-lg font-bold">
            <span>Total Amount</span>
            <span className="text-primary">KSHS {order.total}</span>
          </div>
          <Separator />

          {/* Customer Information */}
          <div>
            <h4 className="font-medium mb-3">Customer Information</h4>
            <div className="bg-muted/50 p-3 rounded-lg space-y-2">
              <div className="flex items-center gap-2">
                <span className="font-medium">{order.user}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {order.userPhone && (
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => window.open(`tel:${order.userPhone}`, '_self')}
                  >
                    <Phone className="h-4 w-4 mr-1" />
                    {order.userPhone}
                  </Button>
                )}
                {order.userEmail && (
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => window.open(`mailto:${order.userEmail}`, '_blank')}
                  >
                    <Mail className="h-4 w-4 mr-1" />
                    Email
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Delivery Information */}
          {order.location && (
            <>
              <Separator />
              <div>
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <Truck className="h-4 w-4" />
                  Delivery Information
                </h4>
                <div className="bg-muted/50 p-3 rounded-lg space-y-2">
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <div>
                      <p className="font-medium text-sm">{order.location.address}</p>
                      {order.location.instructions && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Instructions: "{order.location.instructions}"
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-orange-500" />
                    <span className="font-medium">Estimated Time: {getEstimatedTime()}</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Order Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Order Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                ['Pending', 'Preparing', 'Ready', 'Delivered'].includes(order.status) 
                  ? 'bg-green-100 text-green-600' 
                  : 'bg-gray-100 text-gray-400'
              }`}>
                <CheckCircle className="h-4 w-4" />
              </div>
              <div>
                <p className="font-medium">Order Placed</p>
                <p className="text-sm text-muted-foreground">
                  {new Date(order.date).toLocaleString()}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                ['Preparing', 'Ready', 'Delivered'].includes(order.status) 
                  ? 'bg-blue-100 text-blue-600' 
                  : 'bg-gray-100 text-gray-400'
              }`}>
                <ChefHat className="h-4 w-4" />
              </div>
              <div>
                <p className="font-medium">Preparing</p>
                <p className="text-sm text-muted-foreground">
                  {['Preparing', 'Ready', 'Delivered'].includes(order.status) 
                    ? 'Your order is being prepared' 
                    : 'Waiting to start preparation'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                ['Ready', 'Delivered'].includes(order.status) 
                  ? 'bg-purple-100 text-purple-600' 
                  : 'bg-gray-100 text-gray-400'
              }`}>
                <Package className="h-4 w-4" />
              </div>
              <div>
                <p className="font-medium">Ready for Delivery</p>
                <p className="text-sm text-muted-foreground">
                  {['Ready', 'Delivered'].includes(order.status) 
                    ? 'Order is ready and on the way' 
                    : 'Preparing your order'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                order.status === 'Delivered' 
                  ? 'bg-green-100 text-green-600' 
                  : 'bg-gray-100 text-gray-400'
              }`}>
                <Truck className="h-4 w-4" />
              </div>
              <div>
                <p className="font-medium">Delivered</p>
                <p className="text-sm text-muted-foreground">
                  {order.status === 'Delivered' 
                    ? 'Order has been delivered' 
                    : 'Out for delivery'}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        {onTrackOrder && (
          <Button onClick={onTrackOrder} className="flex-1">
            <Package className="h-4 w-4 mr-2" />
            Track Order
          </Button>
        )}
        {onContactSupport && (
          <Button variant="outline" onClick={onContactSupport} className="flex-1">
            <MessageSquare className="h-4 w-4 mr-2" />
            Contact Support
          </Button>
        )}
        {onClose && (
          <Button variant="outline" onClick={onClose} className="flex-1">
            Continue Shopping
          </Button>
        )}
      </div>

      {/* Support Information */}
      <Card className="bg-muted/30">
        <CardContent className="pt-6">
          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              Need help with your order?
            </p>
            <div className="flex justify-center gap-4">
              <Button variant="ghost" size="sm">
                <Phone className="h-4 w-4 mr-1" />
                Call Support
              </Button>
              <Button variant="ghost" size="sm">
                <MessageSquare className="h-4 w-4 mr-1" />
                Live Chat
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
