import { body, param } from 'express-validator';

// Supplier validation
export const validateSupplier = [
  body('name').notEmpty().withMessage('Name is required').isLength({ min: 2, max: 100 }),
  body('email').isEmail().withMessage('Valid email required'),
  body('phone').notEmpty().withMessage('Phone is required'),
  body('address').notEmpty().withMessage('Address is required'),
  body('leadTimeDays').optional().isInt({ min: 1 }).withMessage('Lead time must be at least 1 day'),
  body('moq').optional().isInt({ min: 1 }),
  body('status').optional().isIn(['active', 'inactive', 'blacklisted']),
];

// Purchase Request validation
export const validatePurchaseRequest = [
  body('inventoryItemId').isMongoId().withMessage('Valid inventory item ID required'),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
];

export const validatePurchaseApproval = [
  param('id').isMongoId().withMessage('Valid request ID required'),
  body('status').optional().isIn(['approved', 'rejected']),
  body('rejectionReason').if(body('status').equals('rejected')).notEmpty().withMessage('Rejection reason required'),
];

// Purchase Order validation
export const validatePurchaseOrder = [
  body('purchaseRequestId').isMongoId().withMessage('Valid request ID required'),
  body('supplierId').isMongoId().withMessage('Valid supplier ID required'),
  body('expectedDeliveryDate').isISO8601().withMessage('Valid delivery date required'),
  body('items').optional().isArray(),
  body('notes').optional().isString(),
];

export const validatePOConfirmation = [
  param('id').isMongoId().withMessage('Valid PO ID required'),
  body('cancellationReason')
    .if(body('action').equals('cancel'))
    .notEmpty()
    .withMessage('Cancellation reason required'),
];

// Goods Received validation
export const validateGoodsReceived = [
  body('purchaseOrderId').isMongoId().withMessage('Valid PO ID required'),
  body('items').isArray({ min: 1 }).withMessage('At least one item required'),
  body('items.*.inventoryItemId').isMongoId(),
  body('items.*.quantityReceived').isFloat({ min: 0 }),
  body('items.*.condition').optional().isIn(['good', 'damaged', 'expired']),
  body('warehouseLocation').optional().isString(),
];

export const validateGoodsInspection = [
  param('id').isMongoId().withMessage('Valid GRN ID required'),
  body('status').isIn(['inspected', 'on_hold']).withMessage('Invalid status'),
  body('inspectionNotes').optional().isString(),
];