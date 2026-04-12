import mongoose, { Schema, Document } from 'mongoose';

export interface IPurchaseRequestItem {
  inventoryItemId: mongoose.Types.ObjectId;
  itemName: string;
  sku: string;
  quantity: number;
  unit: string;
  currentStock: number;
  reorderPoint: number;
}

export interface IPurchaseRequest extends Document {
  requestNumber: string;
  items: IPurchaseRequestItem[];
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'approved' | 'rejected' | 'converted';
  requestedBy: mongoose.Types.ObjectId;
  approvedBy?: mongoose.Types.ObjectId;
  rejectedBy?: mongoose.Types.ObjectId;
  rejectionReason?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PurchaseRequestItemSchema = new Schema<IPurchaseRequestItem>({
  inventoryItemId: { type: Schema.Types.ObjectId, ref: 'InventoryItem', required: true },
  itemName: { type: String, required: true },
  sku: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  unit: { type: String, required: true },
  currentStock: { type: Number, required: true },
  reorderPoint: { type: Number, required: true },
});

const PurchaseRequestSchema = new Schema<IPurchaseRequest>(
  {
    requestNumber: { type: String, required: true, unique: true },
    items: [PurchaseRequestItemSchema],
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'converted'],
      default: 'pending',
    },
    requestedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    rejectedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    rejectionReason: { type: String },
    notes: { type: String },
  },
  { timestamps: true }
);

// Auto-generate request number
PurchaseRequestSchema.pre('save', async function (next) {
  if (this.isNew && !this.requestNumber) {
    const count = await mongoose.model('PurchaseRequest').countDocuments();
    this.requestNumber = `PR-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

export const PurchaseRequest = mongoose.model<IPurchaseRequest>('PurchaseRequest', PurchaseRequestSchema);