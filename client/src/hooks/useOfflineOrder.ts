import { useState, useCallback } from 'react';
import { useOfflineStatus } from './useOfflineStatus';
import { offlineStorage } from '@/lib/offline-storage';
import { offlineQueue } from '@/lib/offline-queue';
import { OfflineValidator } from '@/lib/offline-validation';
import { v4 as uuidv4 } from 'uuid';

interface OrderItem {
  item: {
    id: string;
    name: string;
    price: number;
    category: string;
    image?: string;
  };
  quantity: number;
}

interface CreateOrderData {
  items: OrderItem[];
  user: string;
  userPhone?: string;
  location?: {
    address: string;
    coordinates?: { lat: number; lng: number };
  };
  paymentMethod: 'mpesa' | 'cash' | 'card';
}

export function useOfflineOrder() {
  const { isOnline } = useOfflineStatus();
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createOrder = useCallback(async (orderData: CreateOrderData) => {
    setIsCreating(true);
    setError(null);

    try {
      const orderId = uuidv4();
      const now = new Date().toISOString();
      
      // Calculate total
      const total = orderData.items.reduce(
        (sum, item) => sum + (item.item.price * item.quantity),
        0
      );

      const order = {
        id: orderId,
        ...orderData,
        total,
        status: 'Pending' as const,
        paymentStatus: 'pending' as const,
        synced: isOnline,
        date: now,
        createdAt: now,
        updatedAt: now,
      };

      // Validate and prepare order for storage
      const validation = OfflineValidator.validateAndPrepareOrder(order);
      if (!validation.isValid || !validation.data) {
        setError(validation.errors.join(', '));
        return { success: false, error: validation.errors.join(', ') };
      }

      // Save to local storage first
      await offlineStorage.saveOrder(validation.data);

      if (isOnline) {
        // Try to sync immediately if online
        try {
          const response = await fetch('/api/orders', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(order),
          });

          if (response.ok) {
            // Mark as synced
            await offlineStorage.updateOrder(orderId, { synced: true });
            return { success: true, orderId, synced: true };
          } else {
            throw new Error(`Server error: ${response.status}`);
          }
        } catch (syncError) {
          console.error('Failed to sync order immediately:', syncError);
          // Add to queue for later sync
          await offlineQueue.addItem({
            type: 'create',
            entityType: 'order',
            entityId: orderId,
            data: validation.data,
            priority: 'high',
          });
          return { success: true, orderId, synced: false };
        }
      } else {
        // Add to sync queue for when we come back online
        await offlineQueue.addItem({
          type: 'create',
          entityType: 'order',
          entityId: orderId,
          data: validation.data,
          priority: 'high',
        });
        return { success: true, orderId, synced: false };
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create order';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsCreating(false);
    }
  }, [isOnline]);

  const updateOrderStatus = useCallback(async (
    orderId: string, 
    status: 'Pending' | 'Preparing' | 'Ready' | 'Delivered' | 'Cancelled'
  ) => {
    try {
      const updateData = { status, updatedAt: new Date().toISOString() };
      
      // Update local storage
      await offlineStorage.updateOrder(orderId, updateData);

      if (isOnline) {
        // Try to sync immediately
        try {
          const response = await fetch(`/api/orders/${orderId}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(updateData),
          });

          if (!response.ok) {
            throw new Error(`Server error: ${response.status}`);
          }
        } catch (syncError) {
          console.error('Failed to sync status update:', syncError);
          // Add to queue for later sync
          await offlineQueue.addItem({
            type: 'update',
            entityType: 'order',
            entityId: orderId,
            data: updateData,
            priority: 'medium',
          });
        }
      } else {
        // Add to sync queue for when we come back online
        await offlineQueue.addItem({
          type: 'update',
          entityType: 'order',
          entityId: orderId,
          data: updateData,
          priority: 'medium',
        });
      }

      return { success: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update order';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, [isOnline]);

  const getOrders = useCallback(async (filter?: { status?: string; synced?: boolean }) => {
    try {
      const orders = await offlineStorage.getOrders(filter);
      // Restore orders from storage (decrypt sensitive data)
      return orders.map(order => OfflineValidator.restoreOrderFromStorage(order));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get orders';
      setError(errorMessage);
      return [];
    }
  }, []);

  const getOrder = useCallback(async (orderId: string) => {
    try {
      const order = await offlineStorage.getOrder(orderId);
      return order ? OfflineValidator.restoreOrderFromStorage(order) : null;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get order';
      setError(errorMessage);
      return null;
    }
  }, []);

  const markOrderAsPaid = useCallback(async (orderId: string, paymentMethod: 'mpesa' | 'cash' | 'card') => {
    try {
      const updateData = { 
        paymentStatus: 'completed' as const,
        paymentMethod,
        updatedAt: new Date().toISOString()
      };
      
      // Update local storage
      await offlineStorage.updateOrder(orderId, updateData);

      if (isOnline) {
        // Try to sync immediately
        try {
          const response = await fetch(`/api/orders/${orderId}/payment`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(updateData),
          });

          if (!response.ok) {
            throw new Error(`Server error: ${response.status}`);
          }
        } catch (syncError) {
          console.error('Failed to sync payment update:', syncError);
          // Add to queue for later sync
          await offlineQueue.addItem({
            type: 'update',
            entityType: 'payment',
            entityId: orderId,
            data: updateData,
            priority: 'high',
          });
        }
      } else {
        // Add to sync queue for when we come back online
        await offlineQueue.addItem({
          type: 'update',
          entityType: 'payment',
          entityId: orderId,
          data: updateData,
          priority: 'high',
        });
      }

      return { success: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to mark order as paid';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, [isOnline]);

  return {
    createOrder,
    updateOrderStatus,
    getOrders,
    getOrder,
    markOrderAsPaid,
    isCreating,
    error,
    clearError: () => setError(null),
  };
}
