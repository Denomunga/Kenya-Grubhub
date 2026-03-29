import { Request, Response } from 'express';
import {
  FinancialReportingService,
  ExpenseService
} from './service';
import { Transaction, Invoice, JournalEntry, Expense } from './models';

interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}





export class DashboardController {
  /**
   * Get dashboard stats
   * GET /api/v1/accounting/stats
   */


  
  static async getStats(_req: AuthRequest, res: Response) {
    try {
      const summary = await FinancialReportingService.getFinancialSummary();
      const expenseStats = await ExpenseService.getExpenseStats();

      res.status(200).json({
        success: true,
        data: {
          totalRevenue: summary.revenue,
          totalExpenses: summary.expenses,
          netIncome: summary.netIncome,
          totalAssets: summary.assets,
          totalLiabilities: summary.liabilities,
          totalEquity: summary.equity,
          cashBalance: summary.cashBalance,
          outstandingPayments: summary.accountsReceivable,
          accountsPayable: summary.accountsPayable,
          expenseStats: expenseStats.overview,
          expensesByCategory: expenseStats.expensesByCategory
        }
      });
    } catch (error: any) {
      console.error('Get stats error:', error);
      res.status(500).json({
        success: false,
        error: error?.message || 'Failed to get stats'
      });
    }
  }

  /**
   * Get transactions
   * GET /api/v1/accounting/transactions?page=1&limit=50&type=income|expense
   */
  static async getTransactions(req: AuthRequest, res: Response) {
    try {
      const { page = 1, limit = 50, type } = req.query;

      const query: any = { isDeleted: { $ne: true } };
      if (type === 'income') query.transactionType = 'sale';
      else if (type === 'expense') query.transactionType = { $in: ['purchase', 'payment'] };

      const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

      const transactions = await Transaction
        .find(query)
        .sort({ transactionDate: -1 })
        .skip(skip)
        .limit(parseInt(limit as string))
        .lean();

      const total = await Transaction.countDocuments(query);

      res.status(200).json({
        success: true,
        data: transactions,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total,
          pages: Math.ceil(total / parseInt(limit as string))
        }
      });
    } catch (error: any) {
      console.error('Get transactions error:', error);
      res.status(500).json({
        success: false,
        error: error?.message || 'Failed to fetch transactions'
      });
    }
  }

  /**
   * Get invoices
   * GET /api/v1/accounting/invoices?status=paid|unpaid|overdue|partial
   */
  static async getInvoices(req: AuthRequest, res: Response) {
    try {
      const { status } = req.query;

      const query: any = {};
      if (status) query.status = status;

      const invoices = await Invoice
        .find(query)
        .sort({ createdAt: -1 })
        .lean();

      res.status(200).json({
        success: true,
        data: { invoices }
      });
    } catch (error: any) {
      console.error('Get invoices error:', error);
      res.status(500).json({
        success: false,
        error: error?.message || 'Failed to fetch invoices'
      });
    }
  }

  /**
   * Get monthly financial data
   * GET /api/v1/accounting/monthly?months=12
   */
  static async getMonthlyData(req: AuthRequest, res: Response) {
    try {
      const { months = 12 } = req.query;
      const monthCount = parseInt(months as string);

      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - monthCount);

      // Get revenue from journal entries (posted sales)
      const revenueData = await JournalEntry.aggregate([
        { 
          $match: { 
            transactionDate: { $gte: startDate },
            status: 'posted',
            $or: [
              { referenceType: 'Order' },
              { referenceType: 'POSSale' }
            ]
          } 
        },
        { $unwind: '$lineItems' },
        {
          $match: {
            'lineItems.credit': { $gt: 0 },
            'lineItems.accountCode': { $in: ['4000', '4100', '4200'] } // Revenue accounts
          }
        },
        {
          $group: {
            _id: {
              year: { $year: '$transactionDate' },
              month: { $month: '$transactionDate' }
            },
            revenue: { $sum: '$lineItems.credit' }
          }
        }
      ]);

      // Get expenses from Expense collection
      const expenseData = await Expense.aggregate([
        { 
          $match: { 
            expenseDate: { $gte: startDate },
            status: { $in: ['approved', 'paid'] }
          } 
        },
        {
          $group: {
            _id: {
              year: { $year: '$expenseDate' },
              month: { $month: '$expenseDate' }
            },
            expenses: { $sum: '$amount' }
          }
        }
      ]);

      // Merge revenue and expense data by month
      const monthMap = new Map();
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

      revenueData.forEach((item: any) => {
        const key = `${item._id.year}-${item._id.month}`;
        monthMap.set(key, { 
          month: monthNames[item._id.month - 1],
          year: item._id.year,
          revenue: item.revenue || 0,
          expenses: 0
        });
      });

      expenseData.forEach((item: any) => {
        const key = `${item._id.year}-${item._id.month}`;
        if (monthMap.has(key)) {
          monthMap.get(key).expenses = item.expenses || 0;
        } else {
          monthMap.set(key, {
            month: monthNames[item._id.month - 1],
            year: item._id.year,
            revenue: 0,
            expenses: item.expenses || 0
          });
        }
      });

      const monthlyData = Array.from(monthMap.values())
        .sort((a, b) => {
          if (a.year !== b.year) return a.year - b.year;
          return monthNames.indexOf(a.month) - monthNames.indexOf(b.month);
        });

      res.status(200).json({
        success: true,
        data: monthlyData
      });
    } catch (error: any) {
      console.error('Get monthly data error:', error);
      res.status(500).json({
        success: false,
        error: error?.message || 'Failed to fetch monthly data'
      });
    }
  }

  /**
   * Get cash flow data
   * GET /api/v1/accounting/cashflow?days=30
   */
  static async getCashFlow(req: AuthRequest, res: Response) {
    try {
      const { days = 30 } = req.query;
      const dayCount = parseInt(days as string);

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - dayCount);

      // Get inflow from journal entries (revenue)
      const inflowData = await JournalEntry.aggregate([
        { 
          $match: { 
            transactionDate: { $gte: startDate },
            status: 'posted',
            $or: [
              { referenceType: 'Order' },
              { referenceType: 'POSSale' }
            ]
          } 
        },
        { $unwind: '$lineItems' },
        {
          $match: {
            'lineItems.credit': { $gt: 0 },
            'lineItems.accountCode': { $in: ['4000', '4100', '4200'] }
          }
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$transactionDate' } },
            inflow: { $sum: '$lineItems.credit' }
          }
        }
      ]);

      // Get outflow from expenses
      const outflowData = await Expense.aggregate([
        { 
          $match: { 
            expenseDate: { $gte: startDate },
            status: { $in: ['approved', 'paid'] }
          } 
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$expenseDate' } },
            outflow: { $sum: '$amount' }
          }
        }
      ]);

      // Merge inflow and outflow by date
      const dateMap = new Map();

      inflowData.forEach((item: any) => {
        dateMap.set(item._id, { date: item._id, inflow: item.inflow || 0, outflow: 0 });
      });

      outflowData.forEach((item: any) => {
        if (dateMap.has(item._id)) {
          dateMap.get(item._id).outflow = item.outflow || 0;
        } else {
          dateMap.set(item._id, { date: item._id, inflow: 0, outflow: item.outflow || 0 });
        }
      });

      const cashFlow = Array.from(dateMap.values())
        .sort((a, b) => a.date.localeCompare(b.date));

      res.status(200).json({
        success: true,
        data: cashFlow
      });
    } catch (error: any) {
      console.error('Get cash flow error:', error);
      res.status(500).json({
        success: false,
        error: error?.message || 'Failed to fetch cash flow data'
      });
    }
  }
}
