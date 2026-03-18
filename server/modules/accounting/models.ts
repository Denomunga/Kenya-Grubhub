import mongoose, { Schema, Document } from "mongoose";

/**
 * Chart of Accounts Model
 * Defines all accounts using standard accounting categories
 */
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

AccountSchema.index({ code: 1 });
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

JournalEntrySchema.index({ entryNumber: 1 });
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
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    notes: { type: String },
    attachments: [{ type: String }]
  },
  { timestamps: true }
);

TransactionSchema.index({ transactionNumber: 1 });
TransactionSchema.index({ transactionType: 1 });
TransactionSchema.index({ transactionDate: -1 });
TransactionSchema.index({ status: 1 });

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
ExpenseSchema.index({ expenseId: 1 });
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
RecurringExpenseSchema.index({ recurringId: 1 });
RecurringExpenseSchema.index({ expenseType: 1 });
RecurringExpenseSchema.index({ nextDueDate: 1 });
RecurringExpenseSchema.index({ isActive: 1 });
RecurringExpenseSchema.index({ autoGenerate: 1 });

export const RecurringExpense = mongoose.model<IRecurringExpense>('RecurringExpense', RecurringExpenseSchema);