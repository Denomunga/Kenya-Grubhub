import express from 'express';
import { Order } from '../models/Order';
import { Product } from '../models/Product';
import { Sale } from '../models/Sale';
import { z } from 'zod';

const router = express.Router();

// Validation schemas
const OrderSyncSchema = z.object({
  order: z.object({
    id: z.string().uuid(),
    items: z.array(z.object({
      item: z.object({
        id: z.string(),
        name: z.string(),
        price: z.number(),
        category: z.string(),
        image: z.string().optional(),
      }),
      quantity: z.number().int().min(1),
    })),
    total: z.number(),
    user: z.string(),
    userPhone: z.string().optional(),
    status: z.enum(['Pending', 'Preparing', 'Ready', 'Delivered', 'Cancelled']),
    paymentMethod: z.enum(['mpesa', 'cash', 'card']),
    paymentStatus: z.enum(['pending', 'completed', 'failed']),
    location: z.object({
      address: z.string(),
      coordinates: z.object({
        lat: z.number(),
        lng: z.number(),
      }).optional(),
    }).optional(),
    date: z.string().datetime(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  }),
  clientTimestamp: z.string().datetime(),
});

// Sync order with conflict detection
router.post('/orders/sync', async (req, res) => {
  try {
    const validation = OrderSyncSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: 'Invalid order data', details: validation.error });
    }

    const { order, clientTimestamp } = validation.data;

    // Check if order already exists
    const existingOrder = await Order.findOne({ id: order.id });

    if (existingOrder) {
      // Check for conflicts based on timestamps
      const serverTimestamp = new Date(existingOrder.updatedAt);
      const clientTime = new Date(clientTimestamp);

      if (serverTimestamp > clientTime) {
        // Server has newer data, return conflict
        return res.status(409).json({
          conflict: true,
          serverOrder: existingOrder,
          message: 'Server has newer version of this order'
        });
      }
    }

    // Save or update order
    const savedOrder = await Order.findOneAndUpdate(
      { id: order.id },
      {
        ...order,
        synced: true,
        lastSyncAt: new Date(),
      },
      { upsert: true, new: true }
    );

    res.json({ success: true, order: savedOrder });

  } catch (error) {
    console.error('Order sync error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get orders with sync status
router.get('/orders/sync-status', async (_req, res) => {
  try {
    const { since } = _req.query;
    const filter: any = {};
    
    if (since) {
      filter.updatedAt = { $gte: new Date(since as string) };
    }

    const orders = await Order.find(filter).sort({ updatedAt: -1 });
    res.json({ orders });

  } catch (error) {
    console.error('Sync status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Sync payment
router.post('/payments/sync', async (req, res) => {
  try {
    const { orderId, paymentMethod, paymentStatus, transactionId } = req.body;

    // Find and update order payment
    const order = await Order.findOne({ id: orderId });
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Create a sale record for payment tracking
    const saleData = {
      items: order.items.map(item => ({
        productId: item.productId || '',
        name: item.name,
        quantity: item.quantity,
        price: item.price
      })),
      total: order.total,
      subtotal: order.total,
      tax: 0,
      discount: 0,
      status: paymentStatus === 'completed' ? 'Completed' : 'Pending',
      paymentMethod: paymentMethod === 'mpesa' ? 'Mobile Money' : 
                   paymentMethod === 'cash' ? 'Cash' : 'Card',
      paymentAmount: order.total,
      change: 0,
      cashier: 'system',
      customerName: order.user,
      customerPhone: order.userPhone,
      mpesaTransactionId: transactionId,
      mpesaPhoneNumber: order.userPhone,
      mpesaStatus: paymentStatus,
      paymentConfirmedAt: paymentStatus === 'completed' ? new Date() : undefined
    };

    await Sale.findOneAndUpdate(
      { orderId: order.id },
      saleData,
      { upsert: true, new: true }
    );

    res.json({ success: true, order });

  } catch (error) {
    console.error('Payment sync error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get menu items for caching
router.get('/menu', async (_req, res) => {
  try {
    const menuItems = await Product.find({ available: true }).sort({ category: 1, name: 1 });
    res.json(menuItems);

  } catch (error) {
    console.error('Menu fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Health check for offline sync
router.get('/health', async (_req, res) => {
  try {
    // Check database connectivity
    await Order.findOne().limit(1);
    
    res.json({ 
      status: 'healthy',
      timestamp: new Date().toISOString(),
      features: {
        offlineSync: true,
        conflictResolution: true,
        backupSupport: true
      }
    });

  } catch (error) {
    console.error('Health check error:', error);
    res.status(503).json({ 
      status: 'unhealthy',
      error: 'Database connection failed'
    });
  }
});

// Force resync endpoint
router.post('/force-resync', async (req, res) => {
  try {
    const { lastSyncTime } = req.body;
    
    const filter: any = {};
    if (lastSyncTime) {
      filter.updatedAt = { $gte: new Date(lastSyncTime) };
    }

    const [orders, menuItems, sales] = await Promise.all([
      Order.find(filter).sort({ updatedAt: -1 }),
      Product.find({ available: true }).sort({ category: 1, name: 1 }),
      Sale.find(filter).sort({ createdAt: -1 })
    ]);

    res.json({
      success: true,
      data: {
        orders,
        menuItems,
        payments: sales,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Force resync error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
