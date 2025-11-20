import mongoose from "mongoose";
import { log } from "./vite";

const MONGODB_URI = process.env.MONGODB_URI;

export async function connectDatabase() {
  if (!MONGODB_URI) {
    log("⚠️  No MONGODB_URI found. MongoDB features disabled. Set MONGODB_URI environment variable to enable database.");
    return;
  }

  try {
    await mongoose.connect(MONGODB_URI);
    log("✅ MongoDB connected successfully");
  } catch (error) {
    log(`❌ MongoDB connection error: ${error}`);
    log("⚠️  Continuing without MongoDB. Set MONGODB_URI to enable database features.");
  }
}

mongoose.connection.on("disconnected", () => {
  log("MongoDB disconnected");
});

mongoose.connection.on("error", (error) => {
  log(`MongoDB error: ${error}`);
});
