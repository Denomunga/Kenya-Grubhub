import mongoose, { Schema, Document } from "mongoose";

export interface IPOSSettings extends Document {
  userId: string; // User ID
  favorites: string[]; // Array of product IDs
  recentSales: {
    saleId: string;
    timestamp: Date;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

const POSSettingsSchema = new Schema<IPOSSettings>(
  {
    userId: { type: String, required: true, unique: true },
    favorites: [{ type: String }],
    recentSales: [{
      saleId: { type: String, required: true },
      timestamp: { type: Date, default: Date.now }
    }]
  },
  { timestamps: true }
);

export const POSSettings = mongoose.model<IPOSSettings>('POSSettings', POSSettingsSchema);