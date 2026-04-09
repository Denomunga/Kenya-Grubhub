import mongoose, { Schema, Document } from 'mongoose';

export interface IBankStatement extends Document {
  statementId: string;
  fileName: string;
  uploadDate: Date;
  statementDate: Date;
  bankAccountCode: string; // e.g., '1000' (Cash)
  startingBalance: number;
  endingBalance: number;
  transactions: IBankTransaction[];
  status: 'pending' | 'matched' | 'reconciled';
  createdAt: Date;
  updatedAt: Date;
}

export interface IBankTransaction {
  transactionId: string;       // unique per statement line
  date: Date;
  description: string;
  amount: number;
  type: 'debit' | 'credit';
  matchedTo?: {
    entityType: 'Invoice' | 'Expense' | 'JournalEntry' | 'Payment';
    entityId: string;
    entityRef: string;
    matchConfidence: number;   // 0-100
  };
  isMatched: boolean;
  adjustmentEntryId?: string;   // if user creates an adjustment
  notes?: string;
}

const BankTransactionSchema = new Schema({
  transactionId: { type: String, required: true, unique: true },
  date: { type: Date, required: true },
  description: { type: String, required: true },
  amount: { type: Number, required: true },
  type: { type: String, enum: ['debit', 'credit'], required: true },
  matchedTo: {
    entityType: { type: String, enum: ['Invoice', 'Expense', 'JournalEntry', 'Payment'] },
    entityId: { type: Schema.Types.ObjectId },
    entityRef: String,
    matchConfidence: Number
  },
  isMatched: { type: Boolean, default: false },
  adjustmentEntryId: { type: Schema.Types.ObjectId, ref: 'JournalEntry' },
  notes: String
});

const BankStatementSchema = new Schema({
  statementId: { type: String, required: true, unique: true },
  fileName: String,
  uploadDate: { type: Date, default: Date.now },
  statementDate: { type: Date, required: true },
  bankAccountCode: { type: String, required: true },
  startingBalance: { type: Number, required: true },
  endingBalance: { type: Number, required: true },
  transactions: [BankTransactionSchema],
  status: { type: String, enum: ['pending', 'matched', 'reconciled'], default: 'pending' }
}, { timestamps: true });

export const BankStatement = mongoose.model<IBankStatement>('BankStatement', BankStatementSchema);