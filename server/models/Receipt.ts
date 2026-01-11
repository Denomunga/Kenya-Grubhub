import mongoose, { Schema, Document } from "mongoose";

export interface IReceipt extends Document {
  saleId: string; // Reference to the Sale
  receiptNumber: string;
  receiptData: {
    items: { name: string; quantity: number; unit?: string; price: number; total: number }[];
    subtotal: number;
    tax: number;
    discount: number;
    total: number;
    paymentMethod: string;
    paymentAmount: number;
    change: number;
    customerName?: string;
    customerPhone?: string;
    cashier: { name: string; username: string };
    storeLocation?: string;
  };
  printCount: number; // Track how many times this receipt was printed
  printedAt: Date[];
  createdAt: Date;
  updatedAt: Date;
}

const ReceiptSchema = new Schema<IReceipt>(
  {
    saleId: { type: String, required: true, ref: 'Sale' },
    receiptNumber: { type: String, required: true },
    receiptData: {
      items: [{
        name: { type: String, required: true },
        quantity: { type: Number, required: true },
        unit: { type: String },
        price: { type: Number, required: true },
        total: { type: Number, required: true }
      }],
      subtotal: { type: Number, required: true },
      tax: { type: Number, default: 0 },
      discount: { type: Number, default: 0 },
      total: { type: Number, required: true },
      paymentMethod: { type: String, required: true },
      paymentAmount: { type: Number, required: true },
      change: { type: Number, default: 0 },
      customerName: { type: String },
      customerPhone: { type: String },
      cashier: {
        name: { type: String, required: true },
        username: { type: String, required: true }
      },
      storeLocation: { type: String }
    },
    printCount: { type: Number, default: 1 },
    printedAt: [{ type: Date, default: Date.now }]
  },
  { timestamps: true }
);

// Index for efficient queries
ReceiptSchema.index({ saleId: 1 });
ReceiptSchema.index({ receiptNumber: 1 });

export const Receipt = mongoose.model<IReceipt>('Receipt', ReceiptSchema);