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

    // Verify the sale exists
    const sale = await Sale.findById(saleId);
    if (!sale) {
      return res.status(404).json({ message: "Sale not found" });
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

    // Get all sales to show as receipts
    const sales = await Sale.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalSales = await Sale.countDocuments();

    // Get actual printed receipts to merge with sales data
    const printedReceipts = await Receipt.find()
      .populate('saleId', 'receiptNumber total createdAt')
      .sort({ createdAt: -1 });

    // Create a map of printed receipts by saleId for quick lookup
    const printedReceiptsMap = new Map(
      printedReceipts.map(receipt => [receipt.saleId.toString(), receipt])
    );

    // Format all sales as receipt-like objects, merging with printed receipt data if available
    const formattedReceipts = sales.map(sale => {
      const printedReceipt = printedReceiptsMap.get(sale._id.toString());
      
      return {
        _id: printedReceipt?._id || sale._id,
        saleId: sale._id,
        receiptNumber: sale.receiptNumber,
        createdAt: sale.createdAt,
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

    res.json({
      receipts: formattedReceipts,
      pagination: {
        page,
        limit,
        total: totalSales,
        pages: Math.ceil(totalSales / limit)
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

// Create missing receipts for existing sales
router.post("/create-missing", requireAuth, async (req, res) => {
  try {
    if (req.user?.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    // Get all sales
    const allSales = await Sale.find().sort({ createdAt: -1 });
    
    // Get all existing receipts
    const existingReceipts = await Receipt.find();
    
    // Create a Set of sale IDs that already have receipts
    const existingSaleIds = new Set(
      existingReceipts.map(receipt => receipt.saleId)
    );

    // Find sales that don't have receipts
    const salesWithoutReceipts = allSales.filter(sale => 
      !existingSaleIds.has(sale._id.toString())
    );

    console.log(`Found ${salesWithoutReceipts.length} sales without receipts`);

    if (salesWithoutReceipts.length === 0) {
      return res.json({
        message: "All sales already have receipts",
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

    res.json({
      message: `Successfully created ${createdReceipts.length} missing receipts`,
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