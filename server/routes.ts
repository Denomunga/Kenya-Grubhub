import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import fs from "fs";
import { resolve } from "node:path";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import nodemailer from "nodemailer";
import { body, validationResult } from "express-validator";
import { User } from "./models/User";
import { UserAudit } from "./models/UserAudit";
import { ChatMessage } from "./models/ChatMessage";
import { Review } from "./models/Review";
import { ReviewAudit } from "./models/ReviewAudit";
import { Product } from "./models/Product";
import { News } from "./models/News";
import { Order } from "./models/Order";
import mongoose from "mongoose";
import { NewsAudit } from "./models/NewsAudit";
import session from "express-session";
import MongoStore from "connect-mongo";
import newsletterRoutes from "./routes/newsletter";
import adminNewsletterRoutes from "./routes/admin-newsletter";
import { verifyEmail } from "./services/emailVerification";

import cors from "cors";

declare module "express-session" {
  interface SessionData {
    userId?: string;
  }
}

// Remove the unused import
// import connectPgSimple from "connect-pg-simple";

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // CORS configuration - MUST come before session middleware
  app.use(cors({
    origin: function(origin, callback) {
      const allowedOrigins = process.env.NODE_ENV === 'production' 
        ? [
            process.env.CORS_ORIGIN || 
            process.env.FRONTEND_URL || 
            'https://kenya-grubhub-gx7x.vercel.app',
            /^https:\/\/kenya-grubhub-gx7x.*\.vercel\.app$/,
            /^https:\/\/.*\.onrender\.com$/ // Allow Render URLs
          ]
        : ['http://localhost:5173', 'http://localhost:3000'];
      
      // Allow requests with no origin (mobile apps, curl, etc.)
      if (!origin) return callback(null, true);
      
      for (const allowed of allowedOrigins) {
        if (typeof allowed === 'string' && origin === allowed) {
          return callback(null, true);
        }
        if (allowed instanceof RegExp && allowed.test(origin)) {
          return callback(null, true);
        }
      }
      
      console.log(`CORS blocking origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
    exposedHeaders: ['Set-Cookie']
  }));

  console.log('CORS configured for origin:', process.env.FRONTEND_URL || 'http://localhost:3000');

  // Session setup with secure MongoDB storage
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "kenyan-bistro-secret-key-change-in-production",
      resave: false,
      saveUninitialized: false,
      store: MongoStore.create({
        mongoUrl: process.env.MONGODB_URI!,
        collectionName: 'sessions',
        ttl: 7 * 24 * 60 * 60, // 7 days
        autoRemove: 'native',
        touchAfter: 24 * 3600, // Only update session once per day
        crypto: {
          secret: process.env.SESSION_CRYPTO_SECRET || process.env.SESSION_SECRET || "crypto-secret-change-in-production"
        }
      }),
      cookie: {
        secure: process.env.NODE_ENV === 'production', // Only require HTTPS in production
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
        sameSite: 'none', // MUST be 'none' for cross-origin requests in production
        path: '/',
        // Don't set domain explicitly - let browser handle it
      },
      name: 'kenya-grubhub-session', // Explicit session name
      proxy: true, // Trust proxy for secure cookies behind load balancer
    })
  );

  // Auth middleware - Fix the types here
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

  // Register route - Fix parameter types
  app.post(
    "/api/auth/register",
    [
      body("username").trim().isLength({ min: 2 }).withMessage("Username must be at least 2 characters"),
      body("email").isEmail().normalizeEmail().withMessage("Valid email is required"),
      body("password").isLength({ min: 8 }).withMessage("Password must be at least 8 characters")
        .matches(/[A-Z]/).withMessage("Password must contain at least one uppercase letter")
        .matches(/[a-z]/).withMessage("Password must contain at least one lowercase letter")
        .matches(/\d/).withMessage("Password must contain at least one number"),
      body("name").trim().notEmpty().withMessage("Name is required"),
      body("phone").trim().isLength({ min: 7 }).withMessage("Phone is required and must be valid"),
    ],
    async (req: Request, res: Response) => {
      console.log('Register request body:', req.body);
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.log('Validation errors:', errors.array());
        return res.status(400).json({ errors: errors.array() });
      }

      try {
        const { username, email, password, name, phone } = req.body;
        console.log('Extracted values:', { username, email, name, phone });

        // Additional password strength validation
        const strongPasswordRegex = /(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}/;
        if (!strongPasswordRegex.test(password)) {
          return res.status(400).json({ 
            message: "Password must be at least 8 characters and include uppercase, lowercase, and number" 
          });
        }

        // Verify email is real and deliverable
        // Temporarily disabled for testing
        // const emailVerification = await verifyEmail(email);
        // if (!emailVerification.isValid) {
        //   return res.status(400).json({ 
        //     message: emailVerification.message 
        //   });
        // }

        // Check if user exists
        const existingUser = await User.findOne({ 
          $or: [{ username }, { email }] 
        });
        
        if (existingUser) {
          return res.status(400).json({ 
            message: existingUser.username === username 
              ? "Username already taken" 
              : "Email already registered" 
          });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        const user = await User.create({
          username,
          email,
          password: hashedPassword,
          name,
          phone,
          role: "user",
        });

        // Set session
        req.session.userId = user._id.toString();
        
        // Explicitly save session to MongoDB with proper error handling
        req.session.save((err) => {
          if (err) {
            console.error('Session save error:', err);
            return res.status(500).json({ message: "Session save failed" });
          }
          
          console.log('Session saved successfully');
          
          // Return user without password
          const userResponse = {
            id: user._id.toString(),
            username: user.username,
            email: user.email,
            name: user.name,
            phone: user.phone,
            role: user.role,
            jobTitle: user.jobTitle,
            avatar: user.avatar,
            lastSessionInvalidatedAt: user.lastSessionInvalidatedAt ? user.lastSessionInvalidatedAt.toISOString() : undefined,
          };

          res.status(201).json({ user: userResponse });
        });
      } catch (error: any) {
        console.error("Register error:", error);
        res.status(500).json({ message: "Server error during registration" });
      }
    }
  );

  // Login route - Fix parameter types
  app.post(
    "/api/auth/login",
    [
      body("username").trim().notEmpty().withMessage("Username is required"),
      body("password").notEmpty().withMessage("Password is required"),
    ],
    async (req: Request, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      try {
        const { username, password } = req.body;

        const user = await User.findOne({ username });
        if (!user) {
          return res.status(401).json({ message: "Invalid credentials" });
        }

        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
          return res.status(401).json({ message: "Invalid credentials" });
        }

        req.session.userId = user._id.toString();
        
        // Explicitly save session to MongoDB
        req.session.save((err) => {
          if (err) {
            console.error('Session save error:', err);
            return res.status(500).json({ message: "Session save failed" });
          }
          
          console.log('Login session saved successfully');
          console.log('Session ID after save:', req.sessionID);
          console.log('Session data after save:', { userId: req.session?.userId });
          
          const userResponse = {
            id: user._id.toString(),
            username: user.username,
            email: user.email,
            name: user.name,
            role: user.role,
            jobTitle: user.jobTitle,
            avatar: user.avatar,
            lastSessionInvalidatedAt: user.lastSessionInvalidatedAt ? user.lastSessionInvalidatedAt.toISOString() : undefined,
          };

          res.json({ user: userResponse });
        });
      } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ message: "Server error during login" });
      }
    }
  );

  // Logout route - Fix parameter types
  app.post("/api/auth/logout", (req: Request, res: Response) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  // Get current user - Fix parameter types
  app.get("/api/auth/me", requireAuth, async (req: Request, res: Response) => {
    const userResponse = {
      id: req.user!._id.toString(),
      username: req.user!.username,
      email: req.user!.email,
      name: req.user!.name,
      phone: req.user!.phone,
      phoneVerified: req.user!.phoneVerified,
      role: req.user!.role,
      jobTitle: req.user!.jobTitle,
      avatar: req.user!.avatar,
      lastSessionInvalidatedAt: req.user!.lastSessionInvalidatedAt ? req.user!.lastSessionInvalidatedAt.toISOString() : undefined,
      pendingPhone: req.user!.pendingPhone,
    };
    res.json({ user: userResponse });
  });

  // Update profile - Fix parameter types
  app.patch("/api/auth/profile", requireAuth, async (req: Request, res: Response) => {
    try {
      const { name, email, avatar } = req.body;
      // Prevent normal users from changing their email address via this route
      if (email && req.user!.role !== 'admin') {
        return res.status(403).json({ message: 'Email changes require admin privileges' });
      }
      // Prevent normal users from changing their phone via direct profile PATCH
      if ((req.body as any).phone && req.user!.role !== 'admin') {
        return res.status(403).json({ message: 'Phone changes require email confirmation' });
      }
      const updates: any = {};
      
      if (name) updates.name = name;
      if (email) updates.email = email;
      if (avatar !== undefined) updates.avatar = avatar;

      const user = await User.findByIdAndUpdate(
        req.user!._id,
        updates,
        { new: true }
      ).select("-password");

      const userResponse = {
        id: user!._id.toString(),
        username: user!.username,
        email: user!.email,
        name: user!.name,
        role: user!.role,
        jobTitle: user!.jobTitle,
        avatar: user!.avatar,
        lastSessionInvalidatedAt: user!.lastSessionInvalidatedAt ? user!.lastSessionInvalidatedAt.toISOString() : undefined,
      };

      res.json({ user: userResponse });
    } catch (error) {
      console.error("Profile update error:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // Request a password change — generate a token and email a confirmation link to user
  app.post("/api/auth/password-change-request", requireAuth, async (req: Request, res: Response) => {
    try {
      const token = randomBytes(24).toString('hex');
      const expires = new Date(Date.now() + 1000 * 60 * 60); // 1 hour

      await User.findByIdAndUpdate(req.user!._id, {
        pendingPasswordToken: token,
        pendingPasswordExpires: expires,
      });

      const frontend = process.env.FRONTEND_URL || `${req.protocol}://${req.get('host')}`;
      const confirmLink = `${frontend}/auth/confirm-password?token=${token}`;

      const smtpHost = process.env.SMTP_HOST;
      if (smtpHost) {
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: Number(process.env.SMTP_PORT || 587),
          secure: !!process.env.SMTP_SECURE,
          auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
        });

        await transporter.sendMail({
          from: process.env.SMTP_FROM || 'no-reply@kenyanbistro.local',
          to: req.user!.email,
          subject: 'Confirm your password change',
          text: `Click the link to set your new password: ${confirmLink}`,
          html: `<p>Click the link to set your new password:</p><p><a href="${confirmLink}">${confirmLink}</a></p>`,
        });
      } else {
        console.log(`Password change confirmation link for ${req.user!.email}: ${confirmLink}`);
      }

      res.json({ success: true });
    } catch (err) {
      console.error('Password change request error:', err);
      res.status(500).json({ message: 'Failed to request password change' });
    }
  });

  // Confirm password reset using token (no auth required) — set a new password
  app.post('/api/auth/password-reset', async (req: Request, res: Response) => {
    try {
      const token = req.body.token || req.query.token;
      const newPassword = req.body.newPassword;
      if (!token || !newPassword) return res.status(400).json({ message: 'Token and newPassword are required' });

      // Basic server-side strength check
      const strong = /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{12,}/;
      if (!strong.test(newPassword)) {
        return res.status(400).json({ message: 'Password must be at least 12 characters and include uppercase, lowercase, number and symbol.' });
      }

      // Find user with matching pending token and not expired
      const user = await User.findOne({ pendingPasswordToken: token, pendingPasswordExpires: { $gt: new Date() } });
      if (!user) return res.status(404).json({ message: 'Invalid or expired token' });

      // Set new password
      const hashed = await bcrypt.hash(newPassword, 10);
      user.password = hashed;
      user.pendingPasswordHash = undefined as any;
      user.pendingPasswordToken = undefined as any;
      user.pendingPasswordExpires = undefined as any;
      // mark when sessions were last invalidated; clients use this field to detect and notify
      user.lastSessionInvalidatedAt = new Date();
      await user.save();

      // Invalidate all sessions for this user
      try {
        const store: any = (req as any).sessionStore;
        if (store && typeof store.all === 'function') {
          store.all((err: any, sessions: Record<string, any>) => {
            if (err) {
              console.warn('Failed to list sessions for invalidation', err);
              return;
            }
            Object.keys(sessions).forEach(sid => {
              const s = sessions[sid];
              // memorystore stores serialized session objects; session.userId may be in s.userId or s?.userId
              try {
                const userId = s?.userId || (s && s.session && s.session.userId);
                if (userId && userId === user._id.toString()) {
                  store.destroy(sid, () => {});
                }
              } catch (e) {
                // ignore parse issues
              }
            });
          });
        }
      } catch (e) {
        console.warn('Session invalidation failed', e);
      }

      // Send notification email about password change
      try {
        const smtpHost = process.env.SMTP_HOST;
        const msg = `Your account password was changed and all existing sessions were logged out. If you did not perform this action, contact support immediately.`;
        if (smtpHost) {
          const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: Number(process.env.SMTP_PORT || 587),
            secure: !!process.env.SMTP_SECURE,
            auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
          });
          await transporter.sendMail({ from: process.env.SMTP_FROM || 'no-reply@kenyanbistro.local', to: user.email, subject: 'Password changed', text: msg });
        } else {
          console.log(`Password changed by user ${user.email} — notification: ${msg}`);
        }
      } catch (e) {
        console.warn('Failed to send password change notification', e);
      }

      res.json({ success: true });
    } catch (err) {
      console.error('Password reset confirm error:', err);
      res.status(500).json({ message: 'Failed to confirm password reset' });
    }
  });

  // Request a phone number change — send email confirmation with a token
  app.post('/api/auth/phone-change-request', requireAuth, async (req: Request, res: Response) => {
    try {
      const { newPhone } = req.body;
      if (!newPhone || typeof newPhone !== 'string' || newPhone.trim().length < 7) return res.status(400).json({ message: 'A valid newPhone is required' });

      const token = randomBytes(24).toString('hex');
      const expires = new Date(Date.now() + 1000 * 60 * 60); // 1 hour

      await User.findByIdAndUpdate(req.user!._id, { pendingPhone: newPhone.trim(), pendingPhoneToken: token, pendingPhoneExpires: expires });

      const frontend = process.env.FRONTEND_URL || `${req.protocol}://${req.get('host')}`;
      const confirmLink = `${frontend}/auth/confirm-phone?token=${token}`;

      // Send email
      const smtpHost = process.env.SMTP_HOST;
      if (smtpHost) {
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: Number(process.env.SMTP_PORT || 587),
          secure: !!process.env.SMTP_SECURE,
          auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
        });

        await transporter.sendMail({
          from: process.env.SMTP_FROM || 'no-reply@kenyanbistro.local',
          to: req.user!.email,
          subject: 'Confirm your phone change',
          text: `Click the link to confirm your new phone number: ${confirmLink}`,
          html: `<p>Click the link to confirm your new phone number:</p><p><a href="${confirmLink}">${confirmLink}</a></p>`,
        });
      } else {
        console.log(`Phone change confirmation link for ${req.user!.email}: ${confirmLink}`);
      }

      res.json({ success: true });
    } catch (err) {
      console.error('Phone change request error:', err);
      res.status(500).json({ message: 'Failed to request phone change' });
    }
  });

  // Confirm phone change using token (no auth required)
  app.post('/api/auth/phone-confirm', async (req: Request, res: Response) => {
    try {
      const token = req.body.token || req.query.token;
      if (!token) return res.status(400).json({ message: 'Token is required' });

      const user = await User.findOne({ pendingPhoneToken: token, pendingPhoneExpires: { $gt: new Date() } });
      if (!user) return res.status(404).json({ message: 'Invalid or expired token' });

      user.phone = user.pendingPhone as any;
      user.phoneVerified = true;
      user.pendingPhone = undefined as any;
      user.pendingPhoneToken = undefined as any;
      user.pendingPhoneExpires = undefined as any;
      await user.save();

      // Audit phone confirmation
      const ua = await UserAudit.create({ userId: user._id.toString(), action: 'phone_confirmed', byId: user._id.toString(), byName: user.name, newValue: user.phone });
      try { (app as any).locals.io?.emit('audit:user', ua); } catch (err) {}

      // Send notification email about phone change
      try {
        const smtpHost = process.env.SMTP_HOST;
        const msg = `Your phone number was updated.`;
        if (smtpHost) {
          const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: Number(process.env.SMTP_PORT || 587),
            secure: !!process.env.SMTP_SECURE,
            auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
          });
          await transporter.sendMail({ from: process.env.SMTP_FROM || 'no-reply@kenyanbistro.local', to: user.email, subject: 'Phone changed', text: msg });
        } else {
          console.log(`Phone changed for user ${user.email} — notification: ${msg}`);
        }
      } catch (e) {
        console.warn('Failed to send phone change notification', e);
      }

      res.json({ success: true });
    } catch (err) {
      console.error('Phone confirm error:', err);
      res.status(500).json({ message: 'Failed to confirm phone change' });
    }
  });

  // Get all users (Admin only) - Fix parameter types
  app.get("/api/users", requireAuth, async (req: Request, res: Response) => {
    if (req.user!.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const users = await User.find().select("-password");
      const usersResponse = users.map(u => ({
        id: u._id.toString(),
        username: u.username,
        email: u.email,
        name: u.name,
        role: u.role,
        jobTitle: u.jobTitle,
        avatar: u.avatar,
        phone: u.phone,
        phoneVerified: u.phoneVerified,
      }));
      res.json({ users: usersResponse });
    } catch (error) {
      console.error("Get users error:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Update user role (Admin only) - Fix parameter types
  app.patch("/api/users/:userId/role", requireAuth, async (req: Request, res: Response) => {
    if (req.user!.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const { userId } = req.params;
      const { role, jobTitle } = req.body;

      const user = await User.findByIdAndUpdate(
        userId,
        { role, jobTitle },
        { new: true }
      ).select("-password");

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const userResponse = {
        id: user._id.toString(),
        username: user.username,
        email: user.email,
        name: user.name,
        role: user.role,
        jobTitle: user.jobTitle,
        avatar: user.avatar,
      };

      res.json({ user: userResponse });
    } catch (error) {
      console.error("Update role error:", error);
      res.status(500).json({ message: "Failed to update role" });
    }
  });

  // Admin: change a user's phone directly with audit
  app.patch('/api/users/:userId/phone', requireAuth, async (req: Request, res: Response) => {
    if (!req.user || req.user.role !== 'admin') return res.status(403).json({ message: 'Admin access required' });
    try {
      const { userId } = req.params;
      const { phone, reason, note, verify } = req.body as any;
      if (!phone || typeof phone !== 'string' || phone.trim().length < 7) return res.status(400).json({ message: 'A valid phone is required' });

      // Check unique constraint manually to return nicer error
      const existing = await User.findOne({ phone });
      if (existing && existing._id.toString() !== userId) {
        return res.status(400).json({ message: 'Phone number already associated with another user' });
      }

      const target = await User.findById(userId);
      if (!target) return res.status(404).json({ message: 'User not found' });

      const prevPhone = target.phone;
      target.phone = phone.trim();
      // If admin chooses verify, set phoneVerified true
      if (verify) target.phoneVerified = true;
      await target.save();

      const ua = await UserAudit.create({ userId: target._id.toString(), action: 'phone_changed', byId: req.user!._id.toString(), byName: req.user!.name, newValue: phone.trim(), reason, note });
      try { (app as any).locals.io?.emit('audit:user', ua); } catch (err) {}

      res.json({ user: { id: target._id.toString(), phone: target.phone, phoneVerified: target.phoneVerified, prevPhone } });
    } catch (err) {
      console.error('Admin change phone error:', err);
      res.status(500).json({ message: 'Failed to change phone' });
    }
  });

  // Admin: verify a user's phone without changing it (adds audit)
  app.post('/api/users/:userId/phone/verify', requireAuth, async (req: Request, res: Response) => {
    if (!req.user || req.user.role !== 'admin') return res.status(403).json({ message: 'Admin access required' });
    try {
      const { userId } = req.params;
      const { reason, note } = req.body || {};
      const target = await User.findById(userId);
      if (!target) return res.status(404).json({ message: 'User not found' });
      target.phoneVerified = true;
      await target.save();
      const ua = await UserAudit.create({ userId: target._id.toString(), action: 'phone_verified', byId: req.user!._id.toString(), byName: req.user!.name, newValue: target.phone || '', reason, note });
      try { (app as any).locals.io?.emit('audit:user', ua); } catch (err) {}
      res.json({ success: true, phone: target.phone, phoneVerified: target.phoneVerified });
    } catch (err) {
      console.error('Admin verify phone error:', err);
      res.status(500).json({ message: 'Failed to verify phone' });
    }
  });

  // Chat routes

  // Uploads: accepts single image uploads for admin/staff, stores them under /uploads
  const uploadsDir = resolve(process.cwd(), "uploads");
  try {
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
  } catch (err) {
    console.error("Could not create uploads directory", err);
  }

  const multerStorage = multer.diskStorage({
    destination: uploadsDir,
    filename: (_req, file, cb) => {
      const safeName = `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9.-]/g, "-")}`;
      cb(null, safeName);
    },
  });

  // Validate image types and size (5MB max)
  const upload = multer({ 
    storage: multerStorage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      // accept common image mime types
      const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
      if (!allowed.includes(file.mimetype)) {
        cb(new Error("Unsupported file type"));
        return;
      }
      cb(null, true);
    }
  });

  // Upload endpoint - accepts field name 'image'
  app.post("/api/uploads", requireAuth, upload.single("image"), async (req: Request, res: Response) => {
    try {
      // Only allow admin or staff to upload assets
      if (!req.user || (req.user.role !== "admin" && req.user.role !== "staff")) {
        return res.status(403).json({ message: "Admin/staff access required" });
      }

      if (!req.file) return res.status(400).json({ message: "No file uploaded" });

      // Return an absolute URL so the client (dev server) can load it directly
      const host = req.get("host") || "localhost:5000";
      const proto = req.protocol || "http";

      // Perform resizing/compression using sharp where possible
      try {
        const sharp = await import('sharp');
        const filePath = resolve(uploadsDir, req.file.filename);
        // generate two webp profiles: original (max width 1600) and thumbnail (400)
        await sharp.default(filePath)
          .rotate()
          .resize({ width: 1600, withoutEnlargement: true })
          .toFormat('webp', { quality: 82 })
          .toFile(filePath + '.webp');
        await sharp.default(filePath)
          .rotate()
          .resize({ width: 400, withoutEnlargement: true })
          .toFormat('webp', { quality: 70 })
          .toFile(filePath + '.thumb.webp');
        // remove original file and reference the new webp original filename
        fs.unlinkSync(resolve(uploadsDir, req.file.filename));
        // return both the original-size webp and the thumbnail
        req.file.filename = req.file.filename + '.webp';
        // attach thumbnail name for consumer
        (req.file as any).thumbnail = req.file.filename + '.thumb.webp';
      } catch (err) {
        // If sharp is not available or processing failed, continue with original file
        console.warn('Image processing failed or sharp not available:', err);
      }

      const fileUrl = `${proto}://${host}/uploads/${req.file.filename}`;
      const thumb = (req.file as any).thumbnail;
      const thumbUrl = thumb ? `${proto}://${host}/uploads/${thumb}` : undefined;
      res.status(201).json({ url: fileUrl, thumbnailUrl: thumbUrl });
    } catch (err) {
      console.error("Upload error:", err);
      res.status(500).json({ message: "Failed to upload file" });
    }
  });

  // Product reviews
  // Get reviews for a product
  app.get("/api/products/:productId/reviews", async (req: Request, res: Response) => {
    try {
      const { productId } = req.params;
      // Exclude soft-deleted reviews by default
      const reviews = await Review.find({ productId, deletedAt: { $exists: false } }).sort({ createdAt: -1 });

      const reviewsResponse = reviews.map(r => ({
        id: r._id.toString(),
        productId: r.productId,
        userId: r.userId,
        userName: r.userName,
        rating: r.rating,
        comment: r.comment,
        timestamp: r.createdAt.toISOString(),
      }));

      res.json({ reviews: reviewsResponse });
    } catch (error) {
      console.error("Get product reviews error:", error);
      res.status(500).json({ message: "Failed to fetch product reviews" });
    }
  });

  // Post a review for a product (authenticated)
  app.post("/api/products/:productId/reviews", requireAuth, async (req: Request, res: Response) => {
    try {
      const { productId } = req.params;
      const { rating, comment } = req.body;

      if (!rating || typeof rating !== "number" || rating < 1 || rating > 5) {
        return res.status(400).json({ message: "Rating must be a number between 1 and 5" });
      }

      if (!comment || typeof comment !== "string" || comment.trim().length === 0) {
        return res.status(400).json({ message: "Comment is required" });
      }

      const review = await Review.create({
        productId,
        userId: req.user!._id.toString(),
        userName: req.user!.name,
        rating,
        comment: comment.trim(),
      });

      const reviewResponse = {
        id: review._id.toString(),
        productId: review.productId,
        userId: review.userId,
        userName: review.userName,
        rating: review.rating,
        comment: review.comment,
        timestamp: review.createdAt.toISOString(),
      };

      res.status(201).json({ review: reviewResponse });
    } catch (error) {
      console.error("Create product review error:", error);
      res.status(500).json({ message: "Failed to create product review" });
    }
  });

  // Delete a review (admin only)
  app.delete("/api/reviews/:reviewId", requireAuth, async (req: Request, res: Response) => {
    try {
      if (!req.user || (req.user.role !== "admin" && req.user.role !== "staff")) {
        return res.status(403).json({ message: "Admin/staff access required" });
      }

      const { reviewId } = req.params;
      const found = await Review.findById(reviewId);
      if (!found) return res.status(404).json({ message: "Review not found" });

      // Soft-delete: set deletedAt / deletedBy fields + optional moderation metadata
      const { reason, note } = req.body || {};
      found.deletedAt = new Date();
      found.deletedById = req.user!._id.toString();
      found.deletedByName = req.user!.name;
      if (reason && typeof reason === 'string') found.deletedReason = reason.trim();
      if (note && typeof note === 'string') found.deletedNote = note.trim();
      await found.save();

      // Create audit record including moderation reason/note
      const ra = await ReviewAudit.create({ reviewId: found._id.toString(), action: 'deleted', byId: found.deletedById, byName: found.deletedByName, reason: found.deletedReason, note: found.deletedNote });
      try { (app as any).locals.io?.emit('audit:review', ra); } catch (err) {}

      res.json({ success: true });
    } catch (err) {
      console.error("Delete review error:", err);
      res.status(500).json({ message: "Failed to delete review" });
    }
  });

  // Audit: list recent review audit records (admin only)
  app.get('/api/reviews/audit', requireAuth, async (req: Request, res: Response) => {
    try {
      if (!req.user || req.user.role !== 'admin') return res.status(403).json({ message: 'Admin access required' });

      // Auto-delete audit entries older than 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      // Delete old audit entries (only for 'deleted' action, not 'restored')
      const deleteResult = await ReviewAudit.deleteMany({
        action: 'deleted',
        createdAt: { $lt: thirtyDaysAgo }
      });
      
      if (deleteResult.deletedCount > 0) {
        console.log(`Auto-deleted ${deleteResult.deletedCount} audit entries older than 30 days`);
      }

      // Support filtering, sorting and pagination
      const { action, byName, reviewId, start, end, page = '1', pageSize = '25', export: exportType, sort = 'desc', exportAll } = req.query as any;
      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const size = Math.min(200, Math.max(1, parseInt(pageSize, 10) || 25));

      const filter: any = {};
      if (action) filter.action = action;
      if (byName) filter.byName = new RegExp(byName, 'i');
      if (reviewId) filter.reviewId = reviewId;
      if (start || end) filter.createdAt = {} as any;
      if (start) filter.createdAt.$gte = new Date(start);
      if (end) filter.createdAt.$lte = new Date(end);

      const total = await ReviewAudit.countDocuments(filter);

      // determine sort order
      const sortOrder = sort === 'asc' ? 1 : -1;

      if (exportType === 'csv') {
        // stream as CSV; allow exportAll to request everything (admins only)
        const qs = exportAll === 'true' || exportAll === true;
        const audits = qs ? await ReviewAudit.find(filter).sort({ createdAt: sortOrder }) : await ReviewAudit.find(filter).sort({ createdAt: sortOrder }).limit(5000);
        const rows = audits.map(a => [a._id.toString(), a.reviewId, a.action, a.byId || '', a.byName || '', a.reason || '', a.note || '', a.createdAt.toISOString()].join(','));
        const header = ['id', 'reviewId', 'action', 'byId', 'byName', 'reason', 'note', 'timestamp'].join(',');
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=review_audit.csv');
        return res.send([header, ...rows].join('\n'));
      }

      const audits = await ReviewAudit.find(filter).sort({ createdAt: sortOrder }).skip((pageNum - 1) * size).limit(size);
      const response = audits.map(a => ({ id: a._id.toString(), reviewId: a.reviewId, action: a.action, byId: a.byId, byName: a.byName, reason: a.reason, note: a.note, timestamp: a.createdAt.toISOString() }));
      res.json({ audits: response, total, page: pageNum, pageSize: size, sort: sort === 'asc' ? 'asc' : 'desc' });
    } catch (err) {
      console.error('Get review audits error:', err);
      res.status(500).json({ message: 'Failed to fetch audits' });
    }
  });

  // User audit: list recent user audit records (admin only)
  app.get('/api/users/audit', requireAuth, async (req: Request, res: Response) => {
    try {
      if (!req.user || req.user.role !== 'admin') return res.status(403).json({ message: 'Admin access required' });

      const { action, byName, userId, start, end, page = '1', pageSize = '25', export: exportType, sort = 'desc', exportAll } = req.query as any;
      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const size = Math.min(200, Math.max(1, parseInt(pageSize, 10) || 25));

      const filter: any = {};
      if (action) filter.action = action;
      if (byName) filter.byName = { $regex: new RegExp(byName, 'i') };
      if (userId) filter.userId = userId;
      if (start || end) filter.createdAt = {} as any;
      if (start) filter.createdAt.$gte = new Date(start);
      if (end) filter.createdAt.$lte = new Date(end);

      const total = await UserAudit.countDocuments(filter);
      const sortOrder = sort === 'asc' ? 1 : -1;

      if (exportType === 'csv') {
        const qs = exportAll === 'true' || exportAll === true;
        const audits = qs ? await UserAudit.find(filter).sort({ createdAt: sortOrder }) : await UserAudit.find(filter).sort({ createdAt: sortOrder }).limit(5000);
        const rows = audits.map(a => [a._id.toString(), a.userId, a.action, a.byId || '', a.byName || '', a.newValue || '', a.reason || '', a.note || '', a.createdAt.toISOString()].join(','));
        const header = ['id', 'userId', 'action', 'byId', 'byName', 'newValue', 'reason', 'note', 'timestamp'].join(',');
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=user_audit.csv');
        return res.send([header, ...rows].join('\n'));
      }

      const audits = await UserAudit.find(filter).sort({ createdAt: sortOrder }).skip((pageNum - 1) * size).limit(size);
      const response = audits.map(a => ({ id: a._id.toString(), userId: a.userId, action: a.action, byId: a.byId, byName: a.byName, newValue: a.newValue, reason: a.reason, note: a.note, timestamp: a.createdAt.toISOString() }));
      res.json({ audits: response, total, page: pageNum, pageSize: size, sort: sort === 'asc' ? 'asc' : 'desc' });
    } catch (err) {
      console.error('Get user audits error:', err);
      res.status(500).json({ message: 'Failed to fetch user audits' });
    }
  });

  // Restore a previously soft-deleted review (admin only)
  app.post('/api/reviews/:reviewId/restore', requireAuth, async (req: Request, res: Response) => {
    try {
      if (!req.user || req.user.role !== 'admin') return res.status(403).json({ message: 'Admin access required' });
      const { reviewId } = req.params;
      const found = await Review.findById(reviewId);
      if (!found) return res.status(404).json({ message: 'Review not found' });

      found.deletedAt = undefined as any;
      found.deletedById = undefined as any;
      found.deletedByName = undefined as any;
      found.deletedReason = undefined as any;
      found.deletedNote = undefined as any;
      await found.save();

      // Audit the restore; include both the actor and optionally the original reason for context
      const { note } = req.body || {};
      const auditNote = note ? `${note} (restored; prevReason: ${found.deletedReason || 'none'})` : `restored; prevReason: ${found.deletedReason || 'none'}`;
      const ra = await ReviewAudit.create({ reviewId: found._id.toString(), action: 'restored', byId: req.user!._id.toString(), byName: req.user!.name, note: auditNote });
      try { (app as any).locals.io?.emit('audit:review', ra); } catch (err) {}

      const reviewResponse = {
        id: found._id.toString(),
        productId: found.productId,
        userId: found.userId,
        userName: found.userName,
        rating: found.rating,
        comment: found.comment,
        timestamp: found.createdAt.toISOString()
      };

      res.json({ review: reviewResponse });
    } catch (err) {
      console.error('Restore review error:', err);
      res.status(500).json({ message: 'Failed to restore review' });
    }
  });

  // Menu endpoints - allow fetching products and creating new ones (admin/staff)
  app.get("/api/menu", async (_req: Request, res: Response) => {
    try {
      const items = await Product.find().sort({ createdAt: -1 });
      const response = items.map(p => ({
        id: p._id.toString(),
        name: p.name,
        description: p.description,
        price: p.price,
        category: p.category,
        images: p.images || [],
        available: p.available,
        createdAt: p.createdAt.toISOString(),
      }));
      res.json({ menu: response });
    } catch (err) {
      console.error("Get menu error:", err);
      res.status(500).json({ message: "Failed to fetch menu" });
    }
  });

  app.post("/api/menu", requireAuth, async (req: Request, res: Response) => {
    try {
      if (!req.user || (req.user.role !== "admin" && req.user.role !== "staff")) {
        return res.status(403).json({ message: "Admin/staff access required" });
      }

      const { name, description, price, category, images, available } = req.body;
      if (!name || !description || !price || !category) {
        return res.status(400).json({ message: "name, description, price and category are required" });
      }

      const created = await Product.create({ 
        name, 
        description, 
        price, 
        category, 
        images: images || [], 
        available: available ?? true 
      });

      res.status(201).json({ 
        product: { 
          id: created._id.toString(), 
          name: created.name, 
          description: created.description, 
          price: created.price, 
          category: created.category, 
          images: created.images, 
          available: created.available 
        } 
      });
    } catch (err) {
      console.error("Create menu item error:", err);
      res.status(500).json({ message: "Failed to create menu item" });
    }
  });

  app.put("/api/menu/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      if (!req.user || (req.user.role !== "admin" && req.user.role !== "staff")) {
        return res.status(403).json({ message: "Admin/staff access required" });
      }

      const { id } = req.params;
      const { name, description, price, category, images, available } = req.body;
      
      if (!name || !description || !price || !category) {
        return res.status(400).json({ message: "name, description, price and category are required" });
      }

      const updated = await Product.findByIdAndUpdate(
        id, 
        { name, description, price, category, images, available }, 
        { new: true, runValidators: true }
      );

      if (!updated) {
        return res.status(404).json({ message: "Menu item not found" });
      }

      res.json({ product: { id: updated._id.toString(), name: updated.name, description: updated.description, price: updated.price, category: updated.category, images: updated.images, available: updated.available } });
    } catch (err) {
      console.error("Update menu item error:", err);
      res.status(500).json({ message: "Failed to update menu item" });
    }
  });

  // Add this after the PUT /api/menu/:id endpoint (around line 997)
app.delete('/api/menu/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    if (!req.user || (req.user.role !== "admin" && req.user.role !== "staff")) {
      return res.status(403).json({ message: "Admin/staff access required" });
    }

    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid menu item id" });
    }

    const deleted = await Product.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ message: "Menu item not found" });
    }

    res.json({ success: true });
  } catch (err) {
    console.error("Delete menu item error:", err);
    res.status(500).json({ message: "Failed to delete menu item" });
  }
});

  // News endpoints - fetch and create news posts (admin/staff)
  app.get("/api/news", async (_req: Request, res: Response) => {
    try {
      // Exclude soft-deleted news items by default
      const items = await News.find({ deletedAt: { $exists: false } }).sort({ createdAt: -1 });
      const response = items.map(n => ({ id: n._id.toString(), title: n.title, content: n.content, author: n.author, date: n.date, image: n.image }));
      res.json({ news: response });
    } catch (err) {
      console.error("Get news error:", err);
      res.status(500).json({ message: "Failed to fetch news" });
    }
  });

  app.post("/api/news", requireAuth, async (req: Request, res: Response) => {
    try {
      if (!req.user || (req.user.role !== "admin" && req.user.role !== "staff")) {
        return res.status(403).json({ message: "Admin/staff access required" });
      }

      const { title, content, author, date, image } = req.body;
      if (!title || !content || !author || !date) {
        return res.status(400).json({ message: "title, content, author and date are required" });
      }

      const created = await News.create({ title, content, author, date, image });
      res.status(201).json({ news: { id: created._id.toString(), title: created.title, content: created.content, author: created.author, date: created.date, image: created.image } });
    } catch (err) {
      console.error("Create news error:", err);
      res.status(500).json({ message: "Failed to create news" });
    }
  });

  // Delete (soft) a news item (admin/staff)
  app.delete('/api/news/:newsId', requireAuth, async (req: Request, res: Response) => {
    try {
      if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'staff')) return res.status(403).json({ message: 'Admin/staff access required' });
      const { newsId } = req.params;
      if (!mongoose.isValidObjectId(newsId)) return res.status(400).json({ message: 'Invalid news id' });
      const found = await News.findById(newsId);
      if (!found) return res.status(404).json({ message: 'News not found' });

      // Accept reason + note
      const { reason, note } = req.body || {};
      found.deletedAt = new Date();
      found.deletedById = req.user!._id.toString();
      found.deletedByName = req.user!.name;
      if (reason && typeof reason === 'string') found.deletedReason = reason.trim();
      if (note && typeof note === 'string') found.deletedNote = note.trim();
      await found.save();

      // Audit delete
      const na = await NewsAudit.create({ newsId: found._id.toString(), action: 'deleted', byId: found.deletedById, byName: found.deletedByName, reason: found.deletedReason, note: found.deletedNote });
      try { (app as any).locals.io?.emit('audit:news', na); } catch (err) {}

      res.json({ success: true });
    } catch (err) {
      console.error('Delete news error:', err);
      res.status(500).json({ message: 'Failed to delete news' });
    }
  });

  // Restore a news item (admin only) — optional
  app.post('/api/news/:newsId/restore', requireAuth, async (req: Request, res: Response) => {
    try {
      if (!req.user || req.user.role !== 'admin') return res.status(403).json({ message: 'Admin access required' });
      const { newsId } = req.params;
      if (!mongoose.isValidObjectId(newsId)) return res.status(400).json({ message: 'Invalid news id' });
      const found = await News.findById(newsId);
      if (!found) return res.status(404).json({ message: 'News not found' });

      const { note } = req.body || {};
      const prevReason = found.deletedReason || 'none';
      found.deletedAt = undefined as any;
      found.deletedById = undefined as any;
      found.deletedByName = undefined as any;
      found.deletedReason = undefined as any;
      found.deletedNote = undefined as any;
      await found.save();

      // Audit restore
      const auditNote = note ? `${note} (restored; prevReason: ${prevReason})` : `restored; prevReason: ${prevReason}`;
      const na = await NewsAudit.create({ newsId: found._id.toString(), action: 'restored', byId: req.user!._id.toString(), byName: req.user!.name, note: auditNote });
      try { (app as any).locals.io?.emit('audit:news', na); } catch (err) {}

      res.json({ news: { id: found._id.toString(), title: found.title, content: found.content, author: found.author, date: found.date, image: found.image } });
    } catch (err) {
      console.error('Restore news error:', err);
      res.status(500).json({ message: 'Failed to restore news' });
    }
  });

  // Get a single news item by id (public) — excludes soft-deleted items
  app.get('/api/news/:newsId', async (req: Request, res: Response) => {
    try {
      const { newsId } = req.params;
      if (!mongoose.isValidObjectId(newsId)) return res.status(400).json({ message: 'Invalid news id' });
      const found = await News.findOne({ _id: newsId, deletedAt: { $exists: false } });
      if (!found) return res.status(404).json({ message: 'News not found' });

      const response = { id: found._id.toString(), title: found.title, content: found.content, author: found.author, date: found.date, image: found.image, views: found.views ?? 0 };
      res.json({ news: response });
    } catch (err) {
      console.error('Get news item error:', err);
      res.status(500).json({ message: 'Failed to fetch news item' });
    }
  });

  // Record a news view for analytics/audit; public endpoint
  app.post('/api/news/:newsId/view', async (req: Request, res: Response) => {
    try {
      const { newsId } = req.params;
      if (!mongoose.isValidObjectId(newsId)) return res.status(400).json({ message: 'Invalid news id' });
      const found = await News.findOne({ _id: newsId, deletedAt: { $exists: false } });
      if (!found) return res.status(404).json({ message: 'News not found' });

      const byId = (req as any).session?.userId || undefined;
      let byName = undefined;
      if (byId && mongoose.isValidObjectId(String(byId))) {
        const byU = await User.findById(byId);
        byName = byU?.name;
      }
      const updated = await News.findByIdAndUpdate(found._id, { $inc: { views: 1 } }, { new: true });
      const na = await NewsAudit.create({ newsId: found._id.toString(), action: 'viewed', byId, byName, note: `views=${updated?.views ?? 0}` });
      try { (app as any).locals.io?.emit('audit:news', na); } catch (err) {}

      res.json({ success: true });
    } catch (err) {
      console.error('News view audit error:', err);
      res.status(500).json({ message: 'Failed to record view' });
    }
  });

  // Admin: set news view count (Admin only)
  app.patch('/api/news/:newsId/views', requireAuth, async (req: Request, res: Response) => {
    try {
      if (!req.user || req.user.role !== 'admin') return res.status(403).json({ message: 'Admin access required' });
      const { newsId } = req.params;
      if (!mongoose.isValidObjectId(newsId)) return res.status(400).json({ message: 'Invalid news id' });
      const { views, reason, note } = req.body as any;
      if (typeof views !== 'number' || views < 0) return res.status(400).json({ message: 'views must be a non-negative number' });
      const found = await News.findById(newsId);
      if (!found) return res.status(404).json({ message: 'News not found' });
      found.views = Math.max(0, Math.floor(views));
      await found.save();
      const na = await NewsAudit.create({ newsId: found._id.toString(), action: 'views_updated', byId: req.user!._id.toString(), byName: req.user!.name, newValue: String(found.views), reason, note });
      try { (app as any).locals.io?.emit('audit:news', na); } catch (err) {}
      res.json({ success: true, views: found.views });
    } catch (err) {
      console.error('Update news views error:', err);
      res.status(500).json({ message: 'Failed to update news views' });
    }
  });

  // Get messages for a thread - Fix parameter types
  // Orders: Create, List, Update status — emits socket events for real-time dashboards
  app.post('/api/orders', async (req: Request, res: Response) => {
    try {
      const { items, total, user, userId, eta } = req.body as any;
      if (!items || !Array.isArray(items) || typeof total !== 'number') return res.status(400).json({ message: 'items and total required' });
      const o = await Order.create({ items, total, user, userId, eta });
      try { (app as any).locals.io?.emit('orders:new', { id: o._id.toString(), items: o.items, total: o.total, status: o.status, user: o.user, createdAt: o.createdAt, eta: o.eta }); } catch (e) {}
      // Emit KPIs update
      try {
        const totalRevenueAgg = await Order.aggregate([{ $group: { _id: null, revenue: { $sum: "$total" } } }]);
        const totalRevenue = totalRevenueAgg.length ? totalRevenueAgg[0].revenue : 0;
        const activeOrders = await Order.countDocuments({ status: { $ne: 'Delivered' } });
        const since = new Date(Date.now() - 60_000);
        const opm = await Order.countDocuments({ createdAt: { $gte: since } });
        (app as any).locals.io?.emit('kpi:update', { totalRevenue, activeOrders, ordersPerMinute: opm });
      } catch (err) {}
      res.status(201).json({ order: { id: o._id.toString(), items: o.items, total: o.total, status: o.status, user: o.user, createdAt: o.createdAt, eta: o.eta } });
    } catch (err) {
      console.error('Create order error:', err);
      res.status(500).json({ message: 'Failed to create order' });
    }
  });

  app.get('/api/orders', requireAuth, async (req: Request, res: Response) => {
    try {
      if (req.user!.role === 'user') {
        const orders = await Order.find({ userId: req.user!._id.toString() }).sort({ createdAt: -1 });
        return res.json({ orders: orders.map(o => ({ id: o._id.toString(), items: o.items, total: o.total, status: o.status, user: o.user, createdAt: o.createdAt, eta: o.eta })) });
      }
      const orders = await Order.find().sort({ createdAt: -1 });
      res.json({ orders: orders.map(o => ({ id: o._id.toString(), items: o.items, total: o.total, status: o.status, user: o.user, createdAt: o.createdAt, eta: o.eta })) });
    } catch (err) {
      console.error('Get orders error:', err);
      res.status(500).json({ message: 'Failed to fetch orders' });
    }
  });

  app.patch('/api/orders/:orderId/status', requireAuth, async (req: Request, res: Response) => {
    try {
      const { orderId } = req.params;
      if (!orderId) return res.status(400).json({ message: 'orderId required' });
      const { status } = req.body as any;
      if (!status) return res.status(400).json({ message: 'status required' });
      const found = await Order.findById(orderId);
      if (!found) return res.status(404).json({ message: 'Order not found' });
      found.status = status;
      await found.save();
      try { (app as any).locals.io?.emit('orders:update', { id: found._id.toString(), status: found.status, eta: found.eta, updatedAt: found.updatedAt }); } catch (e) {}
      // Emit KPIs update
      try {
        const totalRevenueAgg = await Order.aggregate([{ $group: { _id: null, revenue: { $sum: "$total" } } }]);
        const totalRevenue = totalRevenueAgg.length ? totalRevenueAgg[0].revenue : 0;
        const activeOrders = await Order.countDocuments({ status: { $ne: 'Delivered' } });
        const since = new Date(Date.now() - 60_000);
        const opm = await Order.countDocuments({ createdAt: { $gte: since } });
        (app as any).locals.io?.emit('kpi:update', { totalRevenue, activeOrders, ordersPerMinute: opm });
      } catch (err) {}
      res.json({ success: true, order: { id: found._id.toString(), status: found.status, eta: found.eta } });
    } catch (err) {
      console.error('Update order status error:', err);
      res.status(500).json({ message: 'Failed to update order status' });
    }
  });
  app.get("/api/chat/threads/:threadId/messages", requireAuth, async (req: Request, res: Response) => {
    try {
      const { threadId } = req.params;
      const messages = await ChatMessage.find({ threadId }).sort({ createdAt: 1 });
      
      const messagesResponse = messages.map(m => ({
        id: m._id.toString(),
        threadId: m.threadId,
        senderId: m.senderId,
        senderName: m.senderName,
        senderRole: m.senderRole,
        text: m.text,
        isRead: m.isRead,
        encrypted: m.encrypted,
        timestamp: m.createdAt.toISOString(),
      }));

      res.json({ messages: messagesResponse });
    } catch (error) {
      console.error("Get messages error:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  // Send a message - Fix parameter types
  app.post("/api/chat/messages", requireAuth, async (req: Request, res: Response) => {
    try {
      const { threadId, text } = req.body;

      if (!text || !threadId) {
        return res.status(400).json({ message: "Thread ID and text are required" });
      }

      const message = await ChatMessage.create({
        threadId,
        senderId: req.user!._id.toString(),
        senderName: req.user!.name,
        senderRole: req.user!.role,
        text,
        isRead: false,
        encrypted: true,
      });

      const messageResponse = {
        id: message._id.toString(),
        threadId: message.threadId,
        senderId: message.senderId,
        senderName: message.senderName,
        senderRole: message.senderRole,
        text: message.text,
        isRead: message.isRead,
        encrypted: message.encrypted,
        timestamp: message.createdAt.toISOString(),
      };

      res.status(201).json({ message: messageResponse });
      try { (app as any).locals.io?.emit('chat:message', { threadId: message.threadId, message: messageResponse }); } catch (e) {}
    } catch (error) {
      console.error("Send message error:", error);
      res.status(500).json({ message: "Failed to send message" });
    }
  });

  // Mark messages as read - Fix parameter types
  app.patch("/api/chat/threads/:threadId/read", requireAuth, async (req: Request, res: Response) => {
    try {
      const { threadId } = req.params;
      const { readerRole } = req.body;

      // Mark messages as read based on who is reading
      let updateFilter: any = { threadId, isRead: false };
      
      if (readerRole === "admin" || readerRole === "staff") {
        // Admin/Staff marks user messages as read
        updateFilter.senderRole = "user";
      } else {
        // Users mark admin/staff messages as read
        updateFilter.senderRole = { $in: ["admin", "staff"] };
      }

      await ChatMessage.updateMany(updateFilter, { isRead: true });

      res.json({ success: true });
    } catch (error) {
      console.error("Mark read error:", error);
      res.status(500).json({ message: "Failed to mark messages as read" });
    }
  });

  // Get all threads (Admin/Staff only) - Fix parameter types
  app.get("/api/chat/threads", requireAuth, async (req: Request, res: Response) => {
    if (req.user!.role === "user") {
      return res.status(403).json({ message: "Access denied" });
    }

    try {
      // Get all unique thread IDs
      const threads = await ChatMessage.aggregate([
        {
          $group: {
            _id: "$threadId",
            lastMessage: { $last: "$$ROOT" },
            unreadCount: {
              $sum: {
                $cond: [
                  { $and: [{ $eq: ["$isRead", false] }, { $eq: ["$senderRole", "user"] }] },
                  1,
                  0
                ]
              }
            }
          }
        },
        { $sort: { "lastMessage.createdAt": -1 } }
      ]);

      const threadsResponse = await Promise.all(threads.map(async (t) => {
        // Get user name for the thread
        const userMsg = await ChatMessage.findOne({ 
          threadId: t._id, 
          senderRole: "user" 
        });
        
        return {
          id: t._id,
          userName: userMsg?.senderName || "Unknown User",
          lastMessage: t.lastMessage ? {
            id: t.lastMessage._id.toString(),
            text: t.lastMessage.text,
            timestamp: t.lastMessage.createdAt.toISOString(),
            senderRole: t.lastMessage.senderRole,
          } : null,
          unreadCount: t.unreadCount,
          typing: false,
        };
      }));

      res.json({ threads: threadsResponse });
    } catch (error) {
      console.error("Get threads error:", error);
      res.status(500).json({ message: "Failed to fetch threads" });
    }
  });

  // Newsletter routes
  app.use("/api/newsletter", newsletterRoutes);

  // Admin newsletter routes (protected)
  app.use("/api/admin/newsletter", requireAuth, adminNewsletterRoutes);

  const httpServer = createServer(app);

  return httpServer;
}