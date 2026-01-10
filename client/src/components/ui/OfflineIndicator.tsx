import { useState, useEffect } from 'react';
import { useOfflineStatus } from '@/hooks/useOfflineStatus';
import { offlineQueue } from '@/lib/offline-queue';
import { offlineStorage } from '@/lib/offline-storage';
import { 
  Wifi, 
  WifiOff, 
  AlertTriangle, 
  RefreshCw,
  Database
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function OfflineIndicator() {
  const { isOnline, isOffline, lastOnlineTime, offlineDuration, connectionType } = useOfflineStatus();
  const [queueStats, setQueueStats] = useState<any>(null);
  const [storageStats, setStorageStats] = useState<any>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const [queue, storage] = await Promise.all([
          offlineQueue.getQueueStats(),
          offlineStorage.getStorageStats()
        ]);
        setQueueStats(queue);
        setStorageStats(storage);
      } catch (error) {
        console.error('Error loading stats:', error);
      }
    };

    loadStats();
    const interval = setInterval(loadStats, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleForceSync = async () => {
    setIsSyncing(true);
    try {
      await offlineQueue.forceSync();
      // Reload stats
      const [queue, storage] = await Promise.all([
        offlineQueue.getQueueStats(),
        offlineStorage.getStorageStats()
      ]);
      setQueueStats(queue);
      setStorageStats(storage);
    } catch (error) {
      console.error('Error during force sync:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  const getConnectionColor = () => {
    if (!isOnline) return 'text-red-500';
    if (connectionType === 'wifi' || connectionType === 'ethernet') return 'text-green-500';
    if (connectionType === 'cellular') return 'text-yellow-500';
    return 'text-gray-500';
  };

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
      {/* Main Status Indicator */}
      <Card className={`${isOffline ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isOnline ? (
                <Wifi className={`h-5 w-5 ${getConnectionColor()}`} />
              ) : (
                <WifiOff className="h-5 w-5 text-red-500" />
              )}
              <div>
                <p className="font-medium text-sm">
                  {isOnline ? 'Online' : 'Offline'}
                </p>
                {connectionType && isOnline && (
                  <p className="text-xs text-gray-600">{connectionType}</p>
                )}
              </div>
            </div>
            
            {isOffline && lastOnlineTime && (
              <div className="text-right">
                <p className="text-xs text-gray-600">Offline for</p>
                <p className="text-sm font-medium">{formatDuration(offlineDuration)}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Sync Status */}
      {(queueStats?.totalItems > 0 || storageStats?.unsyncedOrders > 0) && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Database className="h-4 w-4" />
              Sync Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {queueStats && (
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-gray-600">Queue:</span>
                  <Badge variant="secondary" className="ml-1">
                    {queueStats.totalItems}
                  </Badge>
                </div>
                <div>
                  <span className="text-gray-600">Failed:</span>
                  <Badge variant="destructive" className="ml-1">
                    {queueStats.failedItems}
                  </Badge>
                </div>
              </div>
            )}
            
            {storageStats?.unsyncedOrders > 0 && (
              <div className="flex items-center gap-2 text-xs">
                <AlertTriangle className="h-3 w-3 text-yellow-600" />
                <span>{storageStats.unsyncedOrders} orders not synced</span>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button
                size="sm"
                onClick={handleForceSync}
                disabled={!isOnline || isSyncing}
                className="flex-1"
              >
                <RefreshCw className={`h-3 w-3 mr-1 ${isSyncing ? 'animate-spin' : ''}`} />
                {isSyncing ? 'Syncing...' : 'Sync Now'}
              </Button>
              
              {queueStats?.failedItems > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => offlineQueue.retryFailedItems()}
                  disabled={!isOnline}
                >
                  Retry Failed
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Storage Stats */}
      {storageStats && (storageStats.orders > 0 || storageStats.menuItems > 0) && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Database className="h-4 w-4" />
              Local Storage
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-gray-600">Orders:</span>
                <Badge variant="secondary" className="ml-1">
                  {storageStats.orders}
                </Badge>
              </div>
              <div>
                <span className="text-gray-600">Menu Items:</span>
                <Badge variant="secondary" className="ml-1">
                  {storageStats.menuItems}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
