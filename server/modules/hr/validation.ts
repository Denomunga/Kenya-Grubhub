import { body, param, query } from 'express-validator';

/**
 * Employee Validation
 */
export const validateCreateEmployee = [
  body('firstName')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('First name is required and must be less than 50 characters'),

  body('lastName')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name is required and must be less than 50 characters'),

  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),

  body('phone')
    .trim()
    .isLength({ min: 10, max: 15 })
    .withMessage('Phone must be between 10 and 15 characters'),

  body('dateOfBirth')
    .isISO8601()
    .withMessage('Valid date of birth is required'),

  body('gender')
    .isIn(['male', 'female', 'other'])
    .withMessage('Gender must be male, female, or other'),

  body('address.street')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Street address is required'),

  body('address.city')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('City is required'),

  body('address.state')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('State is required'),

  body('address.zipCode')
    .trim()
    .isLength({ min: 1, max: 20 })
    .withMessage('ZIP code is required'),

  body('address.country')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Country is required'),

  body('department')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Department is required'),

  body('position')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Position is required'),

  body('employmentType')
    .isIn(['full_time', 'part_time', 'contract', 'intern'])
    .withMessage('Invalid employment type'),

  body('hireDate')
    .isISO8601()
    .withMessage('Valid hire date is required'),

  body('salary')
    .isFloat({ min: 0 })
    .withMessage('Salary must be a positive number'),

  body('currency')
    .optional()
    .trim()
    .isLength({ min: 3, max: 3 })
    .withMessage('Currency must be 3 characters'),

  body('emergencyContact.name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Emergency contact name is required'),

  body('emergencyContact.relationship')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Emergency contact relationship is required'),

  body('emergencyContact.phone')
    .trim()
    .isLength({ min: 10, max: 15 })
    .withMessage('Emergency contact phone is required')
];

export const validateUpdateEmployee = [
  param('id')
    .isMongoId()
    .withMessage('Valid employee ID is required'),

  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('First name must be less than 50 characters'),

  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name must be less than 50 characters'),

  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),

  body('phone')
    .optional()
    .trim()
    .isLength({ min: 10, max: 15 })
    .withMessage('Phone must be between 10 and 15 characters'),

  body('department')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Department must be less than 100 characters'),

  body('position')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Position must be less than 100 characters'),

  body('salary')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Salary must be a positive number'),

  body('status')
    .optional()
    .isIn(['active', 'inactive', 'terminated', 'on_leave'])
    .withMessage('Invalid status')
];

export const validateGetEmployees = [
  query('status')
    .optional()
    .isIn(['active', 'inactive', 'terminated', 'on_leave'])
    .withMessage('Invalid status'),

  query('department')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Department must be less than 100 characters'),

  query('search')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Search term must be less than 100 characters'),

  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
];

/**
 * Job Posting Validation
 */
export const validateCreateJobPosting = [
  body('title')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Job title is required and must be less than 200 characters'),

  body('department')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Department is required'),

  body('location')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Location is required'),

  body('employmentType')
    .isIn(['full_time', 'part_time', 'contract', 'intern'])
    .withMessage('Invalid employment type'),

  body('description')
    .trim()
    .isLength({ min: 10, max: 5000 })
    .withMessage('Description must be between 10 and 5000 characters'),

  body('requirements')
    .isArray({ min: 1 })
    .withMessage('Requirements must be a non-empty array'),

  body('requirements.*')
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Each requirement must be less than 500 characters'),

  body('responsibilities')
    .optional()
    .isArray()
    .withMessage('Responsibilities must be an array'),

  body('responsibilities.*')
    .optional()
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Each responsibility must be less than 500 characters'),

  body('salaryRange.min')
    .isFloat({ min: 0 })
    .withMessage('Minimum salary must be a positive number'),

  body('salaryRange.max')
    .isFloat({ min: 0 })
    .withMessage('Maximum salary must be a positive number'),

  body('salaryRange.currency')
    .optional()
    .trim()
    .isLength({ min: 3, max: 3 })
    .withMessage('Currency must be 3 characters'),

  body('closingDate')
    .isISO8601()
    .withMessage('Valid closing date is required')
];

export const validateUpdateJobPosting = [
  param('id')
    .isMongoId()
    .withMessage('Valid job posting ID is required'),

  body('title')
    .optional()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Job title must be less than 200 characters'),

  body('description')
    .optional()
    .trim()
    .isLength({ min: 10, max: 5000 })
    .withMessage('Description must be between 10 and 5000 characters'),

  body('closingDate')
    .optional()
    .isISO8601()
    .withMessage('Valid closing date is required'),

  body('status')
    .optional()
    .isIn(['open', 'closed', 'filled', 'cancelled'])
    .withMessage('Invalid status')
];

/**
 * Job Application Validation
 */
export const validateApplyForJob = [
  param('jobId')
    .isMongoId()
    .withMessage('Valid job ID is required'),

  body('applicantName')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Applicant name is required'),

  body('applicantEmail')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),

  body('applicantPhone')
    .trim()
    .isLength({ min: 10, max: 15 })
    .withMessage('Phone must be between 10 and 15 characters'),

  body('experience')
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage('Experience must be between 10 and 2000 characters'),

  body('education')
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Education must be between 10 and 1000 characters'),

  body('skills')
    .isArray({ min: 1 })
    .withMessage('Skills must be a non-empty array'),

  body('skills.*')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Each skill must be less than 100 characters'),

  body('expectedSalary')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Expected salary must be a positive number'),

  body('availabilityDate')
    .isISO8601()
    .withMessage('Valid availability date is required'),

  body('coverLetter')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Cover letter must be less than 2000 characters'),

  body('resumeUrl')
    .optional()
    .trim()
    .isURL()
    .withMessage('Resume URL must be a valid URL')
];

export const validateUpdateApplicationStatus = [
  param('id')
    .isMongoId()
    .withMessage('Valid application ID is required'),

  body('status')
    .isIn(['pending', 'under_review', 'interviewed', 'offered', 'hired', 'rejected'])
    .withMessage('Invalid status'),

  body('reviewNotes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Review notes must be less than 1000 characters')
];

/**
 * Payroll Validation
 */
export const validateCreatePayroll = [
  body('employeeId')
    .isMongoId()
    .withMessage('Valid employee ID is required'),

  body('payPeriod.startDate')
    .isISO8601()
    .withMessage('Valid pay period start date is required'),

  body('payPeriod.endDate')
    .isISO8601()
    .withMessage('Valid pay period end date is required'),

  body('payDate')
    .isISO8601()
    .withMessage('Valid pay date is required'),

  body('basicSalary')
    .isFloat({ min: 0 })
    .withMessage('Basic salary must be a positive number'),

  body('allowances')
    .optional()
    .isArray()
    .withMessage('Allowances must be an array'),

  body('allowances.*.type')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Allowance type is required'),

  body('allowances.*.amount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Allowance amount must be a positive number'),

  body('deductions')
    .optional()
    .isArray()
    .withMessage('Deductions must be an array'),

  body('deductions.*.type')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Deduction type is required'),

  body('deductions.*.amount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Deduction amount must be a positive number'),

  body('paymentMethod')
    .optional()
    .isIn(['bank_transfer', 'cash', 'cheque'])
    .withMessage('Invalid payment method'),

  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes must be less than 500 characters')
];

export const validateUpdatePayrollStatus = [
  param('id')
    .isMongoId()
    .withMessage('Valid payroll ID is required'),

  body('status')
    .isIn(['pending', 'processed', 'paid', 'cancelled'])
    .withMessage('Invalid status')
];

export const validateCalculatePayroll = [
  param('employeeId')
    .isMongoId()
    .withMessage('Valid employee ID is required'),

  query('month')
    .optional()
    .isInt({ min: 1, max: 12 })
    .withMessage('Month must be between 1 and 12'),

  query('year')
    .optional()
    .isInt({ min: 2000, max: 2100 })
    .withMessage('Year must be between 2000 and 2100')
];

// Export validation sets
export const hrValidation = {
  // Employee validations
  createEmployee: validateCreateEmployee,
  updateEmployee: validateUpdateEmployee,
  getEmployees: validateGetEmployees,

  // Job posting validations
  createJobPosting: validateCreateJobPosting,
  updateJobPosting: validateUpdateJobPosting,

  // Job application validations
  applyForJob: validateApplyForJob,
  updateApplicationStatus: validateUpdateApplicationStatus,

  // Payroll validations
  createPayroll: validateCreatePayroll,
  updatePayrollStatus: validateUpdatePayrollStatus,
  calculatePayroll: validateCalculatePayroll
};