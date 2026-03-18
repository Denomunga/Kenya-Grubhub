import { body, query, param } from 'express-validator';

/**
 * Validation schemas for Accounting module
 */

// ============================================================
// JOURNAL ENTRY VALIDATIONS
// ============================================================

export const validateCreateJournalEntry = [
  body('transactionDate')
    .isISO8601()
    .withMessage('transactionDate must be a valid ISO8601 date string')
    .toDate(),

  body('description')
    .trim()
    .isLength({ min: 3, max: 500 })
    .withMessage('description must be between 3 and 500 characters'),

  body('lines')
    .isArray({ min: 1 })
    .withMessage('lines must be a non-empty array with at least 1 entry'),

  body('lines.*.accountCode')
    .trim()
    .notEmpty()
    .withMessage('Each line must have an accountCode'),

  body('lines.*.debit')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('debit must be a positive number'),

  body('lines.*.credit')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('credit must be a positive number'),

  body('lines.*.description')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('line description must be less than 200 characters'),

  body('referenceType')
    .optional()
    .trim()
    .isIn(['PurchaseOrder', 'Invoice', 'Payment', 'Supplier', 'Other'])
    .withMessage('referenceType must be a valid type'),

  body('referenceId')
    .optional()
    .isMongoId()
    .withMessage('referenceId must be a valid MongoDB ID'),

  body('referenceNumber')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('referenceNumber must be between 1 and 50 characters')
];

export const validatePostJournalEntry = [
  param('id')
    .isMongoId()
    .withMessage('id must be a valid MongoDB ID')
];

export const validateGetJournalEntries = [
  query('status')
    .optional()
    .isIn(['draft', 'posted', 'reversed'])
    .withMessage('status must be one of: draft, posted, reversed'),

  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('page must be a positive integer')
    .toInt(),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('limit must be an integer between 1 and 100')
    .toInt()
];

// ============================================================
// TRANSACTION VALIDATIONS
// ============================================================

export const validateRecordPurchaseTransaction = [
  body('purchaseOrderId')
    .isMongoId()
    .withMessage('purchaseOrderId must be a valid MongoDB ID'),

  body('poNumber')
    .trim()
    .notEmpty()
    .isLength({ min: 1, max: 50 })
    .withMessage('poNumber is required and must be less than 50 characters'),

  body('totalAmount')
    .isFloat({ min: 0.01 })
    .withMessage('totalAmount must be a positive number greater than 0')
    .toFloat()
];

export const validateRecordPaymentTransaction = [
  body('supplierId')
    .isMongoId()
    .withMessage('supplierId must be a valid MongoDB ID'),

  body('amount')
    .isFloat({ min: 0.01 })
    .withMessage('amount must be a positive number greater than 0')
    .toFloat(),

  body('description')
    .trim()
    .isLength({ min: 3, max: 500 })
    .withMessage('description must be between 3 and 500 characters')
];

// ============================================================
// FINANCIAL REPORT VALIDATIONS
// ============================================================

export const validateGetAccountLedger = [
  param('code')
    .trim()
    .notEmpty()
    .isLength({ min: 1, max: 20 })
    .withMessage('code must be between 1 and 20 characters'),

  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('page must be a positive integer')
    .toInt(),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('limit must be an integer between 1 and 100')
    .toInt()
];

// ============================================================
// EXPORTED VALIDATION SETS
// ============================================================

export const accountingValidation = {
  // Journal entry validation
  createJournalEntry: validateCreateJournalEntry,
  postJournalEntry: validatePostJournalEntry,
  getJournalEntries: validateGetJournalEntries,

  // Transaction validation
  recordPurchaseTransaction: validateRecordPurchaseTransaction,
  recordPaymentTransaction: validateRecordPaymentTransaction,

  // Financial report validation
  getAccountLedger: validateGetAccountLedger
};