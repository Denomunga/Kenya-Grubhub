import mongoose, { Schema, Document } from "mongoose";

/**
 * Employee Model
 */
export interface IEmployee extends Document {
  employeeId: string; // Unique employee identifier
  userId?: mongoose.Types.ObjectId; // Link to User model if exists
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: Date;
  gender: 'male' | 'female' | 'other';
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  department: string;
  position: string;
  employmentType: 'full_time' | 'part_time' | 'contract' | 'intern';
  hireDate: Date;
  salary: number;
  currency: string;
  managerId?: mongoose.Types.ObjectId; // Reference to another employee
  status: 'active' | 'inactive' | 'terminated' | 'on_leave';
  emergencyContact: {
    name: string;
    relationship: string;
    phone: string;
  };
  bankDetails?: {
    accountName: string;
    accountNumber: string;
    bankName: string;
    swiftCode?: string;
  };
  documents?: {
    type: string;
    fileName: string;
    fileUrl: string;
    uploadedAt: Date;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

const EmployeeSchema = new Schema<IEmployee>(
  {
    employeeId: { type: String, required: true, unique: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    phone: { type: String, required: true },
    dateOfBirth: { type: Date, required: true },
    gender: { type: String, required: true, enum: ['male', 'female', 'other'] },
    address: {
      street: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      zipCode: { type: String, required: true },
      country: { type: String, required: true }
    },
    department: { type: String, required: true },
    position: { type: String, required: true },
    employmentType: {
      type: String,
      required: true,
      enum: ['full_time', 'part_time', 'contract', 'intern']
    },
    hireDate: { type: Date, required: true },
    salary: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, default: 'KES' },
    managerId: { type: Schema.Types.ObjectId, ref: 'Employee' },
    status: {
      type: String,
      required: true,
      enum: ['active', 'inactive', 'terminated', 'on_leave'],
      default: 'active'
    },
    emergencyContact: {
      name: { type: String, required: true },
      relationship: { type: String, required: true },
      phone: { type: String, required: true }
    },
    bankDetails: {
      accountName: String,
      accountNumber: String,
      bankName: String,
      swiftCode: String
    },
    documents: [{
      type: { type: String, required: true },
      fileName: { type: String, required: true },
      fileUrl: { type: String, required: true },
      uploadedAt: { type: Date, default: Date.now }
    }]
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual for full name
EmployeeSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Index for efficient queries
EmployeeSchema.index({ employeeId: 1 });
EmployeeSchema.index({ email: 1 });
EmployeeSchema.index({ department: 1 });
EmployeeSchema.index({ status: 1 });
EmployeeSchema.index({ managerId: 1 });

/**
 * Job Posting Model
 */
export interface IJobPosting extends Document {
  jobId: string; // Unique job identifier
  title: string;
  department: string;
  location: string;
  employmentType: 'full_time' | 'part_time' | 'contract' | 'intern';
  description: string;
  requirements: string[];
  responsibilities: string[];
  salaryRange: {
    min: number;
    max: number;
    currency: string;
  };
  postedBy: mongoose.Types.ObjectId; // Employee who posted
  postedDate: Date;
  closingDate: Date;
  status: 'open' | 'closed' | 'filled' | 'cancelled';
  applicationCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const JobPostingSchema = new Schema<IJobPosting>(
  {
    jobId: { type: String, required: true, unique: true },
    title: { type: String, required: true, trim: true },
    department: { type: String, required: true },
    location: { type: String, required: true },
    employmentType: {
      type: String,
      required: true,
      enum: ['full_time', 'part_time', 'contract', 'intern']
    },
    description: { type: String, required: true },
    requirements: [{ type: String }],
    responsibilities: [{ type: String }],
    salaryRange: {
      min: { type: Number, required: true, min: 0 },
      max: { type: Number, required: true, min: 0 },
      currency: { type: String, required: true, default: 'KES' }
    },
    postedBy: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
    postedDate: { type: Date, default: Date.now },
    closingDate: { type: Date, required: true },
    status: {
      type: String,
      required: true,
      enum: ['open', 'closed', 'filled', 'cancelled'],
      default: 'open'
    },
    applicationCount: { type: Number, default: 0 }
  },
  {
    timestamps: true
  }
);

// Index for efficient queries
JobPostingSchema.index({ jobId: 1 });
JobPostingSchema.index({ department: 1 });
JobPostingSchema.index({ status: 1 });
JobPostingSchema.index({ closingDate: 1 });

/**
 * Job Application Model
 */
export interface IJobApplication extends Document {
  applicationId: string; // Unique application identifier
  jobId: mongoose.Types.ObjectId; // Reference to JobPosting
  applicantName: string;
  applicantEmail: string;
  applicantPhone: string;
  resumeUrl?: string;
  coverLetter?: string;
  experience: string;
  education: string;
  skills: string[];
  expectedSalary?: number;
  availabilityDate: Date;
  status: 'pending' | 'under_review' | 'interviewed' | 'offered' | 'hired' | 'rejected';
  appliedDate: Date;
  reviewedBy?: mongoose.Types.ObjectId; // Employee who reviewed
  reviewDate?: Date;
  reviewNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const JobApplicationSchema = new Schema<IJobApplication>(
  {
    applicationId: { type: String, required: true, unique: true },
    jobId: { type: Schema.Types.ObjectId, ref: 'JobPosting', required: true },
    applicantName: { type: String, required: true, trim: true },
    applicantEmail: { type: String, required: true, lowercase: true },
    applicantPhone: { type: String, required: true },
    resumeUrl: String,
    coverLetter: String,
    experience: { type: String, required: true },
    education: { type: String, required: true },
    skills: [{ type: String }],
    expectedSalary: { type: Number, min: 0 },
    availabilityDate: { type: Date, required: true },
    status: {
      type: String,
      required: true,
      enum: ['pending', 'under_review', 'interviewed', 'offered', 'hired', 'rejected'],
      default: 'pending'
    },
    appliedDate: { type: Date, default: Date.now },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'Employee' },
    reviewDate: Date,
    reviewNotes: String
  },
  {
    timestamps: true
  }
);

// Index for efficient queries
JobApplicationSchema.index({ applicationId: 1 });
JobApplicationSchema.index({ jobId: 1 });
JobApplicationSchema.index({ applicantEmail: 1 });
JobApplicationSchema.index({ status: 1 });

/**
 * Payroll Model
 */
export interface IPayroll extends Document {
  payrollId: string; // Unique payroll identifier
  employeeId: mongoose.Types.ObjectId; // Reference to Employee
  payPeriod: {
    startDate: Date;
    endDate: Date;
  };
  payDate: Date;
  basicSalary: number;
  allowances: {
    type: string;
    amount: number;
    description?: string;
  }[];
  deductions: {
    type: string;
    amount: number;
    description?: string;
  }[];
  grossPay: number;
  totalDeductions: number;
  netPay: number;
  currency: string;
  paymentMethod: 'bank_transfer' | 'cash' | 'cheque';
  status: 'pending' | 'processed' | 'paid' | 'cancelled';
  processedBy: mongoose.Types.ObjectId; // Employee who processed
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PayrollSchema = new Schema<IPayroll>(
  {
    payrollId: { type: String, required: true, unique: true },
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
    payPeriod: {
      startDate: { type: Date, required: true },
      endDate: { type: Date, required: true }
    },
    payDate: { type: Date, required: true },
    basicSalary: { type: Number, required: true, min: 0 },
    allowances: [{
      type: { type: String, required: true },
      amount: { type: Number, required: true, min: 0 },
      description: String
    }],
    deductions: [{
      type: { type: String, required: true },
      amount: { type: Number, required: true, min: 0 },
      description: String
    }],
    grossPay: { type: Number, required: true, min: 0 },
    totalDeductions: { type: Number, required: true, min: 0 },
    netPay: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, default: 'KES' },
    paymentMethod: {
      type: String,
      required: true,
      enum: ['bank_transfer', 'cash', 'cheque'],
      default: 'bank_transfer'
    },
    status: {
      type: String,
      required: true,
      enum: ['pending', 'processed', 'paid', 'cancelled'],
      default: 'pending'
    },
    processedBy: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
    notes: String
  },
  {
    timestamps: true
  }
);

// Index for efficient queries
PayrollSchema.index({ payrollId: 1 });
PayrollSchema.index({ employeeId: 1 });
PayrollSchema.index({ payPeriod: 1 });
PayrollSchema.index({ payDate: 1 });
PayrollSchema.index({ status: 1 });

// Create models
export const Employee = mongoose.model<IEmployee>('Employee', EmployeeSchema);
export const JobPosting = mongoose.model<IJobPosting>('JobPosting', JobPostingSchema);
export const JobApplication = mongoose.model<IJobApplication>('JobApplication', JobApplicationSchema);
export const Payroll = mongoose.model<IPayroll>('Payroll', PayrollSchema);