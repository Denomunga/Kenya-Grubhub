import mongoose, { Schema, Document } from "mongoose";

export interface INewsletter extends Document {
  email: string;
  isActive: boolean;
  subscribedAt: Date;
  unsubscribeToken?: string;
  preferences: {
    specialOffers: boolean;
    newProducts: boolean;
    events: boolean;
    news: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

const NewsletterSchema = new Schema<INewsletter>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    subscribedAt: {
      type: Date,
      default: Date.now,
    },
    unsubscribeToken: {
      type: String,
      unique: true,
      sparse: true,
    },
    preferences: {
      specialOffers: {
        type: Boolean,
        default: true,
      },
      newProducts: {
        type: Boolean,
        default: true,
      },
      events: {
        type: Boolean,
        default: true,
      },
      news: {
        type: Boolean,
        default: true,
      },
    },
  },
  {
    timestamps: true,
  }
);

// Create index for active status lookup
NewsletterSchema.index({ isActive: 1 });

export const Newsletter = mongoose.model<INewsletter>("Newsletter", NewsletterSchema);
