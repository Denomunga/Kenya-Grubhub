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

// Get all receipts (admin only)
router.get("/", requireAuth, apiLimiter, async (req, res) => {
  try {
    if (req.user?.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const receipts = await Receipt.find()
      .populate('saleId', 'receiptNumber total createdAt')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Receipt.countDocuments();

    res.json({
      receipts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
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

    const totalReceipts = await Receipt.countDocuments();
    const totalPrints = await Receipt.aggregate([
      { $group: { _id: null, total: { $sum: "$printCount" } } }
    ]);

    const recentReceipts = await Receipt.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('saleId', 'receiptNumber total');

    res.json({
      totalReceipts,
      totalPrints: totalPrints.length > 0 ? totalPrints[0].total : 0,
      recentReceipts
    });
  } catch (error) {
    console.error("Error fetching receipt stats:", error);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;