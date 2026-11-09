/**
 * Lớp HTTP dùng chung cho mọi module.
 * Đặt EXPO_PUBLIC_API_URL (vd: http://192.168.1.5:8080/api) để gọi backend thật.
 * Không đặt => mỗi module dùng dữ liệu mock của riêng nó để demo giao diện.
 */
const BASE_URL = process.env.EXPO_PUBLIC_API_URL;
export const isMock = !BASE_URL;
let token: string | null = null;
type TokenProvider = () => Promise<string | null>;
let tokenProvider: TokenProvider = async () => token;

export const setToken = (value: string | null) => { token = value; };
export const configureApiAuth = (provider: TokenProvider) => { tokenProvider = provider; };

/**
 * Module đăng nhập đăng ký thêm hàm làm mới token (refresh). `api()` gọi nó khi server trả 401,
 * rồi thử lại đúng một lần. Trả về token mới, hoặc null nếu không làm mới được.
 */
let refreshProvider: TokenProvider | null = null;
export const configureApiRefresh = (provider: TokenProvider) => { refreshProvider = provider; };
export const refreshAccessToken = (): Promise<string | null> => (refreshProvider ? refreshProvider() : Promise.resolve(null));

export function getApiBaseUrl(prefix = '', fallback = '') {
  const base = (BASE_URL || fallback).replace(/\/+$/, '');
  const normalizedPrefix = prefix ? `/${prefix.replace(/^\/+|\/+$/g, '')}` : '';
  return normalizedPrefix && !base.endsWith(normalizedPrefix) ? `${base}${normalizedPrefix}` : base;
}

const sleep = (ms = 350) => new Promise((resolve) => setTimeout(resolve, ms));

type CallOptions<R> = {
  baseUrl?: string;
  useMock?: boolean;
  requestInit?: RequestInit;
  parseResponse?: (response: Response) => Promise<R>;
};

async function fetchApi(url: string, init: RequestInit = {}) {
  const authToken = await tokenProvider();
  const isMultipart = typeof FormData !== 'undefined' && init.body instanceof FormData;
  const headers = new Headers(init.headers);
  if (!headers.has('Accept')) headers.set('Accept', 'application/json');
  if (!isMultipart && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  if (authToken && !headers.has('Authorization')) headers.set('Authorization', `Bearer ${authToken}`);
  return fetch(url, {
    ...init,
    headers,
  });
}

/** `mock` chạy khi chưa cấu hình backend. */
export async function call<R>(
  method: string,
  path: string,
  body: unknown | undefined,
  mock?: () => R | Promise<R>,
  options: CallOptions<R> = {},
): Promise<R> {
  if (isMock && options.useMock !== false) {
    if (!mock) throw new Error('Chức năng này chưa có dữ liệu demo. Hãy chạy với backend thật (npm run dev) và đăng nhập.');
    await sleep();
    return mock();
  }
  const init = options.requestInit ?? {};
  const res = await fetchApi(`${options.baseUrl ?? getApiBaseUrl()}${path}`, {
    ...init,
    method: init.method ?? method,
    body: init.body ?? (body === undefined ? undefined : JSON.stringify(body)),
  });
  if (options.parseResponse) return options.parseResponse(res);
  if (!res.ok) throw new Error((await res.text().catch(() => '')) || `HTTP ${res.status}`);
  return res.status === 204 ? (undefined as R) : res.json();
}
