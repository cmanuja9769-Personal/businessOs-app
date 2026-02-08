import { useState, useEffect, useCallback } from 'react';
import { NetworkService } from '@services/network';

interface UseNetworkStatusReturn {
  isConnected: boolean;
  isChecking: boolean;
  checkConnection: () => Promise<boolean>;
}

export function useNetworkStatus(): UseNetworkStatusReturn {
  const [isConnected, setIsConnected] = useState(true);
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    const unsubscribe = NetworkService.subscribeToNetworkChanges((connected) => {
      setIsConnected(connected);
    });

    NetworkService.checkConnection().then(setIsConnected);

    return () => unsubscribe();
  }, []);

  const checkConnection = useCallback(async () => {
    setIsChecking(true);
    const connected = await NetworkService.checkConnection();
    setIsConnected(connected);
    setIsChecking(false);
    return connected;
  }, []);

  return { isConnected, isChecking, checkConnection };
}
