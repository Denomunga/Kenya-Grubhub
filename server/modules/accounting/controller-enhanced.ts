import { Request, Response } from 'express';
import {
  AccountService,
  EnhancedReportingService,
  AgingReportService,
  TaxService,
  AuditService,
  InvoiceService,
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
      const invoice = await InvoiceService.recordPayment(req.params.id, amount);
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
