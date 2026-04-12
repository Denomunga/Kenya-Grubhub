import { Router } from 'express';
import {
  SupplierController,
  PurchaseRequestController,
  PurchaseOrderController,
  GoodsReceivedController
} from './controller';
import {
  validateSupplier,
  validatePurchaseRequest,
  validatePurchaseApproval,
  validatePurchaseOrder,
  validatePOConfirmation,
  validateGoodsReceived,
  validateGoodsInspection
} from './validation';
import { generalLimiter, authLimiter } from '@shared/middleware/rateLimiter';
import { requireAuth } from '@shared/middleware/auth';
import { requireRole } from '@shared/middleware/roles';

const router = Router();

// Apply authentication to all routes
router.use(requireAuth);

// ============================================================
// SUPPLIER ROUTES
// ============================================================

// Get all suppliers
router.get('/suppliers',
  generalLimiter,
  SupplierController.getSuppliers
);

// Get supplier by ID
router.get('/suppliers/:id',
  generalLimiter,
  SupplierController.getSupplierById
);

// Create supplier (admin/procurement manager only)
router.post('/suppliers',
  authLimiter,
  requireRole(['admin', 'procurement_manager']),
  validateSupplier,
  SupplierController.createSupplier
);

// Update supplier (admin/procurement manager only)
router.put('/suppliers/:id',
  authLimiter,
  requireRole(['admin', 'procurement_manager']),
  validateSupplier,
  SupplierController.updateSupplier
);

// Delete supplier (admin only)
router.delete('/suppliers/:id',
  authLimiter,
  requireRole(['admin']),
  SupplierController.deleteSupplier
);

// ============================================================
// PURCHASE REQUEST ROUTES
// ============================================================

// Get all purchase requests
router.get('/purchase-requests',
  generalLimiter,
  PurchaseRequestController.getPurchaseRequests
);

// Get low stock items
router.get('/low-stock-items',
  generalLimiter,
  PurchaseRequestController.getLowStockItems
);

// Create purchase request (triggered by low stock)
router.post('/purchase-requests',
  authLimiter,
  validatePurchaseRequest,
  PurchaseRequestController.createLowStockRequest
);

// Approve purchase request (manager/admin only)
router.post('/purchase-requests/:id/approve',
  authLimiter,
  requireRole(['admin', 'procurement_manager', 'manager']),
  validatePurchaseApproval,
  PurchaseRequestController.approvePurchaseRequest
);

// Reject purchase request (manager/admin only)
router.post('/purchase-requests/:id/reject',
  authLimiter,
  requireRole(['admin', 'procurement_manager', 'manager']),
  validatePurchaseApproval,
  PurchaseRequestController.rejectPurchaseRequest
);

// ============================================================
// PURCHASE ORDER ROUTES
// ============================================================

// Get all purchase orders
router.get('/purchase-orders',
  generalLimiter,
  PurchaseOrderController.getPurchaseOrders
);

// Get purchase order by ID
router.get('/purchase-orders/:id',
  generalLimiter,
  PurchaseOrderController.getPurchaseOrderById
);

// Create purchase order from request
router.post('/purchase-orders',
  authLimiter,
  requireRole(['admin', 'procurement_manager']),
  validatePurchaseOrder,
  PurchaseOrderController.createPurchaseOrder
);

// Confirm purchase order
router.post('/purchase-orders/:id/confirm',
  authLimiter,
  requireRole(['admin', 'procurement_manager']),
  validatePOConfirmation,
  PurchaseOrderController.confirmPurchaseOrder
);

// Cancel purchase order
router.post('/purchase-orders/:id/cancel',
  authLimiter,
  requireRole(['admin', 'procurement_manager']),
  validatePOConfirmation,
  PurchaseOrderController.cancelPurchaseOrder
);

// ============================================================
// GOODS RECEIVED ROUTES
// ============================================================

// Get all goods received records
router.get('/goods-received',
  generalLimiter,
  GoodsReceivedController.getGoodsReceivedRecords
);

// Get goods received by ID
router.get('/goods-received/:id',
  generalLimiter,
  GoodsReceivedController.getGoodsReceivedById
);

// Record goods received
router.post('/goods-received',
  authLimiter,
  requireRole(['admin', 'procurement_manager', 'warehouse_manager']),
  validateGoodsReceived,
  GoodsReceivedController.receiveGoods
);

// Inspect goods (inspect and update inventory)
router.post('/goods-received/:id/inspect',
  authLimiter,
  requireRole(['admin', 'procurement_manager', 'quality_manager']),
  validateGoodsInspection,
  GoodsReceivedController.inspectGoods
);

export default router;