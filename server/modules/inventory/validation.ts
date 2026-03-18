import { body } from 'express-validator';

export const validateInventoryItem = [
  body('productId')
    .isMongoId()
    .withMessage('Valid product ID is required'),

  body('productName')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Product name must be between 1 and 200 characters'),

  body('sku')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('SKU must be between 1 and 50 characters')
    .matches(/^[A-Za-z0-9-_]+$/)
    .withMessage('SKU can only contain letters, numbers, hyphens, and underscores'),

  body('category')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Category is required and must be less than 100 characters'),

  body('currentStock')
    .isNumeric()
    .withMessage('Current stock must be a number')
    .isFloat({ min: 0 })
    .withMessage('Current stock cannot be negative'),

  body('minimumStock')
    .isNumeric()
    .withMessage('Minimum stock must be a number')
    .isFloat({ min: 0 })
    .withMessage('Minimum stock cannot be negative'),

  body('maximumStock')
    .optional()
    .isNumeric()
    .withMessage('Maximum stock must be a number')
    .isFloat({ min: 0 })
    .withMessage('Maximum stock cannot be negative'),

  body('unit')
    .trim()
    .isLength({ min: 1, max: 20 })
    .withMessage('Unit must be between 1 and 20 characters'),

  body('location')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Location is required and must be less than 100 characters'),

  body('supplierId')
    .optional()
    .isMongoId()
    .withMessage('Invalid supplier ID'),

  body('costPrice')
    .isNumeric()
    .withMessage('Cost price must be a number')
    .isFloat({ min: 0 })
    .withMessage('Cost price cannot be negative'),

  body('sellingPrice')
    .isNumeric()
    .withMessage('Selling price must be a number')
    .isFloat({ min: 0 })
    .withMessage('Selling price cannot be negative'),

  body('expiryDate')
    .optional()
    .isISO8601()
    .withMessage('Expiry date must be a valid date'),

  body('batchNumber')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Batch number must be less than 50 characters'),

  body('status')
    .optional()
    .isIn(['active', 'discontinued', 'out_of_stock'])
    .withMessage('Status must be active, discontinued, or out_of_stock')
];

export const validateStockUpdate = [
  body('quantity')
    .isNumeric()
    .withMessage('Quantity must be a number')
    .notEmpty()
    .withMessage('Quantity is required'),

  body('operation')
    .isIn(['add', 'subtract', 'set'])
    .withMessage('Operation must be add, subtract, or set'),

  body('reason')
    .optional()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Reason must be between 1 and 200 characters')
];

export const validateInventoryQuery = [
  body('category')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Category must be less than 100 characters'),

  body('status')
    .optional()
    .isIn(['active', 'discontinued', 'out_of_stock'])
    .withMessage('Status must be active, discontinued, or out_of_stock'),

  body('lowStock')
    .optional()
    .isBoolean()
    .withMessage('Low stock must be a boolean')
];