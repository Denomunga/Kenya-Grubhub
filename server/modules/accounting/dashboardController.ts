import { Request, Response } from 'express';
import {
  FinancialReportingService,
  ExpenseService
} from './service';
import { Transaction, Invoice } from './models';

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

      const query: any = {};
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

      const monthlyData = await Transaction.aggregate([
        { $match: { transactionDate: { $gte: startDate } } },
        {
          $group: {
            _id: {
              year: { $year: '$transactionDate' },
              month: { $month: '$transactionDate' }
            },
            totalAmount: { $sum: '$totalAmount' },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } }
      ]);

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

      const cashFlow = await Transaction.aggregate([
        { $match: { transactionDate: { $gte: startDate }, status: 'posted' } },
        {
          $group: {
            _id: {
              date: { $dateToString: { format: '%Y-%m-%d', date: '$transactionDate' } },
              type: '$transactionType'
            },
            total: { $sum: '$totalAmount' }
          }
        },
        { $sort: { '_id.date': 1 } }
      ]);

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
