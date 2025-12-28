import mongoose, { Schema, Document } from "mongoose";

export interface IProduct extends Document {
  name: string;
  description: string;
  price: number;
  category: string;
  subcategory?: string;
  brand?: string; // Optional - mainly for electronics, fashion, vehicles
  condition?: "new" | "used" | "refurbished"; // Optional - mainly for electronics, vehicles, fashion
  specifications?: Record<string, any>; // Optional - for technical specs
  images: string[];
  available: boolean;
  stock?: number; // Optional - mainly for physical products
  location?: string; // Optional - mainly for real estate, vehicles
  tags?: string[]; // Optional - for searchability
  size?: string; // Optional - for fashion, furniture
  color?: string; // Optional - for fashion, vehicles
  year?: number; // Optional - for vehicles, electronics
  material?: string; // Optional - for fashion, furniture
  weight?: number; // Optional - for shipping calculation
  dimensions?: { length: number; width: number; height: number; }; // Optional - for shipping
  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema = new Schema<IProduct>(
  {
    name: { type: String, required: true },
    description: { type: String, required: true },
    price: { type: Number, required: true },
    category: { type: String, required: true },
    subcategory: { type: String },
    brand: { type: String },
    condition: { 
      type: String, 
      enum: ["new", "used", "refurbished"],
    },
    specifications: { type: Schema.Types.Mixed },
    images: [{ type: String }],
    available: { type: Boolean, default: true },
    stock: { type: Number },
    location: { type: String },
    tags: [{ type: String }],
    size: { type: String },
    color: { type: String },
    year: { type: Number },
    material: { type: String },
    weight: { type: Number },
    dimensions: {
      length: { type: Number },
      width: { type: Number },
      height: { type: Number }
    }
  },
  { timestamps: true }
);

export const Product = mongoose.model<IProduct>("Product", ProductSchema);
