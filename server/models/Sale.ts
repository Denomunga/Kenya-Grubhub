import mongoose, { Schema, Document } from "mongoose";

export interface ISale extends Document {
  items: { productId: string; name: string; quantity: number; price: number; stock?: number }[];
  total: number;
  subtotal: number;
  tax: number;
  discount: number;
  status: 'Completed' | 'Refunded' | 'Cancelled' | 'Pending' | 'Failed';
  paymentMethod: 'Cash' | 'Card' | 'Mobile Money' | 'Other';
  paymentAmount: number;
  change: number;
  storeLocation?: string; // Business location ID
  cashier: string; // User ID of the staff/admin processing the sale
  customerName?: string;
  customerPhone?: string;
  receiptNumber: string;
  notes?: string;
  auditLog: {
    action: string;
    user: string;
    timestamp: Date;
    details?: any;
  }[];
  // M-Pesa specific fields
  mpesaTransactionId?: string;
  mpesaPhoneNumber?: string;
  mpesaReceipt?: string;
  mpesaStatus?: 'pending' | 'completed' | 'failed';
  paymentConfirmedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const SaleSchema = new Schema<ISale>(
  {
    items: [{
      productId: { type: String, required: true },
      name: { type: String, required: true },
      quantity: { type: Number, required: true },
      price: { type: Number, required: true },
      stock: { type: Number } // Stock at time of sale
    }],
    total: { type: Number, required: true },
    subtotal: { type: Number, required: true },
    tax: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    status: { type: String, enum: ['Completed', 'Refunded', 'Cancelled', 'Pending', 'Failed'], default: 'Completed' },
    paymentMethod: { type: String, enum: ['Cash', 'Card', 'Mobile Money', 'Other'], required: true },
    paymentAmount: { type: Number, required: true },
    change: { type: Number, default: 0 },
    storeLocation: { type: String },
    cashier: { type: String, required: true },
    customerName: { type: String },
    customerPhone: { type: String },
    receiptNumber: { type: String, unique: true },
    notes: { type: String },
    auditLog: [{
      action: { type: String, required: true },
      user: { type: String, required: true },
      timestamp: { type: Date, default: Date.now },
      details: { type: Schema.Types.Mixed }
    }],
    mpesaTransactionId: { type: String },
    mpesaPhoneNumber: { type: String },
    mpesaReceipt: { type: String },
    mpesaStatus: { type: String, enum: ['pending', 'completed', 'failed'] },
    paymentConfirmedAt: { type: Date }
  },
  { timestamps: true }
);

// Auto-generate receipt number
SaleSchema.pre('save', function(next) {
  if (this.isNew && !this.receiptNumber) {
    // Generate unique receipt number using timestamp and random component
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    this.receiptNumber = `RCP-${timestamp}-${random}`;
  }
  next();
});

export const Sale = mongoose.model<ISale>('Sale', SaleSchema);