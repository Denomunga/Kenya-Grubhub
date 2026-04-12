import mongoose from 'mongoose';
import { GoodsReceived } from '../models/GoodsReceived';
import { PurchaseOrder } from '../models/PurchaseOrder';
import { InventoryItem } from '../../inventory/model';
import { AppError } from '../../shared/errors/AppError';

export class GoodsReceivedService {
  static async receiveGoods(
    purchaseOrderId: string,
    items: any[],
    receivedBy: string,
    warehouseLocation?: string
  ) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const po = await PurchaseOrder.findById(purchaseOrderId).session(session);
      if (!po) throw new AppError('Purchase order not found', 404);
      if (!['confirmed', 'shipped', 'partially_received'].includes(po.status)) {
        throw new AppError(`Cannot receive goods for order with status: ${po.status}`, 400);
      }

      // Validate received quantities against ordered
      const receivedItems = items.map(item => {
        const poItem = po.items.find(i => i.sku === item.sku);
        if (!poItem) throw new AppError(`Item ${item.sku} not found in PO`, 400);
        if (item.quantityReceived > poItem.quantity) {
          throw new AppError(`Received quantity exceeds ordered for ${item.sku}`, 400);
        }
        return {
          inventoryItemId: poItem.inventoryItemId,
          itemName: poItem.itemName,
          sku: poItem.sku,
          quantityOrdered: poItem.quantity,
          quantityReceived: item.quantityReceived,
          unit: poItem.unit,
          condition: item.condition || 'good',
          notes: item.notes,
        };
      });

      const grn = await GoodsReceived.create([{
        purchaseOrderId: po._id,
        items: receivedItems,
        receivedBy: new mongoose.Types.ObjectId(receivedBy),
        warehouseLocation,
      }], { session });

      // Update PO status based on received quantities
      const totalOrdered = po.items.reduce((sum, i) => sum + i.quantity, 0);
      const totalReceived = receivedItems.reduce((sum, i) => sum + i.quantityReceived, 0);

      if (totalReceived >= totalOrdered) {
        po.status = 'received';
        po.actualDeliveryDate = new Date();
      } else if (totalReceived > 0) {
        po.status = 'partially_received';
      }
      await po.save({ session });

      await session.commitTransaction();
      return grn[0];
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  static async inspectGoods(
    id: string,
    inspectionNotes: string,
    inspectedBy: string,
    status: 'inspected' | 'on_hold'
  ) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const grn = await GoodsReceived.findById(id).session(session);
      if (!grn) throw new AppError('Goods received record not found', 404);
      if (grn.status !== 'pending_inspection') {
        throw new AppError('Goods already inspected', 400);
      }

      grn.status = status;
      grn.inspectionNotes = inspectionNotes;
      grn.inspectedBy = new mongoose.Types.ObjectId(inspectedBy);
      grn.inspectedAt = new Date();
      await grn.save({ session });

      // If inspected and passed, update inventory
      if (status === 'inspected') {
        for (const item of grn.items) {
          if (item.condition === 'good') {
            await InventoryItem.findByIdAndUpdate(
              item.inventoryItemId,
              { $inc: { currentStock: item.quantityReceived } },
              { session }
            );
          }
          // Could log damaged items separately
        }
      }

      await session.commitTransaction();
      return grn;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  static async getGoodsReceivedRecords(
    filters: { status?: string; purchaseOrderId?: string },
    page: number = 1,
    limit: number = 50
  ) {
    const query: any = {};
    if (filters.status) query.status = filters.status;
    if (filters.purchaseOrderId) query.purchaseOrderId = filters.purchaseOrderId;

    const skip = (page - 1) * limit;
    const [records, total] = await Promise.all([
      GoodsReceived.find(query)
        .populate('purchaseOrderId', 'poNumber')
        .populate('receivedBy', 'name')
        .populate('inspectedBy', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      GoodsReceived.countDocuments(query),
    ]);

    return {
      records,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }

  static async getGoodsReceivedById(id: string) {
    const record = await GoodsReceived.findById(id)
      .populate('purchaseOrderId')
      .populate('receivedBy', 'name email')
      .populate('inspectedBy', 'name');
    if (!record) throw new AppError('Goods received record not found', 404);
    return record;
  }
}