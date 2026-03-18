import mongoose, { Schema, Document } from "mongoose";

export interface IInventoryItem extends Document {
  productId: mongoose.Types.ObjectId;
  productName: string;
  sku: string;
  category: string;
  currentStock: number;
  minimumStock: number;
  maximumStock?: number;
  unit: string; // pcs, kg, litre, etc.
  location: string; // warehouse location
  supplierId?: mongoose.Types.ObjectId;
  costPrice: number;
  sellingPrice: number;
  expiryDate?: Date;
  batchNumber?: string;
  status: 'active' | 'discontinued' | 'out_of_stock';
  lastRestockedAt?: Date;
  lastStockCheckAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const InventoryItemSchema = new Schema<IInventoryItem>(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    productName: { type: String, required: true },
    sku: { type: String, required: true, unique: true },
    category: { type: String, required: true },
    currentStock: { type: Number, required: true, default: 0 },
    minimumStock: { type: Number, required: true, default: 0 },
    maximumStock: { type: Number },
    unit: { type: String, required: true, default: 'pcs' },
    location: { type: String, required: true },
    supplierId: { type: Schema.Types.ObjectId, ref: 'Supplier' },
    costPrice: { type: Number, required: true },
    sellingPrice: { type: Number, required: true },
    expiryDate: { type: Date },
    batchNumber: { type: String },
    status: {
      type: String,
      enum: ['active', 'discontinued', 'out_of_stock'],
      default: 'active'
    },
    lastRestockedAt: { type: Date },
    lastStockCheckAt: { type: Date }
  },
  { timestamps: true }
);

// Indexes for performance
InventoryItemSchema.index({ sku: 1 });
InventoryItemSchema.index({ category: 1 });
InventoryItemSchema.index({ status: 1 });
InventoryItemSchema.index({ currentStock: 1 });
InventoryItemSchema.index({ expiryDate: 1 });

export const InventoryItem = mongoose.model<IInventoryItem>('InventoryItem', InventoryItemSchema);