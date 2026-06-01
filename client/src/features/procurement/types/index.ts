 export type ProcurementStatus =
  | 'LOW_STOCK_ALERT'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'PO_CREATED'
  | 'AWAITING_DELIVERY'
  | 'PARTIALLY_RECEIVED'
  | 'INSPECTION'
  | 'COMPLETED'
  | 'REJECTED'
  | 'CANCELLED';

export interface Supplier {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  leadTimeDays: number;
  moq?: number;
  performanceMetrics?: {
    onTimeDeliveryRate: number;
    qualityScore: number;
    averageResponseTime: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseRequest {
  id: string;
  itemName: string;
  quantity: number;
  unit: string;
  requestedBy: string;
  requestDate: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CONVERTED';
  notes?: string;
  supplierId?: string;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplierId: string;
  supplierName?: string;
  requestId?: string;
  itemName: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  orderDate: string;
  expectedDeliveryDate: string;
  status: 'DRAFT' | 'SENT' | 'CONFIRMED' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
  goodsReceivedIds?: string[];
}

export interface GoodsReceivedItem {
  inventoryItemId: string;
  purchaseOrderItemIndex: number;
  quantity: number;
  unit: string;
  qualityStatus: 'accepted' | 'rejected' | 'partial_reject';
  rejectedQuantity?: number;
  rejectionReason?: string;
  productName?: string;
  sku?: string;
}

export interface GoodsReceived {
  id: string;
  _id?: string;
  poId: string;
  grNumber?: string;
  receivedDate: string;
  items: GoodsReceivedItem[];
  quantityReceived: number;
  condition: 'GOOD' | 'DAMAGED' | 'PARTIAL';
  inspectionStatus: 'PENDING_INSPECTION' | 'PASSED' | 'FAILED';
  status: 'pending_inspection' | 'inspected' | 'stock_updated' | 'hold';
  notes?: string;
  receiptUrl?: string;
  receiptPublicId?: string;
  receiptVerified?: boolean;
  receiptVerifiedBy?: string;
  receiptVerifiedAt?: string;
}

export interface PurchaseOrderItem {
  inventoryItemId: string;
  productName: string;
  sku: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
}

export interface LowStockAlert {
  id: string;
  _id?: string;
  productName: string;
  name?: string;
  currentStock: number;
  stock?: number;
  minimumStock: number;
  category?: string;
  sku?: string;
  unit?: string;
  type: 'low_stock_alert';
  requestDate?: string;
  quantity?: number;
  itemName?: string;
}

export interface KanbanItem {
  id: string;
  type: 'request' | 'order' | 'alert';
  status: ProcurementStatus;
  data: PurchaseRequest | PurchaseOrder | LowStockAlert;
}