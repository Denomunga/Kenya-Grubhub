import { body } from 'express-validator';

/**
 * Supplier Validation
 */
export const validateSupplier = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Supplier name is required and must be less than 200 characters'),

  body('email')
    .isEmail()
    .withMessage('Valid email is required'),

  body('phone')
    .trim()
    .isLength({ min: 10, max: 15 })
    .withMessage('Phone must be between 10 and 15 characters'),

  body('address')
    .trim()
    .isLength({ min: 5, max: 300 })
    .withMessage('Address must be between 5 and 300 characters'),

  body('city')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('City is required'),

  body('state')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('State is required'),

  body('zipCode')
    .trim()
    .isLength({ min: 1, max: 20 })
    .withMessage('ZIP code is required'),

  body('country')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Country is required'),

  body('contactPerson')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Contact person name is required'),

  body('contactEmail')
    .isEmail()
    .withMessage('Valid contact email is required'),

  body('contactPhone')
    .trim()
    .isLength({ min: 10, max: 15 })
    .withMessage('Contact phone must be between 10 and 15 characters'),

  body('paymentTerms')
    .optional()
    .isIn(['immediate', 'net30', 'net60', 'net90'])
    .withMessage('Invalid payment terms'),

  body('rating')
    .optional()
    .isFloat({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5'),

  body('status')
    .optional()
    .isIn(['active', 'inactive', 'suspended'])
    .withMessage('Invalid status'),

  body('leadTime')
    .optional()
    .isNumeric()
    .withMessage('Lead time must be a number'),

  body('minimumOrderQuantity')
    .optional()
    .isNumeric()
    .withMessage('Minimum order quantity must be a number')
];

/**
 * Purchase Request Validation
 */
export const validatePurchaseRequest = [
  body('inventoryItemId')
    .isMongoId()
    .withMessage('Valid inventory item ID is required'),

  body('requestedQuantity')
    .isNumeric()
    .withMessage('Quantity must be a number')
    .isFloat({ min: 1 })
    .withMessage('Quantity must be greater than 0'),

  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'urgent'])
    .withMessage('Invalid priority'),

  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes must be less than 500 characters')
];

/**
 * Purchase Approval Validation
 */
export const validatePurchaseApproval = [
  body('status')
    .isIn(['approved', 'rejected'])
    .withMessage('Status must be approved or rejected'),

  body('rejectionReason')
    .if((value, { req }) => req.body.status === 'rejected')
    .trim()
    .isLength({ min: 1, max: 300 })
    .withMessage('Rejection reason is required and must be between 1 and 300 characters')
];

/**
 * Purchase Order Validation
 */
export const validatePurchaseOrder = [
  body('supplierId')
    .isMongoId()
    .withMessage('Valid supplier ID is required'),

  body('items')
    .isArray({ min: 1 })
    .withMessage('At least one item is required'),

  body('items.*.inventoryItemId')
    .isMongoId()
    .withMessage('Valid inventory item ID is required for each item'),

  body('items.*.quantity')
    .isNumeric()
    .withMessage('Quantity must be a number')
    .isFloat({ min: 1 })
    .withMessage('Quantity must be greater than 0'),

  body('items.*.unitPrice')
    .isNumeric()
    .withMessage('Unit price must be a number')
    .isFloat({ min: 0 })
    .withMessage('Unit price cannot be negative'),

  body('paymentTerms')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Payment terms is required'),

  body('deliveryAddress')
    .trim()
    .isLength({ min: 5, max: 300 })
    .withMessage('Delivery address must be between 5 and 300 characters'),

  body('expectedDeliveryDate')
    .isISO8601()
    .withMessage('Valid delivery date is required'),

  body('tax')
    .optional()
    .isNumeric()
    .withMessage('Tax must be a number'),

  body('shippingCost')
    .optional()
    .isNumeric()
    .withMessage('Shipping cost must be a number'),

  body('discountAmount')
    .optional()
    .isNumeric()
    .withMessage('Discount must be a number'),

  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes must be less than 500 characters')
];

/**
 * PO Confirmation Validation
 */
export const validatePOConfirmation = [
  body('status')
    .isIn(['confirmed', 'cancelled'])
    .withMessage('Status must be confirmed or cancelled'),

  body('cancellationReason')
    .if((value, { req }) => req.body.status === 'cancelled')
    .trim()
    .isLength({ min: 1, max: 300 })
    .withMessage('Cancellation reason is required')
];

/**
 * Goods Received Validation
 */
export const validateGoodsReceived = [
  body('purchaseOrderId')
    .isMongoId()
    .withMessage('Valid purchase order ID is required'),

  body('items')
    .isArray({ min: 1 })
    .withMessage('At least one item is required'),

  body('items.*.inventoryItemId')
    .isMongoId()
    .withMessage('Valid inventory item ID is required'),

  body('items.*.quantity')
    .isNumeric()
    .withMessage('Quantity must be a number')
    .isFloat({ min: 0 })
    .withMessage('Quantity cannot be negative'),

  body('items.*.qualityStatus')
    .isIn(['accepted', 'rejected', 'partial_reject'])
    .withMessage('Invalid quality status'),

  body('items.*.rejectionReason')
    .if((_value, { req }) => {
      const items = (req.body.items || []) as any[];
      return items.some((item: any) => item.qualityStatus !== 'accepted');
    })
    .trim()
    .isLength({ min: 1 })
    .withMessage('Rejection reason is required for rejected items'),

  body('warehouseLocation')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Warehouse location must be less than 200 characters'),

  body('transportationNotes')
    .optional()
    .trim()
    .isLength({ max: 300 })
    .withMessage('Transportation notes must be less than 300 characters')
];

/**
 * Goods Inspection Validation
 */
export const validateGoodsInspection = [
  body('status')
    .isIn(['inspected', 'hold'])
    .withMessage('Status must be inspected or hold'),

  body('inspectionNotes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Inspection notes must be less than 500 characters')
];