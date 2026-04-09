import csv from 'csv-parser';
import { BankStatement } from '../models';
import { IBankTransaction } from '../models/bankReconciliation';
import { Invoice } from '../models';
import { Expense } from '../models';
import { Account } from '../models';
import { JournalEntryService } from '../service'; // existing
import OpenAI from 'openai';

interface CsvRow {
  Date: string;
  Description: string;
  Debit?: string;
  Credit?: string;
  Balance?: string;
}

const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

export class BankReconciliationService {
  /**
   * Parse uploaded file (CSV, OFX, MT940) into bank transactions
   * For MVP, support CSV. OFX/MT940 can be added via libraries.
   */
  static async parseStatementFile(fileBuffer: Buffer, fileType: string): Promise<{ transactions: any[]; startBalance: number; endBalance: number }> {
    if (fileType === 'text/csv') {
      return new Promise((resolve, reject) => {
        const results: any[] = [];
        const stream = require('stream');
        const bufferStream = new stream.PassThrough();
        bufferStream.end(fileBuffer);
        bufferStream
          .pipe(csv())
          .on('data', (row: CsvRow) => results.push(row))
          .on('end', () => {
            // Expect columns: Date, Description, Debit, Credit, Balance
            const transactions = results.map(row => ({
              date: new Date(row.Date),
              description: row.Description,
              amount: parseFloat(row.Debit) || parseFloat(row.Credit) || 0,
              type: row.Debit ? 'debit' : 'credit'
            }));
            const startBalance = parseFloat(results[0]?.Balance) || 0;
            const endBalance = parseFloat(results[results.length-1]?.Balance) || 0;
            resolve({ transactions, startBalance, endBalance });
          })
          .on('error', reject);
      });
    }
    throw new Error('Unsupported file type. Please upload CSV.');
  }

  /**
   * AI Matching: find best matching system transaction for a bank transaction
   */
  static async findMatch(bankTxn: IBankTransaction): Promise<{
    entityType: 'Invoice' | 'Expense' | 'JournalEntry' | 'Payment';
    entityId: string;
    entityRef: string;
    confidence: number;
  } | null> {
    // Fetch candidates from system: invoices, expenses, payments within +/- 3 days
    const startDate = new Date(bankTxn.date);
    startDate.setDate(startDate.getDate() - 3);
    const endDate = new Date(bankTxn.date);
    endDate.setDate(endDate.getDate() + 3);

    const candidates: any[] = [];

    // Invoices (amount matches roughly)
    const invoices = await Invoice.find({
      createdAt: { $gte: startDate, $lte: endDate },
      totalAmount: { $gte: bankTxn.amount * 0.95, $lte: bankTxn.amount * 1.05 },
      status: { $in: ['unpaid', 'partial', 'paid'] }
    }).lean();
    invoices.forEach(inv => candidates.push({
      entityType: 'Invoice',
      entityId: inv._id,
      entityRef: inv.invoiceNumber,
      amount: inv.totalAmount,
      description: inv.clientName,
      date: inv.createdAt
    }));

    // Expenses
    const expenses = await Expense.find({
      expenseDate: { $gte: startDate, $lte: endDate },
      amount: { $gte: bankTxn.amount * 0.95, $lte: bankTxn.amount * 1.05 },
      status: { $in: ['approved', 'paid'] }
    }).lean();
    expenses.forEach(exp => candidates.push({
      entityType: 'Expense',
      entityId: exp._id,
      entityRef: exp.expenseId,
      amount: exp.amount,
      description: exp.description,
      date: exp.expenseDate
    }));

    if (candidates.length === 0) return null;

    // Use AI to pick best match
    const prompt = `
      Bank transaction: date=${bankTxn.date}, amount=${bankTxn.amount}, description="${bankTxn.description}"
      System candidates:
      ${candidates.map(c => `- ${c.entityType} ${c.entityRef}: amount=${c.amount}, description="${c.description}", date=${c.date}`).join('\n')}
      Return the best matching candidate as JSON: { entityType, entityId, entityRef, confidence (0-100) }.
      If none good, return null.
    `;
    if (!openai) {
      throw new Error('OpenAI API key not configured. Please set OPENAI_API_KEY environment variable.');
    }

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0,
      response_format: { type: 'json_object' }
    });
    const result = JSON.parse(response.choices[0]?.message?.content || '{}');
    if (result && result.entityId) {
      return {
        entityType: result.entityType as 'Invoice' | 'Expense' | 'JournalEntry' | 'Payment',
        entityId: result.entityId,
        entityRef: result.entityRef,
        confidence: result.confidence
      };
    }
    return null;
  }

  /**
   * Upload and process statement
   */
  static async uploadStatement(fileBuffer: Buffer, fileName: string, bankAccountCode: string) {
    const fileType = fileName.endsWith('.csv') ? 'text/csv' : 'application/octet-stream';
    const { transactions, startBalance, endBalance } = await this.parseStatementFile(fileBuffer, fileType);
    
    const statementId = `BS-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const statement = new BankStatement({
      statementId,
      fileName,
      statementDate: new Date(),
      bankAccountCode,
      startingBalance: startBalance,
      endingBalance: endBalance,
      transactions: transactions.map((tx, idx) => ({
        transactionId: `${statementId}-${idx}`,
        date: tx.date,
        description: tx.description,
        amount: Math.abs(tx.amount),
        type: tx.type,
        isMatched: false
      }))
    });
    await statement.save();

    // Trigger AI matching in background (optional)
    this.autoMatchStatement(statement._id.toString()).catch(console.error);
    
    return statement;
  }

  /**
   * Auto-match all unmatched transactions in a statement
   */
  static async autoMatchStatement(statementId: string) {
    const statement = await BankStatement.findById(statementId);
    if (!statement) throw new Error('Statement not found');
    let updated = false;
    for (const txn of statement.transactions) {
      if (!txn.isMatched) {
        const match = await this.findMatch(txn);
        if (match && match.confidence > 70) {
          txn.matchedTo = {
            entityType: match.entityType,
            entityId: match.entityId,
            entityRef: match.entityRef,
            matchConfidence: match.confidence
          };
          txn.isMatched = true;
          updated = true;
        }
      }
    }
    if (updated) {
      statement.status = 'matched';
      await statement.save();
    }
    return statement;
  }

  /**
   * Manually match a bank transaction to a system entity
   */
  static async manualMatch(statementId: string, transactionId: string, matchData: any) {
    const statement = await BankStatement.findOne({ statementId });
    if (!statement) throw new Error('Statement not found');
    const txn = statement.transactions.find(t => t.transactionId === transactionId);
    if (!txn) throw new Error('Transaction not found');
    txn.matchedTo = {
      entityType: matchData.entityType,
      entityId: matchData.entityId,
      entityRef: matchData.entityRef,
      matchConfidence: 100
    };
    txn.isMatched = true;
    await statement.save();
    return statement;
  }

  /**
   * Create adjustment journal entry for discrepancy
   */
  static async createAdjustment(statementId: string, amount: number, description: string, userId: string) {
    const statement = await BankStatement.findOne({ statementId });
    if (!statement) throw new Error('Statement not found');
    // Create journal entry: Debit/Credit to "Bank Reconciliation Discrepancy" account
    const adjustmentAccount = await Account.findOne({ code: '5900' }); // create this account if missing
    if (!adjustmentAccount) throw new Error('Adjustment account not found. Create account 5900 - Reconciliation Discrepancy');
    
    const entryData = {
      transactionDate: new Date(),
      description,
      lines: [
        { accountCode: statement.bankAccountCode, debit: amount > 0 ? amount : 0, credit: amount < 0 ? -amount : 0 },
        { accountCode: '5900', debit: amount < 0 ? -amount : 0, credit: amount > 0 ? amount : 0 }
      ],
      referenceType: 'BankReconciliation',
      referenceId: statement._id.toString(),
      referenceNumber: statement.statementId,
      userId
    };
    const journalEntry = await JournalEntryService.createJournalEntry(entryData);
    await JournalEntryService.postJournalEntry(journalEntry._id.toString());
    
    // Mark all transactions as reconciled
    statement.status = 'reconciled';
    await statement.save();
    return journalEntry;
  }

  /**
   * Get reconciliation summary: book balance vs bank balance
   */
  static async getReconciliationStatus(bankAccountCode: string) {
    const bankAccount = await Account.findOne({ code: bankAccountCode });
    if (!bankAccount) throw new Error('Bank account not found');
    const bookBalance = bankAccount.balance;
    
    const latestStatement = await BankStatement.findOne({ bankAccountCode, status: 'reconciled' }).sort({ statementDate: -1 });
    const lastReconciledBalance = latestStatement?.endingBalance || 0;
    
    const pendingStatement = await BankStatement.findOne({ bankAccountCode, status: { $in: ['pending', 'matched'] } });
    const unmatchedTransactions = pendingStatement?.transactions.filter(t => !t.isMatched) || [];
    
    return {
      bankAccountCode,
      bookBalance,
      lastReconciledBalance,
      pendingStatement: pendingStatement ? {
        statementId: pendingStatement.statementId,
        statementDate: pendingStatement.statementDate,
        endingBalance: pendingStatement.endingBalance,
        matchedCount: pendingStatement.transactions.filter(t => t.isMatched).length,
        totalCount: pendingStatement.transactions.length
      } : null,
      unmatchedTransactions: unmatchedTransactions.map(t => ({
        transactionId: t.transactionId,
        date: t.date,
        description: t.description,
        amount: t.amount,
        type: t.type
      })),
      difference: pendingStatement ? (pendingStatement.endingBalance - bookBalance) : 0
    };
  }
}