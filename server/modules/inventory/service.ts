import { InventoryItem, IInventoryItem } from './model';
import { Product } from '../../models/Product';

export interface InventoryFilters {
  category?: string;
  status?: string;
  lowStock?: boolean;
  search?: string;
}

export interface StockUpdateData {
  quantity: number;
  operation: 'add' | 'subtract' | 'set';
  reason?: string;
  userId?: string;
}

export class InventoryService {
  /**
   * Get all inventory items with optional filters
   */
  static async getInventoryItems(filters: InventoryFilters = {}, page = 1, limit = 50) {
    try {
      const query: any = {};

      if (filters.category) {
        query.category = filters.category;
      }

      if (filters.status) {
        query.status = filters.status;
      }

      if (filters.lowStock) {
        query.$expr = { $lte: ['$currentStock', '$minimumStock'] };
      }

      if (filters.search) {
        query.$or = [
          { productName: { $regex: filters.search, $options: 'i' } },
          { sku: { $regex: filters.search, $options: 'i' } }
        ];
      }

      const skip = (page - 1) * limit;

      const items = await InventoryItem
        .find(query)
        .populate('productId', 'name description images')
        .populate('supplierId', 'name contact')
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

      const total = await InventoryItem.countDocuments(query);

      return {
        items,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error: any) {
      throw new Error(`Failed to fetch inventory items: ${error?.message || String(error)}`);
    }
  }

  /**
   * Get inventory item by ID
   */
  static async getInventoryItemById(id: string) {
    try {
      const item = await InventoryItem
        .findById(id)
        .populate('productId')
        .populate('supplierId');

      if (!item) {
        throw new Error('Inventory item not found');
      }

      return item;
    } catch (error: any) {
      throw new Error(`Failed to fetch inventory item: ${error.message}`);
    }
  }

  /**
   * Create new inventory item
   */
  static async createInventoryItem(data: Partial<IInventoryItem>) {
    try {
      // Check if SKU already exists
      const existingItem = await InventoryItem.findOne({ sku: data.sku });
      if (existingItem) {
        throw new Error('SKU already exists');
      }

      // Verify product exists
      if (data.productId) {
        const product = await Product.findById(data.productId);
        if (!product) {
          throw new Error('Product not found');
        }
      }

      const item = new InventoryItem(data);
      await item.save();

      return item;
    } catch (error: any) {
      throw new Error(`Failed to create inventory item: ${error.message}`);
    }
  }

  /**
   * Update inventory item
   */
  static async updateInventoryItem(id: string, data: Partial<IInventoryItem>) {
    try {
      // Check SKU uniqueness if being updated
      if (data.sku) {
        const existingItem = await InventoryItem.findOne({ sku: data.sku, _id: { $ne: id } });
        if (existingItem) {
          throw new Error('SKU already exists');
        }
      }

      const item = await InventoryItem.findByIdAndUpdate(
        id,
        { ...data, updatedAt: new Date() },
        { new: true, runValidators: true }
      ).populate('productId').populate('supplierId');

      if (!item) {
        throw new Error('Inventory item not found');
      }

      return item;
    } catch (error: any) {
      throw new Error(`Failed to update inventory item: ${error.message}`);
    }
  }

  /**
   * Update stock levels
   */
  static async updateStock(id: string, updateData: StockUpdateData) {
    try {
      const item = await InventoryItem.findById(id);
      if (!item) {
        throw new Error('Inventory item not found');
      }

      let newStock: number;

      switch (updateData.operation) {
        case 'add':
          newStock = item.currentStock + updateData.quantity;
          break;
        case 'subtract':
          newStock = Math.max(0, item.currentStock - updateData.quantity);
          break;
        case 'set':
          newStock = Math.max(0, updateData.quantity);
          break;
        default:
          throw new Error('Invalid operation');
      }

      // Update status based on stock level
      let status = item.status;
      if (newStock === 0) {
        status = 'out_of_stock';
      } else if (status === 'out_of_stock') {
        status = 'active';
      }

      const updatedItem = await InventoryItem.findByIdAndUpdate(
        id,
        {
          currentStock: newStock,
          status,
          lastRestockedAt: updateData.operation === 'add' ? new Date() : item.lastRestockedAt,
          updatedAt: new Date()
        },
        { new: true }
      );

      // Log stock movement (you might want to create a separate StockMovement model)
      console.log(`Stock ${updateData.operation}: ${item.sku} - ${updateData.quantity} units. Reason: ${updateData.reason || 'No reason provided'}`);

      return updatedItem;
    } catch (error: any) {
      throw new Error(`Failed to update stock: ${error.message}`);
    }
  }

  /**
   * Delete inventory item
   */
  static async deleteInventoryItem(id: string) {
    try {
      const item = await InventoryItem.findByIdAndDelete(id);

      if (!item) {
        throw new Error('Inventory item not found');
      }

      return item;
    } catch (error: any) {
      throw new Error(`Failed to delete inventory item: ${error.message}`);
    }
  }

  /**
   * Get low stock alerts
   */
  static async getLowStockAlerts() {
    try {
      const lowStockItems = await InventoryItem
        .find({
          $expr: { $lte: ['$currentStock', '$minimumStock'] },
          status: { $ne: 'discontinued' }
        })
        .populate('productId', 'name')
        .sort({ currentStock: 1 })
        .lean();

      return lowStockItems;
    } catch (error: any) {
      throw new Error(`Failed to fetch low stock alerts: ${error.message}`);
    }
  }

  /**
   * Get inventory summary
   */
  static async getInventorySummary() {
    try {
      const summary = await InventoryItem.aggregate([
        {
          $group: {
            _id: null,
            totalItems: { $sum: 1 },
            totalValue: { $sum: { $multiply: ['$currentStock', '$costPrice'] } },
            lowStockItems: {
              $sum: {
                $cond: [{ $lte: ['$currentStock', '$minimumStock'] }, 1, 0]
              }
            },
            outOfStockItems: {
              $sum: {
                $cond: [{ $eq: ['$currentStock', 0] }, 1, 0]
              }
            }
          }
        }
      ]);

      return summary[0] || {
        totalItems: 0,
        totalValue: 0,
        lowStockItems: 0,
        outOfStockItems: 0
      };
    } catch (error: any) {
      throw new Error(`Failed to get inventory summary: ${error.message}`);
    }
  }

  /**
   * Sync inventory with product catalog
   */
  static async syncWithProducts() {
    try {
      const products = await Product.find({ available: true });
      const syncedItems = [];

      for (const product of products) {
        let inventoryItem = await InventoryItem.findOne({ productId: product._id });

        if (!inventoryItem) {
          // Create new inventory item
          inventoryItem = new InventoryItem({
            productId: product._id,
            productName: product.name,
            sku: `AUTO-${product._id.toString().slice(-8).toUpperCase()}`,
            category: product.category,
            currentStock: product.stock || 0,
            minimumStock: 10,
            unit: product.unit || 'pcs',
            location: 'Main Warehouse',
            costPrice: product.price * 0.7, // Assume 30% margin
            sellingPrice: product.price,
            status: product.available ? 'active' : 'discontinued'
          });

          await inventoryItem.save();
          syncedItems.push(inventoryItem);
        } else {
          // Update existing item
          inventoryItem.productName = product.name;
          inventoryItem.category = product.category;
          inventoryItem.sellingPrice = product.price;
          inventoryItem.status = product.available ? 'active' : 'discontinued';
          await inventoryItem.save();
          syncedItems.push(inventoryItem);
        }
      }

      return syncedItems;
    } catch (error: any) {
      throw new Error(`Failed to sync with products: ${error.message}`);
    }
  }
}