import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

/** Tải dữ liệu mỗi khi màn hình được focus. */
export function useLoad<T>(fn: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T>();
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(true);
  const reload = useCallback(async () => {
    setError(undefined);
    try { setData(await fn()); } catch (e) { setError((e as Error).message); } finally { setLoading(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useFocusEffect(useCallback(() => { reload(); }, [reload]));
  return { data, error, loading, reload, setData };
}
