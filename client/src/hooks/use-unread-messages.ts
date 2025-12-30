import { useState, useEffect } from 'react';
import { useAuth } from "@/lib/auth";
import { useData } from "@/lib/data";
import { apiFetch } from "@/lib/api";
import { ChatThread } from "@/lib/data";

export function useUnreadMessages() {
  const { user } = useAuth();
  const { messages, getThreads } = useData();
  const threads = getThreads();
  const [unreadCount, setUnreadCount] = useState(0);
  const [hasUnread, setHasUnread] = useState(false);

  useEffect(() => {
    if (!user) return;

    const fetchUnreadCount = async () => {
      try {
        if (user.role === 'user') {
          // For regular users, check their own thread
          const response = await apiFetch(`/api/chat/messages?threadId=${user.id}`);
          if (response.ok) {
            const data = await response.json();
            const messages = data.messages || [];
            const unreadMessages = messages.filter((msg: any) => 
              !msg.isRead && msg.senderRole !== 'user'
            );
            setUnreadCount(unreadMessages.length);
            setHasUnread(unreadMessages.length > 0);
          }
        } else if (user.role === 'admin' || user.role === 'staff') {
          // For admins/staff, check all threads for unread user messages
          const totalUnread = threads.reduce((total: number, thread: ChatThread) => {
            return total + (thread.unreadCount || 0);
          }, 0);
          setUnreadCount(totalUnread);
          setHasUnread(totalUnread > 0);
        }
      } catch (error) {
        console.error('Failed to fetch unread messages:', error);
      }
    };

    fetchUnreadCount();

    // Set up polling for new messages
    const interval = setInterval(fetchUnreadCount, 10000); // Check every 10 seconds

    // ✅ Listen for real-time chat events to update notifications immediately
    const handleMessageRead = () => {
      // Update notifications immediately when messages are read
      setTimeout(fetchUnreadCount, 100); // Small delay to ensure backend is updated
    };

    const handleMessage = () => {
      // Update notifications immediately when new messages arrive
      setTimeout(fetchUnreadCount, 100);
    };

    window.addEventListener('chat:read', handleMessageRead);
    window.addEventListener('chat:message', handleMessage);

    return () => {
      clearInterval(interval);
      window.removeEventListener('chat:read', handleMessageRead);
      window.removeEventListener('chat:message', handleMessage);
    };
  }, [user, threads, messages]); // Add messages as dependency to recalculate when messages state changes

  const markAsRead = () => {
    // For users, clear all notifications
    // For admin/staff, this will be called when they view messages
    setUnreadCount(0);
    setHasUnread(false);
  };

  return { unreadCount, hasUnread, markAsRead };
}
