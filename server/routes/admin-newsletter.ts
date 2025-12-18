import express from "express";
import { NewsletterService } from "../services/newsletterService";
import { Newsletter } from "../models/Newsletter";

const router = express.Router();

// Admin middleware
const requireAdmin = (req: any, res: express.Response, next: express.NextFunction) => {
  if (!req.user || (req.user.role !== "admin" && req.user.role !== "staff")) {
    return res.status(403).json({ message: "Admin/staff access required" });
  }
  next();
};

// POST /api/admin/newsletter/send - Send newsletter to subscribers
router.post("/send", requireAdmin, async (req, res) => {
  try {
    const { type, subject, content, imageUrl, linkUrl } = req.body;

    // Validate required fields
    if (!type || !subject || !content) {
      return res.status(400).json({ 
        success: false, 
        message: "Type, subject, and content are required" 
      });
    }

    // Validate type
    const validTypes = ['specialOffers', 'newProducts', 'events', 'news'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid notification type" 
      });
    }

    // Send newsletter
    await NewsletterService.sendNotification({
      type,
      subject,
      content,
      imageUrl,
      linkUrl
    });

    res.status(200).json({ 
      success: true, 
      message: "Newsletter sent successfully" 
    });

  } catch (error) {
    console.error("Send newsletter error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to send newsletter" 
    });
  }
});

// GET /api/admin/newsletter/stats - Get newsletter statistics
router.get("/stats", requireAdmin, async (_req, res) => {
  try {
    const totalSubscribers = await NewsletterService.getSubscriberCount();
    const subscribersByPreference = await NewsletterService.getSubscribersByPreference();

    res.status(200).json({ 
      success: true, 
      data: {
        totalSubscribers,
        subscribersByPreference
      }
    });

  } catch (error) {
    console.error("Newsletter stats error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to fetch newsletter statistics" 
    });
  }
});

// GET /api/admin/newsletter/subscribers - Get all subscribers (admin only)
router.get("/subscribers", requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 50, active = true } = req.query;
    
    const subscribers = await Newsletter.find({ 
      isActive: active === 'true' 
    })
    .sort({ subscribedAt: -1 })
    .limit(Number(limit))
    .skip((Number(page) - 1) * Number(limit));

    const total = await Newsletter.countDocuments({ 
      isActive: active === 'true' 
    });

    res.status(200).json({ 
      success: true, 
      data: {
        subscribers,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      }
    });

  } catch (error) {
    console.error("Get subscribers error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to fetch subscribers" 
    });
  }
});

// DELETE /api/admin/newsletter/subscribers/:id - Remove subscriber (admin only)
router.delete("/subscribers/:id", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const subscriber = await Newsletter.findByIdAndDelete(id);

    if (!subscriber) {
      return res.status(404).json({ 
        success: false, 
        message: "Subscriber not found" 
      });
    }

    res.status(200).json({ 
      success: true, 
      message: "Subscriber removed successfully" 
    });

  } catch (error) {
    console.error("Remove subscriber error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to remove subscriber" 
    });
  }
});

export default router;
