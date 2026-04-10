import csv from 'csv-parser';
import { PassThrough } from 'stream';
import { BankStatement } from '../models';
import { IBankTransaction } from '../models/bankReconciliation';
import { Invoice } from '../models';
import { Expense } from '../models';
import { Account } from '../models';
import { JournalEntryService } from '../service';
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as fuzzball from 'fuzzball';

// Initialize Gemini if API key exists
const genAI = process.env.GEMINI_API_KEY
  ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  : null;
const geminiModel = genAI?.getGenerativeModel({ model: 'gemini-1.5-flash' });

interface CsvRow {
  Date: string;
  Description: string;
  Debit?: string;
  Credit?: string;
  Balance?: string;
}

interface CandidateMatch {
  entityType: 'Invoice' | 'Expense' | 'JournalEntry' | 'Payment';
  entityId: string;
  entityRef: string;
  amount: number;
  description: string;
  date: Date;
}

export class BankReconciliationService {
  /**
   * Parse uploaded CSV file into bank transactions
   */
  static async parseStatementFile(
    fileBuffer: Buffer,
    fileType: string
  ): Promise<{ transactions: any[]; startBalance: number; endBalance: number }> {
    if (fileType === 'text/csv') {
      return new Promise((resolve, reject) => {
        const results: any[] = [];
        const bufferStream = new PassThrough();
        bufferStream.end(fileBuffer);

        bufferStream
          .pipe(csv())
          .on('data', (row: CsvRow) => results.push(row))
          .on('end', () => {
            try {
              // Normalize header casing
              const getValue = (row: any, possibleKeys: string[]) => {
                for (const key of possibleKeys) {
                  if (row[key] !== undefined) return row[key];
                }
                return undefined;
              };

              const transactions = results.map(row => {
                const dateStr = getValue(row, ['Date', 'date']);
                const description = getValue(row, ['Description', 'description']) || '';
                const debitStr = getValue(row, ['Debit', 'debit']);
                const creditStr = getValue(row, ['Credit', 'credit']);

                const debit = debitStr ? parseFloat(debitStr) : 0;
                const credit = creditStr ? parseFloat(creditStr) : 0;
                const amount = debit || credit || 0;
                const type = debit ? 'debit' : 'credit';

                return {
                  date: new Date(dateStr),
                  description,
                  amount,
                  type,
                };
              });

              const firstBalance = getValue(results[0] || {}, ['Balance', 'balance']);
              const lastBalance = getValue(results[results.length - 1] || {}, ['Balance', 'balance']);
              const startBalance = firstBalance ? parseFloat(firstBalance) : 0;
              const endBalance = lastBalance ? parseFloat(lastBalance) : 0;

              if (isNaN(startBalance) || isNaN(endBalance)) {
                throw new Error('Invalid balance values. Ensure CSV contains a "Balance" column.');
              }

              resolve({ transactions, startBalance, endBalance });
            } catch (err) {
              reject(err);
            }
          })
          .on('error', reject);
      });
    }
    throw new Error('Unsupported file type. Please upload CSV.');
  }

  /**
   * Calculate confidence score using heuristics (0-100)
   */
  private static calculateHeuristicScore(
    bankTxn: IBankTransaction,
    candidate: CandidateMatch
  ): number {
    let score = 0;

    // 1. Amount match (exact or within 1% tolerance)
    const amountDiff = Math.abs(bankTxn.amount - candidate.amount);
    const tolerance = bankTxn.amount * 0.01;
    if (amountDiff <= tolerance) {
      score += 40;
    } else if (amountDiff <= bankTxn.amount * 0.05) {
      score += 20;
    }

    // 2. Date proximity (within 3 days)
    const txnDate = new Date(bankTxn.date);
    const candDate = new Date(candidate.date);
    const dayDiff = Math.abs(
      (txnDate.getTime() - candDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (dayDiff <= 1) score += 30;
    else if (dayDiff <= 3) score += 20;
    else if (dayDiff <= 7) score += 10;

    // 3. Description fuzzy match (using fuzzball)
    const descSimilarity = fuzzball.ratio(
      bankTxn.description.toLowerCase(),
      candidate.description.toLowerCase()
    );
    score += Math.floor(descSimilarity * 0.3); // max 30 points

    // 4. Entity type bias (invoices are more likely for credits, expenses for debits)
    if (bankTxn.type === 'credit' && candidate.entityType === 'Invoice') {
      score += 10;
    } else if (bankTxn.type === 'debit' && candidate.entityType === 'Expense') {
      score += 10;
    }

    return Math.min(score, 100);
  }

  /**
   * AI-powered matching using Gemini (fallback)
   */
  private static async aiMatchWithGemini(
    bankTxn: IBankTransaction,
    candidates: CandidateMatch[]
  ): Promise<CandidateMatch | null> {
    if (!geminiModel) {
      console.warn('Gemini API key not configured. Falling back to heuristic only.');
      return null;
    }

    const prompt = `
You are a bank reconciliation assistant. Given a bank transaction and a list of candidate system transactions, choose the best match.

Bank Transaction:
- Date: ${bankTxn.date}
- Amount: ${bankTxn.amount}
- Type: ${bankTxn.type}
- Description: "${bankTxn.description}"

Candidates:
${candidates.map((c, i) => `
${i + 1}. Type: ${c.entityType}
   Reference: ${c.entityRef}
   Amount: ${c.amount}
   Date: ${c.date}
   Description: "${c.description}"
`).join('\n')}

Return a JSON object with:
{
  "selectedIndex": <number, 1-based index of best match, or 0 if none>,
  "confidence": <number 0-100>
}
`;

    try {
      const result = await geminiModel.generateContent(prompt);
      const responseText = result.response.text();
      // Extract JSON from response (Gemini may wrap in markdown)
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return null;

      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.selectedIndex && parsed.selectedIndex > 0 && parsed.selectedIndex <= candidates.length) {
        return candidates[parsed.selectedIndex - 1];
      }
      return null;
    } catch (error) {
      console.error('Gemini AI matching failed:', error);
      return null;
    }
  }

  /**
   * Main matching function: heuristic first, AI fallback if low confidence
   */
  static async findMatch(
    bankTxn: IBankTransaction
  ): Promise<{
    entityType: 'Invoice' | 'Expense' | 'JournalEntry' | 'Payment';
    entityId: string;
    entityRef: string;
    confidence: number;
  } | null> {
    // 1. Fetch candidates from database (±3 days, ±5% amount)
    const startDate = new Date(bankTxn.date);
    startDate.setDate(startDate.getDate() - 3);
    const endDate = new Date(bankTxn.date);
    endDate.setDate(endDate.getDate() + 3);

    const candidates: CandidateMatch[] = [];

    // Invoices
    const invoices = await Invoice.find({
      createdAt: { $gte: startDate, $lte: endDate },
      totalAmount: { $gte: bankTxn.amount * 0.95, $lte: bankTxn.amount * 1.05 },
      status: { $in: ['unpaid', 'partial', 'paid'] },
    }).lean();

    invoices.forEach(inv => {
      candidates.push({
        entityType: 'Invoice',
        entityId: inv._id.toString(),
        entityRef: inv.invoiceNumber,
        amount: inv.totalAmount,
        description: inv.clientName || '',
        date: inv.createdAt,
      });
    });

    // Expenses
    const expenses = await Expense.find({
      expenseDate: { $gte: startDate, $lte: endDate },
      amount: { $gte: bankTxn.amount * 0.95, $lte: bankTxn.amount * 1.05 },
      status: { $in: ['approved', 'paid'] },
    }).lean();

    expenses.forEach(exp => {
      candidates.push({
        entityType: 'Expense',
        entityId: exp._id.toString(),
        entityRef: exp.expenseId,
        amount: exp.amount,
        description: exp.description || '',
        date: exp.expenseDate,
      });
    });

    if (candidates.length === 0) return null;

    // 2. Heuristic scoring
    const scoredCandidates = candidates.map(candidate => ({
      candidate,
      score: this.calculateHeuristicScore(bankTxn, candidate),
    }));

    scoredCandidates.sort((a, b) => b.score - a.score);
    const bestHeuristic = scoredCandidates[0];

    // 3. If confidence >= 80, accept heuristic; otherwise try AI fallback
    const CONFIDENCE_THRESHOLD = 80;

    if (bestHeuristic.score >= CONFIDENCE_THRESHOLD) {
      return {
        entityType: bestHeuristic.candidate.entityType,
        entityId: bestHeuristic.candidate.entityId,
        entityRef: bestHeuristic.candidate.entityRef,
        confidence: bestHeuristic.score,
      };
    }

    // 4. Low confidence: call Gemini for better matching
    console.log(`Heuristic confidence ${bestHeuristic.score}% below threshold, invoking AI fallback...`);
    const aiMatch = await this.aiMatchWithGemini(bankTxn, candidates);

    if (aiMatch) {
      // Use AI selection but keep heuristic score as base (or use AI's confidence if provided)
      return {
        entityType: aiMatch.entityType,
        entityId: aiMatch.entityId,
        entityRef: aiMatch.entityRef,
        confidence: 85, // AI confidence could be extracted, here we set a fixed high value
      };
    }

    // 5. Fallback to best heuristic if AI fails
    if (bestHeuristic.score > 50) {
      return {
        entityType: bestHeuristic.candidate.entityType,
        entityId: bestHeuristic.candidate.entityId,
        entityRef: bestHeuristic.candidate.entityRef,
        confidence: bestHeuristic.score,
      };
    }

    return null;
  }

  /**
   * Upload and process statement
   */
  static async uploadStatement(
    fileBuffer: Buffer,
    fileName: string,
    bankAccountCode: string
  ) {
    const fileType = fileName.endsWith('.csv') ? 'text/csv' : 'application/octet-stream';
    const { transactions, startBalance, endBalance } = await this.parseStatementFile(
      fileBuffer,
      fileType
    );

    if (!transactions.length) {
      throw new Error('No transactions found in file.');
    }

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
        isMatched: false,
      })),
    });

    await statement.save();

    // Trigger background matching (fire-and-forget)
    this.autoMatchStatement(statement._id.toString()).catch(err =>
      console.error('Background auto-match error:', err)
    );

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
            matchConfidence: match.confidence,
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
  static async manualMatch(
    statementId: string,
    transactionId: string,
    matchData: any
  ) {
    const statement = await BankStatement.findOne({ statementId });
    if (!statement) throw new Error('Statement not found');

    const txn = statement.transactions.find(t => t.transactionId === transactionId);
    if (!txn) throw new Error('Transaction not found');

    txn.matchedTo = {
      entityType: matchData.entityType,
      entityId: matchData.entityId,
      entityRef: matchData.entityRef,
      matchConfidence: 100,
    };
    txn.isMatched = true;

    await statement.save();
    return statement;
  }

  /**
   * Create adjustment journal entry for discrepancy
   */
  static async createAdjustment(
    statementId: string,
    amount: number,
    description: string,
    userId: string
  ) {
    const statement = await BankStatement.findOne({ statementId });
    if (!statement) throw new Error('Statement not found');

    const adjustmentAccount = await Account.findOne({ code: '5900' });
    if (!adjustmentAccount) {
      throw new Error('Adjustment account not found. Create account 5900 - Reconciliation Discrepancy');
    }

    const entryData = {
      transactionDate: new Date(),
      description,
      lines: [
        {
          accountCode: statement.bankAccountCode,
          debit: amount > 0 ? amount : 0,
          credit: amount < 0 ? -amount : 0,
        },
        {
          accountCode: '5900',
          debit: amount < 0 ? -amount : 0,
          credit: amount > 0 ? amount : 0,
        },
      ],
      referenceType: 'BankReconciliation',
      referenceId: statement._id.toString(),
      referenceNumber: statement.statementId,
      userId,
    };

    const journalEntry = await JournalEntryService.createJournalEntry(entryData);
    await JournalEntryService.postJournalEntry(journalEntry._id.toString());

    statement.status = 'reconciled';
    await statement.save();

    return journalEntry;
  }

  /**
   * Get reconciliation summary
   */
  static async getReconciliationStatus(bankAccountCode: string) {
    const bankAccount = await Account.findOne({ code: bankAccountCode });
    if (!bankAccount) throw new Error('Bank account not found');

    const bookBalance = bankAccount.balance;

    const latestStatement = await BankStatement.findOne({
      bankAccountCode,
      status: 'reconciled',
    }).sort({ statementDate: -1 });

    const lastReconciledBalance = latestStatement?.endingBalance || 0;

    const pendingStatement = await BankStatement.findOne({
      bankAccountCode,
      status: { $in: ['pending', 'matched'] },
    });

    const unmatchedTransactions =
      pendingStatement?.transactions.filter(t => !t.isMatched) || [];

    return {
      bankAccountCode,
      bookBalance,
      lastReconciledBalance,
      pendingStatement: pendingStatement
        ? {
            statementId: pendingStatement.statementId,
            statementDate: pendingStatement.statementDate,
            endingBalance: pendingStatement.endingBalance,
            matchedCount: pendingStatement.transactions.filter(t => t.isMatched).length,
            totalCount: pendingStatement.transactions.length,
          }
        : null,
      unmatchedTransactions: unmatchedTransactions.map(t => ({
        transactionId: t.transactionId,
        date: t.date,
        description: t.description,
        amount: t.amount,
        type: t.type,
      })),
      difference: pendingStatement ? pendingStatement.endingBalance - bookBalance : 0,
    };
  }
}