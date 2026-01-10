import { offlineStorage } from './offline-storage';
import { OfflineValidator } from './offline-validation';

interface SyncResult {
  success: boolean;
  synced: number;
  failed: number;
  conflicts: number;
  errors: string[];
}

export class MongoDBSync {
  private static instance: MongoDBSync;
  private syncInProgress = false;
  private lastSyncTime: Date | null = null;

  static getInstance(): MongoDBSync {
    if (!MongoDBSync.instance) {
      MongoDBSync.instance = new MongoDBSync();
    }
    return MongoDBSync.instance;
  }

  // Main sync method
  async syncAllData(): Promise<SyncResult> {
    if (this.syncInProgress) {
      return {
        success: false,
        synced: 0,
        failed: 0,
        conflicts: 0,
        errors: ['Sync already in progress']
      };
    }

    this.syncInProgress = true;
    const result: SyncResult = {
      success: true,
      synced: 0,
      failed: 0,
      conflicts: 0,
      errors: []
    };

    try {
      // Sync orders first (highest priority)
      const orderResult = await this.syncOrders();
      result.synced += orderResult.synced;
      result.failed += orderResult.failed;
      result.conflicts += orderResult.conflicts;
      result.errors.push(...orderResult.errors);

      // Then sync menu items
      const menuResult = await this.syncMenuItems();
      result.synced += menuResult.synced;
      result.failed += menuResult.failed;
      result.conflicts += menuResult.conflicts;
      result.errors.push(...menuResult.errors);

      // Finally sync payments
      const paymentResult = await this.syncPayments();
      result.synced += paymentResult.synced;
      result.failed += paymentResult.failed;
      result.conflicts += paymentResult.conflicts;
      result.errors.push(...paymentResult.errors);

      this.lastSyncTime = new Date();
      
      // Save sync status
      await offlineStorage.saveSetting('lastSyncTime', this.lastSyncTime.toISOString());
      await offlineStorage.saveSetting('lastSyncResult', result);

    } catch (error) {
      result.success = false;
      result.errors.push(`Sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      this.syncInProgress = false;
    }

    return result;
  }

  // Sync orders with conflict resolution
  private async syncOrders(): Promise<SyncResult> {
    const result: SyncResult = {
      success: true,
      synced: 0,
      failed: 0,
      conflicts: 0,
      errors: []
    };

    try {
      const unsyncedOrders = await offlineStorage.getOrders({ synced: false });
      
      for (const order of unsyncedOrders) {
        try {
          // Restore order from storage (decrypt sensitive data)
          const restoredOrder = OfflineValidator.restoreOrderFromStorage(order);
          
          // Verify integrity
          if (!OfflineValidator.verifyOrderIntegrity(restoredOrder, (order as any).checksum)) {
            result.failed++;
            result.errors.push(`Order ${order.id} integrity check failed`);
            continue;
          }

          // Try to sync with server
          const syncResult = await this.syncOrderWithServer(restoredOrder);
          
          if (syncResult.success) {
            await offlineStorage.updateOrder(order.id, { synced: true });
            result.synced++;
          } else if (syncResult.conflict) {
            const resolution = await this.resolveConflict(restoredOrder, syncResult.conflict);
            if (resolution.resolved) {
              await offlineStorage.updateOrder(order.id, { 
                synced: true,
                ...resolution.mergedData
              });
              result.synced++;
              result.conflicts++;
            } else {
              result.failed++;
              result.errors.push(`Order ${order.id} conflict resolution failed`);
            }
          } else {
            result.failed++;
            result.errors.push(`Order ${order.id} sync failed: ${syncResult.error}`);
          }
        } catch (error) {
          result.failed++;
          result.errors.push(`Order ${order.id} error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    } catch (error) {
      result.success = false;
      result.errors.push(`Order sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return result;
  }

  // Sync individual order with server
  private async syncOrderWithServer(order: any): Promise<{
    success: boolean;
    conflict?: any;
    error?: string;
  }> {
    try {
      const response = await fetch('/api/orders/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Offline-Sync': 'true',
        },
        body: JSON.stringify({
          order,
          clientTimestamp: order.updatedAt,
          checksum: order.checksum
        }),
      });

      if (response.ok) {
        return { success: true };
      } else if (response.status === 409) {
        // Conflict detected
        const conflictData = await response.json();
        return { 
          success: false, 
          conflict: conflictData 
        };
      } else {
        const errorText = await response.text();
        return { 
          success: false, 
          error: `Server error: ${response.status} - ${errorText}` 
        };
      }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Network error' 
      };
    }
  }

  // Conflict resolution logic
  private async resolveConflict(localOrder: any, serverData: any): Promise<{
    resolved: boolean;
    mergedData?: any;
  }> {
    try {
      // Compare timestamps to determine which is newer
      const localTime = new Date(localOrder.updatedAt);
      const serverTime = new Date(serverData.updatedAt);

      if (localTime > serverTime) {
        // Local is newer, use local data
        return { resolved: true, mergedData: localOrder };
      } else if (serverTime > localTime) {
        // Server is newer, use server data but preserve local sensitive info
        const mergedOrder = {
          ...serverData,
          userPhone: localOrder.userPhone,
          location: localOrder.location,
        };
        return { resolved: true, mergedData: mergedOrder };
      } else {
        // Same timestamp, merge intelligently
        const mergedOrder = this.mergeOrders(localOrder, serverData);
        return { resolved: true, mergedData: mergedOrder };
      }
    } catch (error) {
      console.error('Conflict resolution error:', error);
      return { resolved: false };
    }
  }

  // Intelligent order merging
  private mergeOrders(localOrder: any, serverOrder: any): any {
    // Preserve the most recent status changes
    const statusPriority = {
      'Cancelled': 4,
      'Delivered': 3,
      'Ready': 2,
      'Preparing': 1,
      'Pending': 0
    };

    const localStatusPriority = statusPriority[localOrder.status as keyof typeof statusPriority] || 0;
    const serverStatusPriority = statusPriority[serverOrder.status as keyof typeof statusPriority] || 0;

    return {
      ...serverOrder,
      // Use local if status is more advanced
      status: localStatusPriority > serverStatusPriority ? localOrder.status : serverOrder.status,
      // Preserve local sensitive data
      userPhone: localOrder.userPhone,
      location: localOrder.location,
      // Use most recent payment status
      paymentStatus: localOrder.paymentStatus === 'completed' ? 'completed' : serverOrder.paymentStatus,
      // Update timestamp
      updatedAt: new Date().toISOString(),
    };
  }

  // Sync menu items
  private async syncMenuItems(): Promise<SyncResult> {
    const result: SyncResult = {
      success: true,
      synced: 0,
      failed: 0,
      conflicts: 0,
      errors: []
    };

    try {
      // Fetch latest menu from server
      const response = await fetch('/api/menu');
      if (response.ok) {
        const serverMenu = await response.json();
        await offlineStorage.saveMenuItems(serverMenu);
        result.synced = serverMenu.length;
      } else {
        result.errors.push('Failed to fetch menu from server');
        result.success = false;
      }
    } catch (error) {
      result.success = false;
      result.errors.push(`Menu sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return result;
  }

  // Sync payments
  private async syncPayments(): Promise<SyncResult> {
    const result: SyncResult = {
      success: true,
      synced: 0,
      failed: 0,
      conflicts: 0,
      errors: []
    };

    try {
      const queue = await offlineStorage.getSyncQueue();
      const paymentItems = queue.filter(item => item.entityType === 'payment');

      for (const item of paymentItems) {
        try {
          const response = await fetch('/api/payments/sync', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(item.data),
          });

          if (response.ok) {
            await offlineStorage.removeFromSyncQueue(item.id);
            result.synced++;
          } else {
            result.failed++;
            result.errors.push(`Payment ${item.entityId} sync failed`);
          }
        } catch (error) {
          result.failed++;
          result.errors.push(`Payment ${item.entityId} error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    } catch (error) {
      result.success = false;
      result.errors.push(`Payment sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return result;
  }

  // Get sync status
  async getSyncStatus(): Promise<{
    lastSyncTime: Date | null;
    pendingSyncs: number;
    lastResult: SyncResult | null;
  }> {
    const pendingSyncs = await offlineStorage.getSyncQueue();
    const lastResult = await offlineStorage.getSetting('lastSyncResult');

    return {
      lastSyncTime: this.lastSyncTime,
      pendingSyncs: pendingSyncs.length,
      lastResult: lastResult || null,
    };
  }

  // Force full resync
  async forceFullResync(): Promise<SyncResult> {
    try {
      // Mark all orders as unsynced
      const orders = await offlineStorage.getOrders();
      for (const order of orders) {
        await offlineStorage.updateOrder(order.id, { synced: false });
      }

      // Clear sync queue
      const queue = await offlineStorage.getSyncQueue();
      for (const item of queue) {
        await offlineStorage.removeFromSyncQueue(item.id);
      }

      // Perform full sync
      return await this.syncAllData();
    } catch (error) {
      return {
        success: false,
        synced: 0,
        failed: 0,
        conflicts: 0,
        errors: [`Force resync failed: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  }
}

export const mongoDBSync = MongoDBSync.getInstance();
