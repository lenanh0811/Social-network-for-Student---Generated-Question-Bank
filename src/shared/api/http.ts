/**
 * Lớp HTTP dùng chung cho mọi module.
 * Đặt EXPO_PUBLIC_API_URL (vd: http://192.168.1.5:8080/api) để gọi backend thật.
 * Không đặt => mỗi module dùng dữ liệu mock của riêng nó để demo giao diện.
 */
const BASE_URL = process.env.EXPO_PUBLIC_API_URL;
export const isMock = !BASE_URL;
let token: string | null = null;
export const setToken = (t: string | null) => { token = t; };

const sleep = (ms = 350) => new Promise((r) => setTimeout(r, ms));

/** `mock` chạy khi chưa cấu hình backend. */
export async function call<R>(method: string, path: string, body: unknown | undefined, mock: () => R | Promise<R>): Promise<R> {
  if (isMock) {
    await sleep();
    return mock();
  }
  const res = await fetch(BASE_URL + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) throw new Error((await res.text().catch(() => '')) || `HTTP ${res.status}`);
  return res.status === 204 ? (undefined as R) : res.json();
}
