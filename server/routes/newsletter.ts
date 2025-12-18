import express from "express";
import { Newsletter } from "../models/Newsletter";
import crypto from "crypto";

const router = express.Router();

// POST /api/newsletter/subscribe - Subscribe to newsletter
router.post("/subscribe", async (req, res) => {
  try {
    const { email, preferences } = req.body;

    // Validate email
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ 
        success: false, 
        message: "Please provide a valid email address" 
      });
    }

    // Check if email already exists
    const existingSubscription = await Newsletter.findOne({ email: email.toLowerCase() });
    
    if (existingSubscription) {
      if (existingSubscription.isActive) {
        return res.status(400).json({ 
          success: false, 
          message: "This email is already subscribed to our newsletter" 
        });
      } else {
        // Reactivate subscription
        existingSubscription.isActive = true;
        existingSubscription.subscribedAt = new Date();
        if (preferences) {
          existingSubscription.preferences = { ...existingSubscription.preferences, ...preferences };
        }
        await existingSubscription.save();
        
        return res.status(200).json({ 
          success: true, 
          message: "Welcome back! You have been re-subscribed to our newsletter" 
        });
      }
    }

    // Create new subscription
    const unsubscribeToken = crypto.randomBytes(32).toString('hex');
    
    const subscription = new Newsletter({
      email: email.toLowerCase(),
      unsubscribeToken,
      preferences: {
        specialOffers: true,
        newProducts: true,
        events: true,
        news: true,
        ...preferences
      }
    });

    await subscription.save();

    // TODO: Send welcome email
    console.log(`Newsletter subscription: ${email} subscribed with token: ${unsubscribeToken}`);

    res.status(201).json({ 
      success: true, 
      message: "Successfully subscribed to our newsletter! Check your email for confirmation." 
    });

  } catch (error) {
    console.error("Newsletter subscription error:", error);
    res.status(500).json({ 
      success: false, 
      message: "An error occurred while subscribing to the newsletter" 
    });
  }
});

// POST /api/newsletter/unsubscribe - Unsubscribe from newsletter
router.post("/unsubscribe", async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid unsubscribe request" 
      });
    }

    const subscription = await Newsletter.findOne({ unsubscribeToken: token });

    if (!subscription) {
      return res.status(404).json({ 
        success: false, 
        message: "Subscription not found" 
      });
    }

    subscription.isActive = false;
    await subscription.save();

    res.status(200).json({ 
      success: true, 
      message: "You have been successfully unsubscribed from our newsletter" 
    });

  } catch (error) {
    console.error("Newsletter unsubscribe error:", error);
    res.status(500).json({ 
      success: false, 
      message: "An error occurred while unsubscribing" 
    });
  }
});

// GET /api/newsletter/status/:email - Check subscription status
router.get("/status/:email", async (req, res) => {
  try {
    const email = req.params.email.toLowerCase();
    
    const subscription = await Newsletter.findOne({ email });

    if (!subscription) {
      return res.status(404).json({ 
        success: false, 
        message: "Email not found in subscription list" 
      });
    }

    res.status(200).json({ 
      success: true, 
      data: {
        email: subscription.email,
        isActive: subscription.isActive,
        subscribedAt: subscription.subscribedAt,
        preferences: subscription.preferences
      }
    });

  } catch (error) {
    console.error("Newsletter status check error:", error);
    res.status(500).json({ 
      success: false, 
      message: "An error occurred while checking subscription status" 
    });
  }
});

// PUT /api/newsletter/preferences - Update subscription preferences
router.put("/preferences", async (req, res) => {
  try {
    const { email, preferences } = req.body;

    if (!email) {
      return res.status(400).json({ 
        success: false, 
        message: "Email is required" 
      });
    }

    const subscription = await Newsletter.findOne({ email: email.toLowerCase() });

    if (!subscription) {
      return res.status(404).json({ 
        success: false, 
        message: "Subscription not found" 
      });
    }

    subscription.preferences = { ...subscription.preferences, ...preferences };
    await subscription.save();

    res.status(200).json({ 
      success: true, 
      message: "Preferences updated successfully",
      data: subscription.preferences
    });

  } catch (error) {
    console.error("Newsletter preferences update error:", error);
    res.status(500).json({ 
      success: false, 
      message: "An error occurred while updating preferences" 
    });
  }
});

export default router;
