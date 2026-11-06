import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Tải dữ liệu mỗi khi màn hình được focus, và tải lại khi `deps` đổi.
 * `deps` nên là các giá trị đơn giản (chuỗi, số…) mà `fn` đang dùng.
 */
export function useLoad<T>(fn: () => Promise<T>, deps: readonly unknown[] = []) {
  const [data, setData] = useState<T>();
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(true);

  // Luôn gọi bản `fn` mới nhất mà không phải đưa nó vào danh sách phụ thuộc.
  const latest = useRef(fn);
  useEffect(() => { latest.current = fn; });

  const reload = useCallback(async () => {
    setError(undefined);
    try { setData(await latest.current()); } catch (e) { setError((e as Error).message); } finally { setLoading(false); }
  }, []);

  const depsKey = JSON.stringify(deps);
  useFocusEffect(useCallback(() => { void depsKey; reload(); }, [reload, depsKey]));
  return { data, error, loading, reload, setData };
}
