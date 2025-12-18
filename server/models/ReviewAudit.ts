import mongoose, { Schema, Document } from "mongoose";

export interface IReviewAudit extends Document {
  reviewId: string;
  action: string;
  byId?: string;
  byName?: string;
  reason?: string;
  note?: string;
  createdAt: Date;
}

const ReviewAuditSchema = new Schema<IReviewAudit>(
  {
    reviewId: { type: String, required: true, index: true },
    action: { type: String, required: true },
    byId: { type: String },
    byName: { type: String },
    reason: { type: String },
    note: { type: String },
  },
  { timestamps: true }
);

export const ReviewAudit = mongoose.model<IReviewAudit>("ReviewAudit", ReviewAuditSchema);
