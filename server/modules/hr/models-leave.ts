import mongoose, { Schema, Document } from "mongoose";

/**
 * Leave Request Model
 */
export interface ILeaveRequest extends Document {
  leaveId: string;
  employeeId: mongoose.Types.ObjectId;
  leaveType: 'annual' | 'sick' | 'maternity' | 'paternity' | 'compassionate' | 'unpaid';
  startDate: Date;
  endDate: Date;
  totalDays: number;
  reason: string;
  doctorLetterUrl?: string; // Required for sick leave
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  reviewedBy?: mongoose.Types.ObjectId;
  reviewedAt?: Date;
  reviewNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const LeaveRequestSchema = new Schema<ILeaveRequest>(
  {
    leaveId: { type: String, required: true, unique: true },
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
    leaveType: {
      type: String,
      required: true,
      enum: ['annual', 'sick', 'maternity', 'paternity', 'compassionate', 'unpaid']
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    totalDays: { type: Number, required: true, min: 1 },
    reason: { type: String, required: true },
    doctorLetterUrl: { type: String },
    status: {
      type: String,
      required: true,
      enum: ['pending', 'approved', 'rejected', 'cancelled'],
      default: 'pending'
    },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'Employee' },
    reviewedAt: { type: Date },
    reviewNotes: { type: String }
  },
  {
    timestamps: true
  }
);

LeaveRequestSchema.index({ employeeId: 1, status: 1 });
LeaveRequestSchema.index({ status: 1 });

export const LeaveRequest = mongoose.model<ILeaveRequest>('LeaveRequest', LeaveRequestSchema);
