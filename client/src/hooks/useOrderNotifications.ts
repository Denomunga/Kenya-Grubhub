import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { useData } from '@/lib/data';
import { apiFetch } from '@/lib/api';

interface OrderNotification {
  id: string;
  orderId: string;
  message: string;
  status: string;
  timestamp: string;
  read: boolean;
}

export function useOrderNotifications() {
  const { user } = useAuth();
  const { orders } = useData();
  const [notifications, setNotifications] = useState<OrderNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [hasUnread, setHasUnread] = useState(false);

  // Load notifications from localStorage
  useEffect(() => {
    if (!user) return;
    
    const stored = localStorage.getItem(`order_notifications_${user.id}`);
    if (stored) {
      const parsed = JSON.parse(stored);
      setNotifications(parsed);
      const unread = parsed.filter((n: OrderNotification) => !n.read);
      setUnreadCount(unread.length);
      setHasUnread(unread.length > 0);
    }
  }, [user]);

  // Check for order status changes
  useEffect(() => {
    if (!user || orders.length === 0) return;

    const checkOrderStatusChanges = () => {
      const userOrders = user.role === 'user' 
        ? orders.filter(order => order.user === user.name)
        : orders; // Admin/staff see all orders

      userOrders.forEach(order => {
        const lastStatusKey = `last_status_${order.id}`;
        const lastStatus = localStorage.getItem(lastStatusKey);
        
        // If status changed, create notification
        if (lastStatus && lastStatus !== order.status) {
          const notification: OrderNotification = {
            id: `${order.id}_${Date.now()}`,
            orderId: order.id,
            message: getOrderStatusMessage(order.status),
            status: order.status,
            timestamp: new Date().toISOString(),
            read: false
          };

          setNotifications(prev => {
            const updated = [notification, ...prev].slice(0, 50); // Keep only last 50 notifications
            localStorage.setItem(`order_notifications_${user.id}`, JSON.stringify(updated));
            return updated;
          });
        }
        
        // Update last status
        localStorage.setItem(lastStatusKey, order.status);
      });
    };

    checkOrderStatusChanges();
  }, [orders, user]);

  // Update unread count when notifications change
  useEffect(() => {
    const unread = notifications.filter(n => !n.read);
    setUnreadCount(unread.length);
    setHasUnread(unread.length > 0);
  }, [notifications]);

  // Mark notifications as read
  const markAsRead = () => {
    if (!user) return;
    
    setNotifications(prev => {
      const updated = prev.map(n => ({ ...n, read: true }));
      localStorage.setItem(`order_notifications_${user.id}`, JSON.stringify(updated));
      return updated;
    });
    setUnreadCount(0);
    setHasUnread(false);
  };

  // Mark single notification as read
  const markNotificationAsRead = (notificationId: string) => {
    if (!user) return;
    
    setNotifications(prev => {
      const updated = prev.map(n => 
        n.id === notificationId ? { ...n, read: true } : n
      );
      localStorage.setItem(`order_notifications_${user.id}`, JSON.stringify(updated));
      return updated;
    });
  };

  // Clear all notifications
  const clearNotifications = () => {
    if (!user) return;
    
    setNotifications([]);
    setUnreadCount(0);
    setHasUnread(false);
    localStorage.removeItem(`order_notifications_${user.id}`);
  };

  return { 
    notifications, 
    unreadCount, 
    hasUnread, 
    markAsRead, 
    markNotificationAsRead,
    clearNotifications 
  };
}

function getOrderStatusMessage(status: string): string {
  switch (status) {
    case 'Pending':
      return 'Your order has been received and is pending confirmation';
    case 'Preparing':
      return 'Your order is now being prepared';
    case 'Ready':
      return 'Your order is ready for pickup/delivery';
    case 'Delivered':
      return 'Your order has been delivered successfully';
    case 'Cancelled':
      return 'Your order has been cancelled';
    default:
      return `Order status updated to: ${status}`;
  }
}
