import { Router, Request, Response } from 'express';
import { body, query, param, validationResult } from 'express-validator';
import { AccountingController, ExpenseController, RecurringExpenseController } from './controller';
import { DashboardController } from './dashboardController';
import { AccountCRUDController, ReportsController, AgingController, TaxController, AuditController, InvoiceEnhancedController, InventoryAccountingController, InsightsController, CashFlowForecastController, RecurringInvoiceController, AutoJournalController } from './controller-enhanced';
import { requireAuth } from '@shared/middleware/auth';
import { requireRole } from '@shared/middleware/roles';
import { generalLimiter, authLimiter } from '@shared/middleware/rateLimiter';
import multer from 'multer'; // ✅ ADD THIS IMPORT
import { BankReconciliationController } from './controler/bankReconciliationController';
import { SearchController } from './controler/searchController';



const upload = multer({ storage: multer.memoryStorage() }); // ✅ ADD MULTER CONFIG



const router = Router();


// Middleware for handling validation errors
const handleValidationErrors = (req: Request, res: Response, next: Function) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }
  next();
};


// Add to your accounting routes
router.get('/search/entities', requireAuth, SearchController.searchEntities);









// Bank reconciliation routes
router.post(
  '/reconciliation/upload',
  requireAuth,
  requireRole(['admin', 'accounting_manager']),
  upload.single('statement'),
  BankReconciliationController.uploadStatement
);

router.post(
  '/reconciliation/:statementId/auto-match',
  requireAuth,
  requireRole(['admin', 'accounting_manager']),
  BankReconciliationController.autoMatch
);

router.post(
  '/reconciliation/:statementId/transactions/:transactionId/match',
  requireAuth,
  requireRole(['admin', 'accounting_manager']),
  BankReconciliationController.manualMatch
);

router.post(
  '/reconciliation/:statementId/adjustment',
  requireAuth,
  requireRole(['admin', 'accounting_manager']),
  BankReconciliationController.createAdjustment
);

router.get(
  '/reconciliation/status/:bankAccountCode',
  requireAuth,
  requireRole(['admin', 'accounting_manager', 'accounting_person']),
  BankReconciliationController.getReconciliationStatus
);

router.get(
  '/reconciliation/statement/:statementId',
  requireAuth,
  requireRole(['admin', 'accounting_manager', 'accounting_person']),
  BankReconciliationController.getStatementDetails
);

router.get(
  '/reconciliation/statements',
  requireAuth,
  requireRole(['admin', 'accounting_manager', 'accounting_person']),
  BankReconciliationController.getAllStatements
);

router.post(
  '/reconciliation/:statementId/finalize',
  requireAuth,
  requireRole(['admin', 'accounting_manager']),
  BankReconciliationController.finalizeReconciliation
);






// ============================================================
// INITIALIZATION ENDPOINTS
// ============================================================

/**
 * Initialize chart of accounts with default accounts
 * POST /api/v1/accounting/init
 * Requires: Admin role
 */

// Remove line 34 completely
// router.post('/sync-auth0', checkJwt, async (req, res) => { ... });

// Then for all protected accounting routes, replace requireAuth with checkJwt
// Example:
router.get('/stats', generalLimiter, requireAuth, requireRole(['admin', 'accounting_manager']), DashboardController.getStats);
// etc.


router.post(
  '/init',
  authLimiter,
  requireAuth,
  requireRole(['admin']),
  AccountingController.initializeAccounts
);


// ============================================================
// INVOICE ENDPOINTS (including PDF upload)
// ============================================================

/**
 * Create a new invoice (manual entry)
 * POST /api/v1/accounting/invoices
 */
router.post(
  '/invoices',
  authLimiter,
  requireAuth,
  requireRole(['admin', 'accounting_manager']),
  [
    body('clientName').trim().notEmpty().withMessage('Client name is required'),
    body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be a positive number'),
    body('dueDate').isISO8601().withMessage('Invalid due date'),
    body('description').optional().trim().isLength({ max: 500 }),
    body('status').optional().isIn(['unpaid', 'paid', 'overdue', 'partial'])
  ],
  handleValidationErrors,
  AccountingController.createInvoice
);

/**
 * Upload and process an invoice PDF (AI extraction using Zerox)
 * POST /api/v1/accounting/invoices/upload
 * Expects multipart/form-data with field name "invoice"
 */
router.post(
  '/invoices/upload',
  authLimiter,
  requireAuth,
  requireRole(['admin', 'accounting_manager']),
  upload.single('invoice'), // Multer middleware
  AccountingController.uploadInvoicePdf
);












// ============================================================
// ACCOUNT ENDPOINTS
// ============================================================

/**
 * Get all accounts in the chart of accounts
 * GET /api/v1/accounting/accounts
 */
router.get(
  '/accounts',
  generalLimiter,
  requireAuth,
  AccountingController.getAccounts
);

// ============================================================
// JOURNAL ENTRY ENDPOINTS
// ============================================================

/**
 * Create a new journal entry
 * POST /api/v1/accounting/journal-entries
 * Body: {
 *   transactionDate: ISO date string,
 *   description: string,
 *   lines: [
 *     { accountCode: string, debit?: number, credit?: number, description?: string },
 *     ...
 *   ],
 *   referenceType?: string,
 *   referenceId?: string,
 *   referenceNumber?: string
 * }
 */
router.post(
  '/journal-entries',
  authLimiter,
  requireAuth,
  requireRole(['admin', 'accounting_manager']),
  [
    body('transactionDate').isISO8601().withMessage('Invalid transaction date'),
    body('description').trim().isLength({ min: 3 }).withMessage('Description must be at least 3 characters'),
    body('lines').isArray({ min: 1 }).withMessage('Lines must be a non-empty array'),
    body('lines.*.accountCode').trim().notEmpty().withMessage('Account code is required'),
    body('lines.*.debit').optional().isNumeric().withMessage('Debit must be a number'),
    body('lines.*.credit').optional().isNumeric().withMessage('Credit must be a number')
  ],
  handleValidationErrors,
  AccountingController.createJournalEntry
);

/**
 * Post a journal entry (apply to accounts)
 * POST /api/v1/accounting/journal-entries/:id/post
 */
router.post(
  '/journal-entries/:id/post',
  authLimiter,
  requireAuth,
  requireRole(['admin', 'accounting_manager']),
  [
    param('id').isMongoId().withMessage('Invalid journal entry ID')
  ],
  handleValidationErrors,
  AccountingController.postJournalEntry
);

/**
 * Get journal entries with optional filtering
 * GET /api/v1/accounting/journal-entries?status=draft&page=1&limit=50
 */
router.get(
  '/journal-entries',
  generalLimiter,
  requireAuth,
  [
    query('status').optional().isIn(['draft', 'posted', 'reversed']).withMessage('Invalid status'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
  ],
  handleValidationErrors,
  AccountingController.getJournalEntries
);

// ============================================================
// TRANSACTION ENDPOINTS
// ============================================================

/**
 * Record a purchase transaction
 * POST /api/v1/accounting/transactions/purchase
 * Body: {
 *   purchaseOrderId: string,
 *   poNumber: string,
 *   totalAmount: number
 * }
 */

/**
 * Create a new invoice
 * POST /api/v1/accounting/invoices
 */


router.post(
  '/invoices',
  authLimiter,
  requireAuth,
  requireRole(['admin', 'accounting_manager']),
  [
    body('clientName').trim().notEmpty().withMessage('Client name is required'),
    body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be a positive number'),
    body('dueDate').isISO8601().withMessage('Invalid due date'),
    body('description').optional().trim().isLength({ max: 500 }),
    body('status').optional().isIn(['unpaid', 'paid', 'overdue', 'partial'])
  ],
  handleValidationErrors,
  AccountingController.createInvoice
);
 
/**
 * Create a new expense
 * POST /api/v1/accounting/expenses
 */
router.post(
  '/expenses',
  authLimiter,
  requireAuth,
  requireRole(['admin', 'accounting_manager']),
  [
    body('expenseType').isIn(['rent', 'utilities', 'salaries', 'supplies', 'marketing', 'maintenance', 'insurance', 'taxes', 'other']).withMessage('Invalid expense type'),
    body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be a positive number'),
    body('description').trim().notEmpty().withMessage('Description is required'),
    body('vendor').optional().trim(),
    body('paymentMethod').isIn(['cash', 'bank_transfer', 'credit_card', 'check', 'other']).withMessage('Invalid payment method'),
    body('dueDate').optional().isISO8601().withMessage('Invalid due date'),
    body('category').optional().trim(),
    body('accountCode').optional().trim()
  ],
  handleValidationErrors,
  ExpenseController.createExpense
);
 
/**
 * Create a new recurring expense
 * POST /api/v1/accounting/recurring-expenses
 */
router.post(
  '/recurring-expenses',
  authLimiter,
  requireAuth,
  requireRole(['admin', 'accounting_manager']),
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('expenseType').isIn(['rent', 'utilities', 'salaries', 'supplies', 'marketing', 'maintenance', 'insurance', 'taxes', 'other']).withMessage('Invalid expense type'),
    body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be a positive number'),
    body('frequency').isIn(['daily', 'weekly', 'monthly', 'quarterly', 'yearly']).withMessage('Invalid frequency'),
    body('startDate').isISO8601().withMessage('Invalid start date'),
    body('endDate').optional().isISO8601().withMessage('Invalid end date'),
    body('description').optional().trim(),
    body('vendor').optional().trim(),
    body('paymentMethod').optional().isIn(['cash', 'bank_transfer', 'credit_card', 'check', 'other']),
    body('category').optional().trim(),
    body('accountCode').optional().trim(),
    body('autoGenerate').optional().isBoolean(),
    body('isActive').optional().isBoolean()
  ],
  handleValidationErrors,
  RecurringExpenseController.createRecurringExpense
);


router.post(
  '/transactions/purchase',
  authLimiter,
  requireAuth,
  requireRole(['admin', 'accounting_manager', 'procurement_manager']),
  [
    body('purchaseOrderId').isMongoId().withMessage('Invalid purchase order ID'),
    body('poNumber').trim().notEmpty().withMessage('PO number is required'),
    body('totalAmount').isNumeric().withMessage('Total amount must be a number')
  ],
  handleValidationErrors,
  AccountingController.recordPurchaseTransaction
);

/**
 * Record a payment transaction
 * POST /api/v1/accounting/transactions/payment
 * Body: {
 *   supplierId: string,
 *   amount: number,
 *   description: string
 * }
 */
router.post(
  '/transactions/payment',
  authLimiter,
  requireAuth,
  requireRole(['admin', 'accounting_manager']),
  [
    body('supplierId').isMongoId().withMessage('Invalid supplier ID'),
    body('amount').isNumeric().withMessage('Amount must be a number'),
    body('description').trim().isLength({ min: 3 }).withMessage('Description must be at least 3 characters')
  ],
  handleValidationErrors,
  AccountingController.recordPaymentTransaction
);





// ============================================================
// FINANCIAL REPORT ENDPOINTS
// ============================================================

/**
 * Generate trial balance report
 * GET /api/v1/accounting/trial-balance
 */
router.get(
  '/trial-balance',
  generalLimiter,
  requireAuth,
  requireRole(['admin', 'accounting_manager']),
  AccountingController.getTrialBalance
);

/**
 * Get financial summary
 * GET /api/v1/accounting/financial-summary
 */
router.get(
  '/financial-summary',
  generalLimiter,
  requireAuth,
  requireRole(['admin', 'accounting_manager']),
  AccountingController.getFinancialSummary
);

/**
 * Get account ledger (transaction history for specific account)
 * GET /api/v1/accounting/accounts/:code/ledger?page=1&limit=100
 */
router.get(
  '/accounts/:code/ledger',
  generalLimiter,
  requireAuth,
  [
    param('code').trim().notEmpty().withMessage('Account code is required'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
  ],
  handleValidationErrors,
  AccountingController.getAccountLedger
);

// ============================================================
// DASHBOARD ENDPOINTS
// ============================================================

router.get('/stats', generalLimiter, requireAuth, requireRole(['admin', 'accounting_manager']), DashboardController.getStats);

router.get('/transactions', generalLimiter, requireAuth, requireRole(['admin', 'accounting_manager', 'accounting_person', 'staff']), [query('page').optional().isInt({ min: 1 }), query('limit').optional().isInt({ min: 1, max: 100 }), query('type').optional().isIn(['income', 'expense'])], handleValidationErrors, DashboardController.getTransactions);

router.get('/invoices', generalLimiter, requireAuth, requireRole(['admin', 'accounting_manager', 'accounting_person', 'staff']), [query('status').optional().isIn(['paid', 'unpaid', 'overdue', 'partial'])], handleValidationErrors, DashboardController.getInvoices);

router.get('/monthly', generalLimiter, requireAuth, requireRole(['admin', 'accounting_manager']), [query('months').optional().isInt({ min: 1, max: 24 })], handleValidationErrors, DashboardController.getMonthlyData);

router.get('/cashflow', generalLimiter, requireAuth, requireRole(['admin', 'accounting_manager']), [query('days').optional().isInt({ min: 7, max: 90 })], handleValidationErrors, DashboardController.getCashFlow);

// ============================================================
// ENHANCED ACCOUNT (COA) ENDPOINTS
// ============================================================
router.post('/accounts', authLimiter, requireAuth, requireRole(['admin', 'accounting_manager']),
  [body('code').trim().notEmpty(), body('name').trim().notEmpty(), body('category').isIn(['asset', 'liability', 'equity', 'revenue', 'expense']), body('normalBalance').isIn(['debit', 'credit'])],
  handleValidationErrors, AccountCRUDController.createAccount);
router.put('/accounts/:id', authLimiter, requireAuth, requireRole(['admin', 'accounting_manager']),
  [param('id').isMongoId()], handleValidationErrors, AccountCRUDController.updateAccount);
router.delete('/accounts/:id', authLimiter, requireAuth, requireRole(['admin', 'accounting_manager']),
  [param('id').isMongoId()], handleValidationErrors, AccountCRUDController.deleteAccount);
router.get('/accounts/category/:category', generalLimiter, requireAuth, AccountCRUDController.getAccountsByCategory);

// ============================================================
// ENHANCED FINANCIAL REPORTS
// ============================================================
router.get('/reports/income-statement', generalLimiter, requireAuth, requireRole(['admin', 'accounting_manager', 'accounting_person']), ReportsController.getIncomeStatement);
router.get('/reports/balance-sheet', generalLimiter, requireAuth, requireRole(['admin', 'accounting_manager', 'accounting_person']), ReportsController.getBalanceSheet);
router.get('/reports/cash-flow', generalLimiter, requireAuth, requireRole(['admin', 'accounting_manager', 'accounting_person']), ReportsController.getCashFlowStatement);
router.get('/reports/general-ledger', generalLimiter, requireAuth, requireRole(['admin', 'accounting_manager', 'accounting_person']), ReportsController.getGeneralLedger);
router.get('/reports/trial-balance', generalLimiter, requireAuth, requireRole(['admin', 'accounting_manager', 'accounting_person']), ReportsController.getTrialBalance);

// ============================================================
// AGING REPORTS
// ============================================================
router.get('/aging/receivable', generalLimiter, requireAuth, requireRole(['admin', 'accounting_manager', 'accounting_person']), AgingController.getReceivableAging);
router.get('/aging/payable', generalLimiter, requireAuth, requireRole(['admin', 'accounting_manager', 'accounting_person']), AgingController.getPayableAging);

// ============================================================
// TAX MANAGEMENT
// ============================================================
router.get('/tax/rates', generalLimiter, requireAuth, requireRole(['admin', 'accounting_manager', 'accounting_person']), TaxController.getTaxRates);
router.post('/tax/rates', authLimiter, requireAuth, requireRole(['admin']),
  [body('name').trim().notEmpty(), body('code').trim().notEmpty(), body('rate').isFloat({ min: 0, max: 100 }), body('type').isIn(['vat', 'withholding', 'excise', 'custom'])],
  handleValidationErrors, TaxController.createTaxRate);
router.put('/tax/rates/:id', authLimiter, requireAuth, requireRole(['admin']),
  [param('id').isMongoId()], handleValidationErrors, TaxController.updateTaxRate);
router.delete('/tax/rates/:id', authLimiter, requireAuth, requireRole(['admin']),
  [param('id').isMongoId()], handleValidationErrors, TaxController.deleteTaxRate);
router.get('/tax/summary', generalLimiter, requireAuth, requireRole(['admin', 'accounting_manager', 'accounting_person']), TaxController.getTaxSummary);
router.post('/tax/init', authLimiter, requireAuth, requireRole(['admin']), TaxController.initTaxRates);

// ============================================================
// AUDIT TRAIL
// ============================================================
router.get('/audit-logs', generalLimiter, requireAuth, requireRole(['admin']), AuditController.getAuditLogs);

// ============================================================
// ENHANCED INVOICE ENDPOINTS
// ============================================================
router.get('/invoices/list', generalLimiter, requireAuth, requireRole(['admin', 'accounting_manager']), InvoiceEnhancedController.getInvoices);
router.get('/invoices/:id', generalLimiter, requireAuth, requireRole(['admin', 'accounting_manager']),
  [param('id').isMongoId()], handleValidationErrors, InvoiceEnhancedController.getInvoiceById);
router.put('/invoices/:id', authLimiter, requireAuth, requireRole(['admin', 'accounting_manager']),
  [param('id').isMongoId()], handleValidationErrors, InvoiceEnhancedController.updateInvoice);
router.post('/invoices/:id/payment', authLimiter, requireAuth, requireRole(['admin', 'accounting_manager']),
  [param('id').isMongoId(), body('amount').isFloat({ min: 0.01 })], handleValidationErrors, InvoiceEnhancedController.recordPayment);
router.delete('/invoices/:id', authLimiter, requireAuth, requireRole(['admin']),
  [param('id').isMongoId()], handleValidationErrors, InvoiceEnhancedController.deleteInvoice);
router.post('/invoices/bulk-status', authLimiter, requireAuth, requireRole(['admin', 'accounting_manager']),
  [body('ids').isArray({ min: 1 }), body('status').isIn(['unpaid', 'paid', 'overdue', 'partial'])], handleValidationErrors, InvoiceEnhancedController.bulkUpdateStatus);
router.post('/invoices/:id/reminder', authLimiter, requireAuth, requireRole(['admin', 'accounting_manager']),
  [param('id').isMongoId()], handleValidationErrors, InvoiceEnhancedController.sendReminder);

// ============================================================
// ENHANCED EXPENSE ENDPOINTS (missing GET routes)
// ============================================================
router.get('/expenses', generalLimiter, requireAuth, requireRole(['admin', 'accounting_manager']),
  [query('status').optional().isIn(['pending', 'approved', 'paid', 'cancelled', 'overdue']), query('page').optional().isInt({ min: 1 }), query('limit').optional().isInt({ min: 1, max: 100 })],
  handleValidationErrors, ExpenseController.getExpenses);
router.get('/expenses/:id', generalLimiter, requireAuth, requireRole(['admin', 'accounting_manager']),
  [param('id').isMongoId()], handleValidationErrors, ExpenseController.getExpenseById);
router.put('/expenses/:id', authLimiter, requireAuth, requireRole(['admin', 'accounting_manager']),
  [param('id').isMongoId()], handleValidationErrors, ExpenseController.updateExpense);
router.put('/expenses/:id/status', authLimiter, requireAuth, requireRole(['admin', 'accounting_manager']),
  [param('id').isMongoId(), body('status').isIn(['pending', 'approved', 'paid', 'cancelled', 'overdue'])],
  handleValidationErrors, ExpenseController.updateExpenseStatus);
router.post('/expenses/:id/approve', authLimiter, requireAuth, requireRole(['admin', 'accounting_manager']),
  [param('id').isMongoId()], handleValidationErrors, ExpenseController.approveExpense);
router.post('/expenses/:id/pay', authLimiter, requireAuth, requireRole(['admin', 'accounting_manager']),
  [param('id').isMongoId()], handleValidationErrors, ExpenseController.payExpense);

// ============================================================
// RECURRING EXPENSE ENDPOINTS (missing routes)
// ============================================================
router.get('/recurring-expenses', generalLimiter, requireAuth, requireRole(['admin', 'accounting_manager']), RecurringExpenseController.getRecurringExpenses);
router.get('/recurring-expenses/upcoming', generalLimiter, requireAuth, requireRole(['admin', 'accounting_manager']), RecurringExpenseController.getUpcomingExpenses);
router.get('/recurring-expenses/:id', generalLimiter, requireAuth, requireRole(['admin', 'accounting_manager']),
  [param('id').isMongoId()], handleValidationErrors, RecurringExpenseController.getRecurringExpenseById);
router.put('/recurring-expenses/:id', authLimiter, requireAuth, requireRole(['admin', 'accounting_manager']),
  [param('id').isMongoId()], handleValidationErrors, RecurringExpenseController.updateRecurringExpense);
router.delete('/recurring-expenses/:id', authLimiter, requireAuth, requireRole(['admin', 'accounting_manager']),
  [param('id').isMongoId()], handleValidationErrors, RecurringExpenseController.deleteRecurringExpense);
router.post('/recurring-expenses/generate-monthly', authLimiter, requireAuth, requireRole(['admin', 'accounting_manager']), RecurringExpenseController.generateMonthlyExpenses);

// ============================================================
// INVENTORY ACCOUNTING ROUTES
// ============================================================
router.get('/inventory/stock-overview', generalLimiter, requireAuth, requireRole(['admin', 'accounting_manager', 'accounting_person']), InventoryAccountingController.getStockOverview);
router.get('/inventory/cogs', generalLimiter, requireAuth, requireRole(['admin', 'accounting_manager', 'accounting_person']), InventoryAccountingController.getCOGS);

// ============================================================
// INSIGHTS ROUTES
// ============================================================
router.get('/insights', generalLimiter, requireAuth, requireRole(['admin', 'accounting_manager', 'accounting_person']), InsightsController.getInsights);

// ============================================================
// CASH FLOW FORECAST ROUTES
// ============================================================
router.get('/cash-flow-forecast', generalLimiter, requireAuth, requireRole(['admin', 'accounting_manager', 'accounting_person']), CashFlowForecastController.getForecast);

// ============================================================
// RECURRING INVOICE ROUTES
// ============================================================
router.get('/recurring-invoices', generalLimiter, requireAuth, requireRole(['admin', 'accounting_manager', 'accounting_person']), RecurringInvoiceController.getAll);
router.post('/recurring-invoices', authLimiter, requireAuth, requireRole(['admin', 'accounting_manager']), RecurringInvoiceController.create);
router.put('/recurring-invoices/:id', authLimiter, requireAuth, requireRole(['admin', 'accounting_manager']), [param('id').isMongoId()], handleValidationErrors, RecurringInvoiceController.update);
router.delete('/recurring-invoices/:id', authLimiter, requireAuth, requireRole(['admin']), [param('id').isMongoId()], handleValidationErrors, RecurringInvoiceController.delete);
router.post('/recurring-invoices/generate-due', authLimiter, requireAuth, requireRole(['admin', 'accounting_manager']), RecurringInvoiceController.generateDue);

// ============================================================
// AUTO JOURNAL ENTRY ROUTES
// ============================================================
router.post('/auto-journal/orders', authLimiter, requireAuth, requireRole(['admin', 'accounting_manager']), AutoJournalController.generateFromOrders);
router.post('/auto-journal/procurement', authLimiter, requireAuth, requireRole(['admin', 'accounting_manager']), AutoJournalController.generateFromProcurement);

export default router;




