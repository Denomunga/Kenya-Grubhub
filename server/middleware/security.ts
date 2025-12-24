import rateLimit from 'express-rate-limit';
import { body, validationResult } from 'express-validator';
import DOMPurify from 'isomorphic-dompurify';
import { Request, Response, NextFunction } from 'express';

// Rate limiting configuration
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: 'Too many authentication attempts, please try again later.',
  skipSuccessfulRequests: true,
});

export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests, please try again later.',
});

export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // limit each IP to 10 uploads per hour
  message: 'Too many upload attempts, please try again later.',
});

// Input sanitization functions
export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') return '';
  return DOMPurify.sanitize(input.trim(), {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  });
}

export function sanitizeHtml(input: string): string {
  if (typeof input !== 'string') return '';
  return DOMPurify.sanitize(input.trim(), {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: ['href', 'target'],
  });
}

// Validation middleware
export const validateRegistration = [
  body('username')
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be 3-30 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  body('name')
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be 2-50 characters')
    .trim(),
  body('phone')
    .optional()
    .isMobilePhone('any')
    .withMessage('Please provide a valid phone number'),
];

export const validateLogin = [
  body('username')
    .notEmpty()
    .withMessage('Username is required')
    .trim(),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
];

export const validateNews = [
  body('title')
    .isLength({ min: 3, max: 200 })
    .withMessage('Title must be 3-200 characters')
    .trim(),
  body('content')
    .isLength({ min: 10, max: 5000 })
    .withMessage('Content must be 10-5000 characters')
    .trim(),
  body('author')
    .isLength({ min: 2, max: 50 })
    .withMessage('Author name must be 2-50 characters')
    .trim(),
];

export const validateMenuItem = [
  body('name')
    .isLength({ min: 2, max: 100 })
    .withMessage('Item name must be 2-100 characters')
    .trim(),
  body('description')
    .isLength({ min: 5, max: 500 })
    .withMessage('Description must be 5-500 characters')
    .trim(),
  body('price')
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number'),
];

export const validateReview = [
  body('rating')
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5'),
  body('comment')
    .isLength({ min: 5, max: 1000 })
    .withMessage('Comment must be 5-1000 characters')
    .trim(),
];

export const validateBusinessLocation = [
  body('name')
    .isLength({ min: 2, max: 100 })
    .withMessage('Business name must be 2-100 characters')
    .trim(),
  body('address')
    .isLength({ min: 5, max: 200 })
    .withMessage('Address must be 5-200 characters')
    .trim(),
  body('phone')
    .isMobilePhone('any')
    .withMessage('Please provide a valid phone number'),
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
];

// Validation result handler
export const handleValidationErrors = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: 'Validation failed',
      errors: errors.array().map(error => ({
        field: error.type === 'field' ? error.path : 'unknown',
        message: error.msg,
      })),
    });
  }
  next();
};

// XSS protection middleware
export const xssProtection = (_req: Request, _res: Response, next: NextFunction) => {
  // Sanitize string inputs in request body
  if (_req.body && typeof _req.body === 'object') {
    for (const key in _req.body) {
      if (typeof _req.body[key] === 'string') {
        _req.body[key] = sanitizeInput(_req.body[key]);
      }
    }
  }
  next();
};

// Security headers middleware
export const securityHeaders = (_req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  next();
};
