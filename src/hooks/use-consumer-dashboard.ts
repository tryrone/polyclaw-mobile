import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { useAuth } from '@/auth/provider';
import type { ConsumerDashboard } from '@/lib/types';

export function useConsumerDashboard(intervalMs = 20_000) {
  const { consumer, state } = useAuth();
  const [data, setData] = useState<ConsumerDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    if (state !== 'authenticated') return;
    try { setData(await consumer<ConsumerDashboard>('dashboard')); setError(null); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not refresh PolyClaw'); }
    finally { setLoading(false); }
  }, [consumer, state]);
  useEffect(() => {
    void Promise.resolve().then(refresh);
    const timer = setInterval(refresh, intervalMs);
    const subscription = AppState.addEventListener('change', (next) => { if (next === 'active') void refresh(); });
    return () => { clearInterval(timer); subscription.remove(); };
  }, [intervalMs, refresh]);
  return { data, error, loading, refresh };
}
