import mongoose, { Schema, Document } from "mongoose";

export interface OrderLocation {
  address: string;
  latitude: number;
  longitude: number;
  placeId?: string;
  instructions?: string;
}

export interface OrderDoc extends Document {
  items: { productId?: string; name: string; quantity: number; price: number }[];
  total: number;
  status: 'Pending' | 'Preparing' | 'Ready' | 'Delivered' | 'Cancelled';
  user?: string;
  userId?: string;
  userEmail?: string;
  userPhone?: string;
  eta?: string | null;
  location?: OrderLocation;
  createdAt: Date;
  updatedAt: Date;
}

const OrderSchema = new Schema<OrderDoc>({
  items: [{ name: String, productId: String, quantity: Number, price: Number }],
  total: { type: Number, default: 0 },
  status: { type: String, default: 'Pending' },
  user: { type: String },
  userId: { type: String },
  userEmail: { type: String },
  userPhone: { type: String },
  eta: { type: String, default: null },
  location: {
    address: { type: String, required: false },
    latitude: { type: Number, required: false },
    longitude: { type: Number, required: false },
    placeId: { type: String, required: false },
    instructions: { type: String, required: false }
  }
}, { timestamps: true });

export const Order = mongoose.model<OrderDoc>('Order', OrderSchema);
