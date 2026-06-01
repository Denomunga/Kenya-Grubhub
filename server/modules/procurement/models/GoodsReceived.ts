import mongoose, { Schema, Document } from 'mongoose';

export interface IReceivedItem {
  inventoryItemId: mongoose.Types.ObjectId;
  itemName: string;
  sku: string;
  quantityOrdered: number;
  quantityReceived: number;
  unit: string;
  condition: 'good' | 'damaged' | 'expired';
  notes?: string;
}

export interface IGoodsReceived extends Document {
  grnNumber: string;
  purchaseOrderId: mongoose.Types.ObjectId;
  items: IReceivedItem[];
  receivedDate: Date;
  receivedBy: mongoose.Types.ObjectId;
  warehouseLocation?: string;
  status: 'pending_inspection' | 'inspected' | 'on_hold' | 'rejected';
  inspectionStatus: 'PENDING_INSPECTION' | 'PASSED' | 'FAILED';
  inspectionNotes?: string;
  inspectedBy?: mongoose.Types.ObjectId;
  inspectedAt?: Date;
  receiptUrl?: string;
  receiptPublicId?: string;
  receiptVerified: boolean;
  receiptVerifiedBy?: mongoose.Types.ObjectId;
  receiptVerifiedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ReceivedItemSchema = new Schema<IReceivedItem>({
  inventoryItemId: { type: Schema.Types.ObjectId, ref: 'InventoryItem', required: true },
  itemName: { type: String, required: true },
  sku: { type: String, required: true },
  quantityOrdered: { type: Number, required: true },
  quantityReceived: { type: Number, required: true, min: 0 },
  unit: { type: String, required: true },
  condition: { type: String, enum: ['good', 'damaged', 'expired'], default: 'good' },
  notes: { type: String },
});

const GoodsReceivedSchema = new Schema<IGoodsReceived>(
  {
    grnNumber: { type: String, required: true, unique: true },
    purchaseOrderId: { type: Schema.Types.ObjectId, ref: 'PurchaseOrder', required: true },
    items: [ReceivedItemSchema],
    receivedDate: { type: Date, default: Date.now },
    receivedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    warehouseLocation: { type: String },
    status: {
      type: String,
      enum: ['pending_inspection', 'inspected', 'on_hold', 'rejected'],
      default: 'pending_inspection',
    },
    inspectionStatus: {
      type: String,
      enum: ['PENDING_INSPECTION', 'PASSED', 'FAILED'],
      default: 'PENDING_INSPECTION'
    },
    inspectionNotes: { type: String },
    inspectedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    inspectedAt: { type: Date },
    receiptUrl: { type: String },
    receiptPublicId: { type: String },
    receiptVerified: { type: Boolean, default: false },
    receiptVerifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    receiptVerifiedAt: { type: Date },
  },
  { timestamps: true }
);

// Auto-generate GRN number
GoodsReceivedSchema.pre('save', async function (next) {
  if (this.isNew && !this.grnNumber) {
    const count = await mongoose.model('GoodsReceived').countDocuments();
    this.grnNumber = `GRN-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;
  }
  next();
});

export const GoodsReceived = mongoose.model<IGoodsReceived>('GoodsReceived', GoodsReceivedSchema);