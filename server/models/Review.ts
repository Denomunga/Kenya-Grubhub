import mongoose, { Schema, Document } from "mongoose";

export interface IReview extends Document {
  productId: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  // soft-delete metadata
  deletedAt?: Date;
  deletedById?: string;
  deletedByName?: string;
  // optional moderation metadata
  deletedReason?: string;
  deletedNote?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ReviewSchema = new Schema<IReview>(
  {
    productId: { type: String, required: true, index: true },
    userId: { type: String, required: true },
    userName: { type: String, required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, required: true, trim: true },
    deletedAt: { type: Date },
    deletedById: { type: String },
    deletedByName: { type: String },
    deletedReason: { type: String },
    deletedNote: { type: String },
  },
  { timestamps: true }
);

export const Review = mongoose.model<IReview>("Review", ReviewSchema);
