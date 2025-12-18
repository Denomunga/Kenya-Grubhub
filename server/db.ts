import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { log } from "./logger.js";
import { User } from "./models/User.js";

const MONGODB_URI = process.env.MONGODB_URI;

export async function connectDatabase() {
  if (!MONGODB_URI) {
    log("⚠️  No MONGODB_URI found. MongoDB features disabled. Set MONGODB_URI environment variable to enable database.");
    return;
  }

  try {
    await mongoose.connect(MONGODB_URI);
    log("✅ MongoDB connected successfully");
    await initializeDatabase();
  } catch (error) {
    log(`❌ MongoDB connection error: ${error}`);
    log("⚠️  Continuing without MongoDB. Set MONGODB_URI to enable database features.");
  }
}

async function initializeDatabase() {
  try {
    // Check if admin exists
    const adminExists = await User.findOne({ username: "admin" });
    if (!adminExists) {
      const hashedPassword = await bcrypt.hash("admin", 10);
      await User.create({
        username: "admin",
        email: "admin@kenyanbistro.co.ke",
        password: hashedPassword,
        name: "Admin User",
        role: "admin",
      });
      log("✅ Default admin user created (username: admin, password: admin)");
    }
  } catch (error) {
    log(`⚠️  Database initialization warning: ${error}`);
  }
}

mongoose.connection.on("disconnected", () => {
  log("MongoDB disconnected");
});

mongoose.connection.on("error", (error) => {
  log(`MongoDB error: ${error}`);
});