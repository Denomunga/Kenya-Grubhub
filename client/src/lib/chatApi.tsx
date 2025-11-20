import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { useAuth } from "./auth";

export interface ChatMessage {
  id: string;
  threadId: string;
  senderId: string;
  senderName: string;
  senderRole: "admin" | "staff" | "user";
  text: string;
  timestamp: string;
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
  sendMessage: (threadId: string, sender: { id: string, name: string, role: "admin" | "staff" | "user" }, text: string) => Promise<void>;
  markThreadAsRead: (threadId: string, readerRole: "admin" | "staff" | "user") => Promise<void>;
  setTypingStatus: (threadId: string, isTyping: boolean) => void;
  getThreads: () => ChatThread[];
  refreshMessages: (threadId: string) => Promise<void>;
  refreshThreads: () => Promise<void>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [typingStatus, setTypingStatusState] = useState<Record<string, boolean>>({});

  // Refresh messages for a specific thread
  const refreshMessages = useCallback(async (threadId: string) => {
    if (!user) return;
    
    try {
      const response = await fetch(`/api/chat/threads/${threadId}/messages`, {
        credentials: "include",
      });
      
      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages);
      }
    } catch (error) {
      console.error("Failed to fetch messages:", error);
    }
  }, [user]);

  // Refresh threads (admin/staff only)
  const refreshThreads = useCallback(async () => {
    if (!user || user.role === "user") return;
    
    try {
      const response = await fetch("/api/chat/threads", {
        credentials: "include",
      });
      
      if (response.ok) {
        const data = await response.json();
        setThreads(data.threads);
      }
    } catch (error) {
      console.error("Failed to fetch threads:", error);
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
    sender: { id: string, name: string, role: "admin" | "staff" | "user" },
    text: string
  ) => {
    try {
      const response = await fetch("/api/chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ threadId, text }),
      });

      if (response.ok) {
        const data = await response.json();
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
      await fetch(`/api/chat/threads/${threadId}/read`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
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
    return threads.map(t => ({
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
