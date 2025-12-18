import "dotenv/config";
import express from "express";
import cors from "cors";
import fs from "fs";
import { resolve } from "node:path";
import { registerRoutes } from "./routes.js";
import { log } from "./logger.js";
import { connectDatabase } from "./db.js";
import { createServer } from "http";
import { Server as IOServer } from "socket.io";
import os from "os";
import type { Request, Response, NextFunction } from "express";

const app = express();

// Security: Express middleware setup
// allow requests from the frontend dev server during development
const allowedOrigins = process.env.NODE_ENV === 'production' 
  ? [
      process.env.CORS_ORIGIN || 
      process.env.FRONTEND_URL || 
      'https://kenya-grubhub-gx7x.vercel.app',
      /^https:\/\/kenya-grubhub-gx7x.*\.vercel\.app$/  // Wildcard pattern
    ]
  : ['http://localhost:5173', 'http://localhost:3000'];

// Important: For wildcards, cors() needs a different approach
app.use(cors({ 
  origin: function(origin, callback) {
    if (!origin) return callback(null, true);
    
    if (Array.isArray(allowedOrigins)) {
      for (const allowed of allowedOrigins) {
        if (typeof allowed === 'string' && origin === allowed) {
          return callback(null, true);
        }
        if (allowed instanceof RegExp && allowed.test(origin)) {
          return callback(null, true);
        }
      }
    }
    
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: false, limit: "10mb" }));

// API request logger
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  const url = req.path;

  if (url.startsWith("/api")) {
    let capturedJsonResponse: any;

    const originalJson = res.json.bind(res);
    res.json = function (body: any) {
      capturedJsonResponse = body;
      return originalJson(body);
    };

    res.on("finish", () => {
      const duration = Date.now() - start;
      let line = `${req.method} ${url} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        const responseStr = JSON.stringify(capturedJsonResponse);
        line += ` :: ${responseStr.length > 200 ? responseStr.substring(0, 200) + '...' : responseStr}`;
      }
      log(line);
    });
  }

  next();
});

// Health check endpoint
app.get("/api/health", (_req: Request, res: Response) => {
  res.json({ 
    status: "Server is running!", 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Error handling middleware
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error("Unhandled Error:", err.message);
  const status = err?.status || err?.statusCode || 500;
  const message = status === 500 ? "Internal Server Error" : err.message;
  res.status(status).json({ message });
});




async function startServer() {
  const server = createServer(app);

  try {
    // Connect to MongoDB
    await connectDatabase();
    log("✅ Database connection verified");
  } catch (err) {
    console.error("❌ Database connection failed:", err);
    process.exit(1);
  }

  try {
    // Register all routes
    await registerRoutes(app);
    // Serve uploads directory so uploaded images are reachable at /uploads/<filename>
    try {
      const uploadsDir = resolve(process.cwd(), "uploads");
      if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
      app.use("/uploads", express.static(uploadsDir));
      log("✅ Static uploads served at /uploads");
    } catch (err) {
      console.warn("⚠️  Could not setup uploads static path:", err);
    }

    // Serve frontend static files for dashboard and other routes
    try {
      const clientDistPath = resolve(process.cwd(), "..", "client", "dist");
      if (fs.existsSync(clientDistPath)) {
        app.use(express.static(clientDistPath));
        log("✅ Frontend static files served from:", clientDistPath);
      } else {
        console.warn("⚠️  Client dist directory not found at:", clientDistPath);
      }
    } catch (err) {
      console.warn("⚠️  Could not setup frontend static path:", err);
    }
    log("✅ Routes registered successfully");
  } catch (err) {
    console.error("❌ Failed to register routes:", err);
    process.exit(1);
  }
  
  // 404 handler for API routes (must be after all routes are registered)
  app.use("/api/*", (req: Request, res: Response) => {
    res.status(404).json({ message: `API endpoint ${req.method} ${req.originalUrl} not found` });
  });
  
  const port = parseInt(process.env.PORT || "5000", 10);

  if (!(app as any).__serverStarted) {
    server.listen(port, "0.0.0.0", () => {
      log(`🚀 Server running on http://0.0.0.0:${port}`);
      log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      log(`🔗 Health check: http://localhost:${port}/api/health`);
      (app as any).__serverStarted = true;
    });
    // Initialize Socket.IO
    try {
      const io = new IOServer(server, { 
        cors: { 
          origin: allowedOrigins, 
          credentials: true,
          methods: ['GET', 'POST']
        } 
      });
      console.log('🔧 Socket.io CORS Configuration:', {
        allowedOrigins
      });
      // Store it for access from routes
      (app as any).locals.io = io;
      // Set up a simple ping handler and connection log
      io.on('connection', (socket) => {
        log(`🔌 Socket connected: ${socket.id}`);
        socket.on('disconnect', () => log(`🔌 Socket disconnected: ${socket.id}`));
      });
      log('✅ Socket.IO initialized');
      // Periodically emit server health metrics
      setInterval(() => {
        try {
          const memory = process.memoryUsage();
          const load = os.loadavg();
          const uptime = process.uptime();
          io.emit('server:health', { memory, load, uptime, ts: Date.now() });
        } catch (err) { /* ignore */ }
      }, 5000);
    } catch (err) {
      console.warn('⚠️ Socket.IO initialization failed', err);
    }
  }
}

startServer().catch((err) => {
  console.error("❌ Failed to start server:", err);
  process.exit(1);
});