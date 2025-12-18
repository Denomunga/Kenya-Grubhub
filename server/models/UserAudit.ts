import mongoose, { Schema, Document } from "mongoose";

export interface IUserAudit extends Document {
  userId: string;
  action: string;
  byId?: string;
  byName?: string;
  newValue?: string;
  reason?: string;
  note?: string;
  createdAt: Date;
}

const UserAuditSchema = new Schema<IUserAudit>(
  {
    userId: { type: String, required: true, index: true },
    action: { type: String, required: true },
    byId: { type: String },
    byName: { type: String },
    newValue: { type: String },
    reason: { type: String },
    note: { type: String },
  },
  { timestamps: true }
);

export const UserAudit = mongoose.model<IUserAudit>("UserAudit", UserAuditSchema);
