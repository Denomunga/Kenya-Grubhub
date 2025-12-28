import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { useChat } from '@/lib/chatApi';
import { apiFetch } from '@/lib/api';

export function useUnreadMessages() {
  const { user } = useAuth();
  const { getThreads } = useChat();
  const threads = getThreads();
  const [unreadCount, setUnreadCount] = useState(0);
  const [hasUnread, setHasUnread] = useState(false);

  useEffect(() => {
    if (!user) return;

    const calculateUnreadCount = () => {
      if (user.role === 'user') {
        // For regular users, count unread messages from staff/admin
        const userThread = threads.find(t => t.id === user.id);
        setUnreadCount(userThread?.unreadCount || 0);
        setHasUnread((userThread?.unreadCount || 0) > 0);
      } else if (user.role === 'admin' || user.role === 'staff') {
        // For admin/staff, count total unread messages across all threads
        const totalUnread = threads.reduce((sum, thread) => {
          return sum + (thread.unreadCount || 0);
        }, 0);
        setUnreadCount(totalUnread);
        setHasUnread(totalUnread > 0);
      }
    };

    calculateUnreadCount();

    // Set up polling to check for new unread messages
    const interval = setInterval(calculateUnreadCount, 10000); // Check every 10 seconds

    return () => clearInterval(interval);
  }, [user, threads]);

  // Mark messages as read when user views the chat
  const markAsRead = async () => {
    if (!user) return;
    
    try {
      if (user.role === 'user') {
        await apiFetch(`/api/chat/threads/${user.id}/read`, {
          method: 'PATCH',
          body: JSON.stringify({ readerRole: user.role })
        });
      } else {
        // For admin/staff, mark all threads as read
        await Promise.all(
          threads.map(thread => 
            apiFetch(`/api/chat/threads/${thread.id}/read`, {
              method: 'PATCH',
              body: JSON.stringify({ readerRole: user.role })
            })
          )
        );
      }
      setUnreadCount(0);
      setHasUnread(false);
    } catch (error) {
      console.error('Failed to mark messages as read:', error);
    }
  };

  return { unreadCount, hasUnread, markAsRead };
}
