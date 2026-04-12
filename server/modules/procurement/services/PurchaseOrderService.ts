import mongoose from 'mongoose';
import { PurchaseOrder } from '../models/PurchaseOrder';
import { PurchaseRequest } from '../models/PurchaseRequest';
import { Supplier } from '../models/Supplier';
import { InventoryItem } from '../../inventory/model';
import { AppError } from '../../shared/errors/AppError';

export class PurchaseOrderService {
  static async createPurchaseOrderFromRequest(
    purchaseRequestId: string,
    supplierId: string,
    createdBy: string,
    additionalData: any
  ) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const request = await PurchaseRequest.findById(purchaseRequestId).session(session);
      if (!request) throw new AppError('Purchase request not found', 404);
      if (request.status !== 'approved') {
        throw new AppError('Purchase request must be approved first', 400);
      }

      const supplier = await Supplier.findById(supplierId).session(session);
      if (!supplier) throw new AppError('Supplier not found', 404);

      // Build PO items with pricing
      const items = [];
      let subtotal = 0;

      for (const reqItem of request.items) {
        const inventoryItem = await InventoryItem.findById(reqItem.inventoryItemId);
        const unitPrice = additionalData.pricing?.[reqItem.sku] || inventoryItem?.costPrice || 0;
        const totalPrice = reqItem.quantity * unitPrice;
        subtotal += totalPrice;

        items.push({
          inventoryItemId: reqItem.inventoryItemId,
          itemName: reqItem.itemName,
          sku: reqItem.sku,
          quantity: reqItem.quantity,
          unit: reqItem.unit,
          unitPrice,
          totalPrice,
        });
      }

      const tax = subtotal * 0.16; // 16% VAT
      const shipping = additionalData.shipping || 0;
      const totalAmount = subtotal + tax + shipping;

      const poData = {
        purchaseRequestId: request._id,
        supplierId: supplier._id,
        items,
        subtotal,
        tax,
        shipping,
        totalAmount,
        expectedDeliveryDate: additionalData.expectedDeliveryDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        createdBy: new mongoose.Types.ObjectId(createdBy),
        notes: additionalData.notes,
        status: 'draft' as const,
      };

      const po = await PurchaseOrder.create([poData], { session });

      // Update request status
      request.status = 'converted';
      await request.save({ session });

      await session.commitTransaction();
      return po[0];
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  static async getPurchaseOrders(
    filters: { status?: string; supplierId?: string },
    page: number = 1,
    limit: number = 50
  ) {
    const query: any = {};
    if (filters.status) query.status = filters.status;
    if (filters.supplierId) query.supplierId = filters.supplierId;

    const skip = (page - 1) * limit;
    const [orders, total] = await Promise.all([
      PurchaseOrder.find(query)
        .populate('supplierId', 'name email')
        .populate('createdBy', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      PurchaseOrder.countDocuments(query),
    ]);

    return {
      orders,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }

  static async getPurchaseOrderById(id: string) {
    const order = await PurchaseOrder.findById(id)
      .populate('supplierId')
      .populate('createdBy', 'name email')
      .populate('purchaseRequestId');
    if (!order) throw new AppError('Purchase order not found', 404);
    return order;
  }

  static async confirmPurchaseOrder(id: string) {
    const order = await PurchaseOrder.findById(id);
    if (!order) throw new AppError('Purchase order not found', 404);
    if (order.status !== 'draft') {
      throw new AppError(`Cannot confirm order with status: ${order.status}`, 400);
    }
    order.status = 'confirmed';
    await order.save();
    return order;
  }

  static async cancelPurchaseOrder(id: string, reason: string) {
    const order = await PurchaseOrder.findById(id);
    if (!order) throw new AppError('Purchase order not found', 404);
    if (['received', 'cancelled'].includes(order.status)) {
      throw new AppError(`Cannot cancel order with status: ${order.status}`, 400);
    }
    order.status = 'cancelled';
    order.cancellationReason = reason;
    await order.save();
    return order;
  }
}