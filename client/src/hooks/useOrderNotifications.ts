import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { useData } from '@/lib/data';

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

  // Check for order status changes (only track changes made by staff/admin)
  useEffect(() => {
    if (!user || orders.length === 0) return;

    const checkOrderStatusChanges = () => {
      const userOrders = user.role === 'user' 
        ? orders.filter(order => order.user === user.name)
        : orders; // Admin/staff see all orders

      userOrders.forEach(order => {
        const lastStatusKey = `last_status_${order.id}`;
        const lastStatus = localStorage.getItem(lastStatusKey);
        
        // Create notifications for status changes made by staff/admin
        if (lastStatus && lastStatus !== order.status && (user.role === 'admin' || user.role === 'staff')) {
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

  // Check for new orders and create admin notifications
  useEffect(() => {
    if (!user || orders.length === 0) return;

    const checkForNewOrders = () => {
      if (user.role === 'admin' || user.role === 'staff') {
        // Get previous orders count
        const previousOrdersCount = orders.length;
        
        // Check if we have new orders (orders count increased)
        setTimeout(() => {
          if (orders.length > previousOrdersCount) {
            const newOrders = orders.slice(previousOrdersCount);
            
            newOrders.forEach(newOrder => {
              const notification: OrderNotification = {
                id: `new_order_${newOrder.id}_${Date.now()}`,
                orderId: newOrder.id,
                message: `New Order #${newOrder.id} for ${newOrder.total} from ${newOrder.user}`,
                status: 'New Order',
                timestamp: new Date().toISOString(),
                read: false
              };

              setNotifications(prev => {
                const updated = [notification, ...prev].slice(0, 50);
                localStorage.setItem(`order_notifications_${user.id}`, JSON.stringify(updated));
                return updated;
              });
            });
          }
        }, 1000); // Check every second for new orders
      }
    };

    checkForNewOrders();
  }, [orders, user]);

  // Request browser notification permission
  const requestNotificationPermission = async () => {
    if ('Notification' in window && 'Notification.requestPermission' in window.Notification) {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return false;
  };

  // Create browser notification
  const createBrowserNotification = (title: string, body: string, icon?: string) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification(title, {
        body,
        icon: icon || '/favicon.ico',
        tag: 'order-notification',
        requireInteraction: true,
        silent: false
      });

      notification.onclick = () => {
        window.focus();
        // Clicking notification focuses the window
      };

      notification.onshow = () => {
        // When notification is shown, update unread count
        setUnreadCount(prev => Math.max(0, prev - 1));
        setHasUnread(prev => prev > 1);
      };

      // Auto-dismiss after 5 seconds
      setTimeout(() => {
        notification.close();
      }, 5000);

      return notification;
    }
  };

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
    
    // Update unread count
    setUnreadCount(notifications.filter(n => !n.read).length);
    setHasUnread(notifications.filter(n => !n.read).length > 0);
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
