import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { MapPin, Navigation, Clock, MessageSquare, Phone, Mail } from 'lucide-react';

interface OrderLocation {
  address: string;
  latitude: number;
  longitude: number;
  placeId?: string;
  instructions?: string;
}

interface OrderLocationViewProps {
  order: {
    id: string;
    user: string;
    userEmail?: string;
    userPhone?: string;
    status: string;
    location?: OrderLocation;
    createdAt: string;
    eta?: string;
  };
  onUpdateStatus?: (orderId: string, status: string) => void;
  onContactCustomer?: (customerInfo: string) => void;
}

export default function OrderLocationView({ 
  order, 
  onUpdateStatus, 
  onContactCustomer 
}: OrderLocationViewProps) {
  const { toast } = useToast();
  const [estimatedTime, setEstimatedTime] = useState(order.eta);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Preparing': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Ready': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'Delivered': return 'bg-green-100 text-green-800 border-green-200';
      case 'Cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const openGoogleMaps = () => {
    if (!order.location?.latitude || !order.location?.longitude) {
      toast({
        title: "Location Error",
        description: "No location coordinates available",
        variant: "destructive"
      });
      return;
    }
    
    const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(order.location.latitude)},${encodeURIComponent(order.location.longitude)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const getDirectionsUrl = () => {
    if (!order.location?.latitude || !order.location?.longitude) return '#';
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(order.location.latitude)},${encodeURIComponent(order.location.longitude)}`;
  };

  const getPhoneUrl = () => {
    if (!order.userPhone) return '#';
    return `tel:${encodeURIComponent(order.userPhone)}`;
  };

  const getEmailUrl = () => {
    if (!order.userEmail) return '#';
    return `mailto:${encodeURIComponent(order.userEmail)}`;
  };

  const handleCallCustomer = () => {
    if (order.userPhone) {
      window.open(getPhoneUrl(), '_self');
    } else {
      toast({
        title: "No Phone Number",
        description: "Customer phone number is not available",
        variant: "destructive"
      });
    }
  };

  const handleEmailCustomer = () => {
    if (order.userEmail) {
      window.open(`mailto:${encodeURIComponent(order.userEmail)}`, '_blank', 'noopener,noreferrer');
    } else {
      toast({
        title: "No Email Address",
        description: "Customer email address is not available",
        variant: "destructive"
      });
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            Order #{order.id.slice(-6)}
          </CardTitle>
          <Badge className={getStatusColor(order.status)}>
            {order.status}
          </Badge>
        </div>
        <div className="text-sm text-muted-foreground">
          Customer: {order.user} • {new Date(order.createdAt).toLocaleString()}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Customer Contact Information */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <h4 className="font-medium text-blue-800 mb-2 flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Customer Contact
          </h4>
          <div className="space-y-1">
            <p className="font-medium text-blue-900">{order.user}</p>
            <div className="flex flex-wrap gap-2">
              {order.userPhone && (
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={handleCallCustomer}
                  className="bg-white hover:bg-blue-50 border-blue-300"
                >
                  <Phone className="h-3 w-3 mr-1" />
                  {order.userPhone}
                </Button>
              )}
              {order.userEmail && (
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={handleEmailCustomer}
                  className="bg-white hover:bg-blue-50 border-blue-300"
                >
                  <Mail className="h-3 w-3 mr-1" />
                  Email
                </Button>
              )}
              {!order.userPhone && !order.userEmail && (
                <span className="text-sm text-blue-700 italic">No contact information available</span>
              )}
            </div>
          </div>
        </div>

        {/* Location Information */}
        {order.location ? (
          <div className="space-y-3">
            <div className="bg-muted/50 p-3 rounded-lg">
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <div className="flex-1">
                  <p className="font-medium text-sm">{order.location.address}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Coordinates: {order.location.latitude.toFixed(6)}, {order.location.longitude.toFixed(6)}
                  </p>
                </div>
              </div>
              
              {order.location.instructions && (
                <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded">
                  <p className="text-sm font-medium text-blue-800">Delivery Instructions:</p>
                  <p className="text-sm text-blue-700 mt-1">"{order.location.instructions}"</p>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2">
              <Button 
                size="sm" 
                onClick={openGoogleMaps}
                className="flex items-center gap-2"
              >
                <Navigation className="h-4 w-4" />
                Get Directions
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.location?.address || '')}`, '_blank', 'noopener,noreferrer')}
              >
                <MapPin className="h-4 w-4 mr-1" />
                View on Map
              </Button>
              {onContactCustomer && (
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => onContactCustomer(order.user)}
                >
                  <MessageSquare className="h-4 w-4 mr-1" />
                  Contact
                </Button>
              )}
            </div>

            {/* ETA Update */}
            {order.status !== 'Delivered' && order.status !== 'Cancelled' && (
              <div className="flex items-center gap-2 p-3 bg-orange-50 border border-orange-200 rounded">
                <Clock className="h-4 w-4 text-orange-600" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-orange-800">Estimated Delivery Time</p>
                  <input
                    type="text"
                    value={estimatedTime || ''}
                    onChange={(e) => setEstimatedTime(e.target.value)}
                    placeholder="e.g., 30 minutes, 2:00 PM"
                    className="mt-1 w-full px-2 py-1 text-sm border border-orange-300 rounded"
                  />
                </div>
                {onUpdateStatus && (
                  <Button 
                    size="sm" 
                    onClick={() => onUpdateStatus(order.id, order.status)}
                    className="bg-orange-600 hover:bg-orange-700"
                  >
                    Update ETA
                  </Button>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-6 text-muted-foreground">
            <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No delivery location specified</p>
            <p className="text-xs mt-1">This order may be for pickup</p>
          </div>
        )}

        {/* Quick Status Updates */}
        {onUpdateStatus && (
          <div className="border-t pt-4">
            <p className="text-sm font-medium mb-2">Quick Status Update:</p>
            <div className="flex flex-wrap gap-2">
              {order.status === 'Pending' && (
                <Button 
                  size="sm" 
                  onClick={() => onUpdateStatus(order.id, 'Preparing')}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Start Preparing
                </Button>
              )}
              {order.status === 'Preparing' && (
                <Button 
                  size="sm" 
                  onClick={() => onUpdateStatus(order.id, 'Ready')}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  Mark Ready
                </Button>
              )}
              {(order.status === 'Ready' || order.status === 'Preparing') && (
                <Button 
                  size="sm" 
                  onClick={() => onUpdateStatus(order.id, 'Delivered')}
                  className="bg-green-600 hover:bg-green-700"
                >
                  Mark Delivered
                </Button>
              )}
              {order.status !== 'Delivered' && order.status !== 'Cancelled' && (
                <Button 
                  size="sm" 
                  variant="destructive"
                  onClick={() => onUpdateStatus(order.id, 'Cancelled')}
                >
                  Cancel Order
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
