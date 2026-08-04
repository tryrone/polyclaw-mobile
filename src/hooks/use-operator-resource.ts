import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { useAuth } from '@/auth/provider';
import type { OperatorEnvelope } from '@/lib/types';

export function useOperatorResource<T>(path: string, intervalMs = 20_000) {
  const { request, state } = useAuth();
  const [response, setResponse] = useState<OperatorEnvelope<T> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [clock, setClock] = useState(() => Date.now());

  const refresh = useCallback(async () => {
    if (state !== 'authenticated') return;
    try {
      const next = await request<T>(path);
      setResponse(next);
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not refresh');
    } finally { setLoading(false); }
  }, [path, request, state]);

  useEffect(() => {
    void Promise.resolve().then(refresh);
    const timer = setInterval(refresh, intervalMs);
    const clockTimer = setInterval(() => setClock(Date.now()), 5_000);
    const subscription = AppState.addEventListener('change', (next) => { if (next === 'active') refresh(); });
    return () => { clearInterval(timer); clearInterval(clockTimer); subscription.remove(); };
  }, [intervalMs, refresh]);

  const stale = response ? clock > new Date(response.staleAfter).getTime() : false;
  return { data: response?.data ?? null, meta: response, loading, error, stale, refresh };
}
