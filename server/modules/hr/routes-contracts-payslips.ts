import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { validateRequest } from '../../middleware/validation';
import { requireRole } from '../../middleware/auth';
import { rateLimiter } from '../../middleware/rateLimiter';
import { ContractController, PayslipController } from './controller-contracts-payslips';

const router = Router();

// Rate limiter for general routes
const generalLimiter = rateLimiter({ windowMs: 15 * 60 * 1000, max: 100 });

/**
 * Contract Routes
 */

// Get all contracts - HR Manager, Admin, Manager
router.get(
  '/contracts',
  generalLimiter,
  requireRole(['admin', 'hr_manager', 'manager', 'accountant']),
  ContractController.getContracts
);

// Get contract by ID
router.get(
  '/contracts/:id',
  generalLimiter,
  requireRole(['admin', 'hr_manager', 'manager', 'accountant']),
  param('id').isMongoId().withMessage('Valid contract ID required'),
  validateRequest,
  ContractController.getContractById
);

// Create contract - HR Manager, Admin
router.post(
  '/contracts',
  generalLimiter,
  requireRole(['admin', 'hr_manager']),
  [
    body('employeeId').isMongoId().withMessage('Valid employee ID required'),
    body('contractType').isIn(['permanent', 'fixed_term', 'casual', 'consultancy']).withMessage('Valid contract type required'),
    body('title').trim().notEmpty().withMessage('Contract title required'),
    body('startDate').isISO8601().withMessage('Valid start date required'),
    body('salary').isFloat({ min: 0 }).withMessage('Valid salary required'),
    body('terms').trim().notEmpty().withMessage('Contract terms required'),
  ],
  validateRequest,
  ContractController.createContract
);

// Update contract - HR Manager, Admin
router.put(
  '/contracts/:id',
  generalLimiter,
  requireRole(['admin', 'hr_manager']),
  param('id').isMongoId().withMessage('Valid contract ID required'),
  validateRequest,
  ContractController.updateContract
);

// Delete contract - Admin only
router.delete(
  '/contracts/:id',
  generalLimiter,
  requireRole(['admin']),
  param('id').isMongoId().withMessage('Valid contract ID required'),
  validateRequest,
  ContractController.deleteContract
);

// Get expiring contracts
router.get(
  '/contracts/expiring/list',
  generalLimiter,
  requireRole(['admin', 'hr_manager', 'manager']),
  ContractController.getExpiringContracts
);

// Get contract statistics
router.get(
  '/contracts/stats/overview',
  generalLimiter,
  requireRole(['admin', 'hr_manager', 'manager', 'accountant']),
  ContractController.getContractStats
);

/**
 * Payslip Routes
 */

// Get all payslips - HR Manager, Admin, Accountant
router.get(
  '/payslips',
  generalLimiter,
  requireRole(['admin', 'hr_manager', 'accountant', 'payroll_manager']),
  PayslipController.getPayslips
);

// Get payslip by ID
router.get(
  '/payslips/:id',
  generalLimiter,
  requireRole(['admin', 'hr_manager', 'accountant', 'payroll_manager']),
  param('id').isMongoId().withMessage('Valid payslip ID required'),
  validateRequest,
  PayslipController.getPayslipById
);

// Create payslip - HR Manager, Admin, Accountant
router.post(
  '/payslips',
  generalLimiter,
  requireRole(['admin', 'hr_manager', 'accountant', 'payroll_manager']),
  [
    body('employeeId').isMongoId().withMessage('Valid employee ID required'),
    body('payPeriod.month').isInt({ min: 1, max: 12 }).withMessage('Valid month required'),
    body('payPeriod.year').isInt({ min: 2020 }).withMessage('Valid year required'),
    body('basicSalary').isFloat({ min: 0 }).withMessage('Valid basic salary required'),
  ],
  validateRequest,
  PayslipController.createPayslip
);

// Update payslip - HR Manager, Admin, Accountant
router.put(
  '/payslips/:id',
  generalLimiter,
  requireRole(['admin', 'hr_manager', 'accountant', 'payroll_manager']),
  param('id').isMongoId().withMessage('Valid payslip ID required'),
  validateRequest,
  PayslipController.updatePayslip
);

// Delete payslip - Admin only
router.delete(
  '/payslips/:id',
  generalLimiter,
  requireRole(['admin']),
  param('id').isMongoId().withMessage('Valid payslip ID required'),
  validateRequest,
  PayslipController.deletePayslip
);

// Approve payslip - HR Manager, Admin, Accountant
router.post(
  '/payslips/:id/approve',
  generalLimiter,
  requireRole(['admin', 'hr_manager', 'accountant', 'payroll_manager']),
  param('id').isMongoId().withMessage('Valid payslip ID required'),
  validateRequest,
  PayslipController.approvePayslip
);

// Mark payslip as paid - HR Manager, Admin, Accountant
router.post(
  '/payslips/:id/pay',
  generalLimiter,
  requireRole(['admin', 'hr_manager', 'accountant', 'payroll_manager']),
  param('id').isMongoId().withMessage('Valid payslip ID required'),
  validateRequest,
  PayslipController.markPayslipPaid
);

// Get payslips by employee
router.get(
  '/payslips/employee/:employeeId',
  generalLimiter,
  requireRole(['admin', 'hr_manager', 'accountant', 'payroll_manager']),
  param('employeeId').isMongoId().withMessage('Valid employee ID required'),
  validateRequest,
  PayslipController.getPayslipsByEmployee
);

// Get payslip statistics
router.get(
  '/payslips/stats/overview',
  generalLimiter,
  requireRole(['admin', 'hr_manager', 'accountant', 'payroll_manager']),
  PayslipController.getPayslipStats
);

// Generate payslip for single employee
router.post(
  '/payslips/generate/:employeeId',
  generalLimiter,
  requireRole(['admin', 'hr_manager', 'accountant', 'payroll_manager']),
  [
    param('employeeId').isMongoId().withMessage('Valid employee ID required'),
    body('month').isInt({ min: 1, max: 12 }).withMessage('Valid month required'),
    body('year').isInt({ min: 2020 }).withMessage('Valid year required'),
  ],
  validateRequest,
  PayslipController.generatePayslipForEmployee
);

// Generate bulk payslips
router.post(
  '/payslips/generate/bulk',
  generalLimiter,
  requireRole(['admin', 'hr_manager', 'accountant', 'payroll_manager']),
  [
    body('month').isInt({ min: 1, max: 12 }).withMessage('Valid month required'),
    body('year').isInt({ min: 2020 }).withMessage('Valid year required'),
    body('employeeIds').isArray().withMessage('Employee IDs must be an array'),
  ],
  validateRequest,
  PayslipController.generateBulkPayslips
);

export default router;
