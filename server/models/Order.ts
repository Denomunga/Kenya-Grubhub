import mongoose, { Schema, Document } from "mongoose";

export interface OrderDoc extends Document {
  items: { productId?: string; name: string; quantity: number; price: number }[];
  total: number;
  status: 'Pending' | 'Preparing' | 'Ready' | 'Delivered' | 'Cancelled';
  user?: string;
  userId?: string;
  eta?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const OrderSchema = new Schema<OrderDoc>({
  items: [{ name: String, productId: String, quantity: Number, price: Number }],
  total: { type: Number, default: 0 },
  status: { type: String, default: 'Pending' },
  user: { type: String },
  userId: { type: String },
  eta: { type: String, default: null },
}, { timestamps: true });

export const Order = mongoose.model<OrderDoc>('Order', OrderSchema);
