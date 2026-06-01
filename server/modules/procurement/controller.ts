import { Request, Response, NextFunction } from 'express';
import {
  SupplierService,
  PurchaseRequestService,
  PurchaseOrderService,
  GoodsReceivedService
} from './service';
import { validationResult } from 'express-validator';

/**
 * Procurement Controller
 */

// ============================================================
// SUPPLIER CONTROLLER
// ============================================================
export class SupplierController {
  static async getSuppliers(req: Request, res: Response, next: NextFunction) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const filters = {
        status: req.query.status as string,
        search: req.query.search as string
      };

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;

      const result = await SupplierService.getSuppliers(filters, page, limit);

      res.json({
        success: true,
        data: result.suppliers,
        pagination: result.pagination
      });
    } catch (error) {
      next(error);
    }
  }

  static async getSupplierById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const supplier = await SupplierService.getSupplierById(id);

      res.json({
        success: true,
        data: supplier
      });
    } catch (error) {
      next(error);
    }
  }

  static async createSupplier(req: Request, res: Response, next: NextFunction) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const supplier = await SupplierService.createSupplier(req.body);

      res.status(201).json({
        success: true,
        data: supplier,
        message: 'Supplier created successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateSupplier(req: Request, res: Response, next: NextFunction) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { id } = req.params;
      const supplier = await SupplierService.updateSupplier(id, req.body);

      res.json({
        success: true,
        data: supplier,
        message: 'Supplier updated successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  static async deleteSupplier(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      await SupplierService.deleteSupplier(id);

      res.json({
        success: true,
        message: 'Supplier deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }
}

// ============================================================
// PURCHASE REQUEST CONTROLLER
// ============================================================
export class PurchaseRequestController {
  /**
   * Create low stock purchase request
   */
  static async createLowStockRequest(req: Request, res: Response, next: NextFunction) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { inventoryItemId, priority } = req.body;
      const userId = (req as any).user?.id;

      const purchaseRequest = await PurchaseRequestService.createLowStockRequest(
        inventoryItemId,
        userId,
        priority
      );

      res.status(201).json({
        success: true,
        data: purchaseRequest,
        message: 'Purchase request created successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  static async getPurchaseRequests(req: Request, res: Response, next: NextFunction) {
    try {
      const filters = {
        status: req.query.status as string,
        priority: req.query.priority as string
      };

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;

      const result = await PurchaseRequestService.getPurchaseRequests(filters, page, limit);

      res.json({
        success: true,
        data: result.requests,
        pagination: result.pagination
      });
    } catch (error) {
      next(error);
    }
  }

  static async approvePurchaseRequest(req: Request, res: Response, next: NextFunction) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { id } = req.params;
      const approvedBy = (req as any).user?.id;

      const purchaseRequest = await PurchaseRequestService.approvePurchaseRequest(id, approvedBy);

      res.json({
        success: true,
        data: purchaseRequest,
        message: 'Purchase request approved'
      });
    } catch (error) {
      next(error);
    }
  }

  
  static async getLowStockItems(req: Request, res: Response, next: NextFunction) {
    try {
      const threshold = parseInt(req.query.threshold as string) || 10;
      const items = await PurchaseRequestService.getLowStockItems(threshold);
      
      res.json({
        success: true,
        data: items,
        count: items.length
      });
    } catch (error) {
      next(error);
    }
  }

  static async rejectPurchaseRequest(req: Request, res: Response, next: NextFunction) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { id } = req.params;
      const { status, rejectionReason } = req.body;
      const rejectedBy = (req as any).user?.id;

      if (status !== 'rejected') {
        return res.status(400).json({
          success: false,
          message: 'Use approvePurchaseRequest endpoint for approval'
        });
      }

      const purchaseRequest = await PurchaseRequestService.rejectPurchaseRequest(
        id,
        rejectionReason,
        rejectedBy
      );

      res.json({
        success: true,
        data: purchaseRequest,
        message: 'Purchase request rejected'
      });
    } catch (error) {
      next(error);
    }
  }
}

// ============================================================
// PURCHASE ORDER CONTROLLER
// ============================================================
export class PurchaseOrderController {
  static async createPurchaseOrder(req: Request, res: Response, next: NextFunction) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { purchaseRequestId, supplierId, ...additionalData } = req.body;
      const createdBy = (req as any).user?.id;

      const purchaseOrder = await PurchaseOrderService.createPurchaseOrderFromRequest(
        purchaseRequestId,
        supplierId,
        createdBy,
        additionalData
      );

      res.status(201).json({
        success: true,
        data: purchaseOrder,
        message: 'Purchase order created successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  static async getPurchaseOrders(req: Request, res: Response, next: NextFunction) {
    try {
      const filters = {
        status: req.query.status as string,
        supplierId: req.query.supplierId as string
      };

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;

      const result = await PurchaseOrderService.getPurchaseOrders(filters, page, limit);

      res.json({
        success: true,
        data: result.orders,
        pagination: result.pagination
      });
    } catch (error) {
      next(error);
    }
  }

  static async getPurchaseOrderById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const order = await PurchaseOrderService.getPurchaseOrderById(id);

      res.json({
        success: true,
        data: order
      });
    } catch (error) {
      next(error);
    }
  }

  static async confirmPurchaseOrder(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const order = await PurchaseOrderService.confirmPurchaseOrder(id);

      res.json({
        success: true,
        data: order,
        message: 'Purchase order confirmed'
      });
    } catch (error) {
      next(error);
    }
  }

  static async cancelPurchaseOrder(req: Request, res: Response, next: NextFunction) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { id } = req.params;
      const { cancellationReason } = req.body;

      const order = await PurchaseOrderService.cancelPurchaseOrder(id, cancellationReason);

      res.json({
        success: true,
        data: order,
        message: 'Purchase order cancelled'
      });
    } catch (error) {
      next(error);
    }
  }
}

// ============================================================
// GOODS RECEIVED CONTROLLER
// ============================================================
export class GoodsReceivedController {
  static async receiveGoods(req: Request, res: Response, next: NextFunction) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { purchaseOrderId, items, warehouseLocation } = req.body;
      const receivedBy = (req as any).user?.id;

      const goodsReceived = await GoodsReceivedService.receiveGoods(
        purchaseOrderId,
        items,
        receivedBy,
        warehouseLocation
      );

      res.status(201).json({
        success: true,
        data: goodsReceived,
        message: 'Goods received recorded'
      });
    } catch (error) {
      next(error);
    }
  }

  static async inspectGoods(req: Request, res: Response, next: NextFunction) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { id } = req.params;
      const { inspectionNotes, status } = req.body;
      const inspectedBy = (req as any).user?.id;
      const receiptFile = (req as any).file;

      const goodsReceived = await GoodsReceivedService.inspectGoods(
        id,
        inspectionNotes,
        inspectedBy,
        status,
        receiptFile
      );

      res.json({
        success: true,
        data: goodsReceived,
        message: status === 'inspected' ? 'Goods inspected and inventory updated' : 'Goods on hold'
      });
    } catch (error) {
      next(error);
    }
  }

  static async uploadReceipt(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const receiptFile = (req as any).file;
      const verifiedBy = (req as any).user?.id;

      if (!receiptFile) {
        return res.status(400).json({ success: false, message: 'Receipt file is required' });
      }

      const goodsReceived = await GoodsReceivedService.uploadReceipt(
        id,
        receiptFile,
        verifiedBy
      );

      res.json({
        success: true,
        data: goodsReceived,
        message: 'Receipt uploaded successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  static async getGoodsReceivedRecords(req: Request, res: Response, next: NextFunction) {
    try {
      const filters = {
        status: req.query.status as string,
        purchaseOrderId: req.query.purchaseOrderId as string
      };

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;

      const result = await GoodsReceivedService.getGoodsReceivedRecords(filters, page, limit);

      res.json({
        success: true,
        data: result.records,
        pagination: result.pagination
      });
    } catch (error) {
      next(error);
    }
  }

  static async getGoodsReceivedById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const record = await GoodsReceivedService.getGoodsReceivedById(id);

      res.json({
        success: true,
        data: record
      });
    } catch (error) {
      next(error);
    }
  }
}