import mongoose from 'mongoose';
import { Supplier, ISupplier } from '../models/Supplier';
import { AppError } from '../../shared/errors/AppError';

export class SupplierService {
  static async getSuppliers(
    filters: { status?: string; search?: string },
    page: number = 1,
    limit: number = 50
  ) {
    const query: any = {};
    if (filters.status) query.status = filters.status;
    if (filters.search) {
      query.$or = [
        { name: { $regex: filters.search, $options: 'i' } },
        { email: { $regex: filters.search, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;
    const [suppliers, total] = await Promise.all([
      Supplier.find(query).sort({ name: 1 }).skip(skip).limit(limit),
      Supplier.countDocuments(query),
    ]);

    return {
      suppliers,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }

  static async getSupplierById(id: string) {
    const supplier = await Supplier.findById(id);
    if (!supplier) throw new AppError('Supplier not found', 404);
    return supplier;
  }

  static async createSupplier(data: Partial<ISupplier>) {
    const existing = await Supplier.findOne({ email: data.email });
    if (existing) throw new AppError('Supplier with this email already exists', 409);
    return Supplier.create(data);
  }

  static async updateSupplier(id: string, data: Partial<ISupplier>) {
    const supplier = await Supplier.findByIdAndUpdate(id, data, { new: true, runValidators: true });
    if (!supplier) throw new AppError('Supplier not found', 404);
    return supplier;
  }

  static async deleteSupplier(id: string) {
    // Check if supplier has any POs
    const hasOrders = await mongoose.model('PurchaseOrder').exists({ supplierId: id });
    if (hasOrders) throw new AppError('Cannot delete supplier with existing purchase orders', 400);
    const result = await Supplier.findByIdAndDelete(id);
    if (!result) throw new AppError('Supplier not found', 404);
    return result;
  }
}