import { Request, Response, NextFunction } from 'express';
import { InventoryService, InventoryFilters, StockUpdateData } from './service';
import { validationResult } from 'express-validator';

export class InventoryController {
  /**
   * Get all inventory items
   */
  static async getInventoryItems(req: Request, res: Response, next: NextFunction) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const filters: InventoryFilters = {
        category: req.query.category as string,
        status: req.query.status as string,
        lowStock: req.query.lowStock === 'true',
        search: req.query.search as string
      };

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;

      const result = await InventoryService.getInventoryItems(filters, page, limit);

      res.json({
        success: true,
        data: result.items,
        pagination: result.pagination
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get inventory item by ID
   */
  static async getInventoryItemById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'Inventory item ID is required'
        });
      }

      const item = await InventoryService.getInventoryItemById(id);

      res.json({
        success: true,
        data: item
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create new inventory item
   */
  static async createInventoryItem(req: Request, res: Response, next: NextFunction) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const item = await InventoryService.createInventoryItem(req.body);

      res.status(201).json({
        success: true,
        data: item,
        message: 'Inventory item created successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update inventory item
   */
  static async updateInventoryItem(req: Request, res: Response, next: NextFunction) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const { id } = req.params;

      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'Inventory item ID is required'
        });
      }

      const item = await InventoryService.updateInventoryItem(id, req.body);

      res.json({
        success: true,
        data: item,
        message: 'Inventory item updated successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update stock levels
   */
  static async updateStock(req: Request, res: Response, next: NextFunction) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const { id } = req.params;

      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'Inventory item ID is required'
        });
      }

      const updateData: StockUpdateData = {
        quantity: parseFloat(req.body.quantity),
        operation: req.body.operation,
        reason: req.body.reason,
        userId: (req as any).user?.id // Assuming user is attached by auth middleware
      };

      const item = await InventoryService.updateStock(id, updateData);

      res.json({
        success: true,
        data: item,
        message: 'Stock updated successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete inventory item
   */
  static async deleteInventoryItem(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'Inventory item ID is required'
        });
      }

      await InventoryService.deleteInventoryItem(id);

      res.json({
        success: true,
        message: 'Inventory item deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get low stock alerts
   */
  static async getLowStockAlerts(_req: Request, res: Response, next: NextFunction) {
    try {
      const alerts = await InventoryService.getLowStockAlerts();

      res.json({
        success: true,
        data: alerts,
        count: alerts.length
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get inventory summary
   */
  static async getInventorySummary(_req: Request, res: Response, next: NextFunction) {
    try {
      const summary = await InventoryService.getInventorySummary();

      res.json({
        success: true,
        data: summary
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Sync inventory with product catalog
   */
  static async syncWithProducts(_req: Request, res: Response, next: NextFunction) {
    try {
      const syncedItems = await InventoryService.syncWithProducts();

      res.json({
        success: true,
        data: syncedItems,
        count: syncedItems.length,
        message: `Successfully synced ${syncedItems.length} inventory items with product catalog`
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Bulk update inventory items
   */
  static async bulkUpdate(req: Request, res: Response, next: NextFunction) {
    try {
      const { updates } = req.body;

      if (!Array.isArray(updates) || updates.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Updates array is required and cannot be empty'
        });
      }

      const results = [];
      const errors = [];

      for (const update of updates) {
        try {
          if (!update.id) {
            errors.push({ item: update, error: 'ID is required' });
            continue;
          }

          const item = await InventoryService.updateInventoryItem(update.id, update.data || update);
          results.push(item);
        } catch (error: any) {
          errors.push({ item: update, error: error?.message || String(error) });
        }
      }

      res.json({
        success: true,
        data: {
          updated: results,
          failed: errors
        },
        message: `Updated ${results.length} items, ${errors.length} failed`
      });
    } catch (error) {
      next(error);
    }
  }
}