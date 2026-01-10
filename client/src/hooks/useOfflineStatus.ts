import { useState, useEffect } from 'react';

interface NetworkStatus {
  isOnline: boolean;
  isOffline: boolean;
  connectionType?: string;
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
}

export function useOfflineStatus(): NetworkStatus & {
  lastOnlineTime: Date | null;
  offlineDuration: number;
} {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
    isOnline: navigator.onLine,
    isOffline: !navigator.onLine,
  });
  const [lastOnlineTime, setLastOnlineTime] = useState<Date | null>(
    navigator.onLine ? new Date() : null
  );
  const [offlineDuration, setOfflineDuration] = useState(0);

  useEffect(() => {
    let offlineTimer: NodeJS.Timeout;

    const updateNetworkStatus = () => {
      const connection = (navigator as any).connection || 
                        (navigator as any).mozConnection || 
                        (navigator as any).webkitConnection;

      const newStatus: NetworkStatus = {
        isOnline: navigator.onLine,
        isOffline: !navigator.onLine,
        connectionType: connection?.type,
        effectiveType: connection?.effectiveType,
        downlink: connection?.downlink,
        rtt: connection?.rtt,
        saveData: connection?.saveData,
      };

      setNetworkStatus(newStatus);

      if (navigator.onLine) {
        setLastOnlineTime(new Date());
        setOfflineDuration(0);
        if (offlineTimer) {
          clearInterval(offlineTimer);
        }
      } else {
        setLastOnlineTime(null);
        // Start counting offline duration
        offlineTimer = setInterval(() => {
          setOfflineDuration(prev => prev + 1);
        }, 1000);
      }
    };

    const handleOnline = () => updateNetworkStatus();
    const handleOffline = () => updateNetworkStatus();
    const handleConnectionChange = () => updateNetworkStatus();

    // Initial status
    updateNetworkStatus();

    // Event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    const connection = (navigator as any).connection || 
                      (navigator as any).mozConnection || 
                      (navigator as any).webkitConnection;
    if (connection) {
      connection.addEventListener('change', handleConnectionChange);
    }

    // Periodic connectivity check (every 30 seconds)
    const connectivityCheck = setInterval(async () => {
      try {
        const response = await fetch('/api/health', {
          method: 'HEAD',
          cache: 'no-cache',
          signal: AbortSignal.timeout(5000)
        });
        
        if (response.ok && !navigator.onLine) {
          // Browser says offline but we can reach server
          setNetworkStatus(prev => ({ ...prev, isOnline: true, isOffline: false }));
        } else if (!response.ok && navigator.onLine) {
          // Browser says online but we can't reach server
          setNetworkStatus(prev => ({ ...prev, isOnline: false, isOffline: true }));
        }
      } catch (error) {
        // Can't reach server
        if (navigator.onLine) {
          setNetworkStatus(prev => ({ ...prev, isOnline: false, isOffline: true }));
        }
      }
    }, 30000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (connection) {
        connection.removeEventListener('change', handleConnectionChange);
      }
      clearInterval(connectivityCheck);
      if (offlineTimer) {
        clearInterval(offlineTimer);
      }
    };
  }, []);

  return {
    ...networkStatus,
    lastOnlineTime,
    offlineDuration,
  };
}
