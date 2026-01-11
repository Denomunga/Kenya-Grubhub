import { Router, Request, Response, NextFunction } from "express";
import { Sale } from "../models/Sale";
import { Product } from "../models/Product";
import { User } from "../models/User";
import { POSSettings } from "../models/POSSettings";
import { Order } from "../models/Order";
import rateLimit from 'express-rate-limit';
import { calculateTotalRevenue } from '../routes';
import MpesaService from '../services/realMpesaService';

const router = Router();

// Rate limiter for API calls
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // requests per windowMs
  message: 'Too many requests, please try again later.',
});

// Auth middleware
const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  try {
    const user = await User.findById(req.session.userId).select("-password");
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }
    req.user = user;
    next();
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// Get all COMPLETED sales (admin only)
router.get("/sales", requireAuth, apiLimiter, async (req, res) => {
  try {
    if (req.user?.role !== "admin" && req.user?.role !== "staff") {
      return res.status(403).json({ message: "Access denied" });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined; // Return all if no limit
    const skip = limit ? (page - 1) * limit : 0;

    const query = Sale.find({ status: 'Completed' })
      .populate('cashier', 'name username')
      .sort({ createdAt: -1 });

    // Only apply pagination if limit is specified
    if (limit !== undefined) {
      query.skip(skip).limit(limit);
    }

    const sales = await query;

    const total = await Sale.countDocuments({ status: 'Completed' });

    res.json({
      sales,
      pagination: limit ? {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      } : {
        page,
        limit: total,
        total,
        pages: 1
      }
    });
  } catch (error) {
    console.error("Error fetching sales:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Create a new sale
router.post("/sales", requireAuth, apiLimiter, async (req, res) => {
  try {
    if (req.user?.role !== "admin" && req.user?.role !== "staff") {
      return res.status(403).json({ message: "Access denied" });
    }

    const {
      items,
      paymentMethod,
      paymentAmount,
      storeLocation,
      customerName,
      customerPhone,
      notes,
      tax = 0,
      discount = 0
    } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "Items are required" });
    }

    if (!paymentMethod || !paymentAmount) {
      return res.status(400).json({ message: "Payment details are required" });
    }

    // Validate and calculate totals
    let subtotal = 0;
    const validatedItems = [];

    for (const item of items) {
      if (!item.productId || !item.quantity || !item.price) {
        return res.status(400).json({ message: "Invalid item data" });
      }

      const product = await Product.findById(item.productId);
      if (!product) {
        return res.status(404).json({ message: `Product ${item.productId} not found` });
      }

      if (!product.available) {
        return res.status(400).json({ message: `Product ${product.name} is not available` });
      }

      if (product.stock !== undefined && product.stock < item.quantity) {
        return res.status(400).json({ message: `Insufficient stock for ${product.name}. Available: ${product.stock}` });
      }

      subtotal += item.quantity * item.price;
      validatedItems.push({
        productId: item.productId,
        name: product.name,
        quantity: item.quantity,
        unit: product.unit,
        price: item.price,
        stock: product.stock
      });
    }

    const total = subtotal + tax - discount;

    if (paymentAmount < total) {
      return res.status(400).json({ message: "Payment amount is less than total" });
    }

    const change = paymentAmount - total;

    // Create the sale
    const sale = new Sale({
      items: validatedItems,
      total,
      subtotal,
      tax,
      discount,
      paymentMethod,
      paymentAmount,
      change,
      storeLocation,
      cashier: req.user._id,
      customerName,
      customerPhone,
      notes,
      status: paymentMethod === 'Mobile Money' ? 'Pending' : 'Completed',
      mpesaStatus: paymentMethod === 'Mobile Money' ? 'pending' : undefined,
      auditLog: [{
        action: 'created',
        user: req.user._id,
        timestamp: new Date(),
        details: { items: validatedItems.length, total, paymentMethod }
      }]
    });

    await sale.save();

    // Update inventory - only for non-M-Pesa payments
    // M-Pesa stock will be deducted when payment is confirmed
    if (paymentMethod !== 'Mobile Money') {
      for (const item of validatedItems) {
        await Product.findByIdAndUpdate(item.productId, {
          $inc: { stock: -item.quantity }
        });
      }
    }

    // Populate cashier info
    await sale.populate('cashier', 'name username');

    // Emit KPIs update for real-time dashboard
    try {
      const totalRevenue = await calculateTotalRevenue();
      const activeOrders = await Order.countDocuments({ status: { $ne: 'Delivered' } });
      const since = new Date(Date.now() - 60_000);
      const opm = await Order.countDocuments({ createdAt: { $gte: since } });
      
      // Emit socket event for real-time updates
      const reqApp = req.app as any;
      reqApp.locals.io?.emit('kpi:update', { totalRevenue, activeOrders, ordersPerMinute: opm });
    } catch (err) {
      console.error('Error emitting KPI update after POS sale:', err);
    }

    // Start M-Pesa payment monitoring if needed
    if (paymentMethod === 'Mobile Money') {
      try {
        const reqApp = req.app as any;
        const mpesaService = new MpesaService(reqApp.locals.io);
        mpesaService.startPaymentMonitoring(sale._id.toString(), total);
      } catch (error) {
        console.error('Error starting M-Pesa monitoring:', error);
      }
    }

    res.status(201).json(sale);
  } catch (error) {
    console.error("Error creating sale:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get sale by ID
router.get("/sales/:id([0-9a-fA-F]{24})", requireAuth, async (req, res) => {
  try {
    if (req.user?.role !== "admin" && req.user?.role !== "staff") {
      return res.status(403).json({ message: "Access denied" });
    }

    const sale = await Sale.findById(req.params.id).populate('cashier', 'name username');
    if (!sale) {
      return res.status(404).json({ message: "Sale not found" });
    }

    res.json(sale);
  } catch (error) {
    console.error("Error fetching sale:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Update sale status (for refunds/cancellations)
router.patch("/sales/:id([0-9a-fA-F]{24})", requireAuth, async (req, res) => {
  try {
    if (req.user?.role !== "admin" && req.user?.role !== "staff") {
      return res.status(403).json({ message: "Access denied" });
    }

    const { status, notes, mpesaStatus } = req.body;

    if (!['Completed', 'Refunded', 'Cancelled', 'Failed'].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const sale = await Sale.findById(req.params.id);
    if (!sale) {
      return res.status(404).json({ message: "Sale not found" });
    }

    // If refunding, restore inventory
    if (status === 'Refunded' && sale.status === 'Completed') {
      for (const item of sale.items) {
        await Product.findByIdAndUpdate(item.productId, {
          $inc: { stock: item.quantity }
        });
      }
    }

    sale.status = status;
    if (notes) sale.notes = notes;
    if (mpesaStatus) sale.mpesaStatus = mpesaStatus;
    
    // For failed payments, clear M-Pesa transaction details
    if (status === 'Failed') {
      sale.mpesaTransactionId = undefined;
      sale.mpesaReceipt = undefined;
      sale.mpesaPhoneNumber = undefined;
      sale.mpesaStatus = 'failed';
    }
    
    // Add audit log
    sale.auditLog.push({
      action: `status_changed_to_${status.toLowerCase()}`,
      user: req.user._id,
      timestamp: new Date(),
      details: { previousStatus: sale.status, newStatus: status, notes }
    });
    
    await sale.save();

    await sale.populate('cashier', 'name username');

    res.json(sale);
  } catch (error) {
    console.error("Error updating sale:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get total revenue from all sales
router.get("/sales/total", requireAuth, async (req, res) => {
  try {
    if (req.user?.role !== "admin" && req.user?.role !== "staff") {
      return res.status(403).json({ message: "Access denied" });
    }

    const [totalRevenue, totalSales, todaySales] = await Promise.all([
      Sale.aggregate([
        { $match: { status: 'Completed' } },
        { $group: { _id: null, total: { $sum: '$total' } } },
        { $project: { total: 1 } }
      ]),
      Sale.countDocuments({ status: 'Completed' }),
      Sale.aggregate([
        { $match: { 
          status: 'Completed',
          createdAt: { 
            $gte: new Date(new Date().setHours(0, 0, 0, 0)) 
          } 
        } },
        { $group: { _id: null, total: { $sum: '$total' } } },
        { $project: { total: 1 } }
      ])
    ]);

    res.json({
      totalRevenue: totalRevenue[0]?.total || 0,
      totalSales,
      todayRevenue: todaySales[0]?.total || 0
    });
  } catch (error) {
    console.error("Error calculating total revenue:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get sales summary/KPIs
router.get("/sales/summary", requireAuth, async (req, res) => {
  try {
    if (req.user?.role !== "admin" && req.user?.role !== "staff") {
      return res.status(403).json({ message: "Access denied" });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [totalSales, todaySales, salesByMethod] = await Promise.all([
      Sale.aggregate([
        { $match: { status: 'Completed' } },
        { $group: { _id: null, total: { $sum: '$total' }, count: { $sum: 1 } } }
      ]),
      Sale.aggregate([
        { $match: { status: 'Completed', createdAt: { $gte: today, $lt: tomorrow } } },
        { $group: { _id: null, total: { $sum: '$total' }, count: { $sum: 1 } } }
      ]),
      Sale.aggregate([
        { $match: { status: 'Completed' } },
        { $group: { _id: '$paymentMethod', total: { $sum: '$total' }, count: { $sum: 1 } } }
      ])
    ]);

    res.json({
      total: totalSales[0] || { total: 0, count: 0 },
      today: todaySales[0] || { total: 0, count: 0 },
      byPaymentMethod: salesByMethod
    });
  } catch (error) {
    console.error("Error fetching sales summary:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get POS settings for user
router.get("/settings", requireAuth, async (req, res) => {
  try {
    let settings = await POSSettings.findOne({ userId: req.user._id });
    if (!settings) {
      settings = new POSSettings({ userId: req.user._id, favorites: [], recentSales: [] });
      await settings.save();
    }
    res.json(settings);
  } catch (error) {
    console.error("Error fetching POS settings:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Update POS settings
router.patch("/settings", requireAuth, async (req, res) => {
  try {
    const { favorites, recentSales } = req.body;
    const settings = await POSSettings.findOneAndUpdate(
      { userId: req.user._id },
      { favorites, recentSales },
      { new: true, upsert: true }
    );
    res.json(settings);
  } catch (error) {
    console.error("Error updating POS settings:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Add to favorites
router.post("/favorites/:productId", requireAuth, async (req, res) => {
  try {
    const settings = await POSSettings.findOneAndUpdate(
      { userId: req.user._id },
      { $addToSet: { favorites: req.params.productId } },
      { new: true, upsert: true }
    );
    res.json(settings);
  } catch (error) {
    console.error("Error adding to favorites:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Remove from favorites
router.delete("/favorites/:productId", requireAuth, async (req, res) => {
  try {
    const settings = await POSSettings.findOneAndUpdate(
      { userId: req.user._id },
      { $pull: { favorites: req.params.productId } },
      { new: true }
    );
    res.json(settings);
  } catch (error) {
    console.error("Error removing from favorites:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Add recent sale
router.post("/recent-sales/:saleId", requireAuth, async (req, res) => {
  try {
    const settings = await POSSettings.findOneAndUpdate(
      { userId: req.user._id },
      {
        $push: {
          recentSales: {
            $each: [{ saleId: req.params.saleId, timestamp: new Date() }],
            $slice: -10 // Keep only last 10
          }
        }
      },
      { new: true, upsert: true }
    );
    res.json(settings);
  } catch (error) {
    console.error("Error adding recent sale:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Search products
router.get("/search", requireAuth, async (req, res) => {
  try {
    const { q, category, brand } = req.query;
    let query: any = { available: true };

    if (q) {
      query.$or = [
        { name: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
        { brand: { $regex: q, $options: 'i' } },
        { tags: { $regex: q, $options: 'i' } }
      ];
    }

    if (category) {
      query.category = category;
    }

    if (brand) {
      query.brand = brand;
    }

    const products = await Product.find(query).limit(50);
    res.json(products);
  } catch (error) {
    console.error("Error searching products:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Daily reports
router.get("/reports/daily", requireAuth, async (req, res) => {
  try {
    if (req.user?.role !== "admin" && req.user?.role !== "staff") {
      return res.status(403).json({ message: "Access denied" });
    }

    const date = req.query.date ? new Date(req.query.date as string) : new Date();
    // Use date string for filtering to avoid timezone issues
    const dateString = date.toISOString().split('T')[0]; // YYYY-MM-DD format
    // Also check last 24 hours as fallback
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [sales, refunds, summary] = await Promise.all([
      Sale.find({
        status: 'Completed',
        $or: [
          {
            $expr: {
              $eq: [
                { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                dateString
              ]
            }
          },
          { createdAt: { $gte: twentyFourHoursAgo } }
        ]
      }).populate('cashier', 'name username'),
      Sale.find({
        status: 'Refunded',
        $or: [
          {
            $expr: {
              $eq: [
                { $dateToString: { format: '%Y-%m-%d', date: '$updatedAt' } },
                dateString
              ]
            }
          },
          { updatedAt: { $gte: twentyFourHoursAgo } }
        ]
      }),
      Sale.aggregate([
        {
          $match: {
            status: 'Completed',
            $or: [
              {
                $expr: {
                  $eq: [
                    { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                    dateString
                  ]
                }
              },
              { createdAt: { $gte: twentyFourHoursAgo } }
            ]
          }
        },
        {
          $group: {
            _id: null,
            totalSales: { $sum: '$total' },
            totalItems: { $sum: { $size: '$items' } },
            averageTransaction: { $avg: '$total' },
            count: { $sum: 1 }
          }
        }
      ])
    ]);

    res.json({
      date: dateString,
      sales,
      refunds,
      summary: summary[0] || { totalSales: 0, totalItems: 0, averageTransaction: 0, count: 0 }
    });
  } catch (error) {
    console.error("Error generating daily report:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Inventory reports
router.get("/reports/inventory", requireAuth, async (req, res) => {
  try {
    if (req.user?.role !== "admin" && req.user?.role !== "staff") {
      return res.status(403).json({ message: "Access denied" });
    }

    const [lowStock, outOfStock, turnover] = await Promise.all([
      Product.find({ stock: { $gt: 0, $lte: 10 }, available: true }),
      Product.find({ stock: 0, available: true }),
      Sale.aggregate([
        { $match: { status: 'Completed' } },
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.productId',
            sold: { $sum: '$items.quantity' },
            revenue: { $sum: { $multiply: ['$items.quantity', '$items.price'] } }
          }
        },
        { $sort: { sold: -1 } },
        { $limit: 20 }
      ])
    ]);

    res.json({
      lowStock,
      outOfStock,
      topSelling: turnover
    });
  } catch (error) {
    console.error("Error generating inventory report:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Customer analytics
router.get("/reports/customers", requireAuth, async (req, res) => {
  try {
    if (req.user?.role !== "admin" && req.user?.role !== "staff") {
      return res.status(403).json({ message: "Access denied" });
    }

    const [customerStats, repeatCustomers] = await Promise.all([
      Sale.aggregate([
        { $match: { status: 'Completed', customerPhone: { $exists: true, $ne: null } } },
        {
          $group: {
            _id: '$customerPhone',
            totalSpent: { $sum: '$total' },
            visitCount: { $sum: 1 },
            lastVisit: { $max: '$createdAt' },
            averageOrder: { $avg: '$total' }
          }
        },
        { $sort: { totalSpent: -1 } },
        { $limit: 50 }
      ]),
      Sale.aggregate([
        { $match: { status: 'Completed', customerPhone: { $exists: true, $ne: null } } },
        {
          $group: {
            _id: '$customerPhone',
            visits: { $sum: 1 }
          }
        },
        { $match: { visits: { $gt: 1 } } },
        { $count: 'repeatCustomers' }
      ])
    ]);

    res.json({
      topCustomers: customerStats,
      repeatCustomerCount: repeatCustomers[0]?.repeatCustomers || 0
    });
  } catch (error) {
    console.error("Error generating customer analytics:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Trend analysis
router.get("/reports/trends", requireAuth, async (req, res) => {
  try {
    if (req.user?.role !== "admin" && req.user?.role !== "staff") {
      return res.status(403).json({ message: "Access denied" });
    }

    const days = parseInt(req.query.days as string) || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [dailySales, categoryTrends, paymentTrends] = await Promise.all([
      Sale.aggregate([
        { $match: { status: 'Completed', createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
            },
            total: { $sum: '$total' },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id': 1 } }
      ]),
      Sale.aggregate([
        { $match: { status: 'Completed', createdAt: { $gte: startDate } } },
        { $unwind: '$items' },
        {
          $lookup: {
            from: 'products',
            localField: 'items.productId',
            foreignField: '_id',
            as: 'product'
          }
        },
        { $unwind: '$product' },
        {
          $group: {
            _id: '$product.category',
            total: { $sum: { $multiply: ['$items.quantity', '$items.price'] } },
            count: { $sum: '$items.quantity' }
          }
        },
        { $sort: { total: -1 } }
      ]),
      Sale.aggregate([
        { $match: { status: 'Completed', createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: '$paymentMethod',
            total: { $sum: '$total' },
            count: { $sum: 1 }
          }
        }
      ])
    ]);

    res.json({
      dailySales,
      categoryTrends,
      paymentTrends
    });
  } catch (error) {
    console.error("Error generating trend analysis:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Trends comparison for real percentage calculations
router.get("/reports/trends-comparison", requireAuth, async (req, res) => {
  try {
    if (req.user?.role !== "admin" && req.user?.role !== "staff") {
      return res.status(403).json({ message: "Access denied" });
    }

    const now = new Date();
    const currentPeriodStart = new Date(now);
    currentPeriodStart.setDate(currentPeriodStart.getDate() - 7); // Last 7 days
    
    const previousPeriodStart = new Date(currentPeriodStart);
    previousPeriodStart.setDate(previousPeriodStart.getDate() - 7); // Previous 7 days
    
    const [currentData, previousData] = await Promise.all([
      // Calculate current period metrics (last 7 days)
      Sale.aggregate([
        { 
          $match: { 
            status: 'Completed', 
            createdAt: { $gte: currentPeriodStart, $lt: now } 
          }
        },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$total' },
            totalOrders: { $sum: 1 },
            totalItems: { $sum: { $size: '$items' } }
          }
        }
      ]),
      // Calculate previous period metrics (previous 7 days)
      Sale.aggregate([
        { 
          $match: { 
            status: 'Completed', 
            createdAt: { $gte: previousPeriodStart, $lt: currentPeriodStart } 
          }
        },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$total' },
            totalOrders: { $sum: 1 },
            totalItems: { $sum: { $size: '$items' } }
          }
        }
      ])
    ]);
    
    const current = currentData[0] || { totalRevenue: 0, totalOrders: 0, totalItems: 0 };
    const previous = previousData[0] || { totalRevenue: 0, totalOrders: 0, totalItems: 0 };
    
    // Calculate percentages
    const calculatePercentage = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / previous) * 100;
    };
    
    res.json({
      current,
      previous,
      percentages: {
        revenue: calculatePercentage(current.totalRevenue, previous.totalRevenue),
        orders: calculatePercentage(current.totalOrders, previous.totalOrders),
        avgOrderValue: calculatePercentage(
          current.totalOrders > 0 ? current.totalRevenue / current.totalOrders : 0,
          previous.totalOrders > 0 ? previous.totalRevenue / previous.totalOrders : 0
        )
      }
    });
  } catch (error) {
    console.error("Error generating trends comparison:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Performance metrics
router.get("/reports/performance", requireAuth, async (req, res) => {
  try {
    if (req.user?.role !== "admin" && req.user?.role !== "staff") {
      return res.status(403).json({ message: "Access denied" });
    }

    const [metrics, staffPerformance] = await Promise.all([
      Sale.aggregate([
        { $match: { status: 'Completed' } },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$total' },
            totalTransactions: { $sum: 1 },
            averageTransactionValue: { $avg: '$total' },
            totalItemsSold: { $sum: { $size: '$items' } }
          }
        }
      ]),
      Sale.aggregate([
        { $match: { status: 'Completed' } },
        {
          $group: {
            _id: '$cashier',
            totalRevenue: { $sum: '$total' },
            transactionCount: { $sum: 1 },
            averageTransaction: { $avg: '$total' }
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'user'
          }
        },
        { $unwind: '$user' },
        {
          $project: {
            name: '$user.name',
            totalRevenue: 1,
            transactionCount: 1,
            averageTransaction: 1
          }
        },
        { $sort: { totalRevenue: -1 } }
      ])
    ]);

    res.json({
      overall: metrics[0] || {
        totalRevenue: 0,
        totalTransactions: 0,
        averageTransactionValue: 0,
        totalItemsSold: 0
      },
      staffPerformance
    });
  } catch (error) {
    console.error("Error generating performance metrics:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Stock Management Endpoints

// Get all products with stock levels
router.get("/stock", requireAuth, apiLimiter, async (req, res) => {
  try {
    if (req.user?.role !== "admin" && req.user?.role !== "staff") {
      return res.status(403).json({ message: "Access denied" });
    }

    const products = await Product.find()
      .select('name price stock unit quantityStep available category brand description condition specifications images image tags size color material year location dimensions weight')
      .sort({ category: 1, name: 1 });

    res.json(products);
  } catch (error) {
    console.error("Error fetching stock levels:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Update stock level
router.patch("/stock/:productId", requireAuth, apiLimiter, async (req, res) => {
  try {
    if (req.user?.role !== "admin") {
      return res.status(403).json({ message: "Only admins can update stock levels" });
    }

    const { productId } = req.params;
    const { stock, operation } = req.body; // operation: 'set' | 'add' | 'subtract'

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    let newStock: number;
    const currentStock = product.stock || 0;

    switch (operation) {
      case 'set':
        newStock = Math.max(0, stock);
        break;
      case 'add':
        newStock = currentStock + Math.max(0, stock);
        break;
      case 'subtract':
        newStock = Math.max(0, currentStock - Math.max(0, stock));
        break;
      default:
        return res.status(400).json({ message: "Invalid operation. Use 'set', 'add', or 'subtract'" });
    }

    // Update product stock and availability
    const updatedProduct = await Product.findByIdAndUpdate(
      productId,
      { 
        stock: newStock,
        available: newStock > 0
      },
      { new: true }
    ).select('name stock available');

    // Log the stock change for audit purposes
    if (updatedProduct) {
      console.log(`Stock updated by ${req.user.username}: Product ${updatedProduct.name} (${productId}) - ${operation} ${stock}, new stock: ${newStock}`);
    }

    res.json({
      message: "Stock updated successfully",
      product: updatedProduct,
      previousStock: currentStock,
      newStock: newStock
    });
  } catch (error) {
    console.error("Error updating stock:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Bulk stock update
router.patch("/stock/bulk", requireAuth, apiLimiter, async (req, res) => {
  try {
    if (req.user?.role !== "admin") {
      return res.status(403).json({ message: "Only admins can update stock levels" });
    }

    const { updates } = req.body; // Array of { productId, stock, operation }

    if (!Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({ message: "Invalid updates array" });
    }

    const results = [];
    
    for (const update of updates) {
      const { productId, stock, operation } = update;
      
      const product = await Product.findById(productId);
      if (!product) {
        results.push({ productId, error: "Product not found" });
        continue;
      }

      let newStock: number;
      const currentStock = product.stock || 0;

      switch (operation) {
        case 'set':
          newStock = Math.max(0, stock);
          break;
        case 'add':
          newStock = currentStock + Math.max(0, stock);
          break;
        case 'subtract':
          newStock = Math.max(0, currentStock - Math.max(0, stock));
          break;
        default:
          results.push({ productId, error: "Invalid operation" });
          continue;
      }

      await Product.findByIdAndUpdate(
        productId,
        { 
          stock: newStock,
          available: newStock > 0
        }
      );

      results.push({
        productId,
        productName: product.name,
        previousStock: currentStock,
        newStock: newStock,
        operation,
        amount: stock
      });
    }

    console.log(`Bulk stock update by ${req.user.username}: ${results.length} products updated`);

    res.json({
      message: "Bulk stock update completed",
      results
    });
  } catch (error) {
    console.error("Error in bulk stock update:", error);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;