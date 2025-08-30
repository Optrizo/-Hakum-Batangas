import { useState, useEffect } from 'react';

export interface OfflineQueueItem {
  id: string;
  operation: 'update' | 'create' | 'delete';
  data: any;
  timestamp: number;
  retryCount: number;
}

export const useOfflineQueue = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [offlineQueue, setOfflineQueue] = useState<OfflineQueueItem[]>([]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const addToQueue = (item: Omit<OfflineQueueItem, 'timestamp' | 'retryCount'>) => {
    const queueItem: OfflineQueueItem = {
      ...item,
      timestamp: Date.now(),
      retryCount: 0,
    };
    
    setOfflineQueue(prev => [...prev, queueItem]);
  };

  const removeFromQueue = (id: string) => {
    setOfflineQueue(prev => prev.filter(item => item.id !== id));
  };

  const clearQueue = () => {
    setOfflineQueue([]);
  };

  return {
    isOnline,
    offlineQueue,
    addToQueue,
    removeFromQueue,
    clearQueue,
  };
};