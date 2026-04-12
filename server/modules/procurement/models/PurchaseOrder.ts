import mongoose, { Schema, Document } from 'mongoose';

export interface IPurchaseOrderItem {
  inventoryItemId: mongoose.Types.ObjectId;
  itemName: string;
  sku: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
}

export interface IPurchaseOrder extends Document {
  poNumber: string;
  purchaseRequestId?: mongoose.Types.ObjectId;
  supplierId: mongoose.Types.ObjectId;
  items: IPurchaseOrderItem[];
  subtotal: number;
  tax: number;
  shipping: number;
  totalAmount: number;
  currency: string;
  status: 'draft' | 'sent' | 'confirmed' | 'shipped' | 'partially_received' | 'received' | 'cancelled';
  orderDate: Date;
  expectedDeliveryDate: Date;
  actualDeliveryDate?: Date;
  createdBy: mongoose.Types.ObjectId;
  notes?: string;
  cancellationReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PurchaseOrderItemSchema = new Schema<IPurchaseOrderItem>({
  inventoryItemId: { type: Schema.Types.ObjectId, ref: 'InventoryItem', required: true },
  itemName: { type: String, required: true },
  sku: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  unit: { type: String, required: true },
  unitPrice: { type: Number, required: true, min: 0 },
  totalPrice: { type: Number, required: true, min: 0 },
});

const PurchaseOrderSchema = new Schema<IPurchaseOrder>(
  {
    poNumber: { type: String, required: true, unique: true },
    purchaseRequestId: { type: Schema.Types.ObjectId, ref: 'PurchaseRequest' },
    supplierId: { type: Schema.Types.ObjectId, ref: 'Supplier', required: true },
    items: [PurchaseOrderItemSchema],
    subtotal: { type: Number, required: true, min: 0 },
    tax: { type: Number, default: 0, min: 0 },
    shipping: { type: Number, default: 0, min: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'KES' },
    status: {
      type: String,
      enum: ['draft', 'sent', 'confirmed', 'shipped', 'partially_received', 'received', 'cancelled'],
      default: 'draft',
    },
    orderDate: { type: Date, default: Date.now },
    expectedDeliveryDate: { type: Date, required: true },
    actualDeliveryDate: { type: Date },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    notes: { type: String },
    cancellationReason: { type: String },
  },
  { timestamps: true }
);

// Auto-generate PO number
PurchaseOrderSchema.pre('save', async function (next) {
  if (this.isNew && !this.poNumber) {
    const count = await mongoose.model('PurchaseOrder').countDocuments();
    this.poNumber = `PO-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;
  }
  next();
});

export const PurchaseOrder = mongoose.model<IPurchaseOrder>('PurchaseOrder', PurchaseOrderSchema);