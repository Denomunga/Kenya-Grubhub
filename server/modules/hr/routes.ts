import { Router } from 'express';
import {
  EmployeeController,
  JobPostingController,
  JobApplicationController,
  PayrollController
} from './controller';
import { generalLimiter, authLimiter } from '@shared/middleware/rateLimiter';
import { requireAuth } from '@shared/middleware/auth';
import { requireRole } from '@shared/middleware/roles';
import contractsPayslipsRoutes from './routes-contracts-payslips';

const router = Router();

router.get(
  '/jobs',
  generalLimiter,
  JobPostingController.getJobPostings
);
 
/**
 * Get job posting by ID (public)
 * GET /api/v1/hr/jobs/:id
 */
router.get(
  '/jobs/:id',
  generalLimiter,
  JobPostingController.getJobPostingById
);
 

// Apply authentication to all routes
router.use(requireAuth);

// Mount contracts and payslips routes
router.use(contractsPayslipsRoutes);

// ============================================================
// EMPLOYEE ROUTES
// ============================================================

/**
 * Get all employees
 * GET /api/v1/hr/employees
 */
router.get(
  '/employees',
  generalLimiter,
  requireRole(['admin', 'hr_manager', 'manager']),
  EmployeeController.getEmployees
);

/**
 * Get employee statistics
 * GET /api/v1/hr/employees/stats
 */
router.get(
  '/employees/stats',
  generalLimiter,
  requireRole(['admin', 'hr_manager', 'manager']),
  EmployeeController.getEmployeeStats
);

/**
 * Get employee by ID
 * GET /api/v1/hr/employees/:id
 */
router.get(
  '/employees/:id',
  generalLimiter,
  EmployeeController.getEmployeeById
);

/**
 * Create new employee
 * POST /api/v1/hr/employees
 */
router.post(
  '/employees',
  authLimiter,
  requireRole(['admin', 'hr_manager']),
  EmployeeController.createEmployee
);

/**
 * Update employee
 * PUT /api/v1/hr/employees/:id
 */
router.put(
  '/employees/:id',
  authLimiter,
  requireRole(['admin', 'hr_manager']),
  EmployeeController.updateEmployee
);

/**
 * Delete employee
 * DELETE /api/v1/hr/employees/:id
 */
router.delete(
  '/employees/:id',
  authLimiter,
  requireRole(['admin']),
  EmployeeController.deleteEmployee
);

// ============================================================
// JOB POSTING ROUTES
// ============================================================

/**
 * Get all job postings
 * GET /api/v1/hr/jobs
 */
router.get(
  '/jobs',
  generalLimiter,
  JobPostingController.getJobPostings
);

/**
 * Get job posting by ID
 * GET /api/v1/hr/jobs/:id
 */
router.get(
  '/jobs/:id',
  generalLimiter,
  JobPostingController.getJobPostingById
);

/**
 * Create new job posting
 * POST /api/v1/hr/jobs
 */
router.post(
  '/jobs',
  authLimiter,
  requireRole(['admin', 'hr_manager']),
  JobPostingController.createJobPosting
);

/**
 * Update job posting
 * PUT /api/v1/hr/jobs/:id
 */
router.put(
  '/jobs/:id',
  authLimiter,
  requireRole(['admin', 'hr_manager']),
  JobPostingController.updateJobPosting
);

/**
 * Close job posting
 * PUT /api/v1/hr/jobs/:id/close
 */
router.put(
  '/jobs/:id/close',
  authLimiter,
  requireRole(['admin', 'hr_manager']),
  JobPostingController.closeJobPosting
);

// ============================================================
// JOB APPLICATION ROUTES
// ============================================================

/**
 * Get all job applications
 * GET /api/v1/hr/applications
 */
router.get(
  '/applications',
  generalLimiter,
  requireRole(['admin', 'hr_manager']),
  JobApplicationController.getJobApplications
);

/**
 * Get job application by ID
 * GET /api/v1/hr/applications/:id
 */
router.get(
  '/applications/:id',
  generalLimiter,
  requireRole(['admin', 'hr_manager']),
  JobApplicationController.getJobApplicationById
);

/**
 * Apply for a job (public route - no auth required)
 * POST /api/v1/hr/jobs/:jobId/apply
 */
router.post(
  '/jobs/:jobId/apply',
  generalLimiter,
  JobApplicationController.applyForJob
);

/**
 * Update application status
 * PUT /api/v1/hr/applications/:id/status
 */
router.put(
  '/applications/:id/status',
  authLimiter,
  requireRole(['admin', 'hr_manager']),
  JobApplicationController.updateApplicationStatus
);

// ============================================================
// PAYROLL ROUTES
// ============================================================

/**
 * Get all payrolls
 * GET /api/v1/hr/payrolls
 */
router.get(
  '/payrolls',
  generalLimiter,
  requireRole(['admin', 'hr_manager', 'payroll_manager']),
  PayrollController.getPayrolls
);

/**
 * Get payroll by ID
 * GET /api/v1/hr/payrolls/:id
 */
router.get(
  '/payrolls/:id',
  generalLimiter,
  requireRole(['admin', 'hr_manager', 'payroll_manager']),
  PayrollController.getPayrollById
);

/**
 * Create new payroll
 * POST /api/v1/hr/payrolls
 */
router.post(
  '/payrolls',
  authLimiter,
  requireRole(['admin', 'hr_manager', 'payroll_manager']),
  PayrollController.createPayroll
);

/**
 * Update payroll status
 * PUT /api/v1/hr/payrolls/:id/status
 */
router.put(
  '/payrolls/:id/status',
  authLimiter,
  requireRole(['admin', 'hr_manager', 'payroll_manager']),
  PayrollController.updatePayrollStatus
);

/**
 * Calculate monthly payroll for employee
 * GET /api/v1/hr/payrolls/calculate/:employeeId
 */
router.get(
  '/payrolls/calculate/:employeeId',
  generalLimiter,
  requireRole(['admin', 'hr_manager', 'payroll_manager']),
  PayrollController.calculateMonthlyPayroll
);

export default router;