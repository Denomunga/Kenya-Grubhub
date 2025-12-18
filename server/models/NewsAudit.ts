import mongoose, { Schema, Document } from "mongoose";

export interface INewsAudit extends Document {
  newsId: string;
  action: string;
  byId?: string;
  byName?: string;
  reason?: string;
  note?: string;
  createdAt: Date;
}

const NewsAuditSchema = new Schema<INewsAudit>(
  {
    newsId: { type: String, required: true, index: true },
    action: { type: String, required: true },
    byId: { type: String },
    byName: { type: String },
    reason: { type: String },
    note: { type: String },
  },
  { timestamps: true }
);

export const NewsAudit = mongoose.model<INewsAudit>("NewsAudit", NewsAuditSchema);
