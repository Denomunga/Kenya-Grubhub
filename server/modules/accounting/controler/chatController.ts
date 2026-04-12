import { Request, Response } from 'express';
import { UserChatService } from '../services/userChatService';

export class ChatController {
  static async handleChat(req: Request, res: Response) {
    try {
      const { message, history } = req.body;
      if (!message) {
        return res.status(400).json({ success: false, error: 'Message is required' });
      }
      const userId = (req as any).user?.id || 'anonymous';
      const chatService = new UserChatService(userId);
      const response = await chatService.sendMessage(message, history || []);
      res.json({ success: true, response });
    } catch (error: any) {
      console.error('Chat error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
}
