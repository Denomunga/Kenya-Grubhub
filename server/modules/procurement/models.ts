import mongoose, { Schema, Document } from "mongoose";

/**
 * Supplier Model
 */
export interface ISupplier extends Document {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  contactPerson: string;
  contactEmail: string;
  contactPhone: string;
  bankDetails?: {
    accountName: string;
    accountNumber: string;
    bankName: string;
    swiftCode?: string;
  };
  paymentTerms: 'immediate' | 'net30' | 'net60' | 'net90';
  rating: number; // 1-5
  status: 'active' | 'inactive' | 'suspended';
  leadTime?: number; // days
  minimumOrderQuantity?: number;
  categories?: string[]; // product categories they supply
  createdAt: Date;
  updatedAt: Date;
}

const SupplierSchema = new Schema<ISupplier>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    phone: { type: String, required: true },
    address: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    zipCode: { type: String, required: true },
    country: { type: String, required: true },
    contactPerson: { type: String, required: true },
    contactEmail: { type: String, required: true },
    contactPhone: { type: String, required: true },
    bankDetails: {
      accountName: String,
      accountNumber: String,
      bankName: String,
      swiftCode: String
    },
    paymentTerms: {
      type: String,
      enum: ['immediate', 'net30', 'net60', 'net90'],
      default: 'net30'
    },
    rating: { type: Number, min: 1, max: 5, default: 3 },
    status: {
      type: String,
      enum: ['active', 'inactive', 'suspended'],
      default: 'active'
    },
    leadTime: { type: Number }, // in days
    minimumOrderQuantity: { type: Number },
    categories: [{ type: String }]
  },
  { timestamps: true }
);

SupplierSchema.index({ status: 1 });
SupplierSchema.index({ rating: -1 });

export const Supplier = mongoose.model<ISupplier>('Supplier', SupplierSchema);

/**
 * Purchase Request Model
 * Created when inventory level is low
 */
export interface IPurchaseRequest extends Document {
  requestNumber: string;
  inventoryItemId: mongoose.Types.ObjectId;
  productName: string;
  sku: string;
  currentStock: number;
  minimumStock: number;
  recommendedQuantity: number;
  requestedQuantity: number;
  requestedBy: mongoose.Types.ObjectId; // User who requested
  requestDate: Date;
  status: 'pending_approval' | 'approved' | 'rejected' | 'converted_to_po';
  approvedBy?: mongoose.Types.ObjectId;
  approvalDate?: Date;
  rejectionReason?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PurchaseRequestSchema = new Schema<IPurchaseRequest>(
  {
    requestNumber: { type: String, required: true, unique: true },
    inventoryItemId: { type: Schema.Types.ObjectId, ref: 'InventoryItem', required: true },
    productName: { type: String, required: true },
    sku: { type: String, required: true },
    currentStock: { type: Number, required: true },
    minimumStock: { type: Number, required: true },
    recommendedQuantity: { type: Number, required: true },
    requestedQuantity: { type: Number, required: true },
    requestedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    requestDate: { type: Date, default: Date.now },
    status: {
      type: String,
      enum: ['pending_approval', 'approved', 'rejected', 'converted_to_po'],
      default: 'pending_approval'
    },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvalDate: { type: Date },
    rejectionReason: { type: String },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium'
    },
    notes: { type: String }
  },
  { timestamps: true }
);

PurchaseRequestSchema.index({ status: 1 });
PurchaseRequestSchema.index({ inventoryItemId: 1 });
PurchaseRequestSchema.index({ priority: 1 });

export const PurchaseRequest = mongoose.model<IPurchaseRequest>('PurchaseRequest', PurchaseRequestSchema);

/**
 * Purchase Order Model
 */
export interface IPurchaseOrderItem {
  inventoryItemId: mongoose.Types.ObjectId;
  productName: string;
  sku: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
  expectedDeliveryDate?: Date;
}

export interface IPurchaseOrder extends Document {
  poNumber: string;
  supplierId: mongoose.Types.ObjectId;
  purchaseRequestId?: mongoose.Types.ObjectId;
  items: IPurchaseOrderItem[];
  totalAmount: number;
  tax?: number;
  shippingCost?: number;
  discountAmount?: number;
  grandTotal: number;
  paymentTerms: string;
  deliveryAddress: string;
  status: 'draft' | 'submitted' | 'confirmed' | 'partially_received' | 'received' | 'cancelled';
  orderDate: Date;
  expectedDeliveryDate: Date;
  confirmedDate?: Date;
  receivedDate?: Date;
  cancelledDate?: Date;
  cancellationReason?: string;
  createdBy: mongoose.Types.ObjectId;
  notes?: string;
  attachments?: string[]; // file URLs
  createdAt: Date;
  updatedAt: Date;
}

const PurchaseOrderSchema = new Schema<IPurchaseOrder>(
  {
    poNumber: { type: String, required: true, unique: true },
    supplierId: { type: Schema.Types.ObjectId, ref: 'Supplier', required: true },
    purchaseRequestId: { type: Schema.Types.ObjectId, ref: 'PurchaseRequest' },
    items: [
      {
        inventoryItemId: { type: Schema.Types.ObjectId, ref: 'InventoryItem', required: true },
        productName: { type: String, required: true },
        sku: { type: String, required: true },
        quantity: { type: Number, required: true },
        unit: { type: String, required: true },
        unitPrice: { type: Number, required: true },
        totalPrice: { type: Number, required: true }
      }
    ],
    totalAmount: { type: Number, required: true },
    tax: { type: Number, default: 0 },
    shippingCost: { type: Number, default: 0 },
    discountAmount: { type: Number, default: 0 },
    grandTotal: { type: Number, required: true },
    paymentTerms: { type: String, required: true },
    deliveryAddress: { type: String, required: true },
    status: {
      type: String,
      enum: ['draft', 'submitted', 'confirmed', 'partially_received', 'received', 'cancelled'],
      default: 'draft'
    },
    orderDate: { type: Date, default: Date.now },
    expectedDeliveryDate: { type: Date, required: true },
    confirmedDate: { type: Date },
    receivedDate: { type: Date },
    cancelledDate: { type: Date },
    cancellationReason: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    notes: { type: String },
    attachments: [{ type: String }]
  },
  { timestamps: true }
);

PurchaseOrderSchema.index({ supplierId: 1 });
PurchaseOrderSchema.index({ status: 1 });
PurchaseOrderSchema.index({ orderDate: -1 });

export const PurchaseOrder = mongoose.model<IPurchaseOrder>('PurchaseOrder', PurchaseOrderSchema);

/**
 * Goods Received Model
 */
export interface IGoodsReceivedItem {
  inventoryItemId: mongoose.Types.ObjectId;
  purchaseOrderItemIndex: number;
  quantity: number;
  unit: string;
  qualityStatus: 'accepted' | 'rejected' | 'partial_reject';
  rejectedQuantity?: number;
  rejectionReason?: string;
  expiryDate?: Date;
  batchNumber?: string;
}

export interface IGoodsReceived extends Document {
  grNumber: string;
  purchaseOrderId: mongoose.Types.ObjectId;
  supplierId: mongoose.Types.ObjectId;
  items: IGoodsReceivedItem[];
  receivedDate: Date;
  receivedBy: mongoose.Types.ObjectId;
  totalItemsReceived: number;
  totalItemsRejected: number;
  status: 'pending_inspection' | 'inspected' | 'stock_updated' | 'hold';
  inspectionNotes?: string;
  inspectedBy?: mongoose.Types.ObjectId;
  inspectionDate?: Date;
  warehouseLocation?: string;
  transportationNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const GoodsReceivedSchema = new Schema<IGoodsReceived>(
  {
    grNumber: { type: String, required: true, unique: true },
    purchaseOrderId: { type: Schema.Types.ObjectId, ref: 'PurchaseOrder', required: true },
    supplierId: { type: Schema.Types.ObjectId, ref: 'Supplier', required: true },
    items: [
      {
        inventoryItemId: { type: Schema.Types.ObjectId, ref: 'InventoryItem', required: true },
        purchaseOrderItemIndex: { type: Number, required: true },
        quantity: { type: Number, required: true },
        unit: { type: String, required: true },
        qualityStatus: {
          type: String,
          enum: ['accepted', 'rejected', 'partial_reject'],
          default: 'accepted'
        },
        rejectedQuantity: { type: Number },
        rejectionReason: { type: String },
        expiryDate: { type: Date },
        batchNumber: { type: String }
      }
    ],
    receivedDate: { type: Date, default: Date.now },
    receivedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    totalItemsReceived: { type: Number, required: true },
    totalItemsRejected: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['pending_inspection', 'inspected', 'stock_updated', 'hold'],
      default: 'pending_inspection'
    },
    inspectionNotes: { type: String },
    inspectedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    inspectionDate: { type: Date },
    warehouseLocation: { type: String },
    transportationNotes: { type: String }
  },
  { timestamps: true }
);

GoodsReceivedSchema.index({ purchaseOrderId: 1 });
GoodsReceivedSchema.index({ status: 1 });

export const GoodsReceived = mongoose.model<IGoodsReceived>('GoodsReceived', GoodsReceivedSchema);
