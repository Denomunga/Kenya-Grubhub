import express from 'express';
import { News } from '../models/News';
import { NewsView } from '../models/NewsView';
import { v4 as uuidv4 } from 'uuid';

export const newsRouter = express.Router();

// Track a view for a news article
newsRouter.post('/:id/view', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || req.ip || uuidv4(); // Use user ID if authenticated, otherwise use IP or generate a unique ID
    
    // Check if this user has already viewed this news article
    const existingView = await NewsView.findOne({ 
      newsId: id, 
      $or: [
        { userId: userId },
        { ipAddress: req.ip }
      ]
    });

    if (!existingView) {
      // Create a new view record
      const view = new NewsView({
        newsId: id,
        userId: userId,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });
      await view.save();

      // Increment the view count in the news document
      await News.findByIdAndUpdate(id, { $inc: { views: 1 } });
    }

    // Get the updated view count
    const news = await News.findById(id);
    
    res.json({ 
      success: true, 
      views: news?.views || 0,
      isNewView: !existingView
    });
  } catch (error) {
    console.error('Error tracking news view:', error);
    res.status(500).json({ success: false, error: 'Failed to track view' });
  }
});

// Get view statistics (admin only)
newsRouter.get('/:id/views', async (req, res) => {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const { id } = req.params;
    
    // Get total view count
    const news = await News.findById(id).select('views');
    
    // Get unique viewers count
    const uniqueViewers = await NewsView.distinct('userId', { newsId: id });
    
    // Get view history (last 50 views)
    const viewHistory = await NewsView.find({ newsId: id })
      .sort({ viewedAt: -1 })
      .limit(50)
      .select('userId ipAddress userAgent viewedAt')
      .lean();

    res.json({
      success: true,
      totalViews: news?.views || 0,
      uniqueViewers: uniqueViewers.length,
      viewHistory
    });
  } catch (error) {
    console.error('Error getting view statistics:', error);
    res.status(500).json({ success: false, error: 'Failed to get view statistics' });
  }
});

export default newsRouter;
