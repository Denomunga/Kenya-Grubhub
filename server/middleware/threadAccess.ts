import { Request, Response } from 'express';
import { ChatMessage } from '../models/ChatMessage';

/**
 * Validates if a user has access to a specific thread
 * @param req - Express request object
 * @param threadId - Thread ID to validate access to
 * @returns True if user has access, false otherwise
 */
export async function validateThreadAccess(req: Request, threadId: string): Promise<boolean> {
  try {
    const user = req.user;
    if (!user) return false;

    // Admin and staff can access all threads
    if (user.role === 'admin' || user.role === 'staff') {
      return true;
    }

    // Regular users can only access their own thread (threadId equals their userId)
    if (user.role === 'user') {
      return threadId === user._id.toString();
    }

    return false;
  } catch (error) {
    console.error('Thread access validation error:', error);
    return false;
  }
}

/**
 * Validates if a user can participate in a thread (send/receive messages)
 * @param req - Express request object
 * @param threadId - Thread ID to validate
 * @returns True if user can participate, false otherwise
 */
export async function validateThreadParticipation(req: Request, threadId: string): Promise<boolean> {
  try {
    const user = req.user;
    if (!user) return false;

    // Admin and staff can participate in all threads
    if (user.role === 'admin' || user.role === 'staff') {
      return true;
    }

    // Check if user has any messages in this thread (for existing conversations)
    const userMessage = await ChatMessage.findOne({
      threadId: threadId,
      senderId: user._id.toString()
    });

    // If user has messages in thread, they can participate
    if (userMessage) {
      return true;
    }

    // For new threads, users can only start threads with themselves
    if (user.role === 'user') {
      return threadId === user._id.toString();
    }

    return false;
  } catch (error) {
    console.error('Thread participation validation error:', error);
    return false;
  }
}

/**
 * Middleware to check thread access before proceeding
 */
export async function requireThreadAccess(req: Request, res: Response, next: Function) {
  try {
    const { threadId } = req.params;
    
    if (!threadId) {
      return res.status(400).json({ message: 'Thread ID is required' });
    }

    const hasAccess = await validateThreadAccess(req, threadId);
    if (!hasAccess) {
      return res.status(403).json({ message: 'Access denied to this thread' });
    }

    next();
  } catch (error) {
    console.error('Thread access middleware error:', error);
    res.status(500).json({ message: 'Failed to validate thread access' });
  }
}

/**
 * Middleware to check thread participation before proceeding
 */
export async function requireThreadParticipation(req: Request, res: Response, next: Function) {
  try {
    const { threadId } = req.params;
    
    if (!threadId) {
      return res.status(400).json({ message: 'Thread ID is required' });
    }

    const canParticipate = await validateThreadParticipation(req, threadId);
    if (!canParticipate) {
      return res.status(403).json({ message: 'You cannot participate in this thread' });
    }

    next();
  } catch (error) {
    console.error('Thread participation middleware error:', error);
    res.status(500).json({ message: 'Failed to validate thread participation' });
  }
}

/**
 * Filters messages based on user role and thread access
 * @param messages - Array of messages to filter
 * @param user - User object
 * @param threadId - Thread ID context
 * @returns Filtered array of messages
 */
export function filterMessagesByAccess(messages: any[], user: any, threadId: string): any[] {
  if (!user) return [];

  // Admin and staff can see all messages in threads they have access to
  if (user.role === 'admin' || user.role === 'staff') {
    return messages;
  }

  // Regular users can only see messages in their own thread
  if (user.role === 'user' && threadId === user._id.toString()) {
    return messages;
  }

  // No access for other cases
  return [];
}

/**
 * Validates message ownership for editing/deleting
 * @param req - Express request object
 * @param messageId - Message ID to validate
 * @returns True if user owns the message or is admin/staff
 */
export async function validateMessageOwnership(req: Request, messageId: string): Promise<boolean> {
  try {
    const user = req.user;
    if (!user) return false;

    const message = await ChatMessage.findById(messageId);
    if (!message) return false;

    // Admin and staff can manage all messages
    if (user.role === 'admin' || user.role === 'staff') {
      return true;
    }

    // Users can only manage their own messages
    return message.senderId === user._id.toString();
  } catch (error) {
    console.error('Message ownership validation error:', error);
    return false;
  }
}
