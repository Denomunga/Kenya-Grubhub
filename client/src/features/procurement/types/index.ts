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

export interface GoodsReceived {
  id: string;
  poId: string;
  receivedDate: string;
  quantityReceived: number;
  condition: 'GOOD' | 'DAMAGED' | 'PARTIAL';
  inspectionStatus: 'PENDING' | 'PASSED' | 'FAILED';
  notes?: string;
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