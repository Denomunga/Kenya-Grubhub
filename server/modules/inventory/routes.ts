import { Router } from 'express';
import { InventoryController } from './controller';
import {
  validateInventoryItem,
  validateStockUpdate,
  validateInventoryQuery
} from './validation';
import { authLimiter, generalLimiter } from '@shared/middleware/rateLimiter';
import { requireAuth } from '@shared/middleware/auth';
import { requireRole } from '@shared/middleware/roles';

const router = Router();

// Apply authentication to all routes
router.use(requireAuth);

// Apply role-based access (inventory management typically requires admin/manager roles)
router.use(requireRole(['admin', 'manager', 'inventory_manager']));

// Get inventory summary (dashboard)
router.get('/summary',
  generalLimiter,
  InventoryController.getInventorySummary
);

// Get low stock alerts
router.get('/alerts/low-stock',
  generalLimiter,
  InventoryController.getLowStockAlerts
);

// Get all inventory items with filtering
router.get('/',
  generalLimiter,
  validateInventoryQuery,
  InventoryController.getInventoryItems
);

// Get inventory item by ID
router.get('/:id',
  generalLimiter,
  InventoryController.getInventoryItemById
);

// Create new inventory item
router.post('/',
  authLimiter,
  validateInventoryItem,
  InventoryController.createInventoryItem
);

// Update inventory item
router.put('/:id',
  authLimiter,
  validateInventoryItem,
  InventoryController.updateInventoryItem
);

// Update stock levels
router.patch('/:id/stock',
  authLimiter,
  validateStockUpdate,
  InventoryController.updateStock
);

// Bulk update inventory items
router.patch('/bulk',
  authLimiter,
  InventoryController.bulkUpdate
);

// Sync with product catalog
router.post('/sync/products',
  authLimiter,
  InventoryController.syncWithProducts
);

// Delete inventory item
router.delete('/:id',
  authLimiter,
  InventoryController.deleteInventoryItem
);

export default router;