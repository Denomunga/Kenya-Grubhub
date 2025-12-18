import mongoose, { Schema, Document } from "mongoose";

export interface INews extends Document {
  title: string;
  content: string;
  author: string;
  date: string;
  image?: string;
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
    author: { type: String, required: true },
    date: { type: String, required: true },
    image: { type: String },
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
