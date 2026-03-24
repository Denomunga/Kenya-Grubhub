import { Router, Request, Response, NextFunction } from 'express';
import { LeaveController } from './controller-leave';
import { body, param, validationResult } from 'express-validator';
import rateLimit from 'express-rate-limit';
import { requireRole, requireAuth } from '../../shared/middleware/auth';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const generalLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });

const validateRequest = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

const router = Router();

// Doctor letter upload setup
const uploadsDir = path.resolve(process.cwd(), 'uploads', 'doctor-letters');
try {
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
} catch (err) {
  console.error('Could not create doctor-letters directory', err);
}

const doctorLetterStorage = multer.diskStorage({
  destination: uploadsDir,
  filename: (_req: any, file: any, cb: any) => {
    const safeName = `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9.-]/g, '-')}`;
    cb(null, safeName);
  }
});

const doctorLetterUpload = multer({
  storage: doctorLetterStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req: any, file: any, cb: any) => {
    const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF and image files are allowed for doctor letters'));
    }
  }
});

// All routes require authentication (requireAuth imported from shared middleware)
router.use(requireAuth);

// ═══════════════════════════════════════════════════════════════════
// Employee routes (any authenticated user)
// ═══════════════════════════════════════════════════════════════════

// Get my leave requests
router.get('/my', generalLimiter, LeaveController.getMyLeaves);

// Get my leave balance
router.get('/my/balance', generalLimiter, LeaveController.getMyLeaveBalance);

// Upload doctor letter
router.post('/upload-doctor-letter', generalLimiter, doctorLetterUpload.single('doctorLetter'), (req: any, res: any) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded' });
    const host = req.get('host') || 'localhost:5000';
    const proto = 'https';
    const fileUrl = `${proto}://${host}/uploads/doctor-letters/${req.file.filename}`;
    res.status(201).json({ success: true, data: { url: fileUrl, filename: req.file.originalname } });
  } catch (err) {
    console.error('Doctor letter upload error:', err);
    res.status(500).json({ success: false, error: 'Failed to upload doctor letter' });
  }
});

// Apply for leave
router.post(
  '/apply',
  generalLimiter,
  body('leaveType').isIn(['annual', 'sick', 'maternity', 'paternity', 'compassionate', 'unpaid']).withMessage('Valid leave type required'),
  body('startDate').isISO8601().withMessage('Valid start date required'),
  body('endDate').isISO8601().withMessage('Valid end date required'),
  body('reason').isString().isLength({ min: 5 }).withMessage('Reason is required (min 5 chars)'),
  validateRequest,
  LeaveController.applyLeave
);

// Cancel my leave request
router.post(
  '/:id/cancel',
  generalLimiter,
  param('id').isMongoId().withMessage('Valid leave ID required'),
  validateRequest,
  LeaveController.cancelLeave
);

// ═══════════════════════════════════════════════════════════════════
// HR/Admin routes
// ═══════════════════════════════════════════════════════════════════

// Get all leave requests
router.get(
  '/',
  generalLimiter,
  requireRole(['admin', 'hr_manager', 'manager', 'staff']),
  LeaveController.getLeaveRequests
);

// Get leave stats
router.get(
  '/stats',
  generalLimiter,
  requireRole(['admin', 'hr_manager', 'manager', 'staff']),
  LeaveController.getLeaveStats
);

// Get employee leave balance (HR)
router.get(
  '/balance/:employeeId',
  generalLimiter,
  requireRole(['admin', 'hr_manager', 'manager', 'staff']),
  param('employeeId').isMongoId().withMessage('Valid employee ID required'),
  validateRequest,
  LeaveController.getEmployeeLeaveBalance
);

// Review (approve/reject) leave request
router.post(
  '/:id/review',
  generalLimiter,
  requireRole(['admin', 'hr_manager', 'manager', 'staff']),
  param('id').isMongoId().withMessage('Valid leave ID required'),
  body('action').isIn(['approved', 'rejected']).withMessage('Action must be approved or rejected'),
  validateRequest,
  LeaveController.reviewLeave
);

export default router;
