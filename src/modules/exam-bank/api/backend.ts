import { call } from '@/shared/api/http';

/** Lỗi từ backend: `message` là thông báo tiếng Việt của server. */
export class ApiError extends Error {
  constructor(message: string, public status?: number, public code?: string) { super(message); }
}

type Query = Record<string, string | number | boolean | undefined | null>;
const qs = (q?: Query) => {
  const e = Object.entries(q ?? {}).filter(([, v]) => v !== undefined && v !== null && v !== '');
  return e.length ? `?${e.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`).join('&')}` : '';
};

/**
 * Gọi API backend (token do module auth cấp qua configureApiAuth) và bóc `data` khỏi `{ code, message, data }`.
 * Không có EXPO_PUBLIC_API_URL => chạy hàm `mock` để demo giao diện.
 */
export function api<T>(method: string, path: string, opts: { body?: unknown; query?: Query; mock: () => T | Promise<T> }): Promise<T> {
  return call<T>(method, path + qs(opts.query), opts.body, opts.mock, {
    parseResponse: async (res) => {
      const text = res.status === 204 ? '' : await res.text();
      let json: { code?: unknown; message?: string; data?: T } | undefined;
      try { json = text ? JSON.parse(text) : undefined; } catch { /* không phải JSON */ }
      if (!res.ok) {
        const fallback = res.status === 401 ? 'Phiên đăng nhập đã hết hạn, hãy đăng nhập lại.' : res.status === 403 ? 'Bạn không có quyền thực hiện thao tác này.' : `Lỗi máy chủ (HTTP ${res.status})`;
        throw new ApiError(json?.message || fallback, res.status, json?.code === undefined ? undefined : String(json.code));
      }
      return (json && 'data' in json ? json.data : undefined) as T;
    },
  });
}
