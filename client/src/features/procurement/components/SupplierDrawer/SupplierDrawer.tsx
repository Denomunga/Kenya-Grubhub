import React from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useSupplier } from '../../hooks/useProcurementData';
import { usePurchaseOrders } from '../../hooks/useProcurementData';
import { format } from 'date-fns';
import { formatPriceKSHS } from '@/lib/format';
import { Phone, Mail, MapPin, Clock, Package } from 'lucide-react';

interface SupplierDrawerProps {
  supplierId: string | null;
  open: boolean;
  onClose: () => void;
}

export const SupplierDrawer: React.FC<SupplierDrawerProps> = ({ supplierId, open, onClose }) => {
  const { data: supplier, isLoading } = useSupplier(supplierId || '');
  const { data: orders } = usePurchaseOrders();

  const supplierOrders = React.useMemo(() => {
    if (!orders || !supplierId) return [];
    return orders.filter((po: any) => po.supplierId === supplierId);
  }, [orders, supplierId]);

  const totalSpend = React.useMemo(() => {
    return supplierOrders.reduce((sum: number, po: any) => sum + (po.totalAmount || 0), 0);
  }, [supplierOrders]);

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-xl">{supplier?.name || 'Supplier Details'}</SheetTitle>
        </SheetHeader>

        {isLoading ? (
          <div className="py-8 text-center text-muted-foreground">Loading supplier information...</div>
        ) : supplier ? (
          <div className="mt-6 space-y-6">
            {/* Contact Info */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{supplier.email}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{supplier.phone}</span>
                </div>
                <div className="flex items-start gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <span>{supplier.address}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>Lead Time: {supplier.leadTimeDays} days</span>
                </div>
              </CardContent>
            </Card>

            {/* Performance Metrics */}
            {supplier.performanceMetrics && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Performance</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span>On-Time Delivery</span>
                      <span>{supplier.performanceMetrics.onTimeDeliveryRate}%</span>
                    </div>
                    <Progress value={supplier.performanceMetrics.onTimeDeliveryRate} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span>Quality Score</span>
                      <span>{supplier.performanceMetrics.qualityScore}%</span>
                    </div>
                    <Progress value={supplier.performanceMetrics.qualityScore} className="h-2" />
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Avg Response: {supplier.performanceMetrics.averageResponseTime}h
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Order History */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Purchase Orders ({supplierOrders.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {supplierOrders.slice(0, 5).map((po: any) => (
                    <div key={po.id} className="flex items-center justify-between text-sm border-b pb-2">
                      <div>
                        <div className="font-medium">PO #{po.poNumber}</div>
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(po.orderDate), 'MMM d, yyyy')}
                        </div>
                      </div>
                      <div className="text-right">
                        <div>{formatPriceKSHS(po.totalAmount)}</div>
                        <Badge variant="outline" className="text-xs">{po.status}</Badge>
                      </div>
                    </div>
                  ))}
                  {supplierOrders.length === 0 && (
                    <div className="text-sm text-muted-foreground text-center py-4">
                      No purchase orders yet.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Summary Stats */}
            <div className="grid grid-cols-2 gap-3">
              <Card>
                <CardContent className="pt-4">
                  <div className="text-xs text-muted-foreground">Total Spend</div>
                  <div className="text-lg font-bold">{formatPriceKSHS(totalSpend)}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="text-xs text-muted-foreground">MOQ</div>
                  <div className="text-lg font-bold">{supplier.moq || 'N/A'}</div>
                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
          <div className="py-8 text-center text-muted-foreground">Supplier not found.</div>
        )}
      </SheetContent>
    </Sheet>
  );
};