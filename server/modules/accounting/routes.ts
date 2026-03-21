import { Router, Request, Response } from 'express';
import { body, query, param, validationResult } from 'express-validator';
import { AccountingController } from './controller';
import { DashboardController } from './dashboardController';
import { requireAuth } from '@shared/middleware/auth';
import { requireRole } from '@shared/middleware/roles';
import { generalLimiter, authLimiter } from '@shared/middleware/rateLimiter';


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
  AccountingController.createInvoice   // ✅ Use AccountingController, not DashboardController
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

router.get('/transactions', generalLimiter, requireAuth, requireRole(['admin', 'accounting_manager']), [query('page').optional().isInt({ min: 1 }), query('limit').optional().isInt({ min: 1, max: 100 }), query('type').optional().isIn(['income', 'expense'])], handleValidationErrors, DashboardController.getTransactions);

router.get('/invoices', generalLimiter, requireAuth, requireRole(['admin', 'accounting_manager']), [query('status').optional().isIn(['paid', 'unpaid', 'overdue', 'partial'])], handleValidationErrors, DashboardController.getInvoices);

router.get('/monthly', generalLimiter, requireAuth, requireRole(['admin', 'accounting_manager']), [query('months').optional().isInt({ min: 1, max: 24 })], handleValidationErrors, DashboardController.getMonthlyData);

router.get('/cashflow', generalLimiter, requireAuth, requireRole(['admin', 'accounting_manager']), [query('days').optional().isInt({ min: 7, max: 90 })], handleValidationErrors, DashboardController.getCashFlow);

export default router;