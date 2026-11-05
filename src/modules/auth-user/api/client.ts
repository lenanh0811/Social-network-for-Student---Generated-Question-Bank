/**
 * Service gọi API Authentication & User Management (/auth/*, /users/*, /devices/register).
 * - Envelope `{ code, message, data }` giống các module khác (xem SOCIAL_API.md).
 * - Tự gắn access token, tự refresh khi sắp hết hạn hoặc khi server trả 401, và chỉ refresh 1 lần cho nhiều request cùng lúc.
 * - Không đặt EXPO_PUBLIC_API_URL => chạy trên mockDb.
 * Dùng fetch trực tiếp thay vì `call()` vì request refresh không được chờ token provider (tránh vòng lặp).
 */
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { configureApiAuth, getApiBaseUrl, isMock } from '@/shared/api/http';
import type { Role } from '@/shared/types';
import { mock } from './mockDb';
import { storage } from './storage';
import {
  AuthError, type DeviceInfo, type PublicProfile, type RegisterInput, type Session, type UpdateProfileInput, type UserProfile,
} from './types';

const SESSION_KEY = 'quizhub.session';
const DEVICE_KEY = 'quizhub.device_id';
const SUCCESS = new Set(['1000', '0000', 'SUCCESS']);
/** Refresh sớm 30 giây trước khi access token hết hạn. */
const SKEW = 30_000;

// ───────── Phiên đăng nhập ─────────
let session: Session | null = null;
let refreshing: Promise<Session> | null = null;
const listeners = new Set<(s: Session | null) => void>();

/** Lắng nghe khi phiên thay đổi (đăng nhập/đăng xuất/refresh thất bại). */
export const onSessionChange = (fn: (s: Session | null) => void) => {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
};

async function setSession(s: Session | null) {
  session = s;
  if (s) await storage.set(SESSION_KEY, JSON.stringify(s));
  else await storage.remove(SESSION_KEY);
  listeners.forEach((fn) => fn(s));
}

/** Đọc phiên đã lưu khi mở app. */
export async function restoreSession() {
  try {
    const raw = await storage.get(SESSION_KEY);
    const s = raw ? (JSON.parse(raw) as Session) : null;
    session = s?.accessToken && s.refreshToken ? s : null;
  } catch {
    session = null;
  }
  return session;
}

export const clearSession = () => setSession(null);

let deviceId: string | null = null;
/** Thông tin thiết bị hiện tại (device_id sinh 1 lần rồi lưu lại). */
export async function device(): Promise<DeviceInfo> {
  if (!deviceId) {
    deviceId = await storage.get(DEVICE_KEY);
    if (!deviceId) {
      deviceId = `dev-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
      await storage.set(DEVICE_KEY, deviceId);
    }
  }
  const name = Platform.OS === 'web' ? 'Trình duyệt web' : Constants.deviceName ?? (Platform.OS === 'ios' ? 'iPhone' : 'Điện thoại Android');
  // Backend yêu cầu platform viết HOA: IOS | ANDROID | DESKTOP | WEB (Platform.OS trả về chữ thường).
  const platform = ({ ios: 'IOS', android: 'ANDROID', web: 'WEB' } as Record<string, string>)[Platform.OS] ?? 'DESKTOP';
  return { id: deviceId, name, platform };
}

// ───────── HTTP ─────────
const sleep = (ms = 350) => new Promise((r) => setTimeout(r, ms));
const baseUrl = () => getApiBaseUrl('api/v1');

async function send<R>(method: string, path: string, body?: unknown, token?: string | null): Promise<R> {
  let res: Response;
  try {
    res = await fetch(`${baseUrl()}${path}`, {
      method,
      headers: {
        Accept: 'application/json',
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new AuthError('Không kết nối được máy chủ. Kiểm tra mạng và thử lại.', 0, 'NETWORK_ERROR');
  }
  const text = res.status === 204 ? '' : await res.text();
  let json: { code?: unknown; message?: string; data?: unknown; errors?: Record<string, string> } | null = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* không phải JSON */ }
  const code = json && json.code !== undefined ? String(json.code) : undefined;
  if (!res.ok || (code && !SUCCESS.has(code))) {
    const fallback = res.status === 401 ? 'Phiên đăng nhập không hợp lệ' : `Lỗi máy chủ (HTTP ${res.status})`;
    throw new AuthError(json?.message || fallback, res.status, code, json?.errors);
  }
  return (json && 'data' in json ? json.data : json) as R;
}

/** Đổi refresh token lấy access token mới (single-flight). Thất bại => xoá phiên. */
export function refreshSession(): Promise<Session> {
  if (!refreshing) {
    const current = session;
    refreshing = (async () => {
      if (!current) throw new AuthError('Bạn chưa đăng nhập', 401, 'UNAUTHORIZED');
      try {
        const next = isMock
          ? (await sleep(150), mock.refresh(current.refreshToken))
          : toSession(await send<RawTokens>('POST', '/auth/refresh', { refresh_token: current.refreshToken }), current.refreshToken);
        await setSession(next);
        return next;
      } catch (e) {
        // Chỉ đăng xuất khi server từ chối token, không đăng xuất vì mất mạng.
        if (e instanceof AuthError && e.status !== 0) await setSession(null);
        throw e;
      }
    })().finally(() => { refreshing = null; });
  }
  return refreshing;
}

/** Access token còn hạn (refresh nếu cần). Dùng chung cho mọi module qua configureApiAuth. */
export async function getAccessToken() {
  if (refreshing) return (await refreshing).accessToken;
  if (!session) return null;
  if (session.expiresAt - SKEW < Date.now()) {
    try { return (await refreshSession()).accessToken; } catch { return null; }
  }
  return session.accessToken;
}
configureApiAuth(getAccessToken);

/** Request cần đăng nhập: gặp 401 thì refresh rồi thử lại đúng 1 lần. */
async function authed<R>(method: string, path: string, body: unknown, mockFn: (token: string | null) => R): Promise<R> {
  const run = async (token: string | null) => (isMock ? (await sleep(), mockFn(token)) : send<R>(method, path, body, token));
  const token = await getAccessToken();
  try {
    return await run(token);
  } catch (e) {
    if (!(e instanceof AuthError) || e.status !== 401 || !session) throw e;
    return run((await refreshSession()).accessToken);
  }
}

/** Request công khai (đăng ký, đăng nhập...). */
const open = async <R>(method: string, path: string, body: unknown, mockFn: () => R): Promise<R> =>
  isMock ? (await sleep(), mockFn()) : send<R>(method, path, body);

// ───────── Ánh xạ dữ liệu server (snake_case) ─────────
type RawTokens = { access_token: string; refresh_token?: string; expires_in?: number };
type RawUser = Record<string, unknown>;

function toSession(t: RawTokens, prevRefresh?: string): Session {
  return {
    accessToken: t.access_token,
    refreshToken: t.refresh_token ?? prevRefresh ?? '',
    expiresAt: Date.now() + (t.expires_in ?? 900) * 1000,
  };
}
const str = (v: unknown) => (typeof v === 'string' && v ? v : undefined);
const toRole = (v: unknown): Role => (String(v ?? '').toLowerCase().match(/lecturer|teacher|giang/) ? 'lecturer' : 'student');

export function toUser(u: RawUser): UserProfile {
  return {
    id: String(u.user_id ?? u.id ?? ''),
    name: str(u.full_name) ?? str(u.name) ?? str(u.username) ?? 'Người dùng',
    role: toRole(u.role),
    email: str(u.email) ?? '',
    verified: Boolean(u.is_verified ?? u.verified ?? true),
    avatarUrl: str(u.avatar_url),
    studentId: str(u.student_id),
    faculty: str(u.faculty),
    className: str(u.class_name),
    phone: str(u.phone),
    bio: str(u.bio),
    createdAt: str(u.created_at),
  };
}

// ───────── API ─────────
/** POST /auth/register */
export const register = (p: RegisterInput) =>
  open('POST', '/auth/register', {
    full_name: p.fullName.trim(), email: p.email.trim().toLowerCase(), password: p.password,
    role: p.role.toUpperCase(), student_id: p.studentId || undefined,
  }, () => mock.register(p)).then(() => ({ email: p.email.trim().toLowerCase() }));

/** POST /auth/verify */
export const verify = (email: string, code: string) =>
  open('POST', '/auth/verify', { email, code }, () => mock.verify(email, code)).then(() => undefined);

/** POST /auth/login — lưu phiên và trả về hồ sơ. */
export async function login(email: string, password: string): Promise<UserProfile> {
  const d = await device();
  const res = await open<{ session: Session; user: UserProfile } | (RawTokens & { user?: RawUser })>(
    'POST', '/auth/login',
    { email: email.trim().toLowerCase(), password, device_id: d.id, device_name: d.name, platform: d.platform },
    () => mock.login(email, password, d),
  );
  let user: UserProfile;
  if ('session' in res) {
    await setSession(res.session);
    user = res.user;
  } else {
    await setSession(toSession(res));
    user = res.user ? toUser(res.user) : await getMe();
  }
  void registerDevice();
  return user;
}

/** POST /auth/logout — luôn xoá phiên cục bộ kể cả khi server lỗi. */
export async function logout() {
  const refreshToken = session?.refreshToken;
  await unregisterDevice();
  try {
    await authed('POST', '/auth/logout', { refresh_token: refreshToken }, (t) => mock.logout(t));
  } catch { /* vẫn đăng xuất ở máy */ }
  await setSession(null);
}

/** POST /auth/change-password */
export const changePassword = (current: string, next: string) =>
  authed('POST', '/auth/change-password', { current_password: current, new_password: next }, (t) => mock.changePassword(t, current, next))
    .then(() => undefined);

/** GET /users/me */
export const getMe = () => authed<UserProfile | RawUser>('GET', '/users/me', undefined, (t) => mock.getMe(t))
  .then((u) => (isMock ? (u as UserProfile) : toUser(u as RawUser)));

/** GET /users/{userId} */
export const getUser = (id: string) =>
  authed<PublicProfile | RawUser>('GET', `/users/${encodeURIComponent(id)}`, undefined, (t) => mock.getUser(t, id))
    .then((u): PublicProfile => (isMock ? (u as PublicProfile) : toUser(u as RawUser)));

/** PUT /users/me */
export const updateMe = (p: UpdateProfileInput) =>
  authed<UserProfile | RawUser>('PUT', '/users/me', {
    full_name: p.fullName.trim(), student_id: p.studentId, faculty: p.faculty, class_name: p.className,
    phone: p.phone, bio: p.bio, avatar_url: p.avatarUrl,
  }, (t) => mock.updateMe(t, p)).then((u) => (isMock ? (u as UserProfile) : toUser(u as RawUser)));

/** DELETE /users/me — xác nhận bằng mật khẩu, sau đó xoá phiên. */
export async function deleteMe(password: string) {
  await authed('DELETE', '/users/me', { password }, (t) => mock.deleteMe(t, password));
  await setSession(null);
}

// ───────── Thiết bị ─────────
let deviceRegistered = false;
let pushToken: string | undefined;
const deviceListeners = new Set<() => void>();
const setRegistered = (v: boolean) => {
  deviceRegistered = v;
  deviceListeners.forEach((fn) => fn());
};
/** Theo dõi trạng thái đăng ký thiết bị (dùng với useSyncExternalStore). */
export const subscribeDevice = (fn: () => void) => {
  deviceListeners.add(fn);
  return () => { deviceListeners.delete(fn); };
};
/** Module thông báo gọi hàm này khi có push token; nếu đang đăng nhập sẽ đăng ký lại thiết bị. */
export function setPushToken(token: string | undefined) {
  pushToken = token;
  if (session) void registerDevice();
}
export const isDeviceRegistered = () => deviceRegistered;

/** POST /devices/register — gọi sau khi đăng nhập / khôi phục phiên. Lỗi không chặn đăng nhập. */
export async function registerDevice() {
  const d = await device();
  try {
    await authed('POST', '/devices/register', {
      device_id: d.id, device_name: d.name, platform: d.platform, push_token: pushToken,
    }, (t) => mock.registerDevice(t, { ...d, pushToken }));
    setRegistered(true);
  } catch {
    setRegistered(false);
  }
  return deviceRegistered;
}

/** DELETE /devices/register — gọi trước khi đăng xuất (lúc token còn hiệu lực). */
export async function unregisterDevice() {
  if (!session) return;
  const d = await device();
  try {
    await authed('DELETE', '/devices/register', { device_id: d.id }, (t) => mock.unregisterDevice(t, d.id));
  } catch { /* vẫn tiếp tục đăng xuất */ }
  setRegistered(false);
}

export { isMock };
