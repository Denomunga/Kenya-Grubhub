import { Request, Response } from 'express';
import mongoose from 'mongoose';
import {
  ChartOfAccountsService,
  JournalEntryService,
  TransactionService,
  FinancialReportingService,
  ExpenseService,
  RecurringExpenseService,
  InvoiceService,
  CreateJournalEntryData
} from './service';
import { IExpense, IRecurringExpense } from './models';
import { Invoice } from './models';

interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

interface CreateExpenseData {
  expenseType: IExpense['expenseType'];
  amount: number;
  description: string;
  vendor?: string;
  paymentMethod: IExpense['paymentMethod'];
  expenseDate: Date;
  dueDate?: Date;
  category?: string;
  accountCode?: string;
  recurringExpenseId?: string | mongoose.Types.ObjectId;
  referenceNumber?: string;
  createdBy: mongoose.Types.ObjectId;
}

interface CreateRecurringExpenseData {
  name: string;
  description?: string;
  expenseType: IRecurringExpense['expenseType'];
  amount: number;
  frequency: IRecurringExpense['frequency'];
  startDate: Date;
  endDate?: Date;
  accountCode?: string;
  vendor?: string;
  paymentMethod?: IRecurringExpense['paymentMethod'];
  category?: string;
  autoGenerate?: boolean;
  isActive?: boolean;
  createdBy: mongoose.Types.ObjectId;
}

async function generateInvoiceNumber(): Promise<string> {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const datePrefix = `${year}${month}${day}`;

  // Count invoices created today
  const startOfDay = new Date(today.setHours(0, 0, 0, 0));
  const endOfDay = new Date(today.setHours(23, 59, 59, 999));
  const count = await Invoice.countDocuments({
    createdAt: { $gte: startOfDay, $lte: endOfDay }
  });

  const sequence = String(count + 1).padStart(4, '0');
  return `INV-${datePrefix}-${sequence}`;
}

export class AccountingController {
  /**
   * Initialize chart of accounts
   * POST /api/v1/accounting/init
   */
  static async initializeAccounts(_req: AuthRequest, res: Response) {
    try {
      await ChartOfAccountsService.initializeDefaultAccounts();
      res.status(200).json({
        success: true,
        message: 'Chart of accounts initialized successfully'
      });
    } catch (error: any) {
      console.error('Initialize accounts error:', error);
      res.status(500).json({
        success: false,
        error: error?.message || 'Failed to initialize accounts'
      });
    }
  }
  
/**
 * Upload and process an invoice PDF using AI (Zerox)
 * POST /api/v1/accounting/invoices/upload
 * Expects multipart/form-data with field name "invoice" (PDF file)
 */
  
  static async uploadInvoicePdf(req: AuthRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // Multer should have attached the file
    const file = (req as any).file;
    if (!file) {
      return res.status(400).json({
        success: false,
        error: 'No PDF file uploaded'
      });
    }

    if (file.mimetype !== 'application/pdf') {
      return res.status(400).json({
        success: false,
        error: 'Only PDF files are allowed'
      });
    }

    // Process the invoice using the AI service
    const invoice = await InvoiceService.processInvoiceFromPdf(
      file.buffer,
      file.originalname,
      req.user.id
    );

    res.status(201).json({
      success: true,
      message: 'Invoice created from PDF successfully',
      data: invoice
    });
  } catch (error: any) {
    console.error('Upload invoice PDF error:', error);
    res.status(500).json({
      success: false,
      error: error?.message || 'Failed to process invoice PDF'
    });
  }
}


  // In dashboardController.ts or accountingController.ts
static async createInvoice(req: Request, res: Response) {
  try {
    const { clientName, amount, dueDate, description, status = 'unpaid' } = req.body;
    
    // Generate unique invoice number
    const invoiceNumber = await generateInvoiceNumber();
    
    // Auto tax calculation
    const taxCalc = await InvoiceService.calculateTax(amount);

    const invoice = new Invoice({
      invoiceNumber,
      clientName,
      amount,
      taxRate: taxCalc.taxRate,
      taxAmount: taxCalc.taxAmount,
      totalAmount: taxCalc.totalAmount,
      dueDate: new Date(dueDate),
      description,
      status,
      paidAmount: 0,
      createdBy: new mongoose.Types.ObjectId(req.user.id),
      createdAt: new Date()
    });
    
    await invoice.save();
    
    // Auto journal entry for invoice creation
    await InvoiceService.createInvoiceJournalEntry(invoice, req.user.id);
    
    res.status(201).json({
      success: true,
      data: invoice
    });
  } catch (error) {
    console.error('Error creating invoice:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to create invoice',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}


  /**
   * Get all accounts
   * GET /api/v1/accounting/accounts
   */
  static async getAccounts(_req: AuthRequest, res: Response) {
    try {
      const accounts = await ChartOfAccountsService.getAllAccounts();
      res.status(200).json({
        success: true,
        data: accounts
      });
    } catch (error: any) {
      console.error('Get accounts error:', error);
      res.status(500).json({
        success: false,
        error: error?.message || 'Failed to fetch accounts'
      });
    }
  }

  /**
   * Create journal entry
   * POST /api/v1/accounting/journal-entries
   */
  static async createJournalEntry(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      const {
        transactionDate,
        description,
        lines,
        referenceType,
        referenceId,
        referenceNumber
      } = req.body;

      // Validate required fields
      if (!transactionDate || !description || !lines || lines.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: transactionDate, description, lines'
        });
      }

      const data: CreateJournalEntryData = {
        transactionDate: new Date(transactionDate),
        description,
        lines,
        referenceType,
        referenceId,
        referenceNumber,
        userId: req.user.id
      };

      const journalEntry = await JournalEntryService.createJournalEntry(data);

      res.status(201).json({
        success: true,
        message: 'Journal entry created successfully',
        data: journalEntry
      });
    } catch (error: any) {
      console.error('Create journal entry error:', error);
      res.status(400).json({
        success: false,
        error: error?.message || 'Failed to create journal entry'
      });
    }
  }

  /**
   * Post journal entry
   * POST /api/v1/accounting/journal-entries/:id/post
   */
  static async postJournalEntry(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      const journalEntry = await JournalEntryService.postJournalEntry(id);

      res.status(200).json({
        success: true,
        message: 'Journal entry posted successfully',
        data: journalEntry
      });
    } catch (error: any) {
      console.error('Post journal entry error:', error);
      res.status(400).json({
        success: false,
        error: error?.message || 'Failed to post journal entry'
      });
    }
  }

  /**
   * Get journal entries
   * GET /api/v1/accounting/journal-entries?status=draft&page=1&limit=50
   */
  static async getJournalEntries(req: AuthRequest, res: Response) {
    try {
      const { status, page = 1, limit = 50 } = req.query;

      const filters: any = {};
      if (status) filters.status = status;

      const result = await JournalEntryService.getJournalEntries(
        filters,
        parseInt(page as string),
        parseInt(limit as string)
      );

      res.status(200).json({
        success: true,
        data: result.entries,
        pagination: result.pagination
      });
    } catch (error: any) {
      console.error('Get journal entries error:', error);
      res.status(500).json({
        success: false,
        error: error?.message || 'Failed to fetch journal entries'
      });
    }
  }

  /**
   * Record purchase transaction
   * POST /api/v1/accounting/transactions/purchase
   */
  static async recordPurchaseTransaction(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      const { purchaseOrderId, poNumber, totalAmount } = req.body;

      if (!purchaseOrderId || !poNumber || !totalAmount) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: purchaseOrderId, poNumber, totalAmount'
        });
      }

      const transaction = await TransactionService.recordPurchaseTransaction(
        purchaseOrderId,
        poNumber,
        totalAmount,
        req.user.id
      );

      res.status(201).json({
        success: true,
        message: 'Purchase transaction recorded successfully',
        data: transaction
      });
    } catch (error: any) {
      console.error('Record purchase transaction error:', error);
      res.status(400).json({
        success: false,
        error: error?.message || 'Failed to record purchase transaction'
      });
    }
  }

  /**
   * Record payment transaction
   * POST /api/v1/accounting/transactions/payment
   */
  static async recordPaymentTransaction(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      const { supplierId, amount, description } = req.body;

      if (!supplierId || !amount || !description) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: supplierId, amount, description'
        });
      }

      const transaction = await TransactionService.recordPaymentTransaction(
        supplierId,
        amount,
        description,
        req.user.id
      );

      res.status(201).json({
        success: true,
        message: 'Payment transaction recorded successfully',
        data: transaction
      });
    } catch (error: any) {
      console.error('Record payment transaction error:', error);
      res.status(400).json({
        success: false,
        error: error?.message || 'Failed to record payment transaction'
      });
    }
  }

  /**
   * Generate trial balance
   * GET /api/v1/accounting/trial-balance
   */
  static async getTrialBalance(_req: AuthRequest, res: Response) {
    try {
      const trialBalance = await FinancialReportingService.generateTrialBalance();

      res.status(200).json({
        success: true,
        data: trialBalance
      });
    } catch (error: any) {
      console.error('Get trial balance error:', error);
      res.status(500).json({
        success: false,
        error: error?.message || 'Failed to generate trial balance'
      });
    }
  }

  /**
   * Get financial summary
   * GET /api/v1/accounting/financial-summary
   */
  static async getFinancialSummary(_req: AuthRequest, res: Response) {
    try {
      const summary = await FinancialReportingService.getFinancialSummary();

      res.status(200).json({
        success: true,
        data: {
          totalAssets: summary.assets,
          totalLiabilities: summary.liabilities,
          totalEquity: summary.equity,
          totalRevenue: summary.revenue,
          totalExpenses: summary.expenses,
          netIncome: summary.netIncome
        }
      });
    } catch (error: any) {
      console.error('Get financial summary error:', error);
      res.status(500).json({
        success: false,
        error: error?.message || 'Failed to get financial summary'
      });
    }
  }

  /**
   * Get account ledger
   * GET /api/v1/accounting/accounts/:code/ledger?page=1&limit=100
   */
  static async getAccountLedger(req: AuthRequest, res: Response) {
    try {
      const { code } = req.params;
      const { page = 1, limit = 100 } = req.query;

      const ledger = await FinancialReportingService.getAccountLedger(
        code,
        parseInt(page as string),
        parseInt(limit as string)
      );

      res.status(200).json({
        success: true,
        data: ledger
      });
    } catch (error: any) {
      console.error('Get account ledger error:', error);
      res.status(500).json({
        success: false,
        error: error?.message || 'Failed to get account ledger'
      });
    }
  }
}

/**
 * Expense Controller
 * Handles expense management operations
 */
export class ExpenseController {
  /**
   * Create expense
   * POST /api/v1/accounting/expenses
   */
  static async createExpense(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      const {
        expenseType,
        amount,
        description,
        vendor,
        paymentMethod,
        dueDate,
        category,
        accountCode,
        recurringExpenseId,
        referenceNumber
      } = req.body;

      // Validate required fields
      if (!expenseType || !amount || !description || !paymentMethod) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: expenseType, amount, description, paymentMethod'
        });
      }

      const expenseData: CreateExpenseData = {
        expenseType,
        amount: parseFloat(amount),
        description,
        vendor,
        paymentMethod,
        expenseDate: new Date(),
        dueDate: dueDate ? new Date(dueDate) : undefined,
        category,
        accountCode,
        recurringExpenseId,
        referenceNumber,
        createdBy: new mongoose.Types.ObjectId(req.user.id)
      };

      const expense = await ExpenseService.createExpense(expenseData as Partial<IExpense>);

      res.status(201).json({
        success: true,
        message: 'Expense created successfully',
        data: expense
      });
    } catch (error: any) {
      console.error('Create expense error:', error);
      res.status(400).json({
        success: false,
        error: error?.message || 'Failed to create expense'
      });
    }
  }

  /**
   * Get expenses
   * GET /api/v1/accounting/expenses?status=pending&page=1&limit=50
   */
  static async getExpenses(req: AuthRequest, res: Response) {
    try {
      const {
        status,
        expenseType,
        paymentMethod,
        startDate,
        endDate,
        page = 1,
        limit = 50
      } = req.query;

      const filters: any = {};
      if (status) filters.status = status;
      if (expenseType) filters.expenseType = expenseType;
      if (paymentMethod) filters.paymentMethod = paymentMethod;
      if (startDate) filters.startDate = new Date(startDate as string);
      if (endDate) filters.endDate = new Date(endDate as string);

      const result = await ExpenseService.getExpenses(
        filters,
        parseInt(page as string),
        parseInt(limit as string)
      );

      res.status(200).json({
        success: true,
        data: result.expenses,
        pagination: result.pagination
      });
    } catch (error: any) {
      console.error('Get expenses error:', error);
      res.status(500).json({
        success: false,
        error: error?.message || 'Failed to fetch expenses'
      });
    }
  }

  /**
   * Get expense by ID
   * GET /api/v1/accounting/expenses/:id
   */
  static async getExpenseById(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      const expense = await ExpenseService.getExpenseById(id);

      if (!expense) {
        return res.status(404).json({
          success: false,
          error: 'Expense not found'
        });
      }

      res.status(200).json({
        success: true,
        data: expense
      });
    } catch (error: any) {
      console.error('Get expense by ID error:', error);
      res.status(500).json({
        success: false,
        error: error?.message || 'Failed to fetch expense'
      });
    }
  }

  /**
   * Update expense status
   * PUT /api/v1/accounting/expenses/:id/status
   */
  static async updateExpenseStatus(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      const { id } = req.params;
      const { status, notes } = req.body;

      const updateData: Partial<IExpense> = { status };
      if (notes) {
        updateData.notes = notes;
      }

      if (status === 'approved' || status === 'paid') {
        updateData.approvedBy = new mongoose.Types.ObjectId(req.user.id);
        updateData.approvalDate = new Date();
      }

      if (status === 'paid') {
        updateData.paymentDate = new Date();
      }

      const expense = await ExpenseService.updateExpense(id, updateData);

      if (!expense) {
        return res.status(404).json({
          success: false,
          error: 'Expense not found'
        });
      }

      res.status(200).json({
        success: true,
        data: expense,
        message: `Expense ${status} successfully`
      });
    } catch (error: any) {
      console.error('Update expense status error:', error);
      res.status(500).json({
        success: false,
        error: error?.message || 'Failed to update expense status'
      });
    }
  }

  /**
   * Approve expense
   * POST /api/v1/accounting/expenses/:id/approve
   */
  static async approveExpense(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      const { id } = req.params;
      const expense = await ExpenseService.approveExpense(id, req.user.id);

      res.status(200).json({
        success: true,
        message: 'Expense approved successfully',
        data: expense
      });
    } catch (error: any) {
      console.error('Approve expense error:', error);
      res.status(400).json({
        success: false,
        error: error?.message || 'Failed to approve expense'
      });
    }
  }

  /**
   * Pay expense
   * POST /api/v1/accounting/expenses/:id/pay
   */
  static async payExpense(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      const { id } = req.params;
      const { paymentDate } = req.body;

      const expense = await ExpenseService.markExpenseAsPaid(id, paymentDate ? new Date(paymentDate) : undefined);

      res.status(200).json({
        success: true,
        message: 'Expense paid successfully',
        data: expense
      });
    } catch (error: any) {
      console.error('Pay expense error:', error);
      res.status(400).json({
        success: false,
        error: error?.message || 'Failed to pay expense'
      });
    }
  }

  /**
   * Update expense
   * PUT /api/v1/accounting/expenses/:id
   */
  static async updateExpense(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      const { id } = req.params;
      const updateData = req.body;

      const expense = await ExpenseService.updateExpense(id, updateData);

      res.status(200).json({
        success: true,
        message: 'Expense updated successfully',
        data: expense
      });
    } catch (error: any) {
      console.error('Update expense error:', error);
      res.status(400).json({
        success: false,
        error: error?.message || 'Failed to update expense'
      });
    }
  }

  /**
   * Delete expense
   * DELETE /api/v1/accounting/expenses/:id
   */
  static async deleteExpense(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      const { id } = req.params;

      // Note: Service doesn't return the deleted expense, just check if it exists first
      const expense = await ExpenseService.getExpenseById(id);
      if (!expense) {
        return res.status(404).json({
          success: false,
          error: 'Expense not found'
        });
      }

      // Since there's no delete method in service, we'll need to implement it or use direct model access
      // For now, return not implemented
      res.status(501).json({
        success: false,
        error: 'Delete expense not implemented yet'
      });
    } catch (error: any) {
      console.error('Delete expense error:', error);
      res.status(400).json({
        success: false,
        error: error?.message || 'Failed to delete expense'
      });
    }
  }
}

/**
 * Recurring Expense Controller
 * Handles recurring expense management operations
 */
export class RecurringExpenseController {
  /**
   * Create recurring expense
   * POST /api/v1/accounting/recurring-expenses
   */
  static async createRecurringExpense(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      const {
        name,
        description,
        expenseType,
        amount,
        frequency,
        startDate,
        endDate,
        accountCode,
        vendor,
        paymentMethod,
        category,
        autoGenerate,
        isActive
      } = req.body;

      // Validate required fields
      if (!name || !expenseType || !amount || !frequency || !startDate) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: name, expenseType, amount, frequency, startDate'
        });
      }

      const recurringExpenseData: CreateRecurringExpenseData = {
        name,
        description,
        expenseType,
        amount: parseFloat(amount),
        frequency,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : undefined,
        accountCode,
        vendor,
        paymentMethod,
        category,
        autoGenerate: autoGenerate !== undefined ? autoGenerate : true,
        isActive: isActive !== undefined ? isActive : true,
        createdBy: new mongoose.Types.ObjectId(req.user.id)
      };

      const recurringExpense = await RecurringExpenseService.createRecurringExpense(recurringExpenseData);

      res.status(201).json({
        success: true,
        message: 'Recurring expense created successfully',
        data: recurringExpense
      });
    } catch (error: any) {
      console.error('Create recurring expense error:', error);
      res.status(400).json({
        success: false,
        error: error?.message || 'Failed to create recurring expense'
      });
    }
  }

  /**
   * Get recurring expenses
   * GET /api/v1/accounting/recurring-expenses?isActive=true&page=1&limit=50
   */
  static async getRecurringExpenses(req: AuthRequest, res: Response) {
    try {
      const {
        isActive,
        expenseType,
        frequency,
        page = 1,
        limit = 50
      } = req.query;

      const filters: any = {};
      if (isActive !== undefined) filters.isActive = isActive === 'true';
      if (expenseType) filters.expenseType = expenseType;
      if (frequency) filters.frequency = frequency;

      const result = await RecurringExpenseService.getRecurringExpenses(
        filters,
        parseInt(page as string),
        parseInt(limit as string)
      );

      res.status(200).json({
        success: true,
        data: result.recurringExpenses,
        pagination: result.pagination
      });
    } catch (error: any) {
      console.error('Get recurring expenses error:', error);
      res.status(500).json({
        success: false,
        error: error?.message || 'Failed to fetch recurring expenses'
      });
    }
  }

  /**
   * Get recurring expense by ID
   * GET /api/v1/accounting/recurring-expenses/:id
   */
  static async getRecurringExpenseById(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      const recurringExpense = await RecurringExpenseService.getRecurringExpenseById(id);

      if (!recurringExpense) {
        return res.status(404).json({
          success: false,
          error: 'Recurring expense not found'
        });
      }

      res.status(200).json({
        success: true,
        data: recurringExpense
      });
    } catch (error: any) {
      console.error('Get recurring expense by ID error:', error);
      res.status(500).json({
        success: false,
        error: error?.message || 'Failed to fetch recurring expense'
      });
    }
  }

  /**
   * Update recurring expense
   * PUT /api/v1/accounting/recurring-expenses/:id
   */
  static async updateRecurringExpense(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      const { id } = req.params;
      const updateData = req.body;

      const recurringExpense = await RecurringExpenseService.updateRecurringExpense(id, updateData);

      res.status(200).json({
        success: true,
        message: 'Recurring expense updated successfully',
        data: recurringExpense
      });
    } catch (error: any) {
      console.error('Update recurring expense error:', error);
      res.status(400).json({
        success: false,
        error: error?.message || 'Failed to update recurring expense'
      });
    }
  }

  /**
   * Delete recurring expense
   * DELETE /api/v1/accounting/recurring-expenses/:id
   */
  static async deleteRecurringExpense(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      const { id } = req.params;

      await RecurringExpenseService.deleteRecurringExpense(id);

      res.status(200).json({
        success: true,
        message: 'Recurring expense deleted successfully'
      });
    } catch (error: any) {
      console.error('Delete recurring expense error:', error);
      res.status(400).json({
        success: false,
        error: error?.message || 'Failed to delete recurring expense'
      });
    }
  }

  /**
   * Generate monthly expenses
   * POST /api/v1/accounting/recurring-expenses/generate-monthly
   */
  static async generateMonthlyExpenses(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      const { targetDate } = req.body;
      const date = targetDate ? new Date(targetDate) : new Date();

      const result = await RecurringExpenseService.generateMonthlyExpenses(date);

      res.status(200).json({
        success: true,
        message: `Generated ${result.generatedCount} expenses for ${date.toISOString().split('T')[0]}`,
        data: result
      });
    } catch (error: any) {
      console.error('Generate monthly expenses error:', error);
      res.status(500).json({
        success: false,
        error: error?.message || 'Failed to generate monthly expenses'
      });
    }
  }

  /**
   * Get upcoming recurring expenses
   * GET /api/v1/accounting/recurring-expenses/upcoming
   */
  static async getUpcomingExpenses(req: AuthRequest, res: Response) {
    try {
      const { daysAhead = 30 } = req.query;

      const upcomingExpenses = await RecurringExpenseService.getUpcomingExpenses(parseInt(daysAhead as string));

      res.status(200).json({
        success: true,
        data: upcomingExpenses
      });
    } catch (error: any) {
      console.error('Get upcoming expenses error:', error);
      res.status(500).json({
        success: false,
        error: error?.message || 'Failed to get upcoming expenses'
      });
    }
  }
}