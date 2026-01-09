import { Router, Request, Response } from "express";
import { Receipt } from "../models/Receipt";
import { Sale } from "../models/Sale";
import rateLimit from 'express-rate-limit';

const router = Router();

// Rate limiter for API calls
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // requests per windowMs
  message: 'Too many requests, please try again later.',
});

// Auth middleware
const requireAuth = async (req: Request, res: Response, next: any) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  try {
    const User = (await import("../models/User")).User;
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

// Save a receipt when printed
router.post("/save", requireAuth, apiLimiter, async (req, res) => {
  try {
    if (req.user?.role !== "admin" && req.user?.role !== "staff") {
      return res.status(403).json({ message: "Access denied" });
    }

    const { saleId, receiptData } = req.body;

    if (!saleId || !receiptData) {
      return res.status(400).json({ message: "Sale ID and receipt data are required" });
    }

    // Verify the sale exists and is completed
    const sale = await Sale.findById(saleId);
    if (!sale) {
      return res.status(404).json({ message: "Sale not found" });
    }

    // Only allow receipts for completed sales
    if (sale.status !== 'Completed' && sale.mpesaStatus !== 'completed') {
      return res.status(400).json({ 
        message: "Cannot create receipt for incomplete or failed sale",
        saleStatus: sale.status,
        mpesaStatus: sale.mpesaStatus
      });
    }

    // Check if receipt already exists for this sale
    let receipt = await Receipt.findOne({ saleId });

    if (receipt) {
      // Update existing receipt - increment print count and add print timestamp
      receipt.printCount += 1;
      receipt.printedAt.push(new Date());
      await receipt.save();
    } else {
      // Create new receipt
      receipt = new Receipt({
        saleId,
        receiptNumber: sale.receiptNumber,
        receiptData: {
          ...receiptData,
          cashier: {
            name: req.user.name,
            username: req.user.username
          }
        }
      });
      await receipt.save();
    }

    res.status(201).json({
      message: "Receipt saved successfully",
      receipt: {
        id: receipt._id,
        receiptNumber: receipt.receiptNumber,
        printCount: receipt.printCount,
        lastPrinted: receipt.printedAt[receipt.printedAt.length - 1]
      }
    });
  } catch (error) {
    console.error("Error saving receipt:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get receipt by sale ID
router.get("/sale/:saleId", requireAuth, async (req, res) => {
  try {
    if (req.user?.role !== "admin" && req.user?.role !== "staff") {
      return res.status(403).json({ message: "Access denied" });
    }

    const receipt = await Receipt.findOne({ saleId: req.params.saleId });
    if (!receipt) {
      return res.status(404).json({ message: "Receipt not found" });
    }

    res.json(receipt);
  } catch (error) {
    console.error("Error fetching receipt:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get all receipts (admin and staff)
router.get("/", requireAuth, apiLimiter, async (req, res) => {
  try {
    if (req.user?.role !== "admin" && req.user?.role !== "staff") {
      return res.status(403).json({ message: "Access denied" });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    // Get all COMPLETED sales to show as receipts
    const sales = await Sale.find({ status: 'Completed' })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalSales = await Sale.countDocuments({ status: 'Completed' });

    // Get all orders to show as receipts too (excluding cancelled orders)
    const { Order } = await import("../models/Order");
    const orders: any[] = await Order.find({ status: { $ne: 'Cancelled' } })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalOrders = await Order.countDocuments({ status: { $ne: 'Cancelled' } });

    // Get actual printed receipts to merge with sales/order data
    const printedReceipts = await Receipt.find()
      .sort({ createdAt: -1 });

    // Create a map of printed receipts by saleId for quick lookup
    const printedReceiptsMap = new Map(
      printedReceipts.map(receipt => [receipt.saleId.toString(), receipt])
    );

    // Format all sales as receipt-like objects
    const salesReceipts = sales.map(sale => {
      const printedReceipt = printedReceiptsMap.get(sale._id.toString());
      
      return {
        _id: printedReceipt?._id || sale._id,
        saleId: sale._id,
        receiptNumber: sale.receiptNumber,
        createdAt: sale.createdAt,
        type: 'POS',
        receiptData: {
          items: sale.items,
          subtotal: sale.subtotal,
          tax: sale.tax,
          discount: sale.discount,
          total: sale.total,
          paymentMethod: sale.paymentMethod,
          paymentAmount: sale.paymentAmount,
          change: sale.change,
          customerName: sale.customerName,
          customerPhone: sale.customerPhone,
          cashier: sale.cashier,
          storeLocation: sale.storeLocation
        },
        printCount: printedReceipt?.printCount || 0,
        printedAt: printedReceipt?.printedAt || []
      };
    });

    // Format all orders as receipt-like objects
    const orderReceipts = orders.map(order => {
      const printedReceipt = printedReceiptsMap.get(order._id.toString());
      
      return {
        _id: printedReceipt?._id || order._id,
        saleId: order._id,
        receiptNumber: printedReceipt?.receiptNumber || `ORD-${order._id.toString().slice(-6)}`,
        createdAt: order.createdAt,
        type: 'Order',
        status: order.status,
        receiptData: {
          items: order.items,
          subtotal: order.total,
          tax: 0,
          discount: 0,
          total: order.total,
          paymentMethod: 'Website Order',
          paymentAmount: order.total,
          change: 0,
          customerName: order.user,
          customerPhone: order.userPhone,
          cashier: {
            name: 'Website Order',
            username: 'website'
          },
          storeLocation: order.location?.address || 'Online Order'
        },
        printCount: printedReceipt?.printCount || 0,
        printedAt: printedReceipt?.printedAt || []
      };
    });

    // Combine and sort all receipts by date
    const allReceipts = [...salesReceipts, ...orderReceipts].sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    // Apply pagination to combined results
    const paginatedReceipts = allReceipts.slice(skip, skip + limit);

    res.json({
      receipts: paginatedReceipts,
      pagination: {
        page,
        limit,
        total: totalSales + totalOrders,
        pages: Math.ceil((totalSales + totalOrders) / limit)
      }
    });
  } catch (error) {
    console.error("Error fetching receipts:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get receipt statistics
router.get("/stats", requireAuth, async (req, res) => {
  try {
    if (req.user?.role !== "admin" && req.user?.role !== "staff") {
      return res.status(403).json({ message: "Access denied" });
    }

    const [totalReceipts, totalPrints, recentReceipts, salesData] = await Promise.all([
      Receipt.countDocuments(),
      Receipt.aggregate([
        { $group: { _id: null, total: { $sum: "$printCount" } } }
      ]),
      Receipt.find()
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('saleId', 'receiptNumber total'),
      Sale.aggregate([
        { $match: { status: 'Completed' } },
        {
          $group: {
            _id: null,
            totalSalesRevenue: { $sum: "$total" },
            totalSalesCount: { $sum: 1 },
            averageSaleAmount: { $avg: "$total" }
          }
        }
      ])
    ]);

    // Use sales data for more accurate revenue and stats
    const salesStats = salesData.length > 0 ? salesData[0] : { totalSalesRevenue: 0, totalSalesCount: 0, averageSaleAmount: 0 };

    res.json({
      totalReceipts: salesStats.totalSalesCount, // Total sales instead of just printed receipts
      totalPrints: totalPrints.length > 0 ? totalPrints[0].total : 0,
      totalRevenue: salesStats.totalSalesRevenue, // Total sales revenue
      averageSale: salesStats.averageSaleAmount, // Average from all sales
      printedReceipts: totalReceipts, // Number of actually printed receipts
      recentReceipts
    });
  } catch (error) {
    console.error("Error fetching receipt stats:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Create missing receipts for existing sales and orders
router.post("/create-missing", requireAuth, async (req, res) => {
  try {
    if (req.user?.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    // Get all COMPLETED sales and orders (excluding cancelled orders)
    const [allSales, allOrders] = await Promise.all([
      Sale.find({ status: 'Completed' }).sort({ createdAt: -1 }),
      (await import("../models/Order")).Order.find({ status: { $ne: 'Cancelled' } }).sort({ createdAt: -1 })
    ]);
    
    // Get all existing receipts
    const existingReceipts = await Receipt.find();
    
    // Create a Set of sale/order IDs that already have receipts
    const existingSaleIds = new Set(
      existingReceipts.map(receipt => receipt.saleId)
    );

    // Find completed sales that don't have receipts
    const salesWithoutReceipts = allSales.filter(sale => 
      !existingSaleIds.has(sale._id.toString())
    );

    // Find orders that don't have receipts
    const ordersWithoutReceipts = allOrders.filter(order => 
      !existingSaleIds.has(order._id.toString())
    );

    console.log(`Found ${salesWithoutReceipts.length} sales and ${ordersWithoutReceipts.length} orders without receipts`);

    if (salesWithoutReceipts.length === 0 && ordersWithoutReceipts.length === 0) {
      return res.json({
        message: "All sales and orders already have receipts",
        created: 0
      });
    }

    // Create receipts for missing sales
    const createdReceipts = [];
    for (const sale of salesWithoutReceipts) {
      try {
        const receipt = new Receipt({
          saleId: sale._id.toString(),
          receiptNumber: sale.receiptNumber,
          receiptData: {
            items: sale.items,
            subtotal: sale.subtotal,
            tax: sale.tax,
            discount: sale.discount,
            total: sale.total,
            paymentMethod: sale.paymentMethod,
            paymentAmount: sale.paymentAmount,
            change: sale.change,
            customerName: sale.customerName,
            customerPhone: sale.customerPhone,
            cashier: sale.cashier,
            storeLocation: sale.storeLocation
          },
          printCount: 0,
          printedAt: []
        });

        await receipt.save();
        createdReceipts.push(receipt);
      } catch (error) {
        console.error(`Failed to create receipt for sale ${sale.receiptNumber}:`, error instanceof Error ? error.message : String(error));
      }
    }

    // Create receipts for missing orders
    for (const order of ordersWithoutReceipts) {
      try {
        const receiptNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
        const receipt = new Receipt({
          saleId: order._id.toString(),
          receiptNumber,
          receiptData: {
            items: order.items,
            subtotal: order.total,
            tax: 0,
            discount: 0,
            total: order.total,
            paymentMethod: 'Website Order',
            paymentAmount: order.total,
            change: 0,
            customerName: order.user,
            customerPhone: order.userPhone,
            cashier: {
              name: 'Website Order',
              username: 'website'
            },
            storeLocation: order.location?.address || 'Online Order'
          },
          printCount: 0,
          printedAt: []
        });

        await receipt.save();
        createdReceipts.push(receipt);
      } catch (error) {
        console.error(`Failed to create receipt for order ${order._id}:`, error instanceof Error ? error.message : String(error));
      }
    }

    res.json({
      message: `Successfully created ${createdReceipts.length} missing receipts (${salesWithoutReceipts.length} sales, ${ordersWithoutReceipts.length} orders)`,
      created: createdReceipts.length,
      receipts: createdReceipts.map(r => ({
        receiptNumber: r.receiptNumber,
        createdAt: r.createdAt
      }))
    });

  } catch (error) {
    console.error("Error creating missing receipts:", error);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;