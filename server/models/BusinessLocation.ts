import mongoose, { Document, Schema } from 'mongoose';

export interface BusinessLocationDoc extends Document {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  placeId?: string;
  phone?: string;
  email?: string;
  openingHours: {
    monday?: string;
    tuesday?: string;
    wednesday?: string;
    thursday?: string;
    friday?: string;
    saturday?: string;
    sunday?: string;
  };
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const BusinessLocationSchema = new Schema<BusinessLocationDoc>({
  name: { type: String, required: true },
  address: { type: String, required: true },
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
  placeId: { type: String, required: false },
  phone: { type: String, required: false },
  email: { type: String, required: false },
  openingHours: {
    monday: { type: String, default: '11am - 10pm' },
    tuesday: { type: String, default: '11am - 10pm' },
    wednesday: { type: String, default: '11am - 10pm' },
    thursday: { type: String, default: '11am - 10pm' },
    friday: { type: String, default: '11am - 10pm' },
    saturday: { type: String, default: '10am - 11pm' },
    sunday: { type: String, default: '10am - 11pm' }
  },
  description: { type: String, required: false },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

export const BusinessLocation = mongoose.models.BusinessLocation || mongoose.model('BusinessLocation', BusinessLocationSchema);
