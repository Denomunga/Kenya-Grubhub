import mongoose from 'mongoose';
import {
  Supplier,
  ISupplier,
  PurchaseRequest,
  PurchaseOrder,
  GoodsReceived
} from './models';
import { InventoryService } from '../inventory/service';
import { Product } from '../../models/Product';
import { TransactionService } from '../accounting/service';
import { extractReceiptData, compareReceiptWithPO, ReceiptMatchResult } from './receiptParser';
import path from 'path';

/**
 * Procurement Service
 * Handles supplier management, purchase requests, orders, and goods receipt
 */

// ============================================================
// SUPPLIER SERVICE
// ============================================================
export class SupplierService {
  static async getSuppliers(filters: any = {}, page = 1, limit = 50) {
    try {
      const query: any = {};

      if (filters.status) {
        query.status = filters.status;
      }

      if (filters.search) {
        query.$or = [
          { name: { $regex: filters.search, $options: 'i' } },
          { email: { $regex: filters.search, $options: 'i' } }
        ];
      }

      const skip = (page - 1) * limit;

      const suppliers = await Supplier
        .find(query)
        .sort({ rating: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

      const total = await Supplier.countDocuments(query);

      return {
        suppliers,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) }
      };
    } catch (error: any) {
      throw new Error(`Failed to fetch suppliers: ${error?.message || String(error)}`);
    }
  }

  static async getSupplierById(id: string) {
    try {
      const supplier = await Supplier.findById(id);
      if (!supplier) throw new Error('Supplier not found');
      return supplier;
    } catch (error: any) {
      throw new Error(`Failed to fetch supplier: ${error?.message || String(error)}`);
    }
  }

  static async createSupplier(data: Partial<ISupplier>) {
    try {
      const existingSupplier = await Supplier.findOne({ email: data.email });
      if (existingSupplier) throw new Error('Supplier with this email already exists');

      const supplier = new Supplier(data);
      await supplier.save();
      return supplier;
    } catch (error: any) {
      throw new Error(`Failed to create supplier: ${error?.message || String(error)}`);
    }
  }

  static async updateSupplier(id: string, data: Partial<ISupplier>) {
    try {
      const supplier = await Supplier.findByIdAndUpdate(
        id,
        { ...data, updatedAt: new Date() },
        { new: true, runValidators: true }
      );
      if (!supplier) throw new Error('Supplier not found');
      return supplier;
    } catch (error: any) {
      throw new Error(`Failed to update supplier: ${error?.message || String(error)}`);
    }
  }

  static async deleteSupplier(id: string) {
    try {
      const supplier = await Supplier.findByIdAndDelete(id);
      if (!supplier) throw new Error('Supplier not found');
      return supplier;
    } catch (error: any) {
      throw new Error(`Failed to delete supplier: ${error?.message || String(error)}`);
    }
  }
}

// ============================================================
// PURCHASE REQUEST SERVICE
// ============================================================
export class PurchaseRequestService {
  /**
   * Create purchase request when inventory is low
   */
  static async createLowStockRequest(
    inventoryItemId: string,
    requestedBy: string,
    priority: string = 'medium'
  ) {
    try {
      const product = await Product.findById(inventoryItemId);
      if (!product) throw new Error('Product not found');

      // Calculate recommended quantity to bring stock to maximum
      const currentStock = product.stock || 0;
        const minimumStock = 10;
        const recommendedQuantity = Math.max(minimumStock * 2 - currentStock, minimumStock);

      const requestNumber = `PR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const purchaseRequest = new PurchaseRequest({
        requestNumber,
        inventoryItemId,
        productName: product.name,
        sku: product._id.toString().slice(-8).toUpperCase(),
        currentStock,
        minimumStock,
        recommendedQuantity,
        requestedQuantity: recommendedQuantity,
        requestedBy,
        priority,
        requestDate: new Date()
      });

      await purchaseRequest.save();
      return purchaseRequest;
    } catch (error: any) {
      throw new Error(`Failed to create purchase request: ${error?.message || String(error)}`);
    }
  }

  static async getPurchaseRequests(filters: any = {}, page = 1, limit = 50) {
    try {
      const query: any = {};

      if (filters.status) {
        query.status = filters.status;
      }

      if (filters.priority) {
        query.priority = filters.priority;
      }

      const skip = (page - 1) * limit;

      const requests = await PurchaseRequest
        .find(query)
        .populate('inventoryItemId', 'name')
        .sort({ requestDate: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

      const total = await PurchaseRequest.countDocuments(query);

      return {
        requests,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) }
      };
    } catch (error: any) {
      throw new Error(`Failed to fetch purchase requests: ${error?.message || String(error)}`);
    }
  }

  static async approvePurchaseRequest(id: string, approvedBy: string) {
    try {
      const request = await PurchaseRequest.findByIdAndUpdate(
        id,
        {
          status: 'approved',
          approvedBy,
          approvalDate: new Date()
        },
        { new: true }
      );
      if (!request) throw new Error('Purchase request not found');
      return request;
    } catch (error: any) {
      throw new Error(`Failed to approve request: ${error?.message || String(error)}`);
    }
  }

  static async rejectPurchaseRequest(id: string, rejectionReason: string, rejectedBy: string) {
    try {
      const request = await PurchaseRequest.findByIdAndUpdate(
        id,
        {
          status: 'rejected',
          rejectionReason,
          approvedBy: rejectedBy,
          approvalDate: new Date()
        },
        { new: true }
      );
      if (!request) throw new Error('Purchase request not found');
      return request;
    } catch (error: any) {
      throw new Error(`Failed to reject request: ${error?.message || String(error)}`);
    }
  }

  /**
   * Get inventory items with low stock that don't have pending purchase requests
   */
  static async getLowStockItems(threshold: number = 10) {
    try {
      // Get all products with stock below threshold
      const lowStockProducts = await Product.find({ stock: { $lt: threshold } });
      
      // Get IDs of products that already have pending/approved purchase requests
      const existingRequests = await PurchaseRequest.find({
        status: { $in: ['pending_approval', 'approved'] },
        inventoryItemId: { $in: lowStockProducts.map(p => p._id) }
      });
      
      const requestedProductIds = new Set(
        existingRequests.map(r => r.inventoryItemId.toString())
      );
      
      // Filter out products that already have requests
      const alerts = lowStockProducts
        .filter(p => !requestedProductIds.has(p._id.toString()))
        .map(p => ({
          _id: p._id,
          id: p._id.toString(),
          productName: p.name,
          name: p.name,
          currentStock: p.stock || 0,
          stock: p.stock || 0,
          minimumStock: threshold,
          category: p.category,
          sku: p._id.toString().slice(-8).toUpperCase(),
          unit: 'pcs',
          type: 'low_stock_alert'
        }));
      
      return alerts;
    } catch (error: any) {
      throw new Error(`Failed to get low stock items: ${error?.message || String(error)}`);
    }
  }
}

// ============================================================
// PURCHASE ORDER SERVICE
// ============================================================
export class PurchaseOrderService {
  /**
   * Create purchase order from purchase request
   */
  static async createPurchaseOrderFromRequest(
    purchaseRequestId: string,
    supplierId: string,
    createdBy: string,
    additionalData: any = {}
  ) {
    try {
      const purchaseRequest = await PurchaseRequest.findById(purchaseRequestId);
      if (!purchaseRequest) throw new Error('Purchase request not found');

      const supplier = await Supplier.findById(supplierId);
      if (!supplier) throw new Error('Supplier not found');

      const product = await Product.findById(purchaseRequest.inventoryItemId);
      if (!product) throw new Error('Product not found');

      const unitPrice = additionalData.unitPrice || product.costPrice || 0;
      const quantity = purchaseRequest.requestedQuantity;
      const totalPrice = unitPrice * quantity;

      const poNumber = `PO-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const purchaseOrder = new PurchaseOrder({
        poNumber,
        supplierId,
        purchaseRequestId,
        items: [
          {
            inventoryItemId: purchaseRequest.inventoryItemId,
            productName: purchaseRequest.productName,
            sku: purchaseRequest.sku,
            quantity,
            unit: product.unit || 'pcs',
            unitPrice,
            totalPrice
          }
        ],
        totalAmount: totalPrice,
        tax: additionalData.tax || 0,
        shippingCost: additionalData.shippingCost || 0,
        discountAmount: additionalData.discountAmount || 0,
        grandTotal:
          totalPrice + (additionalData.tax || 0) + (additionalData.shippingCost || 0) -
          (additionalData.discountAmount || 0),
        paymentTerms: supplier.paymentTerms || 'net30',
        deliveryAddress: additionalData.deliveryAddress || 'Main Warehouse',
        expectedDeliveryDate: additionalData.expectedDeliveryDate || new Date(Date.now() + (supplier.leadTime || 7) * 24 * 60 * 60 * 1000),
        createdBy,
        notes: additionalData.notes
      });

      await purchaseOrder.save();

      // Update purchase request status
      await PurchaseRequest.findByIdAndUpdate(purchaseRequestId, {
        status: 'converted_to_po'
      });

      return purchaseOrder;
    } catch (error: any) {
      throw new Error(`Failed to create purchase order: ${error?.message || String(error)}`);
    }
  }

  static async getPurchaseOrders(filters: any = {}, page = 1, limit = 50) {
    try {
      const query: any = {};

      if (filters.status) {
        query.status = filters.status;
      }

      if (filters.supplierId) {
        query.supplierId = filters.supplierId;
      }

      const skip = (page - 1) * limit;

      const orders = await PurchaseOrder
        .find(query)
        .populate('supplierId', 'name email')
        .populate('items.inventoryItemId', 'productName sku')
        .sort({ orderDate: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

      const total = await PurchaseOrder.countDocuments(query);

      return {
        orders,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) }
      };
    } catch (error: any) {
      throw new Error(`Failed to fetch purchase orders: ${error?.message || String(error)}`);
    }
  }

  static async getPurchaseOrderById(id: string) {
    try {
      const order = await PurchaseOrder
        .findById(id)
        .populate('supplierId')
        .populate('items.inventoryItemId');

      if (!order) throw new Error('Purchase order not found');
      return order;
    } catch (error: any) {
      throw new Error(`Failed to fetch purchase order: ${error?.message || String(error)}`);
    }
  }

  static async confirmPurchaseOrder(id: string) {
    try {
      const order = await PurchaseOrder.findByIdAndUpdate(
        id,
        {
          status: 'confirmed',
          confirmedDate: new Date()
        },
        { new: true }
      );
      if (!order) throw new Error('Purchase order not found');
      return order;
    } catch (error: any) {
      throw new Error(`Failed to confirm purchase order: ${error?.message || String(error)}`);
    }
  }

  static async cancelPurchaseOrder(id: string, cancellationReason: string) {
    try {
      const order = await PurchaseOrder.findByIdAndUpdate(
        id,
        {
          status: 'cancelled',
          cancelledDate: new Date(),
          cancellationReason
        },
        { new: true }
      );
      if (!order) throw new Error('Purchase order not found');
      return order;
    } catch (error: any) {
      throw new Error(`Failed to cancel purchase order: ${error?.message || String(error)}`);
    }
  }
}

// ============================================================
// GOODS RECEIVED SERVICE
// ============================================================
export class GoodsReceivedService {
  /**
   * Receive goods from supplier
   */
  static async receiveGoods(
    purchaseOrderId: string,
    items: any[],
    receivedBy: string,
    warehouseLocation: string
  ) {
    try {
      const purchaseOrder = await PurchaseOrder.findById(purchaseOrderId);
      if (!purchaseOrder) throw new Error('Purchase order not found');

      // Validate PO status allows receiving
      if (!['confirmed', 'shipped', 'partially_received'].includes(purchaseOrder.status)) {
        throw new Error(`Cannot receive goods for PO with status: ${purchaseOrder.status}`);
      }

      // Validate each received item against PO items
      const validationErrors: string[] = [];
      const validatedItems = items.map((item: any, idx: number) => {
        const poItem = purchaseOrder.items[item.purchaseOrderItemIndex ?? idx];
        if (!poItem) {
          validationErrors.push(`Item at index ${idx} not found in PO`);
          return item;
        }
        if (item.quantity > poItem.quantity) {
          validationErrors.push(`${poItem.productName || poItem.sku}: received ${item.quantity} exceeds ordered ${poItem.quantity}`);
        }
        if (item.quantity < 0) {
          validationErrors.push(`${poItem.productName || poItem.sku}: received quantity cannot be negative`);
        }
        return {
          ...item,
          inventoryItemId: poItem.inventoryItemId,
          unit: poItem.unit,
        };
      });

      if (validationErrors.length > 0) {
        throw new Error('Quantity validation failed: ' + validationErrors.join('; '));
      }

      const supplier = await Supplier.findById(purchaseOrder.supplierId);
      if (!supplier) throw new Error('Supplier not found');

      // Calculate totals from items
      const totalReceived = validatedItems.reduce((sum: number, item: any) => sum + item.quantity, 0);
      const totalRejected = validatedItems.reduce((sum: number, item: any) => sum + (item.rejectedQuantity || 0), 0);
      const grNumber = `GR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const goodsReceived = new GoodsReceived({
        grNumber,
        purchaseOrderId,
        supplierId: purchaseOrder.supplierId,
        items: validatedItems,
        receivedDate: new Date(),
        receivedBy,
        totalItemsReceived: totalReceived,
        totalItemsRejected: totalRejected,
        warehouseLocation,
        status: 'pending_inspection',
        inspectionStatus: 'PENDING_INSPECTION'
      });

      await goodsReceived.save();

      // Update purchase order status
      await PurchaseOrder.findByIdAndUpdate(purchaseOrderId, {
        status: purchaseOrder.status === 'received' ? 'received' : 'partially_received',
        receivedDate: new Date()
      });

      return goodsReceived;
    } catch (error: any) {
      throw new Error(`Failed to record goods received: ${error?.message || String(error)}`);
    }
  }

  static async inspectGoods(id: string, inspectionNotes: string, inspectedBy: string, status: string, receiptFile?: any) {
    try {
      const goodsReceived = await GoodsReceived.findById(id);
      if (!goodsReceived) throw new Error('Goods received record not found');

      // Require receipt before inspection can pass
      if (status === 'inspected' && !goodsReceived.receiptUrl && !receiptFile) {
        throw new Error('Receipt is required before goods can be inspected and accepted. Please upload a receipt first.');
      }

      const updateData: any = {
        status,
        inspectionNotes,
        inspectedBy,
        inspectionDate: new Date(),
        inspectionStatus: status === 'inspected' ? 'PASSED' : 'FAILED'
      };

      // If receipt file provided with inspection, save it
      if (receiptFile) {
        updateData.receiptUrl = '/uploads/receipts/' + receiptFile.filename;
        updateData.receiptPublicId = receiptFile.filename;
        updateData.receiptVerified = true;
        updateData.receiptVerifiedBy = inspectedBy;
        updateData.receiptVerifiedAt = new Date();
      }

      await GoodsReceived.findByIdAndUpdate(id, updateData, { new: true });

      // If inspection passed, validate receipt then update inventory
      if (status === 'inspected') {
        // Pass receipt file path for OCR validation if receipt was just uploaded
        const receiptPath = receiptFile ? '/uploads/receipts/' + receiptFile.filename : undefined;
        await this.validateReceiptAgainstPO(id, receiptPath);
        await this.updateInventoryFromGoodsReceived(id);
      }

      const updated = await GoodsReceived.findById(id);
      return updated;
    } catch (error: any) {
      throw new Error(`Failed to inspect goods: ${error?.message || String(error)}`);
    }
  }

  static async uploadReceipt(id: string, receiptFile: any, verifiedBy: string) {
    try {
      const goodsReceived = await GoodsReceived.findById(id);
      if (!goodsReceived) throw new Error('Goods received record not found');

      goodsReceived.receiptUrl = '/uploads/receipts/' + receiptFile.filename;
      goodsReceived.receiptPublicId = receiptFile.filename;
      goodsReceived.receiptVerified = true;
      goodsReceived.receiptVerifiedBy = new mongoose.Types.ObjectId(verifiedBy);
      goodsReceived.receiptVerifiedAt = new Date();
      await goodsReceived.save();

      return goodsReceived;
    } catch (error: any) {
      throw new Error('Failed to upload receipt: ' + (error?.message || String(error)));
    }
  }

  static async validateReceiptAgainstPO(goodsReceivedId: string, receiptFilePath?: string): Promise<ReceiptMatchResult | boolean> {
    try {
      const goodsReceived = await GoodsReceived.findById(goodsReceivedId);
      if (!goodsReceived) throw new Error('Goods received record not found');

      const purchaseOrder = await PurchaseOrder.findById(goodsReceived.purchaseOrderId);
      if (!purchaseOrder) throw new Error('Associated purchase order not found');

      // Validate that all received items reference valid PO items
      for (const receivedItem of goodsReceived.items) {
        const itemIndex = receivedItem.purchaseOrderItemIndex;
        if (itemIndex < 0 || itemIndex >= purchaseOrder.items.length) {
          throw new Error('Receipt item references invalid PO item index: ' + itemIndex);
        }
      }

      // Validate received quantities don't exceed ordered quantities
      for (const receivedItem of goodsReceived.items) {
        const poItem = purchaseOrder.items[receivedItem.purchaseOrderItemIndex];
        if (poItem && receivedItem.quantity > poItem.quantity) {
          throw new Error('Received quantity for PO item at index ' + receivedItem.purchaseOrderItemIndex + ' exceeds ordered quantity');
        }
      }

      // OCR Validation: If receipt PDF provided, extract and compare with PO
      if (receiptFilePath && receiptFilePath.endsWith('.pdf')) {
        const fullPath = path.join(process.cwd(), receiptFilePath.replace(/^\//, ''));
        
        try {
          const receiptData = await extractReceiptData(fullPath);
          const matchResult = compareReceiptWithPO(receiptData, purchaseOrder.items);

          if (!matchResult.matched) {
            const errorDetails = matchResult.mismatches.map(m => {
              if (m.type === 'missing_in_po') return `Item "${m.item?.name}" not in PO`;
              if (m.type === 'qty_mismatch') return `"${m.poItem?.productName}": receipt shows ${m.actual}, PO has ${m.expected}`;
              if (m.type === 'not_in_receipt') return `"${m.poItem?.productName}" missing from receipt`;
              return 'Unknown mismatch';
            }).join('; ');
            
            throw new Error(`Receipt validation failed: ${errorDetails}`);
          }

          // Return detailed match result for frontend display
          return matchResult;
        } catch (ocrError: any) {
          // If OCR fails, log but don't block - fall back to basic validation
          console.warn('OCR receipt parsing failed:', ocrError.message);
        }
      }

      return true;
    } catch (error: any) {
      throw new Error('Receipt validation failed: ' + (error?.message || String(error)));
    }
  }

  /**
   * Update inventory after goods inspection
   */
  static async updateInventoryFromGoodsReceived(goodsReceivedId: string) {
    try {
      const goodsReceived = await GoodsReceived.findById(goodsReceivedId);
      if (!goodsReceived) throw new Error('Goods received record not found');

      const purchaseOrder = await PurchaseOrder.findById(goodsReceived.purchaseOrderId);
      if (!purchaseOrder) throw new Error('Purchase order not found');

      // Update inventory for each item
      for (const item of goodsReceived.items) {
        if (item.qualityStatus === 'accepted' || item.qualityStatus === 'partial_reject') {
          const acceptedQuantity = item.qualityStatus === 'accepted'
            ? item.quantity
            : item.quantity - (item.rejectedQuantity || 0);

          await InventoryService.updateStock(
            item.inventoryItemId.toString(),
            {
              quantity: acceptedQuantity,
              operation: 'add',
              reason: `Goods received from PO - ${goodsReceived.grNumber}`,
              userId: goodsReceived.receivedBy.toString()
            }
          );

          
        }
      }

      // Update goods received status
      await GoodsReceived.findByIdAndUpdate(goodsReceivedId, {
        status: 'stock_updated',
        updatedAt: new Date()
      });

      // Update PO status to received
      await PurchaseOrder.findByIdAndUpdate(goodsReceived.purchaseOrderId, {
        status: 'received',
        receivedDate: new Date()
      });

      // ✅ ACCOUNTING INTEGRATION: Create purchase transaction when PO is completed
      // This automatically creates journal entries for the purchase
      try {
        await TransactionService.recordPurchaseTransaction(
          purchaseOrder._id.toString(),
          purchaseOrder.poNumber,
          purchaseOrder.totalAmount,
          goodsReceived.receivedBy.toString()
        );
        console.log(`✓ Accounting transaction created for PO ${purchaseOrder.poNumber}`);
      } catch (accountingError: any) {
        // Log the error but don't fail the goods receipt process
        console.error(`⚠ Failed to create accounting transaction: ${accountingError?.message || String(accountingError)}`);
      }

      return goodsReceived;
    } catch (error: any) {
      throw new Error(`Failed to update inventory: ${error?.message || String(error)}`);
    }
  }

  static async getGoodsReceivedRecords(filters: any = {}, page = 1, limit = 50) {
    try {
      const query: any = {};

      if (filters.status) {
        query.status = filters.status;
      }

      if (filters.purchaseOrderId) {
        query.purchaseOrderId = filters.purchaseOrderId;
      }

      const skip = (page - 1) * limit;

      const records = await GoodsReceived
        .find(query)
        .populate('purchaseOrderId', 'poNumber')
        .populate('supplierId', 'name')
        .sort({ receivedDate: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

      const total = await GoodsReceived.countDocuments(query);

      return {
        records,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) }
      };
    } catch (error: any) {
      throw new Error(`Failed to fetch goods received records: ${error?.message || String(error)}`);
    }
  }

  static async getGoodsReceivedById(id: string) {
    try {
      const record = await GoodsReceived
        .findById(id)
        .populate('purchaseOrderId')
        .populate('supplierId')
        .populate('items.inventoryItemId');

      if (!record) throw new Error('Goods received record not found');
      return record;
    } catch (error: any) {
      throw new Error(`Failed to fetch goods received record: ${error?.message || String(error)}`);
    }
  }
}