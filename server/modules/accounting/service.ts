import {
  Account,
  IAccount,
  JournalEntry,
  Transaction,
  FinancialStatement,
  Expense,
  IExpense,
  RecurringExpense,
  IRecurringExpense
} from './models';
import { PurchaseOrder } from '../procurement/models';

/**
 * Accounting Service
 * Implements double-entry bookkeeping
 * Every debit must have an equal and opposite credit
 */

export interface JournalEntryLine {
  accountCode: string;
  debit?: number;
  credit?: number;
  description?: string;
}

export interface CreateJournalEntryData {
  transactionDate: Date;
  description: string;
  lines: JournalEntryLine[];
  referenceType?: string;
  referenceId?: string;
  referenceNumber?: string;
  userId: string;
}

// ============================================================
// CHART OF ACCOUNTS SERVICE
// ============================================================
export class ChartOfAccountsService {
  /**
   * Initialize default chart of accounts
   */
  static async initializeDefaultAccounts() {
    try {
      const existingAccounts = await Account.countDocuments();
      if (existingAccounts > 0) {
        console.log('Chart of accounts already initialized');
        return;
      }

      const defaultAccounts: Partial<IAccount>[] = [
        // ASSETS (Normal Balance: Debit)
        { code: '1000', name: 'Cash', category: 'asset', subcategory: 'current_asset', normalBalance: 'debit' },
        { code: '1100', name: 'Petty Cash', category: 'asset', subcategory: 'current_asset', normalBalance: 'debit' },
        { code: '1200', name: 'Accounts Receivable', category: 'asset', subcategory: 'current_asset', normalBalance: 'debit' },
        { code: '1300', name: 'Inventory', category: 'asset', subcategory: 'current_asset', normalBalance: 'debit' },
        { code: '1500', name: 'Equipment', category: 'asset', subcategory: 'fixed_asset', normalBalance: 'debit' },
        { code: '1600', name: 'Accumulated Depreciation', category: 'asset', subcategory: 'fixed_asset', normalBalance: 'credit' },

        // LIABILITIES (Normal Balance: Credit)
        { code: '2000', name: 'Accounts Payable', category: 'liability', subcategory: 'current_liability', normalBalance: 'credit' },
        { code: '2100', name: 'Short-term Debt', category: 'liability', subcategory: 'current_liability', normalBalance: 'credit' },
        { code: '2200', name: 'Salaries Payable', category: 'liability', subcategory: 'current_liability', normalBalance: 'credit' },
        { code: '2500', name: 'Long-term Debt', category: 'liability', subcategory: 'long_term_liability', normalBalance: 'credit' },

        // EQUITY (Normal Balance: Credit)
        { code: '3000', name: 'Owner Capital', category: 'equity', normalBalance: 'credit' },
        { code: '3100', name: 'Retained Earnings', category: 'equity', normalBalance: 'credit' },
        { code: '3200', name: 'Dividends', category: 'equity', normalBalance: 'debit' },

        // REVENUE (Normal Balance: Credit)
        { code: '4000', name: 'Sales Revenue', category: 'revenue', normalBalance: 'credit' },
        { code: '4100', name: 'Service Revenue', category: 'revenue', normalBalance: 'credit' },
        { code: '4200', name: 'Other Revenue', category: 'revenue', normalBalance: 'credit' },

        // EXPENSES (Normal Balance: Debit)
        { code: '5000', name: 'Cost of Goods Sold', category: 'expense', normalBalance: 'debit' },
        { code: '5100', name: 'Salaries Expense', category: 'expense', normalBalance: 'debit' },
        { code: '5200', name: 'Rent Expense', category: 'expense', normalBalance: 'debit' },
        { code: '5300', name: 'Utilities Expense', category: 'expense', normalBalance: 'debit' },
        { code: '5400', name: 'Depreciation Expense', category: 'expense', normalBalance: 'debit' },
        { code: '5500', name: 'Office Supplies Expense', category: 'expense', normalBalance: 'debit' },
        { code: '5600', name: 'Miscellaneous Expense', category: 'expense', normalBalance: 'debit' }
      ];

      // Create default accounts
      for (const accountData of defaultAccounts) {
        const account = new Account(accountData);
        await account.save();
      }

      console.log(`✓ Initialized ${defaultAccounts.length} default accounts`);
    } catch (error: any) {
      throw new Error(`Failed to initialize accounts: ${error?.message || String(error)}`);
    }
  }

  static async getAccount(code: string) {
    try {
      const account = await Account.findOne({ code });
      if (!account) throw new Error(`Account ${code} not found`);
      return account;
    } catch (error: any) {
      throw new Error(`Failed to fetch account: ${error?.message || String(error)}`);
    }
  }

  static async getAllAccounts() {
    try {
      const accounts = await Account.find({ status: 'active' }).sort({ code: 1 });
      return accounts;
    } catch (error: any) {
      throw new Error(`Failed to fetch accounts: ${error?.message || String(error)}`);
    }
  }
}

// ============================================================
// JOURNAL ENTRY SERVICE
// ============================================================
export class JournalEntryService {
  /**
   * Create a journal entry with double-entry bookkeeping
   * Automatically debits one account and credits another (or multiple)
   */
  static async createJournalEntry(data: CreateJournalEntryData) {
    try {
      // Fetch all accounts for validation
      const accountsMap = new Map<string, IAccount>();
      for (const account of await ChartOfAccountsService.getAllAccounts()) {
        accountsMap.set(account.code, account);
      }

      // Validate and prepare journal entry lines
      let totalDebit = 0;
      let totalCredit = 0;
      const journalLines: any[] = [];

      for (const line of data.lines) {
        const account = accountsMap.get(line.accountCode);
        if (!account) throw new Error(`Account ${line.accountCode} not found`);

        const debit = line.debit || 0;
        const credit = line.credit || 0;

        // Account can't have both debit and credit
        if (debit > 0 && credit > 0) {
          throw new Error(`Account ${line.accountCode} cannot have both debit and credit`);
        }

        totalDebit += debit;
        totalCredit += credit;

        journalLines.push({
          accountId: account._id,
          accountCode: account.code,
          accountName: account.name,
          debit,
          credit,
          description: line.description
        });
      }

      // Verify double-entry bookkeeping: Debits must equal Credits
      const balanced = Math.abs(totalDebit - totalCredit) < 0.01;
      if (!balanced) {
        throw new Error(
          `Journal entry not balanced. Total Debit: ${totalDebit}, Total Credit: ${totalCredit}`
        );
      }

      // Generate entry number
      const entryNumber = `JE-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Create journal entry
      const journalEntry = new JournalEntry({
        entryNumber,
        transactionDate: data.transactionDate,
        description: data.description,
        referenceType: data.referenceType,
        referenceId: data.referenceId,
        referenceNumber: data.referenceNumber,
        lines: journalLines,
        totalDebit,
        totalCredit,
        balanced,
        createdBy: data.userId,
        status: 'draft'
      });

      await journalEntry.save();

      // Update account balances (draft entries don't affect balances yet)
      // Only posted entries update account balances
      
      return journalEntry;
    } catch (error: any) {
      throw new Error(`Failed to create journal entry: ${error?.message || String(error)}`);
    }
  }

  /**
   * Post a journal entry (apply it to account balances)
   */
  static async postJournalEntry(entryId: string) {
    try {
      const journalEntry = await JournalEntry.findById(entryId);
      if (!journalEntry) throw new Error('Journal entry not found');

      if (!journalEntry.balanced) {
        throw new Error('Cannot post unbalanced journal entry');
      }

      // Update account balances
      for (const line of journalEntry.lines) {
        const account = await Account.findById(line.accountId);
        if (!account) throw new Error(`Account not found`);

        // Apply debit or credit to account balance
        if (line.debit > 0) {
          // Debit increases asset/expense accounts, decreases liability/equity/revenue
          if (['asset', 'expense'].includes(account.category)) {
            account.balance += line.debit;
          } else {
            account.balance -= line.debit;
          }
        }

        if (line.credit > 0) {
          // Credit decreases asset/expense accounts, increases liability/equity/revenue
          if (['asset', 'expense'].includes(account.category)) {
            account.balance -= line.credit;
          } else {
            account.balance += line.credit;
          }
        }

        await account.save();
      }

      // Mark entry as posted
      journalEntry.status = 'posted';
      await journalEntry.save();

      return journalEntry;
    } catch (error: any) {
      throw new Error(`Failed to post journal entry: ${error?.message || String(error)}`);
    }
  }

  static async getJournalEntries(filters: any = {}, page = 1, limit = 50) {
    try {
      const query: any = {};
      if (filters.status) query.status = filters.status;

      const skip = (page - 1) * limit;
      const entries = await JournalEntry
        .find(query)
        .populate('lines.accountId', 'code name')
        .sort({ transactionDate: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

      const total = await JournalEntry.countDocuments(query);

      return {
        entries,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) }
      };
    } catch (error: any) {
      throw new Error(`Failed to fetch journal entries: ${error?.message || String(error)}`);
    }
  }
}

// ============================================================
// TRANSACTION SERVICE
// ============================================================
export class TransactionService {
  /**
   * Record a purchase transaction (from procurement)
   * Creates journal entry: Debit Inventory/Expense, Credit Accounts Payable
   */
  static async recordPurchaseTransaction(
    purchaseOrderId: string,
    poNumber: string,
    totalAmount: number,
    userId: string
  ) {
    try {
      const purchaseOrder = await PurchaseOrder.findById(purchaseOrderId).populate('items.inventoryItemId');
      if (!purchaseOrder) throw new Error('Purchase order not found');

      const transactionNumber = `TRX-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Create journal entry for purchase
      // Debit: Inventory (1300) or Expense (5000)
      // Credit: Accounts Payable (2000)
      const journalEntryData: CreateJournalEntryData = {
        transactionDate: new Date(),
        description: `Purchase Order ${poNumber} - Total: ${totalAmount}`,
        lines: [
          {
            accountCode: '1300', // Inventory
            debit: totalAmount,
            description: `Inventory for PO ${poNumber}`
          },
          {
            accountCode: '2000', // Accounts Payable
            credit: totalAmount,
            description: `Liability to supplier for PO ${poNumber}`
          }
        ],
        referenceType: 'PurchaseOrder',
        referenceId: purchaseOrderId,
        referenceNumber: poNumber,
        userId
      };

      const journalEntry = await JournalEntryService.createJournalEntry(journalEntryData);
      await JournalEntryService.postJournalEntry(journalEntry._id.toString());

      // Create transaction record
      const transaction = new Transaction({
        transactionNumber,
        transactionType: 'purchase',
        transactionDate: new Date(),
        description: `Purchase Order ${poNumber}`,
        referenceType: 'PurchaseOrder',
        referenceId: purchaseOrderId,
        referenceNumber: poNumber,
        journalEntries: [journalEntry._id],
        totalAmount,
        status: 'posted',
        createdBy: userId
      });

      await transaction.save();
      return transaction;
    } catch (error: any) {
      throw new Error(`Failed to record purchase transaction: ${error?.message || String(error)}`);
    }
  }

  /**
   * Record a payment transaction
   * Debit: Accounts Payable, Credit: Cash
   */
  static async recordPaymentTransaction(
    supplierId: string,
    amount: number,
    description: string,
    userId: string
  ) {
    try {
      const transactionNumber = `PAY-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const journalEntryData: CreateJournalEntryData = {
        transactionDate: new Date(),
        description,
        lines: [
          {
            accountCode: '2000', // Accounts Payable
            debit: amount,
            description: `Payment to supplier`
          },
          {
            accountCode: '1000', // Cash
            credit: amount,
            description: `Cash payment`
          }
        ],
        referenceType: 'Supplier',
        referenceId: supplierId,
        userId
      };

      const journalEntry = await JournalEntryService.createJournalEntry(journalEntryData);
      await JournalEntryService.postJournalEntry(journalEntry._id.toString());

      const transaction = new Transaction({
        transactionNumber,
        transactionType: 'payment',
        transactionDate: new Date(),
        description,
        journalEntries: [journalEntry._id],
        totalAmount: amount,
        status: 'posted',
        createdBy: userId
      });

      await transaction.save();
      return transaction;
    } catch (error: any) {
      throw new Error(`Failed to record payment transaction: ${error?.message || String(error)}`);
    }
  }
}

// ============================================================
// FINANCIAL REPORTING SERVICE
// ============================================================
export class FinancialReportingService {
  /**
   * Generate trial balance (all accounts with their balances)
   */
  static async generateTrialBalance() {
    try {
      const accounts = await Account.find({ status: 'active' });

      const accountBalances = accounts.map(account => ({
        accountId: account._id,
        accountCode: account.code,
        accountName: account.name,
        category: account.category,
        debitBalance: ['asset', 'expense'].includes(account.category) ? Math.max(0, account.balance) : 0,
        creditBalance: ['liability', 'equity', 'revenue'].includes(account.category) ? Math.max(0, account.balance) : 0
      }));

      let totalDebits = 0;
      let totalCredits = 0;

      accountBalances.forEach(balance => {
        totalDebits += balance.debitBalance;
        totalCredits += balance.creditBalance;
      });

      const statement = new FinancialStatement({
        statementDate: new Date(),
        statementType: 'trial_balance',
        accountBalances,
        totalAssets: accountBalances
          .filter(b => b.category === 'asset')
          .reduce((sum, b) => sum + b.debitBalance, 0),
        totalLiabilities: accountBalances
          .filter(b => b.category === 'liability')
          .reduce((sum, b) => sum + b.creditBalance, 0),
        totalEquity: accountBalances
          .filter(b => b.category === 'equity')
          .reduce((sum, b) => sum + b.creditBalance, 0)
      });

      await statement.save();
      return statement;
    } catch (error: any) {
      throw new Error(`Failed to generate trial balance: ${error?.message || String(error)}`);
    }
  }

  /**
   * Get financial summary
   */
  static async getFinancialSummary() {
    try {
      const accounts = await Account.find({ status: 'active' });

      const summary = {
        assets: accounts
          .filter(a => a.category === 'asset')
          .reduce((sum, a) => sum + a.balance, 0),
        liabilities: accounts
          .filter(a => a.category === 'liability')
          .reduce((sum, a) => sum + a.balance, 0),
        equity: accounts
          .filter(a => a.category === 'equity')
          .reduce((sum, a) => sum + a.balance, 0),
        revenue: accounts
          .filter(a => a.category === 'revenue')
          .reduce((sum, a) => sum + a.balance, 0),
        expenses: accounts
          .filter(a => a.category === 'expense')
          .reduce((sum, a) => sum + a.balance, 0),
        netIncome: 0
      };

      summary.netIncome = summary.revenue - summary.expenses;

      return summary;
    } catch (error: any) {
      throw new Error(`Failed to get financial summary: ${error?.message || String(error)}`);
    }
  }

  /**
   * Get account details with all transactions
   */
  static async getAccountLedger(accountCode: string, page = 1, limit = 100) {
    try {
      const account = await Account.findOne({ code: accountCode });
      if (!account) throw new Error('Account not found');

      const skip = (page - 1) * limit;

      // Get all journal entries for this account
      const entries = await JournalEntry
        .find({
          'lines.accountCode': accountCode,
          status: 'posted'
        })
        .sort({ transactionDate: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

      const total = await JournalEntry.countDocuments({
        'lines.accountCode': accountCode,
        status: 'posted'
      });

      return {
        account: {
          code: account.code,
          name: account.name,
          balance: account.balance
        },
        entries,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) }
      };
    } catch (error: any) {
      throw new Error(`Failed to get account ledger: ${error?.message || String(error)}`);
    }
  }
}

// ============================================================
// EXPENSE SERVICE
// ============================================================
export class ExpenseService {
  static async getExpenses(filters: any = {}, page = 1, limit = 50) {
    try {
      const query: any = {};

      if (filters.status) query.status = filters.status;
      if (filters.expenseType) query.expenseType = filters.expenseType;
      if (filters.category) query.category = filters.category;
      if (filters.vendor) query.vendor = { $regex: filters.vendor, $options: 'i' };

      // Date range filter
      if (filters.startDate || filters.endDate) {
        query.expenseDate = {};
        if (filters.startDate) query.expenseDate.$gte = new Date(filters.startDate);
        if (filters.endDate) query.expenseDate.$lte = new Date(filters.endDate);
      }

      const skip = (page - 1) * limit;

      const expenses = await Expense
        .find(query)
        .populate('vendorId', 'name email')
        .populate('approvedBy', 'firstName lastName')
        .populate('createdBy', 'firstName lastName')
        .sort({ expenseDate: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

      const total = await Expense.countDocuments(query);

      return {
        expenses,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) }
      };
    } catch (error: any) {
      throw new Error(`Failed to fetch expenses: ${error?.message || String(error)}`);
    }
  }

  static async getExpenseById(id: string) {
    try {
      const expense = await Expense
        .findById(id)
        .populate('vendorId', 'name email phone')
        .populate('approvedBy', 'firstName lastName employeeId')
        .populate('createdBy', 'firstName lastName employeeId')
        .populate('journalEntryId');

      if (!expense) throw new Error('Expense not found');
      return expense;
    } catch (error: any) {
      throw new Error(`Failed to fetch expense: ${error?.message || String(error)}`);
    }
  }

  static async createExpense(data: Partial<IExpense>) {
    try {
      // Generate unique expense ID
      const expenseId = `EXP-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

      const expense = new Expense({
        ...data,
        expenseId
      });

      await expense.save();
      return expense;
    } catch (error: any) {
      throw new Error(`Failed to create expense: ${error?.message || String(error)}`);
    }
  }

  static async updateExpense(id: string, data: Partial<IExpense>) {
    try {
      const expense = await Expense.findByIdAndUpdate(
        id,
        { ...data, updatedAt: new Date() },
        { new: true, runValidators: true }
      );

      if (!expense) throw new Error('Expense not found');
      return expense;
    } catch (error: any) {
      throw new Error(`Failed to update expense: ${error?.message || String(error)}`);
    }
  }

  static async approveExpense(id: string, approvedBy: string) {
    try {
      const expense = await Expense.findByIdAndUpdate(
        id,
        {
          status: 'approved',
          approvedBy,
          approvalDate: new Date(),
          updatedAt: new Date()
        },
        { new: true }
      );

      if (!expense) throw new Error('Expense not found');
      return expense;
    } catch (error: any) {
      throw new Error(`Failed to approve expense: ${error?.message || String(error)}`);
    }
  }

  static async markExpenseAsPaid(id: string, paymentDate?: Date) {
    try {
      const expense = await Expense.findByIdAndUpdate(
        id,
        {
          status: 'paid',
          paymentDate: paymentDate || new Date(),
          updatedAt: new Date()
        },
        { new: true }
      );

      if (!expense) throw new Error('Expense not found');

      // Create journal entry for the expense payment
      await this.createExpenseJournalEntry(expense);

      return expense;
    } catch (error: any) {
      throw new Error(`Failed to mark expense as paid: ${error?.message || String(error)}`);
    }
  }

  /**
   * Create journal entry when expense is paid
   * Debit: Expense account, Credit: Cash/Bank
   */
  static async createExpenseJournalEntry(expense: IExpense) {
    try {
      // Determine payment account based on payment method
      let paymentAccountCode = '1000'; // Default to Cash
      switch (expense.paymentMethod) {
        case 'bank_transfer':
          paymentAccountCode = '1000'; // Cash/Bank
          break;
        case 'credit_card':
          paymentAccountCode = '1000'; // Could be a separate credit card account
          break;
        case 'cheque':
          paymentAccountCode = '1000'; // Cash/Bank
          break;
        case 'mpesa':
          paymentAccountCode = '1000'; // Cash/Bank
          break;
        default:
          paymentAccountCode = '1000';
      }

      const journalEntryData: CreateJournalEntryData = {
        transactionDate: expense.paymentDate || new Date(),
        description: `Expense Payment: ${expense.description}`,
        lines: [
          {
            accountCode: expense.accountCode, // Expense account (e.g., "5200" for Rent)
            debit: expense.amount,
            description: expense.description
          },
          {
            accountCode: paymentAccountCode, // Cash/Bank account
            credit: expense.amount,
            description: `Payment for ${expense.description}`
          }
        ],
        referenceType: 'Expense',
        referenceId: expense._id.toString(),
        referenceNumber: expense.expenseId,
        userId: expense.createdBy.toString()
      };

      const journalEntry = await JournalEntryService.createJournalEntry(journalEntryData);
      await JournalEntryService.postJournalEntry(journalEntry._id.toString());

      // Link journal entry to expense
      await Expense.findByIdAndUpdate(expense._id, {
        journalEntryId: journalEntry._id
      });

      return journalEntry;
    } catch (error: any) {
      throw new Error(`Failed to create expense journal entry: ${error?.message || String(error)}`);
    }
  }

  static async getExpenseStats() {
    try {
      const stats = await Expense.aggregate([
        {
          $group: {
            _id: null,
            totalExpenses: { $sum: '$amount' },
            pendingExpenses: {
              $sum: { $cond: [{ $eq: ['$status', 'pending'] }, '$amount', 0] }
            },
            approvedExpenses: {
              $sum: { $cond: [{ $eq: ['$status', 'approved'] }, '$amount', 0] }
            },
            paidExpenses: {
              $sum: { $cond: [{ $eq: ['$status', 'paid'] }, '$amount', 0] }
            },
            expensesByType: { $push: '$expenseType' }
          }
        }
      ]);

      const expensesByCategory = await Expense.aggregate([
        {
          $group: {
            _id: '$category',
            count: { $sum: 1 },
            totalAmount: { $sum: '$amount' }
          }
        }
      ]);

      return {
        overview: stats[0] || {
          totalExpenses: 0,
          pendingExpenses: 0,
          approvedExpenses: 0,
          paidExpenses: 0
        },
        expensesByCategory
      };
    } catch (error: any) {
      throw new Error(`Failed to get expense stats: ${error?.message || String(error)}`);
    }
  }
}

// ============================================================
// RECURRING EXPENSE SERVICE
// ============================================================
export class RecurringExpenseService {
  static async getRecurringExpenses(filters: any = {}, page = 1, limit = 50) {
    try {
      const query: any = {};

      if (filters.expenseType) query.expenseType = filters.expenseType;
      if (filters.isActive !== undefined) query.isActive = filters.isActive;
      if (filters.autoGenerate !== undefined) query.autoGenerate = filters.autoGenerate;

      const skip = (page - 1) * limit;

      const recurringExpenses = await RecurringExpense
        .find(query)
        .populate('vendorId', 'name email')
        .populate('createdBy', 'firstName lastName')
        .sort({ nextDueDate: 1 })
        .skip(skip)
        .limit(limit)
        .lean();

      const total = await RecurringExpense.countDocuments(query);

      return {
        recurringExpenses,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) }
      };
    } catch (error: any) {
      throw new Error(`Failed to fetch recurring expenses: ${error?.message || String(error)}`);
    }
  }

  static async getRecurringExpenseById(id: string) {
    try {
      const recurringExpense = await RecurringExpense
        .findById(id)
        .populate('vendorId', 'name email phone')
        .populate('createdBy', 'firstName lastName employeeId');

      if (!recurringExpense) throw new Error('Recurring expense not found');
      return recurringExpense;
    } catch (error: any) {
      throw new Error(`Failed to fetch recurring expense: ${error?.message || String(error)}`);
    }
  }

  static async createRecurringExpense(data: Partial<IRecurringExpense>) {
    try {
      // Generate unique recurring ID
      const recurringId = `REC-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

      // Set next due date based on frequency
      const nextDueDate = this.calculateNextDueDate(data.startDate!, data.frequency!);

      const recurringExpense = new RecurringExpense({
        ...data,
        recurringId,
        nextDueDate
      });

      await recurringExpense.save();
      return recurringExpense;
    } catch (error: any) {
      throw new Error(`Failed to create recurring expense: ${error?.message || String(error)}`);
    }
  }

  static async updateRecurringExpense(id: string, data: Partial<IRecurringExpense>) {
    try {
      const recurringExpense = await RecurringExpense.findByIdAndUpdate(
        id,
        { ...data, updatedAt: new Date() },
        { new: true, runValidators: true }
      );

      if (!recurringExpense) throw new Error('Recurring expense not found');
      return recurringExpense;
    } catch (error: any) {
      throw new Error(`Failed to update recurring expense: ${error?.message || String(error)}`);
    }
  }

  static async deleteRecurringExpense(id: string) {
    try {
      const recurringExpense = await RecurringExpense.findByIdAndDelete(id);
      if (!recurringExpense) throw new Error('Recurring expense not found');
      return recurringExpense;
    } catch (error: any) {
      throw new Error(`Failed to delete recurring expense: ${error?.message || String(error)}`);
    }
  }

  /**
   * Generate expenses for due recurring expenses
   * This should be called monthly (e.g., via cron job)
   */
  static async generateMonthlyExpenses(currentDate: Date = new Date()) {
    try {
      const dueExpenses = await RecurringExpense.find({
        isActive: true,
        autoGenerate: true,
        nextDueDate: { $lte: currentDate },
        $or: [
          { endDate: { $exists: false } },
          { endDate: { $gte: currentDate } }
        ]
      });

      const generatedExpenses = [];

      for (const recurringExpense of dueExpenses) {
        try {
          // Create expense from recurring expense
          const expenseData: Partial<IExpense> = {
            expenseType: recurringExpense.expenseType as IExpense['expenseType'],
            description: recurringExpense.description,
            amount: recurringExpense.amount,
            currency: recurringExpense.currency,
            expenseDate: recurringExpense.nextDueDate,
            dueDate: recurringExpense.nextDueDate,
            vendor: recurringExpense.vendor,
            vendorId: recurringExpense.vendorId,
            category: recurringExpense.category,
            accountCode: recurringExpense.accountCode,
            paymentMethod: recurringExpense.paymentMethod,
            status: recurringExpense.autoApprove ? 'approved' : 'pending',
            createdBy: recurringExpense.createdBy as any,
            recurringExpenseId: recurringExpense._id,
            notes: `Auto-generated from recurring expense: ${recurringExpense.recurringId}`
          };

          const expense = await ExpenseService.createExpense(expenseData);

          // Update recurring expense
          const nextDueDate = this.calculateNextDueDate(recurringExpense.nextDueDate, recurringExpense.frequency);

          await RecurringExpense.findByIdAndUpdate(recurringExpense._id, {
            nextDueDate,
            lastGeneratedDate: currentDate,
            updatedAt: new Date()
          });

          generatedExpenses.push(expense);

          console.log(`✓ Generated expense ${expense.expenseId} for recurring expense ${recurringExpense.recurringId}`);
        } catch (expenseError: any) {
          console.error(`✗ Failed to generate expense for ${recurringExpense.recurringId}: ${expenseError?.message || String(expenseError)}`);
        }
      }

      return {
        generatedCount: generatedExpenses.length,
        expenses: generatedExpenses
      };
    } catch (error: any) {
      throw new Error(`Failed to generate monthly expenses: ${error?.message || String(error)}`);
    }
  }

  /**
   * Calculate next due date based on frequency
   */
  static calculateNextDueDate(currentDate: Date, frequency: string): Date {
    const nextDate = new Date(currentDate);

    switch (frequency) {
      case 'monthly':
        nextDate.setMonth(nextDate.getMonth() + 1);
        break;
      case 'quarterly':
        nextDate.setMonth(nextDate.getMonth() + 3);
        break;
      case 'yearly':
        nextDate.setFullYear(nextDate.getFullYear() + 1);
        break;
      default:
        nextDate.setMonth(nextDate.getMonth() + 1); // Default to monthly
    }

    return nextDate;
  }

  /**
   * Get upcoming recurring expenses (next 30 days)
   */
  static async getUpcomingExpenses(daysAhead: number = 30) {
    try {
      const currentDate = new Date();
      const futureDate = new Date();
      futureDate.setDate(currentDate.getDate() + daysAhead);

      const upcomingExpenses = await RecurringExpense.find({
        isActive: true,
        nextDueDate: {
          $gte: currentDate,
          $lte: futureDate
        }
      })
      .populate('vendorId', 'name')
      .sort({ nextDueDate: 1 })
      .lean();

      return upcomingExpenses;
    } catch (error: any) {
      throw new Error(`Failed to get upcoming expenses: ${error?.message || String(error)}`);
    }
  }

  /**
   * Initialize default recurring expenses (rent, electricity, water)
   */
  static async initializeDefaultRecurringExpenses(createdBy: string) {
    try {
      const existingExpenses = await RecurringExpense.countDocuments();
      if (existingExpenses > 0) {
        console.log('Recurring expenses already initialized');
        return;
      }

      const defaultExpenses: Partial<IRecurringExpense>[] = [
        {
          expenseType: 'rent',
          description: 'Monthly office rent',
          amount: 50000, // KES
          currency: 'KES',
          frequency: 'monthly',
          startDate: new Date(),
          category: 'Office Expenses',
          accountCode: '5200', // Rent Expense
          paymentMethod: 'bank_transfer',
          autoGenerate: true,
          autoApprove: false,
          isActive: true,
          createdBy: createdBy as any
        },
        {
          expenseType: 'electricity',
          description: 'Monthly electricity bill',
          amount: 15000, // KES
          currency: 'KES',
          frequency: 'monthly',
          startDate: new Date(),
          category: 'Utilities',
          accountCode: '5300', // Utilities Expense
          paymentMethod: 'mpesa',
          autoGenerate: true,
          autoApprove: false,
          isActive: true,
          createdBy: createdBy as any
        },
        {
          expenseType: 'water',
          description: 'Monthly water bill',
          amount: 5000, // KES
          currency: 'KES',
          frequency: 'monthly',
          startDate: new Date(),
          category: 'Utilities',
          accountCode: '5300', // Utilities Expense
          paymentMethod: 'mpesa',
          autoGenerate: true,
          autoApprove: false,
          isActive: true,
          createdBy: createdBy as any
        }
      ];

      const createdExpenses = [];
      for (const expenseData of defaultExpenses) {
        const expense = await this.createRecurringExpense(expenseData);
        createdExpenses.push(expense);
      }

      console.log(`✓ Initialized ${createdExpenses.length} default recurring expenses`);
      return createdExpenses;
    } catch (error: any) {
      throw new Error(`Failed to initialize recurring expenses: ${error?.message || String(error)}`);
    }
  }
}