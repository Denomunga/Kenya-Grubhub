import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface OfflineDB extends DBSchema {
  orders: {
    key: string;
    value: {
      id: string;
      items: Array<{
        item: {
          id: string;
          name: string;
          price: number;
          category: string;
          image?: string;
        };
        quantity: number;
      }>;
      total: number;
      user: string;
      userPhone?: string;
      status: 'Pending' | 'Preparing' | 'Ready' | 'Delivered' | 'Cancelled';
      date: string;
      location?: {
        address: string;
        coordinates?: { lat: number; lng: number };
      };
      paymentMethod: 'mpesa' | 'cash' | 'card';
      paymentStatus: 'pending' | 'completed' | 'failed';
      synced: boolean;
      createdAt: string;
      updatedAt: string;
    };
    indexes: {
      'by-status': 'status';
      'by-synced': 'synced';
      'by-date': 'date';
    };
  };
  menu: {
    key: string;
    value: {
      id: string;
      name: string;
      price: number;
      category: string;
      image?: string;
      available: boolean;
      lastUpdated: string;
    };
    indexes: {
      'by-category': 'category';
      'by-available': 'available';
    };
  };
  syncQueue: {
    key: string;
    value: {
      id: string;
      type: 'create' | 'update' | 'delete';
      entityType: 'order' | 'menu' | 'payment';
      entityId: string;
      data: any;
      retryCount: number;
      maxRetries: number;
      priority: 'high' | 'medium' | 'low';
      createdAt: string;
      lastAttempt?: string;
    };
    indexes: {
      'by-type': 'type';
      'by-retry': 'retryCount';
      'by-entity': 'entityType';
    };
  };
  settings: {
    key: string;
    value: {
      key: string;
      value: any;
      updatedAt: string;
    };
  };
}

class OfflineStorage {
  private db: IDBPDatabase<OfflineDB> | null = null;
  private readonly DB_NAME = 'KenyaGrubHubPOS';
  private readonly DB_VERSION = 1;

  async init(): Promise<void> {
    if (this.db) return;

    this.db = await openDB<OfflineDB>(this.DB_NAME, this.DB_VERSION, {
      upgrade(db: IDBPDatabase<OfflineDB>) {
        // Orders store
        const orderStore = db.createObjectStore('orders', { keyPath: 'id' });
        orderStore.createIndex('by-status', 'status');
        orderStore.createIndex('by-synced', 'synced');
        orderStore.createIndex('by-date', 'date');

        // Menu store
        const menuStore = db.createObjectStore('menu', { keyPath: 'id' });
        menuStore.createIndex('by-category', 'category');
        menuStore.createIndex('by-available', 'available');

        // Sync queue store
        const syncStore = db.createObjectStore('syncQueue', { keyPath: 'id' });
        syncStore.createIndex('by-type', 'type');
        syncStore.createIndex('by-retry', 'retryCount');
        syncStore.createIndex('by-entity', 'entityType');

        // Settings store
        db.createObjectStore('settings', { keyPath: 'key' });
      },
    });
  }

  // Order operations
  async saveOrder(order: OfflineDB['orders']['value']): Promise<void> {
    if (!this.db) await this.init();
    await this.db!.add('orders', order);
  }

  async updateOrder(id: string, updates: Partial<OfflineDB['orders']['value']>): Promise<void> {
    if (!this.db) await this.init();
    const existing = await this.db!.get('orders', id);
    if (existing) {
      const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
      await this.db!.put('orders', updated);
    }
  }

  async getOrders(filter?: { status?: string; synced?: boolean }): Promise<OfflineDB['orders']['value'][]> {
    if (!this.db) await this.init();
    
    let orders: OfflineDB['orders']['value'][] = [];
    
    if (filter?.status) {
      orders = await this.db!.getAllFromIndex('orders', 'by-status', filter.status as any);
    } else if (filter?.synced !== undefined) {
      orders = await this.db!.getAllFromIndex('orders', 'by-synced', filter.synced as any);
    } else {
      orders = await this.db!.getAll('orders');
    }

    return orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getOrder(id: string): Promise<OfflineDB['orders']['value'] | undefined> {
    if (!this.db) await this.init();
    return await this.db!.get('orders', id);
  }

  // Menu operations
  async saveMenuItems(items: OfflineDB['menu']['value'][]): Promise<void> {
    if (!this.db) await this.init();
    const tx = this.db!.transaction('menu', 'readwrite');
    await Promise.all(items.map(item => tx.store.put(item)));
    await tx.done;
  }

  async getMenuItems(filter?: { category?: string; available?: boolean }): Promise<OfflineDB['menu']['value'][]> {
    if (!this.db) await this.init();
    
    let items: OfflineDB['menu']['value'][] = [];
    
    if (filter?.category) {
      items = await this.db!.getAllFromIndex('menu', 'by-category', filter.category as any);
    } else if (filter?.available !== undefined) {
      items = await this.db!.getAllFromIndex('menu', 'by-available', filter.available as any);
    } else {
      items = await this.db!.getAll('menu');
    }

    return items;
  }

  // Sync queue operations
  async addToSyncQueue(item: OfflineDB['syncQueue']['value']): Promise<void> {
    if (!this.db) await this.init();
    await this.db!.add('syncQueue', item);
  }

  async getSyncQueue(): Promise<OfflineDB['syncQueue']['value'][]> {
    if (!this.db) await this.init();
    return await this.db!.getAll('syncQueue');
  }

  async removeFromSyncQueue(id: string): Promise<void> {
    if (!this.db) await this.init();
    await this.db!.delete('syncQueue', id);
  }

  async updateSyncRetry(id: string, retryCount: number): Promise<void> {
    if (!this.db) await this.init();
    const existing = await this.db!.get('syncQueue', id);
    if (existing) {
      const updated = { 
        ...existing, 
        retryCount, 
        lastAttempt: new Date().toISOString() 
      };
      await this.db!.put('syncQueue', updated);
    }
  }

  // Settings operations
  async saveSetting(key: string, value: any): Promise<void> {
    if (!this.db) await this.init();
    await this.db!.put('settings', {
      key,
      value,
      updatedAt: new Date().toISOString()
    });
  }

  async getSetting(key: string): Promise<any> {
    if (!this.db) await this.init();
    const setting = await this.db!.get('settings', key);
    return setting?.value;
  }

  // Utility methods
  async clearAllData(): Promise<void> {
    if (!this.db) await this.init();
    const tx = this.db!.transaction(['orders', 'menu', 'syncQueue', 'settings'], 'readwrite');
    await Promise.all([
      tx.objectStore('orders').clear(),
      tx.objectStore('menu').clear(),
      tx.objectStore('syncQueue').clear(),
      tx.objectStore('settings').clear()
    ]);
    await tx.done;
  }

  async getStorageStats(): Promise<{
    orders: number;
    menuItems: number;
    syncQueueItems: number;
    unsyncedOrders: number;
  }> {
    if (!this.db) await this.init();
    
    const [orders, menuItems, syncQueueItems, unsyncedOrders] = await Promise.all([
      this.db!.count('orders'),
      this.db!.count('menu'),
      this.db!.count('syncQueue'),
      this.db!.countFromIndex('orders', 'by-synced', false as any)
    ]);

    return {
      orders,
      menuItems,
      syncQueueItems,
      unsyncedOrders
    };
  }
}

export const offlineStorage = new OfflineStorage();
