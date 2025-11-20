import type { Express } from "express";
import { createServer, type Server } from "http";
import bcrypt from "bcryptjs";
import { body, validationResult } from "express-validator";
import { User } from "./models/User";
import { ChatMessage } from "./models/ChatMessage";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import MemoryStore from "memorystore";

const MemoryStoreSession = MemoryStore(session);

declare module "express-session" {
  interface SessionData {
    userId?: string;
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Session setup
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "kenyan-bistro-secret-key-change-in-production",
      resave: false,
      saveUninitialized: false,
      store: new MemoryStoreSession({
        checkPeriod: 86400000, // 24 hours
      }),
      cookie: {
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
      },
    })
  );

  // Auth middleware
  const requireAuth = async (req: Express.Request, res: Express.Response, next: Express.NextFunction) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    try {
      const user = await User.findById(req.session.userId).select("-password");
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }
      (req as any).user = user;
      next();
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  };

  // Register
  app.post(
    "/api/auth/register",
    [
      body("username").trim().isLength({ min: 2 }).withMessage("Username must be at least 2 characters"),
      body("email").isEmail().normalizeEmail().withMessage("Valid email is required"),
      body("password").isLength({ min: 4 }).withMessage("Password must be at least 4 characters"),
      body("name").trim().notEmpty().withMessage("Name is required"),
    ],
    async (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      try {
        const { username, email, password, name } = req.body;

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
          role: "user",
        });

        // Set session
        req.session.userId = user._id.toString();

        // Return user without password
        const userResponse = {
          id: user._id.toString(),
          username: user.username,
          email: user.email,
          name: user.name,
          role: user.role,
          jobTitle: user.jobTitle,
          avatar: user.avatar,
        };

        res.status(201).json({ user: userResponse });
      } catch (error: any) {
        console.error("Register error:", error);
        res.status(500).json({ message: "Server error during registration" });
      }
    }
  );

  // Login
  app.post(
    "/api/auth/login",
    [
      body("username").trim().notEmpty().withMessage("Username is required"),
      body("password").notEmpty().withMessage("Password is required"),
    ],
    async (req, res) => {
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
        console.error("Login error:", error);
        res.status(500).json({ message: "Server error during login" });
      }
    }
  );

  // Logout
  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  // Get current user
  app.get("/api/auth/me", requireAuth, async (req: any, res) => {
    const userResponse = {
      id: req.user._id.toString(),
      username: req.user.username,
      email: req.user.email,
      name: req.user.name,
      role: req.user.role,
      jobTitle: req.user.jobTitle,
      avatar: req.user.avatar,
    };
    res.json({ user: userResponse });
  });

  // Update profile
  app.patch("/api/auth/profile", requireAuth, async (req: any, res) => {
    try {
      const { name, email, avatar } = req.body;
      const updates: any = {};
      
      if (name) updates.name = name;
      if (email) updates.email = email;
      if (avatar !== undefined) updates.avatar = avatar;

      const user = await User.findByIdAndUpdate(
        req.user._id,
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
      };

      res.json({ user: userResponse });
    } catch (error) {
      console.error("Profile update error:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // Get all users (Admin only)
  app.get("/api/users", requireAuth, async (req: any, res) => {
    if (req.user.role !== "admin") {
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
      }));
      res.json({ users: usersResponse });
    } catch (error) {
      console.error("Get users error:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Update user role (Admin only)
  app.patch("/api/users/:userId/role", requireAuth, async (req: Express.Request, res: Express.Response) => {
    const user = (req as any).user;
    if (user.role !== "admin") {
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

  // Chat routes

  // Get messages for a thread
  app.get("/api/chat/threads/:threadId/messages", requireAuth, async (req: any, res) => {
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

  // Send a message
  app.post("/api/chat/messages", requireAuth, async (req: any, res) => {
    try {
      const { threadId, text } = req.body;

      if (!text || !threadId) {
        return res.status(400).json({ message: "Thread ID and text are required" });
      }

      const message = await ChatMessage.create({
        threadId,
        senderId: req.user._id.toString(),
        senderName: req.user.name,
        senderRole: req.user.role,
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
    } catch (error) {
      console.error("Send message error:", error);
      res.status(500).json({ message: "Failed to send message" });
    }
  });

  // Mark messages as read
  app.patch("/api/chat/threads/:threadId/read", requireAuth, async (req: any, res) => {
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

  // Get all threads (Admin/Staff only)
  app.get("/api/chat/threads", requireAuth, async (req: any, res) => {
    if (req.user.role === "user") {
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

  const httpServer = createServer(app);

  return httpServer;
}
