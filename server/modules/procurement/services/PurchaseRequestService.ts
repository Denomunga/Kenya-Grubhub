import mongoose from 'mongoose';
import { PurchaseRequest } from '../models/PurchaseRequest';
import { AppError } from '../../shared/errors/AppError';
import { InventoryItem } from '../../inventory/model';

export class PurchaseRequestService {
  /**
   * Create a low-stock purchase request automatically triggered by inventory system
   */
  static async createLowStockRequest(
    inventoryItemId: string,
    userId: string,
    priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium'
  ) {
    const item = await InventoryItem.findById(inventoryItemId);
    if (!item) throw new AppError('Inventory item not found', 404);

    // Calculate recommended order quantity (simple EOQ-like formula)
    const reorderQuantity = Math.max(
      item.minimumStock * 2 - item.currentStock,
      1
    );

    const requestData = {
      items: [{
        inventoryItemId: item._id,
        itemName: item.productName,
        sku: item.sku,
        quantity: reorderQuantity,
        unit: item.unit,
        currentStock: item.currentStock,
        reorderPoint: item.minimumStock,
      }],
      priority,
      requestedBy: new mongoose.Types.ObjectId(userId),
      status: 'pending' as const,
    };

    const request = await PurchaseRequest.create(requestData);
    return request;
  }

  static async getPurchaseRequests(
    filters: { status?: string; priority?: string },
    page: number = 1,
    limit: number = 50
  ) {
    const query: any = {};
    if (filters.status) query.status = filters.status;
    if (filters.priority) query.priority = filters.priority;

    const skip = (page - 1) * limit;
    const [requests, total] = await Promise.all([
      PurchaseRequest.find(query)
        .populate('requestedBy', 'name email')
        .populate('approvedBy', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      PurchaseRequest.countDocuments(query),
    ]);

    return {
      requests,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }

  static async approvePurchaseRequest(id: string, approvedBy: string) {
    const request = await PurchaseRequest.findById(id);
    if (!request) throw new AppError('Purchase request not found', 404);
    if (request.status !== 'pending') {
      throw new AppError(`Cannot approve request with status: ${request.status}`, 400);
    }

    request.status = 'approved';
    request.approvedBy = new mongoose.Types.ObjectId(approvedBy);
    await request.save();

    // Could emit event for notification
    return request;
  }

  static async rejectPurchaseRequest(id: string, reason: string, rejectedBy: string) {
    const request = await PurchaseRequest.findById(id);
    if (!request) throw new AppError('Purchase request not found', 404);
    if (request.status !== 'pending') {
      throw new AppError(`Cannot reject request with status: ${request.status}`, 400);
    }

    request.status = 'rejected';
    request.rejectedBy = new mongoose.Types.ObjectId(rejectedBy);
    request.rejectionReason = reason;
    await request.save();

    return request;
  }
}