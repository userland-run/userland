import { useState, useEffect, useCallback } from 'react';
import { OPFSManager } from '../lib/opfs';

export function useOPFS() {
  const [manager] = useState(() => new OPFSManager());
  const [isReady, setIsReady] = useState(false);
  const [quota, setQuota] = useState<{ usage: number; quota: number } | null>(null);

  useEffect(() => {
    manager.init().then(() => setIsReady(true));
  }, [manager]);

  const refreshQuota = useCallback(async () => {
    const q = await manager.getQuota();
    setQuota(q);
    return q;
  }, [manager]);

  useEffect(() => {
    if (isReady) {
      refreshQuota();
    }
  }, [isReady, refreshQuota]);

  return {
    manager,
    isReady,
    quota,
    refreshQuota,
  };
}
