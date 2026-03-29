import { Request, Response } from 'express';
import {
  AccountService,
  EnhancedReportingService,
  AgingReportService,
  TaxService,
  AuditService,
  InvoiceService,
  InventoryAccountingService,
  InsightsService,
  CashFlowForecastService,
  RecurringInvoiceService,
} from './service';

interface AuthRequest extends Request {
  user?: { id: string; email: string; role: string; firstName?: string; lastName?: string };
}

// ============================================================
// ACCOUNT (COA) CONTROLLER
// ============================================================
export class AccountCRUDController {
  static async createAccount(req: AuthRequest, res: Response) {
    try {
      const account = await AccountService.createAccount(req.body);
      await AuditService.log({ action: 'create', entityType: 'Account', entityId: account._id.toString(), entityRef: account.code, userId: req.user!.id });
      res.status(201).json({ success: true, data: account });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error?.message || 'Failed to create account' });
    }
  }

  static async updateAccount(req: AuthRequest, res: Response) {
    try {
      const account = await AccountService.updateAccount(req.params.id, req.body);
      await AuditService.log({ action: 'update', entityType: 'Account', entityId: req.params.id, entityRef: account.code, userId: req.user!.id, changes: req.body });
      res.status(200).json({ success: true, data: account });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error?.message || 'Failed to update account' });
    }
  }

  static async deleteAccount(req: AuthRequest, res: Response) {
    try {
      const account = await AccountService.deleteAccount(req.params.id);
      await AuditService.log({ action: 'delete', entityType: 'Account', entityId: req.params.id, entityRef: account.code, userId: req.user!.id });
      res.status(200).json({ success: true, message: 'Account deactivated' });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error?.message || 'Failed to delete account' });
    }
  }

  static async getAccountsByCategory(req: AuthRequest, res: Response) {
    try {
      const accounts = await AccountService.getAccountsByCategory(req.params.category);
      res.status(200).json({ success: true, data: accounts });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error?.message || 'Failed to fetch accounts' });
    }
  }
}

// ============================================================
// ENHANCED REPORTS CONTROLLER
// ============================================================
export class ReportsController {
  static async getIncomeStatement(req: AuthRequest, res: Response) {
    try {
      const { startDate, endDate } = req.query;
      const start = startDate ? new Date(startDate as string) : new Date(new Date().getFullYear(), 0, 1);
      const end = endDate ? new Date(endDate as string) : new Date();
      const report = await EnhancedReportingService.getIncomeStatement(start, end);
      res.status(200).json({ success: true, data: report });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error?.message || 'Failed to generate income statement' });
    }
  }

  static async getBalanceSheet(req: AuthRequest, res: Response) {
    try {
      const { asOfDate } = req.query;
      const date = asOfDate ? new Date(asOfDate as string) : new Date();
      const report = await EnhancedReportingService.getBalanceSheet(date);
      res.status(200).json({ success: true, data: report });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error?.message || 'Failed to generate balance sheet' });
    }
  }

  static async getCashFlowStatement(req: AuthRequest, res: Response) {
    try {
      const { startDate, endDate } = req.query;
      const start = startDate ? new Date(startDate as string) : new Date(new Date().getFullYear(), 0, 1);
      const end = endDate ? new Date(endDate as string) : new Date();
      const report = await EnhancedReportingService.getCashFlowStatement(start, end);
      res.status(200).json({ success: true, data: report });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error?.message || 'Failed to generate cash flow statement' });
    }
  }

  static async getGeneralLedger(req: AuthRequest, res: Response) {
    try {
      const { startDate, endDate, accountCode, page = '1', limit = '100' } = req.query;
      const start = startDate ? new Date(startDate as string) : new Date(new Date().getFullYear(), 0, 1);
      const end = endDate ? new Date(endDate as string) : new Date();
      const report = await EnhancedReportingService.getGeneralLedger(start, end, accountCode as string, parseInt(page as string), parseInt(limit as string));
      res.status(200).json({ success: true, data: report.entries, pagination: report.pagination });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error?.message || 'Failed to fetch general ledger' });
    }
  }

  static async getTrialBalance(req: AuthRequest, res: Response) {
    try {
      const { asOfDate } = req.query;
      const date = asOfDate ? new Date(asOfDate as string) : undefined;
      const report = await EnhancedReportingService.getTrialBalance(date);
      res.status(200).json({ success: true, data: report });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error?.message || 'Failed to generate trial balance' });
    }
  }
}

// ============================================================
// AGING REPORTS CONTROLLER
// ============================================================
export class AgingController {
  static async getReceivableAging(_req: AuthRequest, res: Response) {
    try {
      const report = await AgingReportService.getReceivableAging();
      res.status(200).json({ success: true, data: report });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error?.message || 'Failed to generate AR aging' });
    }
  }

  static async getPayableAging(_req: AuthRequest, res: Response) {
    try {
      const report = await AgingReportService.getPayableAging();
      res.status(200).json({ success: true, data: report });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error?.message || 'Failed to generate AP aging' });
    }
  }
}

// ============================================================
// TAX CONTROLLER
// ============================================================
export class TaxController {
  static async getTaxRates(req: AuthRequest, res: Response) {
    try {
      const { type, isActive } = req.query;
      const filters: any = {};
      if (type) filters.type = type;
      if (isActive !== undefined) filters.isActive = isActive === 'true';
      const rates = await TaxService.getTaxRates(filters);
      res.status(200).json({ success: true, data: rates });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error?.message || 'Failed to fetch tax rates' });
    }
  }

  static async createTaxRate(req: AuthRequest, res: Response) {
    try {
      const rate = await TaxService.createTaxRate({ ...req.body, createdBy: req.user!.id });
      res.status(201).json({ success: true, data: rate });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error?.message || 'Failed to create tax rate' });
    }
  }

  static async updateTaxRate(req: AuthRequest, res: Response) {
    try {
      const rate = await TaxService.updateTaxRate(req.params.id, req.body);
      res.status(200).json({ success: true, data: rate });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error?.message || 'Failed to update tax rate' });
    }
  }

  static async deleteTaxRate(req: AuthRequest, res: Response) {
    try {
      await TaxService.deleteTaxRate(req.params.id);
      res.status(200).json({ success: true, message: 'Tax rate deleted' });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error?.message || 'Failed to delete tax rate' });
    }
  }

  static async getTaxSummary(req: AuthRequest, res: Response) {
    try {
      const { startDate, endDate } = req.query;
      const start = startDate ? new Date(startDate as string) : new Date(new Date().getFullYear(), 0, 1);
      const end = endDate ? new Date(endDate as string) : new Date();
      const summary = await TaxService.getTaxSummary(start, end);
      res.status(200).json({ success: true, data: summary });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error?.message || 'Failed to get tax summary' });
    }
  }

  static async initTaxRates(req: AuthRequest, res: Response) {
    try {
      await TaxService.initializeDefaultTaxRates(req.user!.id);
      res.status(200).json({ success: true, message: 'Default tax rates initialized' });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error?.message || 'Failed to initialize tax rates' });
    }
  }
}

// ============================================================
// AUDIT CONTROLLER
// ============================================================
export class AuditController {
  static async getAuditLogs(req: AuthRequest, res: Response) {
    try {
      const { entityType, entityId, userId, action, startDate, endDate, page = '1', limit = '50' } = req.query;
      const filters: any = {};
      if (entityType) filters.entityType = entityType;
      if (entityId) filters.entityId = entityId;
      if (userId) filters.userId = userId;
      if (action) filters.action = action;
      if (startDate) filters.startDate = startDate;
      if (endDate) filters.endDate = endDate;
      const result = await AuditService.getAuditLogs(filters, parseInt(page as string), parseInt(limit as string));
      res.status(200).json({ success: true, data: result.logs, pagination: result.pagination });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error?.message || 'Failed to fetch audit logs' });
    }
  }
}

// ============================================================
// ENHANCED INVOICE CONTROLLER
// ============================================================
export class InvoiceEnhancedController {
  static async getInvoices(req: AuthRequest, res: Response) {
    try {
      const { status, clientName, startDate, endDate, page = '1', limit = '50' } = req.query;
      const filters: any = {};
      if (status) filters.status = status;
      if (clientName) filters.clientName = clientName;
      if (startDate) filters.startDate = startDate;
      if (endDate) filters.endDate = endDate;
      const result = await InvoiceService.getInvoices(filters, parseInt(page as string), parseInt(limit as string));
      res.status(200).json({ success: true, data: result.invoices, pagination: result.pagination });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error?.message || 'Failed to fetch invoices' });
    }
  }

  static async getInvoiceById(req: AuthRequest, res: Response) {
    try {
      const invoice = await InvoiceService.getInvoiceById(req.params.id);
      res.status(200).json({ success: true, data: invoice });
    } catch (error: any) {
      res.status(404).json({ success: false, error: error?.message || 'Invoice not found' });
    }
  }

  static async updateInvoice(req: AuthRequest, res: Response) {
    try {
      const invoice = await InvoiceService.updateInvoice(req.params.id, req.body);
      await AuditService.log({ action: 'update', entityType: 'Invoice', entityId: req.params.id, entityRef: invoice.invoiceNumber, userId: req.user!.id, changes: req.body });
      res.status(200).json({ success: true, data: invoice });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error?.message || 'Failed to update invoice' });
    }
  }

  static async recordPayment(req: AuthRequest, res: Response) {
    try {
      const { amount } = req.body;
      if (!amount || amount <= 0) return res.status(400).json({ success: false, error: 'Valid payment amount required' });
      const invoice = await InvoiceService.recordPayment(req.params.id, amount, req.user!.id);
      await AuditService.log({ action: 'pay', entityType: 'Invoice', entityId: req.params.id, entityRef: invoice.invoiceNumber, userId: req.user!.id, metadata: { amount } });
      res.status(200).json({ success: true, data: invoice, message: 'Payment recorded' });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error?.message || 'Failed to record payment' });
    }
  }

  static async deleteInvoice(req: AuthRequest, res: Response) {
    try {
      const invoice = await InvoiceService.deleteInvoice(req.params.id);
      await AuditService.log({ action: 'delete', entityType: 'Invoice', entityId: req.params.id, entityRef: invoice.invoiceNumber, userId: req.user!.id });
      res.status(200).json({ success: true, message: 'Invoice deleted' });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error?.message || 'Failed to delete invoice' });
    }
  }

  static async bulkUpdateStatus(req: AuthRequest, res: Response) {
    try {
      const { ids, status } = req.body;
      if (!ids?.length || !status) return res.status(400).json({ success: false, error: 'ids and status required' });
      const result = await InvoiceService.bulkUpdateStatus(ids, status);
      res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error?.message || 'Failed to bulk update' });
    }
  }
}

// ============================================================
// INVENTORY ACCOUNTING CONTROLLER
// ============================================================
export class InventoryAccountingController {
  static async getStockOverview(_req: AuthRequest, res: Response) {
    try {
      const data = await InventoryAccountingService.getStockOverview();
      res.json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error?.message || 'Failed to get stock overview' });
    }
  }

  static async getCOGS(req: AuthRequest, res: Response) {
    try {
      const { startDate, endDate } = req.query;
      const start = startDate ? new Date(startDate as string) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      const end = endDate ? new Date(endDate as string) : new Date();
      const data = await InventoryAccountingService.getCOGS(start, end);
      res.json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error?.message || 'Failed to calculate COGS' });
    }
  }
}

// ============================================================
// INSIGHTS CONTROLLER
// ============================================================
export class InsightsController {
  static async getInsights(_req: AuthRequest, res: Response) {
    try {
      const insights = await InsightsService.getInsights();
      res.json({ success: true, data: insights });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error?.message || 'Failed to get insights' });
    }
  }
}

// ============================================================
// CASH FLOW FORECAST CONTROLLER
// ============================================================
export class CashFlowForecastController {
  static async getForecast(req: AuthRequest, res: Response) {
    try {
      const days = req.query.days ? parseInt(req.query.days as string) : 30;
      const forecast = await CashFlowForecastService.getForecast(days);
      res.json({ success: true, data: forecast });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error?.message || 'Failed to get cash flow forecast' });
    }
  }
}

// ============================================================
// RECURRING INVOICE CONTROLLER
// ============================================================
export class RecurringInvoiceController {
  static async getAll(_req: AuthRequest, res: Response) {
    try {
      const items = await RecurringInvoiceService.getAll();
      res.json({ success: true, data: items });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error?.message || 'Failed to get recurring invoices' });
    }
  }

  static async create(req: AuthRequest, res: Response) {
    try {
      const item = await RecurringInvoiceService.create({ ...req.body, createdBy: req.user!.id });
      await AuditService.log({ action: 'create', entityType: 'RecurringInvoice', entityId: item._id.toString(), entityRef: item.recurringId, userId: req.user!.id });
      res.status(201).json({ success: true, data: item });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error?.message || 'Failed to create recurring invoice' });
    }
  }

  static async update(req: AuthRequest, res: Response) {
    try {
      const item = await RecurringInvoiceService.update(req.params.id, req.body);
      await AuditService.log({ action: 'update', entityType: 'RecurringInvoice', entityId: item._id.toString(), entityRef: item.recurringId, userId: req.user!.id });
      res.json({ success: true, data: item });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error?.message || 'Failed to update recurring invoice' });
    }
  }

  static async delete(req: AuthRequest, res: Response) {
    try {
      const item = await RecurringInvoiceService.delete(req.params.id);
      await AuditService.log({ action: 'delete', entityType: 'RecurringInvoice', entityId: item._id.toString(), entityRef: item.recurringId, userId: req.user!.id });
      res.json({ success: true, data: item });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error?.message || 'Failed to delete recurring invoice' });
    }
  }

  static async generateDue(req: AuthRequest, res: Response) {
    try {
      const result = await RecurringInvoiceService.generateDueInvoices(req.user!.id);
      res.json({ success: true, data: result });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error?.message || 'Failed to generate invoices' });
    }
  }
}

// ============================================================
// AUTO JOURNAL ENTRY CONTROLLER
// ============================================================
export class AutoJournalController {
  static async generateFromOrders(req: AuthRequest, res: Response) {
    try {
      const { Order } = await import('../../models/Order');
      const { Sale } = await import('../../models/Sale');
      const { Account, JournalEntry } = await import('./models');
      
      // Get orders and POS sales from last 30 days that don't have journal entries yet
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const [orders, sales] = await Promise.all([
        Order.find({ 
          status: 'Delivered', 
          createdAt: { $gte: thirtyDaysAgo }
        }).lean(),
        Sale.find({ 
          status: 'Completed', 
          createdAt: { $gte: thirtyDaysAgo }
        }).lean()
      ]);
      
      // Get existing journal entries to avoid duplicates
      const existingOrderRefs = await JournalEntry.find({
        referenceType: 'Order',
        referenceId: { $in: orders.map((o: any) => o._id) }
      }).distinct('referenceId');
      
      const existingSaleRefs = await JournalEntry.find({
        referenceType: 'POSSale',
        referenceId: { $in: sales.map((s: any) => s._id) }
      }).distinct('referenceId');
      
      const existingOrderIds = new Set(existingOrderRefs.map(String));
      const existingSaleIds = new Set(existingSaleRefs.map(String));
      
      // Filter out orders/sales that already have journal entries
      const newOrders = orders.filter((o: any) => !existingOrderIds.has(String(o._id)));
      const newSales = sales.filter((s: any) => !existingSaleIds.has(String(s._id)));
      
      // Get or create required accounts
      let revenueAccount = await Account.findOne({ code: { $in: ['4000', '4100'] }, status: 'active' });
      let arAccount = await Account.findOne({ code: { $in: ['1200', '1100'] }, status: 'active' });
      
      // Auto-create missing accounts
      if (!revenueAccount) {
        console.log('Creating missing Sales Revenue account (4000)');
        revenueAccount = await Account.create({
          code: '4000',
          name: 'Sales Revenue',
          category: 'revenue',
          normalBalance: 'credit',
          status: 'active'
        });
      }
      
      if (!arAccount) {
        console.log('Creating missing Accounts Receivable account (1200)');
        arAccount = await Account.create({
          code: '1200',
          name: 'Accounts Receivable',
          category: 'asset',
          subcategory: 'current_asset',
          normalBalance: 'debit',
          status: 'active'
        });
      }
      
      let count = 0;
      
      // Create journal entries for regular orders
      for (const order of newOrders) {
        const entryNumber = `JE-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
        const je = new JournalEntry({
          entryNumber,
          transactionDate: (order as any).createdAt || new Date(),
          description: `Sales revenue from Order #${(order as any).orderNumber || (order as any)._id}`,
          referenceType: 'Order',
          referenceId: (order as any)._id,
          referenceNumber: (order as any).orderNumber,
          lineItems: [
            { accountId: arAccount._id, accountCode: arAccount.code, accountName: arAccount.name, debit: (order as any).total || 0, credit: 0, description: 'Accounts Receivable' },
            { accountId: revenueAccount._id, accountCode: revenueAccount.code, accountName: revenueAccount.name, debit: 0, credit: (order as any).total || 0, description: 'Sales Revenue' }
          ],
          status: 'posted',
          createdBy: req.user!.id,
          postedBy: req.user!.id,
          postedAt: new Date()
        });
        await je.save();
        await AuditService.log({ action: 'create', entityType: 'JournalEntry', entityId: je._id.toString(), entityRef: je.entryNumber, userId: req.user!.id, metadata: `Auto-generated from order ${(order as any).orderNumber}` });
        count++;
      }
      
      // Create journal entries for POS sales
      for (const sale of newSales) {
        const entryNumber = `JE-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
        const je = new JournalEntry({
          entryNumber,
          transactionDate: (sale as any).createdAt || new Date(),
          description: `POS sales revenue - Receipt #${(sale as any).receiptNumber || (sale as any)._id}`,
          referenceType: 'POSSale',
          referenceId: (sale as any)._id,
          referenceNumber: (sale as any).receiptNumber,
          lineItems: [
            { accountId: arAccount._id, accountCode: arAccount.code, accountName: arAccount.name, debit: (sale as any).total || 0, credit: 0, description: 'Cash/Accounts Receivable' },
            { accountId: revenueAccount._id, accountCode: revenueAccount.code, accountName: revenueAccount.name, debit: 0, credit: (sale as any).total || 0, description: 'POS Sales Revenue' }
          ],
          status: 'posted',
          createdBy: req.user!.id,
          postedBy: req.user!.id,
          postedAt: new Date()
        });
        await je.save();
        await AuditService.log({ action: 'create', entityType: 'JournalEntry', entityId: je._id.toString(), entityRef: je.entryNumber, userId: req.user!.id, metadata: `Auto-generated from POS sale ${(sale as any).receiptNumber}` });
        count++;
      }
      
      res.json({ 
        success: true, 
        data: { 
          count, 
          orders: newOrders.length, 
          posSales: newSales.length,
          message: `Generated ${count} journal entries (${newOrders.length} from orders, ${newSales.length} from POS sales)` 
        } 
      });
    } catch (error: any) {
      console.error('Auto-journal from orders failed:', error);
      res.status(500).json({ success: false, error: error?.message || 'Failed to generate journal entries' });
    }
  }
  
  static async generateFromProcurement(_req: AuthRequest, res: Response) {
    try {
      // This can be implemented later for procurement transactions
      res.json({ success: true, data: { count: 0, message: 'Procurement auto-journal not yet implemented' } });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error?.message || 'Failed to generate journal entries' });
    }
  }
}
