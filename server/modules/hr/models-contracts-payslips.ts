import mongoose, { Schema, Document } from "mongoose";
import { Employee } from "./models";

/**
 * Contract Model
 */
export interface IContract extends Document {
  contractId: string;
  employeeId: mongoose.Types.ObjectId;
  contractType: 'permanent' | 'fixed_term' | 'casual' | 'consultancy';
  title: string;
  startDate: Date;
  endDate?: Date;
  renewalDate?: Date;
  salary: number;
  currency: string;
  benefits: string[];
  terms: string;
  status: 'active' | 'expired' | 'terminated' | 'renewed';
  signedDate?: Date;
  signedBy?: mongoose.Types.ObjectId;
  documentUrl?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ContractSchema = new Schema<IContract>(
  {
    contractId: { type: String, required: true, unique: true },
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
    contractType: {
      type: String,
      required: true,
      enum: ['permanent', 'fixed_term', 'casual', 'consultancy']
    },
    title: { type: String, required: true },
    startDate: { type: Date, required: true },
    endDate: Date,
    renewalDate: Date,
    salary: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, default: 'KES' },
    benefits: [{ type: String }],
    terms: { type: String, required: true },
    status: {
      type: String,
      required: true,
      enum: ['active', 'expired', 'terminated', 'renewed'],
      default: 'active'
    },
    signedDate: Date,
    signedBy: { type: Schema.Types.ObjectId, ref: 'Employee' },
    documentUrl: String,
    notes: String
  },
  {
    timestamps: true
  }
);

// Index for efficient queries
ContractSchema.index({ contractId: 1 });
ContractSchema.index({ employeeId: 1 });
ContractSchema.index({ status: 1 });
ContractSchema.index({ endDate: 1 });

/**
 * Payslip Model
 */
export interface IPayslip extends Document {
  payslipId: string;
  employeeId: mongoose.Types.ObjectId;
  payrollId?: mongoose.Types.ObjectId;
  payPeriod: {
    month: number;
    year: number;
  };
  payDate: Date;
  
  // Earnings
  basicSalary: number;
  allowances: {
    type: string;
    amount: number;
    taxable: boolean;
  }[];
  bonuses: {
    type: string;
    amount: number;
  }[];
  overtimeHours: number;
  overtimeRate: number;
  overtimePay: number;
  totalEarnings: number;
  
  // Deductions
  paye: number;
  nssf: number;
  nhif: number;
  otherDeductions: {
    type: string;
    amount: number;
  }[];
  totalDeductions: number;
  
  // Net Pay
  netPay: number;
  currency: string;
  
  // Employer Contributions
  employerNssf: number;
  employerNhif: number;
  
  // Status & Approval
  status: 'draft' | 'approved' | 'paid' | 'cancelled';
  approvedBy?: mongoose.Types.ObjectId;
  approvedAt?: Date;
  paidAt?: Date;
  
  // Additional Info
  paymentMethod: 'bank_transfer' | 'cash' | 'cheque';
  bankDetails?: {
    accountName: string;
    accountNumber: string;
    bankName: string;
  };
  notes?: string;
  
  createdAt: Date;
  updatedAt: Date;
}

const PayslipSchema = new Schema<IPayslip>(
  {
    payslipId: { type: String, required: true, unique: true },
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
    payrollId: { type: Schema.Types.ObjectId, ref: 'Payroll' },
    payPeriod: {
      month: { type: Number, required: true, min: 1, max: 12 },
      year: { type: Number, required: true }
    },
    payDate: { type: Date, required: true },
    
    // Earnings
    basicSalary: { type: Number, required: true, min: 0 },
    allowances: [{
      type: { type: String, required: true },
      amount: { type: Number, required: true, min: 0 },
      taxable: { type: Boolean, default: true }
    }],
    bonuses: [{
      type: { type: String, required: true },
      amount: { type: Number, required: true, min: 0 }
    }],
    overtimeHours: { type: Number, default: 0, min: 0 },
    overtimeRate: { type: Number, default: 0, min: 0 },
    overtimePay: { type: Number, default: 0, min: 0 },
    totalEarnings: { type: Number, required: true, min: 0 },
    
    // Deductions
    paye: { type: Number, default: 0, min: 0 },
    nssf: { type: Number, default: 0, min: 0 },
    nhif: { type: Number, default: 0, min: 0 },
    otherDeductions: [{
      type: { type: String, required: true },
      amount: { type: Number, required: true, min: 0 }
    }],
    totalDeductions: { type: Number, required: true, min: 0 },
    
    // Net Pay
    netPay: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, default: 'KES' },
    
    // Employer Contributions
    employerNssf: { type: Number, default: 0, min: 0 },
    employerNhif: { type: Number, default: 0, min: 0 },
    
    // Status & Approval
    status: {
      type: String,
      required: true,
      enum: ['draft', 'approved', 'paid', 'cancelled'],
      default: 'draft'
    },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'Employee' },
    approvedAt: Date,
    paidAt: Date,
    
    // Payment Info
    paymentMethod: {
      type: String,
      required: true,
      enum: ['bank_transfer', 'cash', 'cheque'],
      default: 'bank_transfer'
    },
    bankDetails: {
      accountName: String,
      accountNumber: String,
      bankName: String
    },
    notes: String
  },
  {
    timestamps: true
  }
);

// Index for efficient queries
PayslipSchema.index({ payslipId: 1 });
PayslipSchema.index({ employeeId: 1 });
PayslipSchema.index({ payPeriod: 1 });
PayslipSchema.index({ status: 1 });
PayslipSchema.index({ payDate: 1 });

// Export models
export const Contract = mongoose.model<IContract>('Contract', ContractSchema);
export const Payslip = mongoose.model<IPayslip>('Payslip', PayslipSchema);
