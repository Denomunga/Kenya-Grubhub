import mongoose, { Schema, Document } from "mongoose";
import { BankStatement as BankStatementModel } from './models/bankReconciliation';

/**
 * Chart of Accounts Model
 * Defines all accounts using standard accounting categories
 */



export interface IInvoice extends Document {
  invoiceNumber: string;
  clientName: string;      // or supplierName if it's a purchase invoice
  amount: number;
  dueDate: Date;
  description?: string;
  status: 'unpaid' | 'paid' | 'overdue' | 'partial';
  paidAmount: number;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
  isDeleted: boolean;
  deletedAt?: Date;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const InvoiceSchema = new Schema<IInvoice>(
  {
    invoiceNumber: { type: String, required: true, unique: true },
    clientName: { type: String, required: true },
    amount: { type: Number, required: true, min: 0 },
    dueDate: { type: Date, required: true },
    description: { type: String },
    status: {
      type: String,
      enum: ['unpaid', 'paid', 'overdue', 'partial'],
      default: 'unpaid',
    },
    paidAmount: { type: Number, default: 0, min: 0 },
    taxRate: { type: Number, default: 0 },
    taxAmount: { type: Number, default: 0 },
    totalAmount: { type: Number, default: 0 },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

InvoiceSchema.index({ clientName: 1 });
InvoiceSchema.index({ dueDate: 1 });
InvoiceSchema.index({ status: 1 });
InvoiceSchema.index({ isDeleted: 1 });

export const Invoice = mongoose.model<IInvoice>('Invoice', InvoiceSchema);


export interface IAccount extends Document {
  code: string; // e.g., "1000" for assets, "2000" for liabilities
  name: string;
  category: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  subcategory?: string; // e.g., "current_asset", "fixed_asset"
  description?: string;
  normalBalance: 'debit' | 'credit'; // Normal balance side for the account
  balance: number; // Current balance
  status: 'active' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
}

const AccountSchema = new Schema<IAccount>(
  {
    code: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    category: {
      type: String,
      enum: ['asset', 'liability', 'equity', 'revenue', 'expense'],
      required: true
    },
    subcategory: { type: String },
    description: { type: String },
    normalBalance: {
      type: String,
      enum: ['debit', 'credit'],
      required: true
    },
    balance: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active'
    }
  },
  { timestamps: true }
);

AccountSchema.index({ category: 1 });

export const Account = mongoose.model<IAccount>('Account', AccountSchema);

/**
 * Journal Entry Model
 * Records individual debit and credit entries
 */
export interface IJournalEntryLine {
  accountId: mongoose.Types.ObjectId;
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
  description?: string;
}

export interface IJournalEntry extends Document {
  entryNumber: string;
  transactionDate: Date;
  description: string;
  referenceType?: string; // "PurchaseOrder", "Invoice", etc.
  referenceId?: mongoose.Types.ObjectId;
  referenceNumber?: string;
  lines: IJournalEntryLine[];
  totalDebit: number;
  totalCredit: number;
  balanced: boolean; // Debit = Credit
  createdBy: mongoose.Types.ObjectId; // User who created
  approvedBy?: mongoose.Types.ObjectId;
  approvalDate?: Date;
  status: 'draft' | 'posted' | 'reversed';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const JournalEntryLineSchema = new Schema<IJournalEntryLine>(
  {
    accountId: { type: Schema.Types.ObjectId, ref: 'Account', required: true },
    accountCode: { type: String, required: true },
    accountName: { type: String, required: true },
    debit: { type: Number, default: 0 },
    credit: { type: Number, default: 0 },
    description: { type: String }
  },
  { _id: false }
);

const JournalEntrySchema = new Schema<IJournalEntry>(
  {
    entryNumber: { type: String, required: true, unique: true },
    transactionDate: { type: Date, required: true, default: Date.now },
    description: { type: String, required: true },
    referenceType: { type: String },
    referenceId: { type: Schema.Types.ObjectId },
    referenceNumber: { type: String },
    lines: [JournalEntryLineSchema],
    totalDebit: { type: Number, required: true },
    totalCredit: { type: Number, required: true },
    balanced: { type: Boolean, default: false },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvalDate: { type: Date },
    status: {
      type: String,
      enum: ['draft', 'posted', 'reversed'],
      default: 'draft'
    },
    notes: { type: String }
  },
  { timestamps: true }
);

JournalEntrySchema.index({ transactionDate: -1 });
JournalEntrySchema.index({ status: 1 });
JournalEntrySchema.index({ referenceId: 1 });

export const JournalEntry = mongoose.model<IJournalEntry>('JournalEntry', JournalEntrySchema);

/**
 * Transaction Model
 * High-level business transaction (e.g., purchase, sale, payment)
 */
export interface ITransaction extends Document {
  transactionNumber: string;
  transactionType: 'purchase' | 'sale' | 'payment' | 'receipt' | 'adjustment' | 'transfer';
  transactionDate: Date;
  description: string;
  referenceType?: string; // "PurchaseOrder", "Invoice", etc.
  referenceId?: mongoose.Types.ObjectId;
  referenceNumber?: string;
  journalEntries: mongoose.Types.ObjectId[]; // Links to journal entries
  totalAmount: number;
  status: 'pending' | 'recorded' | 'posted' | 'cancelled';
  isDeleted: boolean;
  deletedAt?: Date;
  createdBy: mongoose.Types.ObjectId;
  notes?: string;
  attachments?: string[];
  createdAt: Date;
  updatedAt: Date;
}

const TransactionSchema = new Schema<ITransaction>(
  {
    transactionNumber: { type: String, required: true, unique: true },
    transactionType: {
      type: String,
      enum: ['purchase', 'sale', 'payment', 'receipt', 'adjustment', 'transfer'],
      required: true
    },
    transactionDate: { type: Date, required: true, default: Date.now },
    description: { type: String, required: true },
    referenceType: { type: String },
    referenceId: { type: Schema.Types.ObjectId },
    referenceNumber: { type: String },
    journalEntries: [{ type: Schema.Types.ObjectId, ref: 'JournalEntry' }],
    totalAmount: { type: Number, required: true },
    status: {
      type: String,
      enum: ['pending', 'recorded', 'posted', 'cancelled'],
      default: 'pending'
    },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    notes: { type: String },
    attachments: [{ type: String }]
  },
  { timestamps: true }
);

TransactionSchema.index({ transactionType: 1 });
TransactionSchema.index({ transactionDate: -1 });
TransactionSchema.index({ status: 1 });
TransactionSchema.index({ isDeleted: 1 });

export const Transaction = mongoose.model<ITransaction>('Transaction', TransactionSchema);

/**
 * Trial Balance / Financial Statement Snapshot
 * Historical record of account balances
 */
export interface IFinancialStatement extends Document {
  statementDate: Date;
  statementType: 'trial_balance' | 'balance_sheet' | 'income_statement';
  accountBalances: {
    accountId: mongoose.Types.ObjectId;
    accountCode: string;
    accountName: string;
    category: string;
    debitBalance: number;
    creditBalance: number;
  }[];
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  totalRevenue: number;
  totalExpenses: number;
  netIncome: number;
  createdAt: Date;
  updatedAt: Date;
}

const FinancialStatementSchema = new Schema<IFinancialStatement>(
  {
    statementDate: { type: Date, required: true },
    statementType: {
      type: String,
      enum: ['trial_balance', 'balance_sheet', 'income_statement'],
      required: true
    },
    accountBalances: [
      {
        accountId: { type: Schema.Types.ObjectId, ref: 'Account' },
        accountCode: String,
        accountName: String,
        category: String,
        debitBalance: Number,
        creditBalance: Number
      }
    ],
    totalAssets: { type: Number, default: 0 },
    totalLiabilities: { type: Number, default: 0 },
    totalEquity: { type: Number, default: 0 },
    totalRevenue: { type: Number, default: 0 },
    totalExpenses: { type: Number, default: 0 },
    netIncome: { type: Number, default: 0 }
  },
  { timestamps: true }
);

FinancialStatementSchema.index({ statementDate: -1 });
FinancialStatementSchema.index({ statementType: 1 });

export const FinancialStatement = mongoose.model<IFinancialStatement>(
  'FinancialStatement',
  FinancialStatementSchema
);

/**
 * Expense Model
 * Tracks individual business expenses
 */
export interface IExpense extends Document {
  expenseId: string; // Unique expense identifier
  expenseType: 'rent' | 'electricity' | 'water' | 'internet' | 'insurance' | 'maintenance' | 'supplies' | 'marketing' | 'travel' | 'professional_services' | 'other';
  description: string;
  amount: number;
  currency: string;
  expenseDate: Date;
  dueDate?: Date;
  paymentDate?: Date;
  vendor?: string;
  vendorId?: mongoose.Types.ObjectId; // Reference to Supplier if applicable
  category: string; // e.g., "Office Expenses", "Utilities"
  accountCode: string; // Expense account code (e.g., "5200" for Rent Expense)
  paymentMethod: 'cash' | 'bank_transfer' | 'credit_card' | 'cheque' | 'mpesa';
  receiptUrl?: string;
  notes?: string;
  status: 'pending' | 'approved' | 'paid' | 'cancelled' | 'overdue';
  approvedBy?: mongoose.Types.ObjectId;
  approvalDate?: Date;
  createdBy: mongoose.Types.ObjectId;
  journalEntryId?: mongoose.Types.ObjectId; // Link to accounting journal entry
  recurringExpenseId?: mongoose.Types.ObjectId; // If generated from recurring expense
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

const ExpenseSchema = new Schema<IExpense>(
  {
    expenseId: { type: String, required: true, unique: true },
    expenseType: {
      type: String,
      enum: ['rent', 'electricity', 'water', 'internet', 'insurance', 'maintenance', 'supplies', 'marketing', 'travel', 'professional_services', 'other'],
      required: true
    },
    description: { type: String, required: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, default: 'KES' },
    expenseDate: { type: Date, required: true },
    dueDate: { type: Date },
    paymentDate: { type: Date },
    vendor: { type: String },
    vendorId: { type: Schema.Types.ObjectId, ref: 'Supplier' },
    category: { type: String, required: true },
    accountCode: { type: String, required: true },
    paymentMethod: {
      type: String,
      enum: ['cash', 'bank_transfer', 'credit_card', 'cheque', 'mpesa'],
      required: true
    },
    receiptUrl: { type: String },
    notes: { type: String },
    status: {
      type: String,
      enum: ['pending', 'approved', 'paid', 'cancelled', 'overdue'],
      default: 'pending'
    },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvalDate: { type: Date },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    journalEntryId: { type: Schema.Types.ObjectId, ref: 'JournalEntry' },
    recurringExpenseId: { type: Schema.Types.ObjectId, ref: 'RecurringExpense' },
    tags: [{ type: String }]
  },
  { timestamps: true }
);

// Indexes for efficient queries
ExpenseSchema.index({ expenseType: 1 });
ExpenseSchema.index({ expenseDate: -1 });
ExpenseSchema.index({ dueDate: 1 });
ExpenseSchema.index({ status: 1 });
ExpenseSchema.index({ accountCode: 1 });
ExpenseSchema.index({ createdBy: 1 });

export const Expense = mongoose.model<IExpense>('Expense', ExpenseSchema);

/**
 * Recurring Expense Model
 * Defines expenses that repeat monthly (rent, utilities, etc.)
 */
export interface IRecurringExpense extends Document {
  recurringId: string; // Unique recurring expense identifier
  expenseType: 'rent' | 'electricity' | 'water' | 'internet' | 'insurance' | 'maintenance' | 'subscription' | 'other';
  description: string;
  amount: number;
  currency: string;
  frequency: 'monthly' | 'quarterly' | 'yearly';
  startDate: Date;
  endDate?: Date; // Optional end date
  nextDueDate: Date;
  lastGeneratedDate?: Date;
  vendor?: string;
  vendorId?: mongoose.Types.ObjectId; // Reference to Supplier
  category: string;
  accountCode: string; // Expense account code
  paymentMethod: 'cash' | 'bank_transfer' | 'credit_card' | 'cheque' | 'mpesa';
  autoGenerate: boolean; // Whether to auto-generate expenses
  autoApprove: boolean; // Whether to auto-approve generated expenses
  isActive: boolean;
  notes?: string;
  createdBy: mongoose.Types.ObjectId;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

const RecurringExpenseSchema = new Schema<IRecurringExpense>(
  {
    recurringId: { type: String, required: true, unique: true },
    expenseType: {
      type: String,
      enum: ['rent', 'electricity', 'water', 'internet', 'insurance', 'maintenance', 'subscription', 'other'],
      required: true
    },
    description: { type: String, required: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, default: 'KES' },
    frequency: {
      type: String,
      enum: ['monthly', 'quarterly', 'yearly'],
      required: true,
      default: 'monthly'
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date },
    nextDueDate: { type: Date, required: true },
    lastGeneratedDate: { type: Date },
    vendor: { type: String },
    vendorId: { type: Schema.Types.ObjectId, ref: 'Supplier' },
    category: { type: String, required: true },
    accountCode: { type: String, required: true },
    paymentMethod: {
      type: String,
      enum: ['cash', 'bank_transfer', 'credit_card', 'cheque', 'mpesa'],
      required: true
    },
    autoGenerate: { type: Boolean, default: true },
    autoApprove: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    notes: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    tags: [{ type: String }]
  },
  { timestamps: true }
);

// Indexes for efficient queries
RecurringExpenseSchema.index({ expenseType: 1 });
RecurringExpenseSchema.index({ nextDueDate: 1 });
RecurringExpenseSchema.index({ isActive: 1 });
RecurringExpenseSchema.index({ autoGenerate: 1 });

export const RecurringExpense = mongoose.model<IRecurringExpense>('RecurringExpense', RecurringExpenseSchema);

// ============================================================
// AUDIT LOG MODEL
// ============================================================
export interface IAuditLog extends Document {
  action: 'create' | 'update' | 'delete' | 'approve' | 'post' | 'reverse' | 'pay' | 'export';
  entityType: string;
  entityId: mongoose.Types.ObjectId;
  entityRef?: string;
  userId: mongoose.Types.ObjectId;
  userName?: string;
  changes?: Record<string, { old: any; new: any }>;
  metadata?: Record<string, any>;
  ipAddress?: string;
  createdAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    action: { type: String, enum: ['create', 'update', 'delete', 'approve', 'post', 'reverse', 'pay', 'export'], required: true },
    entityType: { type: String, required: true },
    entityId: { type: Schema.Types.ObjectId, required: true },
    entityRef: { type: String },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    userName: { type: String },
    changes: { type: Schema.Types.Mixed },
    metadata: { type: Schema.Types.Mixed },
    ipAddress: { type: String },
  },
  { timestamps: true }
);

AuditLogSchema.index({ entityType: 1, entityId: 1 });
AuditLogSchema.index({ userId: 1 });
AuditLogSchema.index({ createdAt: -1 });
AuditLogSchema.index({ action: 1 });

export const AuditLog = mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);

// ============================================================
// TAX RATE MODEL
// ============================================================
export interface ITaxRate extends Document {
  name: string;
  code: string;
  rate: number;
  type: 'vat' | 'withholding' | 'excise' | 'custom';
  description?: string;
  isDefault: boolean;
  isActive: boolean;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const TaxRateSchema = new Schema<ITaxRate>(
  {
    name: { type: String, required: true },
    code: { type: String, required: true, unique: true },
    rate: { type: Number, required: true, min: 0, max: 100 },
    type: { type: String, enum: ['vat', 'withholding', 'excise', 'custom'], required: true },
    description: { type: String },
    isDefault: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

TaxRateSchema.index({ type: 1 });

export const TaxRate = mongoose.model<ITaxRate>('TaxRate', TaxRateSchema);
// ============================================================
// RECURRING INVOICE MODEL
// ============================================================
export interface IRecurringInvoice extends Document {
  recurringId: string;
  clientName: string;
  amount: number;
  description?: string;
  frequency: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  startDate: Date;
  endDate?: Date;
  nextDueDate: Date;
  lastGeneratedDate?: Date;
  dayOfMonth?: number;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
  autoGenerate: boolean;
  isActive: boolean;
  generatedCount: number;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const RecurringInvoiceSchema = new Schema<IRecurringInvoice>(
  {
    recurringId: { type: String, required: true, unique: true },
    clientName: { type: String, required: true },
    amount: { type: Number, required: true, min: 0 },
    description: { type: String },
    frequency: { type: String, enum: ['weekly', 'monthly', 'quarterly', 'yearly'], required: true, default: 'monthly' },
    startDate: { type: Date, required: true },
    endDate: { type: Date },
    nextDueDate: { type: Date, required: true },
    lastGeneratedDate: { type: Date },
    dayOfMonth: { type: Number, min: 1, max: 28 },
    taxRate: { type: Number, default: 0 },
    taxAmount: { type: Number, default: 0 },
    totalAmount: { type: Number, default: 0 },
    autoGenerate: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true },
    generatedCount: { type: Number, default: 0 },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

RecurringInvoiceSchema.index({ nextDueDate: 1 });
RecurringInvoiceSchema.index({ isActive: 1 });

export const RecurringInvoice = mongoose.model<IRecurringInvoice>('RecurringInvoice', RecurringInvoiceSchema);

export { BankStatement as BankStatementModel } from './models/bankReconciliation';
export const BankStatement = BankStatementModel;

