import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { useAuth } from '@/auth/provider';
import type { ConsumerProcedure } from '@/lib/api';

export function useConsumerResource<T>(procedure: ConsumerProcedure, input?: Record<string, unknown>, intervalMs = 30_000) {
  const { consumer, state } = useAuth();
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const serializedInput = JSON.stringify(input ?? {});
  const refresh = useCallback(async () => {
    if (state !== 'authenticated') return;
    try { setData(await consumer<T>(procedure, JSON.parse(serializedInput))); setError(null); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not refresh PolyClaw'); }
    finally { setLoading(false); }
  }, [consumer, procedure, serializedInput, state]);
  useEffect(() => {
    void Promise.resolve().then(refresh);
    const timer = setInterval(refresh, intervalMs);
    const subscription = AppState.addEventListener('change', (next) => { if (next === 'active') void refresh(); });
    return () => { clearInterval(timer); subscription.remove(); };
  }, [intervalMs, refresh]);
  return { data, error, loading, refresh };
}
