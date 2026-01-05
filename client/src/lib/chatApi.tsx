import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { useHybridAuth } from '@/lib/hybrid-auth';
import { apiFetch } from "./api";
import { toast } from "sonner";

// Helper function with retry-after and exponential backoff for chat
const fetchChatWithRetry = async (url: string, maxRetries: number = 3) => {
  let retryCount = 0;
  
  while (retryCount <= maxRetries) {
    try {
      const response = await apiFetch(url);
      
      if (response.status === 429) {
        retryCount++;
        
        // Check for Retry-After header
        const retryAfter = response.headers.get('Retry-After');
        let delay = 1000 * Math.pow(2, retryCount - 1); // Exponential backoff
        
        if (retryAfter) {
          delay = parseInt(retryAfter) * 1000;
        }
        
        // Cap delay at 30 seconds
        delay = Math.min(delay, 30000);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      return response;
    } catch (error) {
      if (retryCount >= maxRetries) throw error;
      retryCount++;
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retryCount - 1)));
    }
  }
  
  throw new Error('Max retries exceeded');
};

export interface ChatMessage {
  id: string;
  threadId: string;
  senderId: string;
  senderName: string;
  senderRole: "admin" | "staff" | "user";
  text: string;
  timestamp?: string;
  createdAt?: string;
  isRead: boolean;
  encrypted: boolean;
}

export interface ChatThread {
  id: string;
  userName: string;
  lastMessage: ChatMessage | null;
  unreadCount: number;
  typing: boolean;
}

interface ChatContextType {
  messages: ChatMessage[];
  sendMessage: (threadId: string, sender: { id: string, name: string, role: "admin" | "staff" | "user" }, text: string, productId?: string, productInfo?: any) => Promise<void>;
  markThreadAsRead: (threadId: string, readerRole: "admin" | "staff" | "user") => Promise<void>;
  setTypingStatus: (threadId: string, isTyping: boolean) => void;
  getThreads: () => ChatThread[];
  refreshMessages: (threadId: string) => Promise<void>;
  refreshThreads: () => Promise<void>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
  const { user } = useHybridAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [typingStatus, setTypingStatusState] = useState<Record<string, boolean>>({});
  const [lastMessageCount, setLastMessageCount] = useState(0); // Track message count for notifications

  // Refresh messages for a specific thread
  const refreshMessages = useCallback(async (threadId: string) => {
    if (!user) return;
    
    try {
      const response = await fetchChatWithRetry(`/api/chat/messages?threadId=${threadId}`);
      
      if (response.ok) {
        const data = await response.json();
        const newMessages = data.messages || [];
        
        // Check for new messages and show notification
        if (newMessages.length > lastMessageCount && lastMessageCount > 0) {
          const latestMessage = newMessages[newMessages.length - 1];
          
          // Only show notification for messages from other users
          if (latestMessage.senderId !== user.id) {
            toast(`${latestMessage.senderName}: ${latestMessage.text}`, {
              description: "New message received",
              action: {
                label: "View Chat",
                onClick: () => {
                  // Navigate to chat if not already there
                  window.location.href = '/chat';
                }
              }
            });
          }
        }
        
        setMessages(newMessages);
        setLastMessageCount(newMessages.length);
      }
    } catch (error) {
      // Silently handle errors to avoid spam
    }
  }, [user, lastMessageCount]);

  // Refresh threads (admin/staff only)
  const refreshThreads = useCallback(async () => {
    if (!user || user.role === "user") return;
    
    try {
      const response = await fetchChatWithRetry("/api/chat/threads");
      
      if (response.ok) {
        const data = await response.json();
        
        setThreads(data.threads || []);
        
        // Check for new messages in any thread and show notification for admins
        if (data.threads && data.threads.length > 0) {
          const threadWithNewMessages = data.threads.find((thread: ChatThread) => 
            thread.unreadCount > 0 && thread.lastMessage?.senderRole === "user"
          );
          
          if (threadWithNewMessages) {
            toast(`New message from ${threadWithNewMessages.userName}`, {
              description: threadWithNewMessages.lastMessage?.text || "New customer message",
              action: {
                label: "View Chat",
                onClick: () => {
                  window.location.href = '/chat';
                }
              }
            });
          }
        }
      }
    } catch (error) {
      // Silently handle errors to avoid spam
    }
  }, [user]);

  // For users: load their own thread on mount
  useEffect(() => {
    if (user && user.role === "user") {
      refreshMessages(user.id);
    }
  }, [user, refreshMessages]);

  // For admin/staff: load all threads
  useEffect(() => {
    if (user && (user.role === "admin" || user.role === "staff")) {
      refreshThreads();
    }
  }, [user, refreshThreads]);

  const sendMessage = async (
    threadId: string,
    _sender: { id: string, name: string, role: "admin" | "staff" | "user" },
    text: string,
    productId?: string,
    productInfo?: any
  ) => {
    try {
      // Encrypt the message before sending using recipient-based encryption
      let encryptedText = text;
      try {
        // For client-side, we'll let the server handle the encryption
        // The server will create recipient-specific encrypted versions
        encryptedText = text; // Send plain text, server will encrypt properly
      } catch (encryptError) {
        console.error('Failed to prepare message client-side:', encryptError);
        // Continue with plain text if encryption fails (server will encrypt)
      }

      const response = await apiFetch(`/api/chat/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ threadId, text: encryptedText, productId, productInfo }),
      });

      if (response.ok) {
        const data = await response.json();
        // The server returns decrypted text for the sender
        setMessages(prev => [...prev, data.message]);
        
        // Refresh threads for admin/staff to update last message
        if (user && (user.role === "admin" || user.role === "staff")) {
          refreshThreads();
        }
      }
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  const markThreadAsRead = async (threadId: string, readerRole: "admin" | "staff" | "user") => {
    try {
      await apiFetch(`/api/chat/threads/${threadId}/read`, {
        method: "PATCH",
        body: JSON.stringify({ readerRole }),
      });

      // Update local messages optimistically
      setMessages(prev => prev.map(m => {
        if (m.threadId !== threadId) return m;
        
        if (readerRole === "admin" || readerRole === "staff") {
          return m.senderRole === "user" ? { ...m, isRead: true } : m;
        }
        
        if (readerRole === "user") {
          return (m.senderRole === "admin" || m.senderRole === "staff") ? { ...m, isRead: true } : m;
        }

        return m;
      }));

      // Refresh threads to update unread count
      if (user && (user.role === "admin" || user.role === "staff")) {
        refreshThreads();
      }
    } catch (error) {
      console.error("Failed to mark as read:", error);
    }
  };

  const setTypingStatus = (threadId: string, isTyping: boolean) => {
    setTypingStatusState(prev => ({ ...prev, [threadId]: isTyping }));
  };

  const getThreads = (): ChatThread[] => {
    return (threads || []).map(t => ({
      ...t,
      typing: typingStatus[t.id] || false,
    }));
  };

  return (
    <ChatContext.Provider value={{
      messages,
      sendMessage,
      markThreadAsRead,
      setTypingStatus,
      getThreads,
      refreshMessages,
      refreshThreads,
    }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error("useChat must be used within a ChatProvider");
  }
  return context;
}
