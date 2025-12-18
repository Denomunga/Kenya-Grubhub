import mongoose from 'mongoose';

const newsViewSchema = new mongoose.Schema({
  newsId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'News',
    required: true 
  },
  userId: { 
    type: String, 
    required: true 
  },
  ipAddress: { 
    type: String,
    required: true 
  },
  userAgent: String,
  viewedAt: { 
    type: Date, 
    default: Date.now 
  }
}, { timestamps: true });

// Compound index to ensure one view per user per news article
newsViewSchema.index({ newsId: 1, userId: 1 }, { unique: true });

export const NewsView = mongoose.models.NewsView || mongoose.model('NewsView', newsViewSchema);
