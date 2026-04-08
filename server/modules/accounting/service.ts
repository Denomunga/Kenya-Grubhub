import {
  Account,
  IAccount,
  JournalEntry,
  Transaction,
  FinancialStatement,
  Expense,
  IExpense,
  RecurringExpense,
  IRecurringExpense,
  Invoice,
  AuditLog,
  TaxRate,
  ITaxRate,
  RecurringInvoice,
} from './models';
import { PurchaseOrder } from '../procurement/models';
import { Order } from '../../models/Order';
import { Sale } from '../../models/Sale';

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

      const summary: any = {
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
        netIncome: 0,
        cashBalance: 0,
        accountsReceivable: 0,
        accountsPayable: 0
      };

      // Calculate revenue from invoices (paid + partial)
      const revenueAgg = await Invoice.aggregate([
        { $match: { status: { $in: ['paid', 'partial'] }, isDeleted: { $ne: true } } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ]);
      const invoiceRevenue = revenueAgg[0]?.total || 0;

      // Calculate revenue from completed POS sales
      const posRevenueAgg = await Sale.aggregate([
        { $match: { status: 'Completed' } },
        { $group: { _id: null, total: { $sum: '$total' } } }
      ]);
      const posRevenue = posRevenueAgg[0]?.total || 0;

      // Calculate revenue from delivered orders
      const orderRevenueAgg = await Order.aggregate([
        { $match: { status: 'Delivered' } },
        { $group: { _id: null, total: { $sum: '$total' } } }
      ]);
      const orderRevenue = orderRevenueAgg[0]?.total || 0;

      // Combine all revenue sources
      const totalRevenue = invoiceRevenue + posRevenue + orderRevenue;

      // Calculate expenses from Expenses collection
      const expenseAgg = await Expense.aggregate([
        { $match: { status: { $in: ['pending', 'approved', 'paid'] } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);
      const totalExpenses = expenseAgg[0]?.total || 0;

      // Calculate cash balance
      const cashAccounts = accounts.filter(a => a.code && ['1000', '1010', '1020'].includes(a.code));
      const accountCashBalance = cashAccounts.reduce((sum, a) => sum + a.balance, 0);

      // Calculate cash from completed POS sales (all payment methods represent received cash)
      const posCashAgg = await Sale.aggregate([
        { $match: { status: 'Completed' } },
        { $group: { _id: null, total: { $sum: '$total' } } }
      ]);
      const posCashBalance = posCashAgg[0]?.total || 0;

      // Calculate cash from delivered orders
      const orderCashAgg = await Order.aggregate([
        { $match: { status: 'Delivered' } },
        { $group: { _id: null, total: { $sum: '$total' } } }
      ]);
      const orderCashBalance = orderCashAgg[0]?.total || 0;

      // Combine cash balances
      const cashBalance = accountCashBalance + posCashBalance + orderCashBalance;

      // Calculate accounts receivable
      const arAgg = await Invoice.aggregate([
        { $match: { status: { $in: ['unpaid', 'overdue', 'partial'] }, isDeleted: { $ne: true } } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ]);
      const accountsReceivable = arAgg[0]?.total || 0;

      // Update summary with actual data
      summary.revenue = Math.max(summary.revenue, totalRevenue);
      summary.expenses = Math.max(summary.expenses, totalExpenses);
      summary.netIncome = summary.revenue - summary.expenses;
      summary.cashBalance = cashBalance;
      summary.accountsReceivable = accountsReceivable;
      summary.accountsPayable = summary.liabilities;

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
// ============================================================
// ENHANCED CHART OF ACCOUNTS SERVICE (CRUD)
// ============================================================
export class AccountService {
  static async createAccount(data: Partial<IAccount>) {
    const existing = await Account.findOne({ code: data.code });
    if (existing) throw new Error(`Account code ${data.code} already exists`);
    const account = new Account(data);
    await account.save();
    return account;
  }

  static async updateAccount(id: string, data: Partial<IAccount>) {
    const account = await Account.findByIdAndUpdate(id, { ...data, updatedAt: new Date() }, { new: true, runValidators: true });
    if (!account) throw new Error('Account not found');
    return account;
  }

  static async deleteAccount(id: string) {
    const account = await Account.findById(id);
    if (!account) throw new Error('Account not found');
    const hasEntries = await JournalEntry.countDocuments({ 'lines.accountCode': account.code, status: 'posted' });
    if (hasEntries > 0) throw new Error('Cannot delete account with posted journal entries. Deactivate it instead.');
    account.status = 'inactive';
    await account.save();
    return account;
  }

  static async getAccountById(id: string) {
    const account = await Account.findById(id);
    if (!account) throw new Error('Account not found');
    return account;
  }

  static async getAccountsByCategory(category: string) {
    return Account.find({ category, status: 'active' }).sort({ code: 1 }).lean();
  }
}

// ============================================================
// ENHANCED FINANCIAL REPORTING (with date ranges)
// ============================================================
export class EnhancedReportingService {
  static async getIncomeStatement(startDate: Date, endDate: Date) {
    // Get revenue from journal entries (POS sales and orders)
    const journalEntries = await JournalEntry.find({
      status: 'posted',
      transactionDate: { $gte: startDate, $lte: endDate },
      $or: [
        { referenceType: 'Order' },
        { referenceType: 'POSSale' }
      ]
    }).lean();

    const revenueAccounts: Record<string, { code: string; name: string; amount: number }> = {};

    // Process journal entries for revenue
    for (const entry of journalEntries) {
      for (const line of entry.lines) {
        const account = await Account.findOne({ code: line.accountCode }).lean();
        if (!account) continue;
        if (account.category === 'revenue') {
          if (!revenueAccounts[line.accountCode]) {
            revenueAccounts[line.accountCode] = { code: line.accountCode, name: line.accountName, amount: 0 };
          }
          revenueAccounts[line.accountCode].amount += (line.credit - line.debit);
        }
      }
    }

    // Get expenses from Expense collection (includes regular and recurring expenses)
    const expenses = await Expense.find({
      expenseDate: { $gte: startDate, $lte: endDate },
      status: { $in: ['approved', 'paid'] }
    }).lean();

    const expenseAccounts: Record<string, { code: string; name: string; amount: number }> = {};

    // Group expenses by account code or category
    for (const expense of expenses) {
      const accountCode = expense.accountCode || '5600'; // Default to Miscellaneous Expense
      const categoryName = expense.category || expense.expenseType || 'Miscellaneous';
      
      if (!expenseAccounts[accountCode]) {
        expenseAccounts[accountCode] = { 
          code: accountCode, 
          name: categoryName, 
          amount: 0 
        };
      }
      expenseAccounts[accountCode].amount += expense.amount;
    }

    const totalRevenue = Object.values(revenueAccounts).reduce((s, a) => s + a.amount, 0);
    const totalExpenses = Object.values(expenseAccounts).reduce((s, a) => s + a.amount, 0);

    return {
      period: { startDate, endDate },
      revenue: Object.values(revenueAccounts).sort((a, b) => a.code.localeCompare(b.code)),
      expenses: Object.values(expenseAccounts).sort((a, b) => a.code.localeCompare(b.code)),
      totalRevenue,
      totalExpenses,
      netIncome: totalRevenue - totalExpenses,
      grossProfit: totalRevenue - (expenseAccounts['5000']?.amount || 0),
    };
  }

  static async getBalanceSheet(asOfDate: Date) {
    const accounts = await Account.find({ status: 'active' }).sort({ code: 1 }).lean();
    const assets: any[] = [];
    const liabilities: any[] = [];
    const equity: any[] = [];
    let totalAssets = 0, totalLiabilities = 0, totalEquity = 0;

    for (const acct of accounts) {
      const item = { code: acct.code, name: acct.name, subcategory: acct.subcategory, balance: acct.balance };
      if (acct.category === 'asset') { assets.push(item); totalAssets += acct.balance; }
      else if (acct.category === 'liability') { liabilities.push(item); totalLiabilities += acct.balance; }
      else if (acct.category === 'equity') { equity.push(item); totalEquity += acct.balance; }
    }

    const yearStart = new Date(asOfDate.getFullYear(), 0, 1);
    const pl = await this.getIncomeStatement(yearStart, asOfDate);
    const retainedEarnings = pl.netIncome;

    return {
      asOfDate,
      assets, liabilities, equity, retainedEarnings,
      totalAssets, totalLiabilities,
      totalEquity: totalEquity + retainedEarnings,
      balanced: Math.abs(totalAssets - (totalLiabilities + totalEquity + retainedEarnings)) < 0.01,
    };
  }

  static async getCashFlowStatement(startDate: Date, endDate: Date) {
    const entries = await JournalEntry.find({
      status: 'posted',
      transactionDate: { $gte: startDate, $lte: endDate },
      'lines.accountCode': '1000'
    }).lean();

    let operatingIn = 0, operatingOut = 0, investingIn = 0, investingOut = 0, financingIn = 0, financingOut = 0;

    for (const entry of entries) {
      const cashLine = entry.lines.find(l => l.accountCode === '1000');
      if (!cashLine) continue;
      const otherLines = entry.lines.filter(l => l.accountCode !== '1000');
      const isInflow = cashLine.debit > 0;
      const amount = isInflow ? cashLine.debit : cashLine.credit;

      let classified = false;
      for (const ol of otherLines) {
        const acct = await Account.findOne({ code: ol.accountCode }).lean();
        if (!acct) continue;
        if (acct.category === 'revenue' || acct.category === 'expense' || acct.subcategory === 'current_liability' || acct.subcategory === 'current_asset') {
          if (isInflow) operatingIn += amount; else operatingOut += amount;
          classified = true; break;
        } else if (acct.subcategory === 'fixed_asset') {
          if (isInflow) investingIn += amount; else investingOut += amount;
          classified = true; break;
        } else if (acct.subcategory === 'long_term_liability' || acct.category === 'equity') {
          if (isInflow) financingIn += amount; else financingOut += amount;
          classified = true; break;
        }
      }
      if (!classified) { if (isInflow) operatingIn += amount; else operatingOut += amount; }
    }

    const cashAccount = await Account.findOne({ code: '1000' }).lean();
    return {
      period: { startDate, endDate },
      operating: { inflow: operatingIn, outflow: operatingOut, net: operatingIn - operatingOut },
      investing: { inflow: investingIn, outflow: investingOut, net: investingIn - investingOut },
      financing: { inflow: financingIn, outflow: financingOut, net: financingIn - financingOut },
      netCashChange: (operatingIn - operatingOut) + (investingIn - investingOut) + (financingIn - financingOut),
      endingCashBalance: cashAccount?.balance || 0,
    };
  }

  static async getGeneralLedger(startDate: Date, endDate: Date, accountCode?: string, page = 1, limit = 100) {
    const query: any = { status: 'posted', transactionDate: { $gte: startDate, $lte: endDate } };
    if (accountCode) query['lines.accountCode'] = accountCode;
    const skip = (page - 1) * limit;
    const entries = await JournalEntry.find(query).sort({ transactionDate: -1 }).skip(skip).limit(limit).lean();
    const total = await JournalEntry.countDocuments(query);
    return { entries, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
  }

  static async getTrialBalance(_asOfDate?: Date) {
    const accounts = await Account.find({ status: 'active' }).sort({ code: 1 }).lean();
    const balances = accounts.map(acct => ({
      accountId: acct._id, accountCode: acct.code, accountName: acct.name, category: acct.category,
      debitBalance: ['asset', 'expense'].includes(acct.category) ? Math.max(0, acct.balance) : Math.max(0, -acct.balance),
      creditBalance: ['liability', 'equity', 'revenue'].includes(acct.category) ? Math.max(0, acct.balance) : Math.max(0, -acct.balance),
    }));
    const totalDebits = balances.reduce((s, b) => s + b.debitBalance, 0);
    const totalCredits = balances.reduce((s, b) => s + b.creditBalance, 0);
    return { asOfDate: _asOfDate || new Date(), accounts: balances, totalDebits, totalCredits, balanced: Math.abs(totalDebits - totalCredits) < 0.01 };
  }
}

// ============================================================
// AGING REPORTS SERVICE
// ============================================================
export class AgingReportService {
  static async getReceivableAging() {
    const now = new Date();
    const invoices = await Invoice.find({ status: { $in: ['unpaid', 'partial', 'overdue'] } }).lean();
    const buckets = { current: 0, days30: 0, days60: 0, days90: 0, over90: 0 };
    const details: any[] = [];
    for (const inv of invoices) {
      const outstanding = inv.amount - (inv.paidAmount || 0);
      const daysOverdue = Math.floor((now.getTime() - new Date(inv.dueDate).getTime()) / (1000 * 60 * 60 * 24));
      let bucket: string;
      if (daysOverdue <= 0) { buckets.current += outstanding; bucket = 'current'; }
      else if (daysOverdue <= 30) { buckets.days30 += outstanding; bucket = '1-30'; }
      else if (daysOverdue <= 60) { buckets.days60 += outstanding; bucket = '31-60'; }
      else if (daysOverdue <= 90) { buckets.days90 += outstanding; bucket = '61-90'; }
      else { buckets.over90 += outstanding; bucket = '90+'; }
      details.push({ invoiceNumber: inv.invoiceNumber, clientName: inv.clientName, amount: inv.amount, outstanding, dueDate: inv.dueDate, daysOverdue: Math.max(0, daysOverdue), bucket });
    }
    return { summary: buckets, total: Object.values(buckets).reduce((s, v) => s + v, 0), details: details.sort((a, b) => b.daysOverdue - a.daysOverdue) };
  }

  static async getPayableAging() {
    const now = new Date();
    const expenses = await Expense.find({ status: { $in: ['pending', 'approved', 'overdue'] } }).lean();
    const buckets = { current: 0, days30: 0, days60: 0, days90: 0, over90: 0 };
    const details: any[] = [];
    for (const exp of expenses) {
      const dueDate = exp.dueDate || exp.expenseDate;
      const daysOverdue = Math.floor((now.getTime() - new Date(dueDate).getTime()) / (1000 * 60 * 60 * 24));
      let bucket: string;
      if (daysOverdue <= 0) { buckets.current += exp.amount; bucket = 'current'; }
      else if (daysOverdue <= 30) { buckets.days30 += exp.amount; bucket = '1-30'; }
      else if (daysOverdue <= 60) { buckets.days60 += exp.amount; bucket = '31-60'; }
      else if (daysOverdue <= 90) { buckets.days90 += exp.amount; bucket = '61-90'; }
      else { buckets.over90 += exp.amount; bucket = '90+'; }
      details.push({ expenseId: exp.expenseId, description: exp.description, vendor: exp.vendor, amount: exp.amount, dueDate, daysOverdue: Math.max(0, daysOverdue), status: exp.status, bucket });
    }
    return { summary: buckets, total: Object.values(buckets).reduce((s, v) => s + v, 0), details: details.sort((a, b) => b.daysOverdue - a.daysOverdue) };
  }
}

// ============================================================
// TAX SERVICE
// ============================================================
export class TaxService {
  static async createTaxRate(data: Partial<ITaxRate>) {
    const existing = await TaxRate.findOne({ code: data.code });
    if (existing) throw new Error(`Tax code ${data.code} already exists`);
    const taxRate = new TaxRate(data);
    await taxRate.save();
    return taxRate;
  }

  static async getTaxRates(filters: any = {}) {
    const query: any = {};
    if (filters.type) query.type = filters.type;
    if (filters.isActive !== undefined) query.isActive = filters.isActive;
    return TaxRate.find(query).sort({ type: 1, code: 1 }).lean();
  }

  static async updateTaxRate(id: string, data: Partial<ITaxRate>) {
    const rate = await TaxRate.findByIdAndUpdate(id, data, { new: true, runValidators: true });
    if (!rate) throw new Error('Tax rate not found');
    return rate;
  }

  static async deleteTaxRate(id: string) {
    const rate = await TaxRate.findByIdAndDelete(id);
    if (!rate) throw new Error('Tax rate not found');
    return rate;
  }

  static async getTaxSummary(startDate: Date, endDate: Date) {
    const invoices = await Invoice.find({ createdAt: { $gte: startDate, $lte: endDate } }).lean();
    const expenses = await Expense.find({ expenseDate: { $gte: startDate, $lte: endDate } }).lean();
    const totalSales = invoices.reduce((s, i) => s + i.amount, 0);
    const totalPurchases = expenses.filter(e => e.status !== 'cancelled').reduce((s, e) => s + e.amount, 0);
    const vatRate = await TaxRate.findOne({ type: 'vat', isDefault: true }).lean();
    const vat = vatRate?.rate || 16;
    const outputVAT = totalSales * (vat / (100 + vat));
    const inputVAT = totalPurchases * (vat / (100 + vat));
    return {
      period: { startDate, endDate }, totalSales, totalPurchases, vatRate: vat,
      outputVAT: Math.round(outputVAT * 100) / 100, inputVAT: Math.round(inputVAT * 100) / 100,
      netVAT: Math.round((outputVAT - inputVAT) * 100) / 100,
      invoiceCount: invoices.length, expenseCount: expenses.length,
    };
  }

  static async initializeDefaultTaxRates(userId: string) {
    const count = await TaxRate.countDocuments();
    if (count > 0) return;
    const defaults = [
      { name: 'VAT 16%', code: 'VAT-16', rate: 16, type: 'vat' as const, description: 'Standard VAT rate (Kenya)', isDefault: true, isActive: true, createdBy: userId },
      { name: 'VAT 0%', code: 'VAT-0', rate: 0, type: 'vat' as const, description: 'Zero-rated VAT', isDefault: false, isActive: true, createdBy: userId },
      { name: 'VAT Exempt', code: 'VAT-EX', rate: 0, type: 'vat' as const, description: 'VAT Exempt supplies', isDefault: false, isActive: true, createdBy: userId },
      { name: 'Withholding Tax 5%', code: 'WHT-5', rate: 5, type: 'withholding' as const, description: 'Withholding tax on services', isDefault: true, isActive: true, createdBy: userId },
      { name: 'Withholding Tax 3%', code: 'WHT-3', rate: 3, type: 'withholding' as const, description: 'Withholding tax on goods', isDefault: false, isActive: true, createdBy: userId },
    ];
    for (const d of defaults) await TaxRate.create(d);
  }
}

// ============================================================
// AUDIT TRAIL SERVICE
// ============================================================
export class AuditService {
  static async log(data: { action: string; entityType: string; entityId: string; entityRef?: string; userId: string; userName?: string; changes?: any; metadata?: any; ipAddress?: string }) {
    try { await AuditLog.create(data); } catch (err) { console.error('Audit log error:', err); }
  }

  static async getAuditLogs(filters: any = {}, page = 1, limit = 50) {
    const query: any = {};
    if (filters.entityType) query.entityType = filters.entityType;
    if (filters.entityId) query.entityId = filters.entityId;
    if (filters.userId) query.userId = filters.userId;
    if (filters.action) query.action = filters.action;
    if (filters.startDate || filters.endDate) {
      query.createdAt = {};
      if (filters.startDate) query.createdAt.$gte = new Date(filters.startDate);
      if (filters.endDate) query.createdAt.$lte = new Date(filters.endDate);
    }
    const skip = (page - 1) * limit;
    const logs = await AuditLog.find(query).populate('userId', 'firstName lastName email').sort({ createdAt: -1 }).skip(skip).limit(limit).lean();
    const total = await AuditLog.countDocuments(query);
    return { logs, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
  }
}

// ============================================================
// INVOICE SERVICE
// ============================================================
export class InvoiceService {
  // --- Auto tax calculation helper ---
  static async calculateTax(amount: number): Promise<{ taxRate: number; taxAmount: number; totalAmount: number }> {
    try {
      const vatRate = await TaxRate.findOne({ code: 'VAT', isActive: true }).lean();
      const rate = vatRate ? vatRate.rate : 16; // Default Kenya VAT 16%
      const taxAmount = Math.round((amount * rate / 100) * 100) / 100;
      return { taxRate: rate, taxAmount, totalAmount: Math.round((amount + taxAmount) * 100) / 100 };
    } catch {
      return { taxRate: 0, taxAmount: 0, totalAmount: amount };
    }
  }

  // --- Auto journal entry: Invoice Created (Debit: Accounts Receivable, Credit: Revenue) ---
  static async createInvoiceJournalEntry(invoice: any, userId: string) {
    try {
      const arAccount = await Account.findOne({ code: { $in: ['1200', '1100'] }, status: 'active' });
      const revenueAccount = await Account.findOne({ code: { $in: ['4000', '4100'] }, status: 'active' });
      if (!arAccount || !revenueAccount) return null;

      const totalAmount = invoice.totalAmount || invoice.amount;
      const entryNumber = `JE-INV-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
      const lines = [
        { accountId: arAccount._id, accountCode: arAccount.code, accountName: arAccount.name, debit: totalAmount, credit: 0, description: `Invoice ${invoice.invoiceNumber} - ${invoice.clientName}` },
        { accountId: revenueAccount._id, accountCode: revenueAccount.code, accountName: revenueAccount.name, debit: 0, credit: totalAmount, description: `Revenue from invoice ${invoice.invoiceNumber}` },
      ];

      if (invoice.taxAmount && invoice.taxAmount > 0) {
        const taxAccount = await Account.findOne({ code: { $in: ['2100', '2200'] }, status: 'active' });
        if (taxAccount) {
          lines[1].credit = invoice.amount;
          lines.push({ accountId: taxAccount._id, accountCode: taxAccount.code, accountName: taxAccount.name, debit: 0, credit: invoice.taxAmount, description: `VAT on invoice ${invoice.invoiceNumber}` });
        }
      }

      const je = new JournalEntry({
        entryNumber,
        transactionDate: new Date(),
        description: `Auto journal entry for invoice ${invoice.invoiceNumber}`,
        referenceType: 'Invoice',
        referenceId: invoice._id,
        referenceNumber: invoice.invoiceNumber,
        lines,
        totalDebit: totalAmount,
        totalCredit: totalAmount,
        balanced: true,
        createdBy: userId,
        status: 'posted',
      });
      await je.save();

      // Update account balances
      for (const line of lines) {
        if (line.debit > 0) await Account.findByIdAndUpdate(line.accountId, { $inc: { balance: line.debit } });
        if (line.credit > 0) await Account.findByIdAndUpdate(line.accountId, { $inc: { balance: -line.credit } });
      }

      return je;
    } catch (err) {
      console.error('Auto journal entry (invoice create) failed:', err);
      return null;
    }
  }

  // --- Auto journal entry: Payment Recorded (Debit: Cash/Bank, Credit: Accounts Receivable) ---
  static async createPaymentJournalEntry(invoice: any, paymentAmount: number, userId: string) {
    try {
      const cashAccount = await Account.findOne({ code: { $in: ['1000', '1010'] }, status: 'active' });
      const arAccount = await Account.findOne({ code: { $in: ['1200', '1100'] }, status: 'active' });
      if (!cashAccount || !arAccount) return null;

      const entryNumber = `JE-PAY-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
      const lines = [
        { accountId: cashAccount._id, accountCode: cashAccount.code, accountName: cashAccount.name, debit: paymentAmount, credit: 0, description: `Payment received for invoice ${invoice.invoiceNumber}` },
        { accountId: arAccount._id, accountCode: arAccount.code, accountName: arAccount.name, debit: 0, credit: paymentAmount, description: `AR reduced for invoice ${invoice.invoiceNumber}` },
      ];

      const je = new JournalEntry({
        entryNumber,
        transactionDate: new Date(),
        description: `Auto journal entry for payment on invoice ${invoice.invoiceNumber}`,
        referenceType: 'Payment',
        referenceId: invoice._id,
        referenceNumber: invoice.invoiceNumber,
        lines,
        totalDebit: paymentAmount,
        totalCredit: paymentAmount,
        balanced: true,
        createdBy: userId,
        status: 'posted',
      });
      await je.save();

      for (const line of lines) {
        if (line.debit > 0) await Account.findByIdAndUpdate(line.accountId, { $inc: { balance: line.debit } });
        if (line.credit > 0) await Account.findByIdAndUpdate(line.accountId, { $inc: { balance: -line.credit } });
      }

      return je;
    } catch (err) {
      console.error('Auto journal entry (payment) failed:', err);
      return null;
    }
  }

  static async getInvoices(filters: any = {}, page = 1, limit = 50) {
    const query: any = { isDeleted: { $ne: true } };
    if (filters.status) query.status = filters.status;
    if (filters.clientName) query.clientName = { $regex: filters.clientName, $options: 'i' };
    if (filters.startDate || filters.endDate) {
      query.dueDate = {};
      if (filters.startDate) query.dueDate.$gte = new Date(filters.startDate);
      if (filters.endDate) query.dueDate.$lte = new Date(filters.endDate);
    }
    // Auto-update aging: mark overdue invoices
    await Invoice.updateMany(
      { status: 'unpaid', dueDate: { $lt: new Date() }, isDeleted: { $ne: true } },
      { status: 'overdue' }
    );
    const skip = (page - 1) * limit;
    const invoices = await Invoice.find(query).populate('createdBy', 'firstName lastName').sort({ createdAt: -1 }).skip(skip).limit(limit).lean();
    const total = await Invoice.countDocuments(query);
    return { invoices, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
  }

  static async getInvoiceById(id: string) {
    const invoice = await Invoice.findOne({ _id: id, isDeleted: { $ne: true } }).populate('createdBy', 'firstName lastName');
    if (!invoice) throw new Error('Invoice not found');
    return invoice;
  }

  static async updateInvoice(id: string, data: any) {
    const invoice = await Invoice.findOneAndUpdate({ _id: id, isDeleted: { $ne: true } }, { ...data, updatedAt: new Date() }, { new: true, runValidators: true });
    if (!invoice) throw new Error('Invoice not found');
    return invoice;
  }

  static async recordPayment(id: string, amount: number, userId?: string) {
    const invoice = await Invoice.findOne({ _id: id, isDeleted: { $ne: true } });
    if (!invoice) throw new Error('Invoice not found');
    invoice.paidAmount = (invoice.paidAmount || 0) + amount;
    if (invoice.paidAmount >= (invoice.totalAmount || invoice.amount)) invoice.status = 'paid';
    else invoice.status = 'partial';
    await invoice.save();

    // Auto journal entry for payment
    if (userId) {
      await InvoiceService.createPaymentJournalEntry(invoice, amount, userId);
    }

    return invoice;
  }

  // Soft delete instead of hard delete
  static async deleteInvoice(id: string) {
    const invoice = await Invoice.findOne({ _id: id, isDeleted: { $ne: true } });
    if (!invoice) throw new Error('Invoice not found');
    if (invoice.status === 'paid') throw new Error('Cannot delete a paid invoice');
    invoice.isDeleted = true;
    (invoice as any).deletedAt = new Date();
    await invoice.save();
    return invoice;
  }

  static async bulkUpdateStatus(ids: string[], status: string) {
    const result = await Invoice.updateMany(
      { _id: { $in: ids }, isDeleted: { $ne: true } },
      { status, updatedAt: new Date() }
    );
    return { modifiedCount: result.modifiedCount };
  }
}

// ============================================================
// INVENTORY ACCOUNTING SERVICE (COGS, Stock Tracking)
// ============================================================
export class InventoryAccountingService {
  static async getStockOverview() {
    try {
      const InventoryItem = (await import('../inventory/model')).InventoryItem;
      const { Product } = await import('../../models/Product');
      
      // Get inventory items
      const inventoryItems = await InventoryItem.find({ status: { $ne: 'discontinued' } }).sort({ currentStock: 1 }).lean();
      
      // Get all products that don't have inventory records
      const productIdsWithInventory = new Set(inventoryItems.map((i: any) => String(i.productId)));
      const products = await Product.find({ 
        _id: { $nin: Array.from(productIdsWithInventory) },
        available: { $ne: false }
      }).lean();
      
      // Convert products to inventory-like format
      const productAsInventory = products.map((p: any) => ({
        _id: p._id,
        productId: p._id,
        productName: p.name,
        sku: p.sku || `PROD-${p._id.toString().slice(-6)}`,
        category: p.category,
        currentStock: p.stock || 0,
        minimumStock: 5, // default threshold
        unit: p.unit || 'pcs',
        location: 'Main Store',
        costPrice: p.costPrice || p.price * 0.6, // estimate cost as 60% of price
        sellingPrice: p.price,
        status: p.stock === 0 ? 'out_of_stock' : (p.stock && p.stock > 0 ? 'active' : 'active'),
        lastRestockedAt: p.updatedAt,
        fromProduct: true
      }));
      
      // Combine both sources
      const allItems = [...inventoryItems, ...productAsInventory];
      
      const lowStock = allItems.filter((i: any) => i.currentStock <= i.minimumStock && i.currentStock > 0);
      const outOfStock = allItems.filter((i: any) => i.currentStock === 0);
      const totalValue = allItems.reduce((sum: number, i: any) => sum + (i.currentStock * i.costPrice), 0);
      const totalRetailValue = allItems.reduce((sum: number, i: any) => sum + (i.currentStock * i.sellingPrice), 0);
      
      return {
        items: allItems,
        summary: {
          totalItems: allItems.length,
          totalValue: Math.round(totalValue * 100) / 100,
          totalRetailValue: Math.round(totalRetailValue * 100) / 100,
          potentialProfit: Math.round((totalRetailValue - totalValue) * 100) / 100,
          lowStockCount: lowStock.length,
          outOfStockCount: outOfStock.length,
          inventoryItemsCount: inventoryItems.length,
          productItemsCount: productAsInventory.length,
        },
        lowStockAlerts: lowStock,
        outOfStock,
      };
    } catch (err) {
      console.error('Stock overview error:', err);
      return { items: [], summary: { totalItems: 0, totalValue: 0, totalRetailValue: 0, potentialProfit: 0, lowStockCount: 0, outOfStockCount: 0, inventoryItemsCount: 0, productItemsCount: 0 }, lowStockAlerts: [], outOfStock: [] };
    }
  }

  static async getCOGS(startDate: Date, endDate: Date) {
    try {
      const { Order } = await import('../../models/Order');
      const { Sale } = await import('../../models/Sale');
      const [orders, sales] = await Promise.all([
        Order.find({ status: 'Delivered', createdAt: { $gte: startDate, $lte: endDate } }).lean(),
        Sale.find({ status: 'Completed', createdAt: { $gte: startDate, $lte: endDate } }).lean()
      ]);

      const { Product } = await import('../../models/Product');
      let totalCOGS = 0;
      let totalRevenue = 0;
      const productCOGS: any[] = [];

      // Process regular orders
      for (const order of orders) {
        for (const item of (order as any).items || []) {
          if (item.productId) {
            const product = await Product.findById(item.productId).lean();
            if (product) {
              const InventoryItem = (await import('../inventory/model')).InventoryItem;
              const invItem = await InventoryItem.findOne({ productId: item.productId }).lean();
              const costPrice = invItem ? (invItem as any).costPrice : (product as any).price * 0.6;
              const itemCOGS = costPrice * item.quantity;
              const itemRevenue = item.price * item.quantity;
              totalCOGS += itemCOGS;
              totalRevenue += itemRevenue;
              productCOGS.push({ productId: item.productId, name: item.name, quantity: item.quantity, costPrice, revenue: itemRevenue, cogs: itemCOGS, profit: itemRevenue - itemCOGS, margin: itemRevenue > 0 ? ((itemRevenue - itemCOGS) / itemRevenue * 100) : 0 });
            }
          }
        }
      }

      // Process POS sales
      for (const sale of sales) {
        for (const item of (sale as any).items || []) {
          if (item.productId) {
            const product = await Product.findById(item.productId).lean();
            if (product) {
              const InventoryItem = (await import('../inventory/model')).InventoryItem;
              const invItem = await InventoryItem.findOne({ productId: item.productId }).lean();
              const costPrice = invItem ? (invItem as any).costPrice : (product as any).price * 0.6;
              const itemCOGS = costPrice * item.quantity;
              const itemRevenue = item.price * item.quantity;
              totalCOGS += itemCOGS;
              totalRevenue += itemRevenue;
              productCOGS.push({ productId: item.productId, name: item.name, quantity: item.quantity, costPrice, revenue: itemRevenue, cogs: itemCOGS, profit: itemRevenue - itemCOGS, margin: itemRevenue > 0 ? ((itemRevenue - itemCOGS) / itemRevenue * 100) : 0 });
            }
          }
        }
      }

      return {
        totalCOGS: Math.round(totalCOGS * 100) / 100,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        grossProfit: Math.round((totalRevenue - totalCOGS) * 100) / 100,
        grossMargin: totalRevenue > 0 ? Math.round((totalRevenue - totalCOGS) / totalRevenue * 10000) / 100 : 0,
        products: productCOGS.sort((a, b) => b.profit - a.profit),
        period: { startDate, endDate },
      };
    } catch (err) {
      console.error('COGS calculation error:', err);
      return { totalCOGS: 0, totalRevenue: 0, grossProfit: 0, grossMargin: 0, products: [], period: { startDate, endDate } };
    }
  }
}

// ============================================================
// SMART INSIGHTS SERVICE
// ============================================================
export class InsightsService {
  static async getInsights() {
    try {
      const now = new Date();
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
      const insights: { type: 'warning' | 'success' | 'info' | 'danger'; icon: string; message: string; detail?: string }[] = [];

      // Expense trend
      const thisMonthExpenses = await Expense.aggregate([
        { $match: { expenseDate: { $gte: thisMonthStart }, status: { $ne: 'cancelled' } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);
      const lastMonthExpenses = await Expense.aggregate([
        { $match: { expenseDate: { $gte: lastMonthStart, $lte: lastMonthEnd }, status: { $ne: 'cancelled' } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);
      const thisExp = thisMonthExpenses[0]?.total || 0;
      const lastExp = lastMonthExpenses[0]?.total || 0;
      if (lastExp > 0 && thisExp > lastExp) {
        const pct = Math.round((thisExp - lastExp) / lastExp * 100);
        insights.push({ type: 'warning', icon: 'TrendingUp', message: `Your expenses increased by ${pct}% this month`, detail: `KES ${thisExp.toLocaleString()} vs KES ${lastExp.toLocaleString()} last month` });
      } else if (lastExp > 0 && thisExp < lastExp) {
        const pct = Math.round((lastExp - thisExp) / lastExp * 100);
        insights.push({ type: 'success', icon: 'TrendingDown', message: `Your expenses decreased by ${pct}% this month`, detail: `KES ${thisExp.toLocaleString()} vs KES ${lastExp.toLocaleString()} last month` });
      }

      // Most profitable product (includes Orders + POS Sales)
      try {
        const { Order } = await import('../../models/Order');
        const { Sale } = await import('../../models/Sale');
        const [recentOrders, recentSales] = await Promise.all([
          Order.find({ status: 'Delivered', createdAt: { $gte: lastMonthStart } }).lean(),
          Sale.find({ status: 'Completed', createdAt: { $gte: lastMonthStart } }).lean()
        ]);
        const productRevenue: Record<string, { name: string; revenue: number; count: number }> = {};
        
        // Process regular orders
        for (const order of recentOrders) {
          for (const item of (order as any).items || []) {
            const key = item.name || item.productId || 'Unknown';
            if (!productRevenue[key]) productRevenue[key] = { name: key, revenue: 0, count: 0 };
            productRevenue[key].revenue += item.price * item.quantity;
            productRevenue[key].count += item.quantity;
          }
        }
        
        // Process POS sales
        for (const sale of recentSales) {
          for (const item of (sale as any).items || []) {
            const key = item.name || item.productId || 'Unknown';
            if (!productRevenue[key]) productRevenue[key] = { name: key, revenue: 0, count: 0 };
            productRevenue[key].revenue += item.price * item.quantity;
            productRevenue[key].count += item.quantity;
          }
        }
        const sorted = Object.values(productRevenue).sort((a, b) => b.revenue - a.revenue);
        if (sorted.length > 0) {
          insights.push({ type: 'success', icon: 'Star', message: `Your most profitable product is ${sorted[0].name}`, detail: `KES ${sorted[0].revenue.toLocaleString()} revenue from ${sorted[0].count} units sold` });
        }
        if (sorted.length > 2) {
          const worst = sorted[sorted.length - 1];
          insights.push({ type: 'danger', icon: 'AlertTriangle', message: `Low performer: ${worst.name}`, detail: `Only KES ${worst.revenue.toLocaleString()} from ${worst.count} units` });
        }
      } catch {}

      // Overdue invoices warning
      const overdueCount = await Invoice.countDocuments({ status: 'overdue', isDeleted: { $ne: true } });
      if (overdueCount > 0) {
        const overdueTotal = await Invoice.aggregate([
          { $match: { status: 'overdue', isDeleted: { $ne: true } } },
          { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);
        insights.push({ type: 'danger', icon: 'Clock', message: `You have ${overdueCount} overdue invoice(s)`, detail: `Total outstanding: KES ${(overdueTotal[0]?.total || 0).toLocaleString()}` });
      }

      // Upcoming recurring expenses
      const upcomingRecurring = await RecurringExpense.find({ isActive: true, nextDueDate: { $lte: new Date(now.getTime() + 7 * 86400000) } }).lean();
      if (upcomingRecurring.length > 0) {
        const total = upcomingRecurring.reduce((s: number, r: any) => s + r.amount, 0);
        insights.push({ type: 'info', icon: 'Calendar', message: ` recurring expense(s) due this week`, detail: `Total: KES ${total.toLocaleString()}` });
      }

      return insights;
    } catch (err) {
      console.error('Insights error:', err);
      return [];
    }
  }
}

// ============================================================
// CASH FLOW FORECAST SERVICE
// ============================================================
export class CashFlowForecastService {
  static async getForecast(days: number = 30) {
    try {
      const now = new Date();
      const forecastEnd = new Date(now.getTime() + days * 86400000);

      // Current cash position includes cash account balances plus completed POS and delivered order receipts.
      const cashAccounts = await Account.find({ code: { $in: ['1000', '1010', '1020'] }, status: 'active' }).lean();
      const cashBalance = cashAccounts.reduce((s: number, a: any) => s + (a.balance || 0), 0);
      
      const posCashAgg = await Sale.aggregate([
        { $match: { status: 'Completed', createdAt: { $lte: now } } },
        { $group: { _id: null, total: { $sum: '$total' } } }
      ]);
      const posCash = posCashAgg[0]?.total || 0;

      const orderCashAgg = await Order.aggregate([
        { $match: { status: 'Delivered', createdAt: { $lte: now } } },
        { $group: { _id: null, total: { $sum: '$total' } } }
      ]);
      const orderCash = orderCashAgg[0]?.total || 0;

      const currentCash = cashBalance + posCash + orderCash;

      // Expected income (unpaid invoices due in forecast period)
      const expectedIncome = await Invoice.aggregate([
        { $match: { status: { $in: ['unpaid', 'partial'] }, dueDate: { $lte: forecastEnd }, isDeleted: { $ne: true } } },
        { $group: { _id: null, total: { $sum: { $subtract: [{ $ifNull: ['$totalAmount', '$amount'] }, { $ifNull: ['$paidAmount', 0] }] } } } }
      ]);

      // Upcoming recurring expenses
      const recurringExpenses = await RecurringExpense.find({ isActive: true, nextDueDate: { $lte: forecastEnd } }).lean();
      const expectedExpenses = recurringExpenses.reduce((s: number, r: any) => s + r.amount, 0);

      // Pending expenses
      const pendingExpenses = await Expense.aggregate([
        { $match: { status: { $in: ['pending', 'approved'] }, dueDate: { $lte: forecastEnd } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);

      const inflow = expectedIncome[0]?.total || 0;
      const outflow = expectedExpenses + (pendingExpenses[0]?.total || 0);
      const projectedBalance = currentCash + inflow - outflow;

      // Calculate days until cash runs out (if negative trend)
      let daysUntilCashOut: number | null = null;
      if (outflow > inflow && outflow > 0) {
        const dailyBurn = (outflow - inflow) / days;
        if (dailyBurn > 0) daysUntilCashOut = Math.floor(currentCash / dailyBurn);
      }

      // Daily forecast breakdown
      const dailyForecast: { date: string; inflow: number; outflow: number; balance: number }[] = [];
      let runningBalance = currentCash;
      for (let d = 0; d < Math.min(days, 30); d++) {
        const date = new Date(now.getTime() + d * 86400000);
        const dateStr = date.toISOString().slice(0, 10);
        const dayInflow = inflow / days;
        const dayOutflow = outflow / days;
        runningBalance += dayInflow - dayOutflow;
        dailyForecast.push({ date: dateStr, inflow: Math.round(dayInflow), outflow: Math.round(dayOutflow), balance: Math.round(runningBalance) });
      }

      return {
        currentCash: Math.round(currentCash),
        salesCash: Math.round(posCash),
        orderCash: Math.round(orderCash),
        expectedIncome: Math.round(inflow),
        expectedExpenses: Math.round(outflow),
        projectedBalance: Math.round(projectedBalance),
        daysUntilCashOut,
        recurringExpenses: recurringExpenses.map((r: any) => ({ name: r.description, amount: r.amount, dueDate: r.nextDueDate, frequency: r.frequency })),
        dailyForecast,
        warning: daysUntilCashOut !== null && daysUntilCashOut <= 30 ? `You will run out of cash in ${daysUntilCashOut} days` : null,
      };
    } catch (err) {
      console.error('Cash flow forecast error:', err);
      return { currentCash: 0, expectedIncome: 0, expectedExpenses: 0, projectedBalance: 0, daysUntilCashOut: null, recurringExpenses: [], dailyForecast: [], warning: null };
    }
  }
}

// ============================================================
// RECURRING INVOICE SERVICE
// ============================================================
export class RecurringInvoiceService {
  static async getAll() {
    return RecurringInvoice.find().sort({ nextDueDate: 1 }).lean();
  }

  static async create(data: any) {
    const recurringId = `RI-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const taxCalc = await InvoiceService.calculateTax(data.amount);
    const ri = new RecurringInvoice({
      ...data,
      recurringId,
      taxRate: taxCalc.taxRate,
      taxAmount: taxCalc.taxAmount,
      totalAmount: taxCalc.totalAmount,
      generatedCount: 0,
    });
    await ri.save();
    return ri;
  }

  static async update(id: string, data: any) {
    const ri = await RecurringInvoice.findByIdAndUpdate(id, { ...data, updatedAt: new Date() }, { new: true });
    if (!ri) throw new Error('Recurring invoice not found');
    return ri;
  }

  static async delete(id: string) {
    const ri = await RecurringInvoice.findByIdAndUpdate(id, { isActive: false }, { new: true });
    if (!ri) throw new Error('Recurring invoice not found');
    return ri;
  }

  static async generateDueInvoices(userId: string) {
    const now = new Date();
    const dueItems = await RecurringInvoice.find({ isActive: true, autoGenerate: true, nextDueDate: { $lte: now } });
    const generated: any[] = [];

    for (const ri of dueItems) {
      try {
        const invoiceNumber = `INV-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
        const invoice = new Invoice({
          invoiceNumber,
          clientName: ri.clientName,
          amount: ri.amount,
          taxRate: ri.taxRate,
          taxAmount: ri.taxAmount,
          totalAmount: ri.totalAmount,
          dueDate: ri.nextDueDate,
          description: `[Auto] ${ri.description || 'Recurring invoice'}` ,
          status: 'unpaid',
          paidAmount: 0,
          createdBy: ri.createdBy,
        });
        await invoice.save();
        await InvoiceService.createInvoiceJournalEntry(invoice, userId);

        // Update recurring invoice next due date
        let nextDue = new Date(ri.nextDueDate);
        if (ri.frequency === 'weekly') nextDue.setDate(nextDue.getDate() + 7);
        else if (ri.frequency === 'monthly') nextDue.setMonth(nextDue.getMonth() + 1);
        else if (ri.frequency === 'quarterly') nextDue.setMonth(nextDue.getMonth() + 3);
        else if (ri.frequency === 'yearly') nextDue.setFullYear(nextDue.getFullYear() + 1);

        ri.nextDueDate = nextDue;
        ri.lastGeneratedDate = now;
        ri.generatedCount = (ri.generatedCount || 0) + 1;
        if (ri.endDate && nextDue > ri.endDate) ri.isActive = false;
        await ri.save();

        generated.push(invoice);
      } catch (err) {
        console.error(`Failed to generate invoice for RI ${ri.recurringId}:`, err);
      }
    }
    return { generated: generated.length, invoices: generated };
  }
}