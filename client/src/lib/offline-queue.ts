import { offlineStorage } from './offline-storage';
import { v4 as uuidv4 } from 'uuid';

interface QueueItem {
  id: string;
  type: 'create' | 'update' | 'delete';
  entityType: 'order' | 'menu' | 'payment';
  entityId: string;
  data: any;
  retryCount: number;
  maxRetries: number;
  createdAt: string;
  lastAttempt?: string;
  priority: 'high' | 'medium' | 'low';
}

class OfflineQueue {
  private isProcessing = false;
  private syncInProgress = false;

  async addItem(item: Omit<QueueItem, 'id' | 'retryCount' | 'createdAt' | 'maxRetries'>): Promise<void> {
    const queueItem: QueueItem = {
      ...item,
      id: uuidv4(),
      retryCount: 0,
      maxRetries: item.priority === 'high' ? 5 : item.priority === 'medium' ? 3 : 1,
      createdAt: new Date().toISOString(),
    };

    await offlineStorage.addToSyncQueue(queueItem);
    
    // Try to sync immediately if online
    if (navigator.onLine) {
      this.processQueue();
    }
  }

  async processQueue(): Promise<void> {
    if (this.isProcessing || this.syncInProgress) return;
    
    this.isProcessing = true;
    
    try {
      const queue = await offlineStorage.getSyncQueue();
      
      // Sort by priority and creation date
      const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
      const sortedQueue = queue.sort((a, b) => {
        const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
        if (priorityDiff !== 0) return priorityDiff;
        
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });

      for (const item of sortedQueue) {
        if (item.retryCount >= item.maxRetries) {
          console.warn(`Max retries exceeded for item ${item.id}, skipping`);
          continue;
        }

        try {
          const success = await this.processQueueItem(item);
          
          if (success) {
            await offlineStorage.removeFromSyncQueue(item.id);
            console.log(`Successfully synced item ${item.id}`);
          } else {
            await this.updateRetryCount(item);
          }
        } catch (error) {
          console.error(`Error processing queue item ${item.id}:`, error);
          await this.updateRetryCount(item);
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }

  private async processQueueItem(item: QueueItem): Promise<boolean> {
    const { type, entityType, data, entityId } = item;
    
    try {
      let response: Response;

      switch (entityType) {
        case 'order':
          response = await this.syncOrder(type, data, entityId);
          break;
        case 'menu':
          response = await this.syncMenuItem(type, data, entityId);
          break;
        case 'payment':
          response = await this.syncPayment(type, data, entityId);
          break;
        default:
          throw new Error(`Unknown entity type: ${entityType}`);
      }

      if (response.ok) {
        // Update local storage to mark as synced
        if (entityType === 'order') {
          await offlineStorage.updateOrder(entityId, { synced: true });
        }
        return true;
      } else {
        console.error(`Server returned ${response.status} for item ${item.id}`);
        return false;
      }
    } catch (error) {
      console.error(`Network error processing item ${item.id}:`, error);
      return false;
    }
  }

  private async syncOrder(type: string, data: any, orderId: string): Promise<Response> {
    const url = `/api/orders${type === 'create' ? '' : `/${orderId}`}`;
    const method = type === 'create' ? 'POST' : type === 'update' ? 'PUT' : 'DELETE';
    
    return fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: type !== 'delete' ? JSON.stringify(data) : undefined,
    });
  }

  private async syncMenuItem(type: string, data: any, itemId: string): Promise<Response> {
    const url = `/api/menu${type === 'create' ? '' : `/${itemId}`}`;
    const method = type === 'create' ? 'POST' : type === 'update' ? 'PUT' : 'DELETE';
    
    return fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: type !== 'delete' ? JSON.stringify(data) : undefined,
    });
  }

  private async syncPayment(type: string, data: any, paymentId: string): Promise<Response> {
    const url = `/api/payments${type === 'create' ? '' : `/${paymentId}`}`;
    const method = type === 'create' ? 'POST' : 'PUT';
    
    return fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
  }

  private async updateRetryCount(item: QueueItem): Promise<void> {
    const newRetryCount = item.retryCount + 1;
    await offlineStorage.updateSyncRetry(item.id, newRetryCount);
    
    // Exponential backoff for retries
    if (newRetryCount < item.maxRetries) {
      const delay = Math.min(1000 * Math.pow(2, newRetryCount), 30000); // Max 30 seconds
      setTimeout(() => this.processQueue(), delay);
    }
  }

  async getQueueStats(): Promise<{
    totalItems: number;
    pendingItems: number;
    failedItems: number;
    itemsByType: Record<string, number>;
  }> {
    const queue = await offlineStorage.getSyncQueue();
    
    const stats = {
      totalItems: queue.length,
      pendingItems: queue.filter(item => item.retryCount === 0).length,
      failedItems: queue.filter(item => item.retryCount >= item.maxRetries).length,
      itemsByType: queue.reduce((acc, item) => {
        acc[item.entityType] = (acc[item.entityType] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    };

    return stats;
  }

  async clearFailedItems(): Promise<void> {
    const queue = await offlineStorage.getSyncQueue();
    const failedItems = queue.filter(item => item.retryCount >= item.maxRetries);
    
    for (const item of failedItems) {
      await offlineStorage.removeFromSyncQueue(item.id);
    }
  }

  async retryFailedItems(): Promise<void> {
    const queue = await offlineStorage.getSyncQueue();
    const failedItems = queue.filter(item => item.retryCount >= item.maxRetries);
    
    for (const item of failedItems) {
      await offlineStorage.updateSyncRetry(item.id, 0); // Reset retry count
    }
    
    await this.processQueue();
  }

  // Force sync all pending items
  async forceSync(): Promise<void> {
    if (this.syncInProgress) return;
    
    this.syncInProgress = true;
    try {
      await this.processQueue();
    } finally {
      this.syncInProgress = false;
    }
  }
}

export const offlineQueue = new OfflineQueue();
