import { Request, Response } from 'express';
import { ChatService } from '../services/chatService';

export class AdminChatController {
  static async handleChat(req: Request, res: Response) {
    try {
      const { message, history } = req.body;
      if (!message) {
        return res.status(400).json({ success: false, error: 'Message is required' });
      }

      // Inject the authenticated user ID into the service
      const userId = (req as any).user?.id || 'system';
      const chatService = new ChatService(userId);

      const response = await chatService.sendMessage(message, history || []);
      res.json({ success: true, response });
    } catch (error: any) {
      console.error('Admin chat error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
}