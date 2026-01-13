import mongoose, { Schema, Document } from "mongoose";

export interface IPOSSettings extends Document {
  userId: string; // User ID
  favorites: string[]; // Array of product IDs
  pinnedActions?: {
    kind: "tab" | "action" | "order" | "product";
    value: string;
    label: string;
    tab?: string;
  }[];
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
    pinnedActions: [
      {
        kind: { type: String, enum: ["tab", "action", "order", "product"], required: true },
        value: { type: String, required: true },
        label: { type: String, required: true },
        tab: { type: String }
      }
    ],
    recentSales: [{
      saleId: { type: String, required: true },
      timestamp: { type: Date, default: Date.now }
    }]
  },
  { timestamps: true }
);

export const POSSettings = mongoose.model<IPOSSettings>('POSSettings', POSSettingsSchema);