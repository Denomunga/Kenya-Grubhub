import { Router, Request, Response, NextFunction } from 'express';
import { body, param, validationResult } from 'express-validator';
import rateLimit from 'express-rate-limit';
import { requireRole } from '../../shared/middleware/auth';
import { ContractController, PayslipController } from './controller-contracts-payslips';

const router = Router();

// Rate limiter for general routes
const generalLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });



// Define validateRequest if not in a separate file
const validateRequest = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

/**
 * Contract Routes
 */

// Get all contracts - HR Manager, Admin, Manager
router.get(
  '/contracts',
  generalLimiter,
  requireRole(['admin', 'hr_manager', 'manager', 'accountant']),
   validateRequest,
  ContractController.getContracts
);

// Get contract by ID
router.get(
  '/contracts/:id',
  generalLimiter,
  requireRole(['admin', 'hr_manager', 'manager', 'accountant']),
   validateRequest,
  param('id').isMongoId().withMessage('Valid contract ID required'),
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
  validateRequest,
  ContractController.getExpiringContracts
);

// Get contract statistics
router.get(
  '/contracts/stats/overview',
  generalLimiter,
  requireRole(['admin', 'hr_manager', 'manager', 'accountant']),
   validateRequest,
  ContractController.getContractStats
);

// Send contract offer to employee
router.post(
  '/contracts/:id/send-offer',
  generalLimiter,
  requireRole(['admin', 'hr_manager']),
  param('id').isMongoId().withMessage('Valid contract ID required'),
  validateRequest,
  ContractController.sendContractOffer
);

// Employee sign contract
router.post(
  '/contracts/:id/sign',
  generalLimiter,
  requireRole(['employee']), // Allow employees to sign their own contracts
  param('id').isMongoId().withMessage('Valid contract ID required'),
  validateRequest,
  ContractController.signContract
);

// Get employee's contracts (for employee portal)
router.get(
  '/contracts/employee/my',
  generalLimiter,
  requireRole(['employee']),
   validateRequest,
  ContractController.getEmployeeContracts
);

/**
 * Payslip Routes
 */

// Get all payslips - HR Manager, Admin, Accountant
router.get(
  '/payslips',
  generalLimiter,
  requireRole(['admin', 'hr_manager', 'accountant', 'payroll_manager']),
  validateRequest,
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
  validateRequest,
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

// Get employee's payslips (for employee portal)
router.get(
  '/payslips/employee/my',
  generalLimiter,
  requireRole(['employee']),
   validateRequest,
  PayslipController.getEmployeePayslips
);

// Get specific payslip for employee
router.get(
  '/payslips/employee/my/:id',
  generalLimiter,
  requireRole(['employee']),
  param('id').isMongoId().withMessage('Valid payslip ID required'),
  validateRequest,
  PayslipController.getEmployeePayslipById
);

export default router;
