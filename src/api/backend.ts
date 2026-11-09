import { call, refreshAccessToken } from './http';

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
 * HÀM GỌI API CHUẨN CỦA CẢ NHÓM (xem QUY_UOC.md).
 * - Tự gắn token (do module auth-user cấp qua configureApiAuth, lấy từ khoá quizhub.session).
 * - Gặp 401: tự làm mới token qua auth-user rồi thử lại đúng 1 lần. Làm mới không được thì ném lỗi
 *   (auth-user sẽ xoá phiên và đưa người dùng về màn đăng nhập).
 * - Bóc `data` khỏi `{ code, message, data }`; lỗi thì ném ApiError với `message` tiếng Việt của server.
 * - `mock` là tuỳ chọn: không có EXPO_PUBLIC_API_URL (npm run demo) mà API không có `mock` thì báo lỗi rõ ràng.
 */
export async function api<T>(method: string, path: string, opts: { body?: unknown; query?: Query; mock?: () => T | Promise<T> } = {}): Promise<T> {
  const url = path + qs(opts.query);
  const send = () => call<T>(method, url, opts.body, opts.mock, {
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
  try {
    return await send();
  } catch (e) {
    if (e instanceof ApiError && e.status === 401 && (await refreshAccessToken())) return send();
    throw e;
  }
}
