import mongoose, { Schema, Document } from "mongoose";

export interface IChatMessage extends Document {
  threadId: string;
  senderId: string;
  senderName: string;
  senderRole: "admin" | "staff" | "user";
  text: string;
  isRead: boolean;
  encrypted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ChatMessageSchema = new Schema<IChatMessage>(
  {
    threadId: {
      type: String,
      required: true,
      index: true,
    },
    senderId: {
      type: String,
      required: true,
      index: true,
    },
    senderName: {
      type: String,
      required: true,
    },
    senderRole: {
      type: String,
      enum: ["admin", "staff", "user"],
      required: true,
    },
    text: {
      type: String,
      required: true,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    encrypted: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

ChatMessageSchema.index({ threadId: 1, createdAt: -1 });

export const ChatMessage = mongoose.model<IChatMessage>("ChatMessage", ChatMessageSchema);
