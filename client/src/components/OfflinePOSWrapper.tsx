import { useEffect } from 'react';
import { useOfflineStatus } from '@/hooks/useOfflineStatus';
import { offlineQueue } from '@/lib/offline-queue';
import { offlineStorage } from '@/lib/offline-storage';
import { mongoDBSync } from '@/lib/mongodb-sync';
import { OfflineBackup } from '@/lib/offline-backup';
import { OfflineIndicator } from '@/components/ui/OfflineIndicator';

interface OfflinePOSWrapperProps {
  children: React.ReactNode;
}

export function OfflinePOSWrapper({ children }: OfflinePOSWrapperProps) {
  const { isOnline } = useOfflineStatus();

  useEffect(() => {
    // Initialize offline storage
    offlineStorage.init().catch(console.error);

    // Set up enhanced sync when coming back online
    const handleOnline = async () => {
      console.log('Connection restored, starting enhanced sync...');
      try {
        // Use MongoDB sync for robust synchronization
        await mongoDBSync.syncAllData();
        
        // Also process any remaining queue items
        await offlineQueue.processQueue();
        
        // Create backup after successful sync
        await OfflineBackup.autoBackup();
      } catch (error) {
        console.error('Error during enhanced sync:', error);
        // Fallback to basic queue processing
        try {
          await offlineQueue.processQueue();
        } catch (fallbackError) {
          console.error('Fallback sync also failed:', fallbackError);
        }
      }
    };

    // Set up periodic enhanced sync when online
    const syncInterval = setInterval(async () => {
      if (isOnline) {
        try {
          await mongoDBSync.syncAllData();
        } catch (error) {
          console.error('Error during periodic enhanced sync:', error);
        }
      }
    }, 60000); // Every minute for more frequent sync

    // Set up auto-backup every 30 minutes
    const backupInterval = setInterval(async () => {
      await OfflineBackup.autoBackup();
    }, 30 * 60 * 1000);

    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('online', handleOnline);
      clearInterval(syncInterval);
      clearInterval(backupInterval);
    };
  }, [isOnline]);

  // Cache menu items when online
  useEffect(() => {
    const cacheMenuItems = async () => {
      if (isOnline) {
        try {
          const response = await fetch('/api/menu');
          if (response.ok) {
            const menuItems = await response.json();
            await offlineStorage.saveMenuItems(menuItems);
            console.log('Menu items cached for offline use');
          }
        } catch (error) {
          console.error('Error caching menu items:', error);
        }
      }
    };

    cacheMenuItems();
    const interval = setInterval(cacheMenuItems, 300000); // Every 5 minutes

    return () => clearInterval(interval);
  }, [isOnline]);

  return (
    <>
      {children}
      <OfflineIndicator />
    </>
  );
}
