import mongoose, { Schema, Document } from "mongoose";

export interface INews extends Document {
  title: string;
  content: string;
  excerpt?: string;
  author: string;
  date: string;
  category?: string;
  tags?: string[];
  image?: string;
  featured?: boolean;
  published?: boolean;
  views: number;
  deletedAt?: Date;
  deletedById?: string;
  deletedByName?: string;
  deletedReason?: string;
  deletedNote?: string;
  createdAt: Date;
  updatedAt: Date;
}

const NewsSchema = new Schema<INews>(
  {
    title: { type: String, required: true },
    content: { type: String, required: true },
    excerpt: { type: String },
    author: { type: String, required: true },
    date: { type: String, required: true },
    category: { type: String },
    tags: [{ type: String }],
    image: { type: String },
    featured: { type: Boolean, default: false },
    published: { type: Boolean, default: true },
    views: { type: Number, default: 0 },
    deletedAt: { type: Date },
    deletedById: { type: String },
    deletedByName: { type: String },
    deletedReason: { type: String },
    deletedNote: { type: String },
  },
  { timestamps: true }
);

export const News = mongoose.model<INews>("News", NewsSchema);
export type NewsDoc = INews;
