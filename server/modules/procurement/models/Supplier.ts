import mongoose, { Schema, Document } from 'mongoose';

export interface ISupplier extends Document {
  name: string;
  email: string;
  phone: string;
  address: string;
  taxId?: string;
  paymentTerms?: string;
  leadTimeDays: number;
  moq?: number;
  performanceMetrics: {
    onTimeDeliveryRate: number;
    qualityScore: number;
    averageResponseTime: number;
  };
  status: 'active' | 'inactive' | 'blacklisted';
  createdAt: Date;
  updatedAt: Date;
}

const SupplierSchema = new Schema<ISupplier>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    phone: { type: String, required: true },
    address: { type: String, required: true },
    taxId: { type: String },
    paymentTerms: { type: String, default: 'Net 30' },
    leadTimeDays: { type: Number, default: 7 },
    moq: { type: Number },
    performanceMetrics: {
      onTimeDeliveryRate: { type: Number, default: 100 },
      qualityScore: { type: Number, default: 100 },
      averageResponseTime: { type: Number, default: 24 },
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'blacklisted'],
      default: 'active',
    },
  },
  { timestamps: true }
);

export const Supplier = mongoose.model<ISupplier>('Supplier', SupplierSchema);