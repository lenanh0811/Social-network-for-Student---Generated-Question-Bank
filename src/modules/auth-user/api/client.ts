/**
 * Service gọi API Authentication & User Management — khớp Swagger
 * https://snsqb.duckdns.org/api/v1/swagger-ui/index.html (/auth/*, /users/*, /devices/*).
 * - Envelope `{ code, message, data }`, thành công khi code = "0000" (chấp nhận thêm "1000", "SUCCESS").
 * - Lỗi validate: HTTP 400, code "1002", data = [{ field, message }]. Chưa đăng nhập/token hỏng: HTTP 401, code "9998".
 * - Tự gắn access token, tự refresh khi sắp hết hạn (đọc `exp` trong JWT) hoặc khi server trả 401; chỉ refresh 1 lần cho nhiều request.
 * - Không đặt EXPO_PUBLIC_API_URL => chạy trên mockDb.
 * Dùng fetch trực tiếp thay vì `call()` vì request refresh không được chờ token provider (tránh vòng lặp).
 */
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { configureApiAuth, getApiBaseUrl, isMock } from '@/api/http';
import type { Role } from '@/types';
import { mock } from './mock-db';
import { storage } from './storage';
import {
  AuthError, type Device, type DeviceInfo, type Gender, type PublicProfile, type RegisterInput, type Session,
  type UpdateProfileInput, type UserProfile,
} from './types';

const SESSION_KEY = 'quizhub.session';
const DEVICE_KEY = 'quizhub.device_id';
const SUCCESS = new Set(['0000', '1000', 'SUCCESS']);
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

// ───────── Thiết bị hiện tại ─────────
let deviceId: string | null = null;
const PLATFORM = { web: 'WEB', ios: 'IOS', android: 'ANDROID' } as Record<string, string>;

/** Thông tin thiết bị gửi kèm khi đăng nhập (device_id sinh 1 lần rồi lưu lại). */
export async function device(): Promise<DeviceInfo> {
  if (!deviceId) {
    deviceId = await storage.get(DEVICE_KEY);
    if (!deviceId) {
      deviceId = `${Platform.OS}-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
      await storage.set(DEVICE_KEY, deviceId);
    }
  }
  const name = Platform.OS === 'web' ? 'Trình duyệt web' : Constants.deviceName ?? (Platform.OS === 'ios' ? 'iPhone' : 'Điện thoại Android');
  return {
    id: deviceId,
    name,
    platform: PLATFORM[Platform.OS] ?? 'DESKTOP',
    osVersion: Platform.OS === 'web' ? undefined : `${Platform.OS} ${Platform.Version}`,
    appVersion: Constants.expoConfig?.version,
  };
}

// ───────── HTTP ─────────
const sleep = (ms = 350) => new Promise((r) => setTimeout(r, ms));
const baseUrl = () => getApiBaseUrl('api/v1');

/** Tên trường server (camelCase/snake_case) => tên ô trong form. */
const FIELD: Record<string, string> = {
  email: 'email', password: 'password', old_password: 'current', oldPassword: 'current', new_password: 'next', newPassword: 'next',
  full_name: 'fullName', fullName: 'fullName', bio: 'bio', date_of_birth: 'dateOfBirth', dateOfBirth: 'dateOfBirth',
  verify_code: 'code', verifyCode: 'code',
};

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
  let json: { code?: unknown; message?: string; data?: unknown } | null = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* không phải JSON (vd: trang lỗi của proxy) */ }
  const code = json && json.code !== undefined ? String(json.code) : undefined;
  if (!res.ok || (code && !SUCCESS.has(code))) {
    const fields = Array.isArray(json?.data)
      ? Object.fromEntries((json.data as { field?: string; message?: string }[])
        .filter((f) => f.field && FIELD[f.field]).map((f) => [FIELD[f.field!], f.message === 'MISSING_REQUIRED_PARAMETER' ? 'Trường này là bắt buộc' : (f.message ?? 'Không hợp lệ')]))
      : undefined;
    const fallback = res.status === 401 ? 'Phiên đăng nhập không hợp lệ' : res.status === 403 ? 'Bạn không có quyền thực hiện thao tác này' : `Lỗi máy chủ (HTTP ${res.status})`;
    throw new AuthError(json?.message || fallback, res.status, code, fields && Object.keys(fields).length ? fields : undefined);
  }
  return (json && 'data' in json ? json.data : json) as R;
}

/** Đọc `exp` (giây) trong JWT; không đọc được thì coi như còn 15 phút. */
function jwtExpiry(token: string) {
  try {
    const part = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const { exp } = JSON.parse(globalThis.atob(part.padEnd(Math.ceil(part.length / 4) * 4, '=')));
    if (typeof exp === 'number') return exp * 1000;
  } catch { /* token không phải JWT */ }
  return Date.now() + 15 * 60_000;
}

type RawTokens = { access_token: string; refresh_token?: string };
const toSession = (t: RawTokens, prevRefresh?: string): Session => ({
  accessToken: t.access_token,
  refreshToken: t.refresh_token ?? prevRefresh ?? '',
  expiresAt: jwtExpiry(t.access_token),
});

/** Đổi refresh token lấy access token mới (single-flight). Thất bại => xoá phiên. */
export function refreshSession(): Promise<Session> {
  if (!refreshing) {
    const current = session;
    refreshing = (async () => {
      if (!current) throw new AuthError('Bạn chưa đăng nhập', 401, '9998');
      try {
        const next = isMock
          ? (await sleep(150), mock.refresh(current.refreshToken))
          : toSession(await send<RawTokens>('POST', '/auth/refresh', { refresh_token: current.refreshToken }), current.refreshToken);
        await setSession(next);
        return next;
      } catch (e) {
        // Chỉ đăng xuất khi server THỰC SỰ từ chối refresh token (400/401/403).
        // Mất mạng, lỗi 5xx, quá tải (429)... chỉ là lỗi tạm thời: giữ phiên để lần sau thử lại.
        if (e instanceof AuthError && [400, 401, 403].includes(e.status)) {
          console.warn('[auth] Đăng xuất vì refresh token bị từ chối:', e.status, e.code, e.message);
          await setSession(null);
        }
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

/**
 * Cho module khác gọi API cần đăng nhập với cùng envelope, mã lỗi (AuthError) và cơ chế refresh token.
 * `mockFn` nhận access token hiện tại để mock xác định người dùng.
 */
export const apiRequest = authed;

/** Request công khai (đăng nhập, refresh...). */
const open = async <R>(method: string, path: string, body: unknown, mockFn: () => R): Promise<R> =>
  isMock ? (await sleep(), mockFn()) : send<R>(method, path, body);

// ───────── Ánh xạ dữ liệu server (snake_case) ─────────
type Raw = Record<string, unknown>;
const str = (v: unknown) => (typeof v === 'string' && v ? v : undefined);
const toRole = (v: unknown): Role => (String(v ?? '').toUpperCase() === 'LECTURER' ? 'lecturer' : 'student');
const toGender = (v: unknown): Gender | undefined => (v === 'MALE' || v === 'FEMALE' ? v : undefined);

export function toUser(u: Raw): UserProfile {
  return {
    id: String(u.user_id ?? u.id ?? ''),
    name: str(u.full_name) ?? str(u.username) ?? str(u.email) ?? 'Người dùng',
    role: toRole(u.role),
    email: str(u.email) ?? '',
    verified: u.verified === undefined ? true : Boolean(u.verified),
    profileCompleted: u.profile_completed === undefined ? undefined : Boolean(u.profile_completed),
    avatarUrl: str(u.avatar_url),
    coverUrl: str(u.cover_url),
    code: str(u.student_lecturer_code),
    faculty: str(u.school_faculty),
    major: str(u.major),
    className: str(u.class_name),
    gender: toGender(u.gender),
    dateOfBirth: str(u.date_of_birth),
    bio: str(u.bio),
    createdAt: str(u.created_at),
  };
}
const toDevice = (d: Raw): Device => ({
  id: String(d.device_id ?? d.user_device_id ?? ''),
  name: str(d.device_name) ?? 'Thiết bị',
  platform: str(d.platform) ?? '',
  osVersion: str(d.os_version),
  appVersion: str(d.app_version),
  lastActiveAt: str(d.last_active_at),
  active: d.is_active === undefined ? true : Boolean(d.is_active),
  current: Boolean(d.is_current_device),
});
const asUser = (u: unknown) => (isMock ? (u as UserProfile) : toUser(u as Raw));

// ───────── /auth ─────────
/**
 * POST /auth/admin/register — theo Swagger đây là API admin ("không cần gọi và không được gọi")
 * và đang bị chặn ngoài Tailscale VPN. Chỉ dùng được ở chế độ demo; app thật dùng tài khoản nhà trường cấp.
 */
export const canSelfRegister = isMock;
export async function register(p: RegisterInput) {
  const d = await device();
  const email = p.email.trim().toLowerCase();
  await open('POST', '/auth/admin/register', {
    email, password: p.password, device_id: d.id, role: p.role.toUpperCase(), timezone: 'Asia/Ho_Chi_Minh',
  }, () => mock.register({ ...p, email }));
  return { email };
}

/** POST /auth/admin/verify (API admin — xem `register`). */
export async function verify(email: string, code: string) {
  const d = await device();
  await open('POST', '/auth/admin/verify', { email, verify_code: code, device_id: d.id }, () => mock.verify(email, code));
}

/** POST /auth/admin/resend-verify (API admin — xem `register`). */
export const resendVerify = (email: string) =>
  open('POST', '/auth/admin/resend-verify', { email }, () => mock.resendVerify(email)).then(() => undefined);

/** POST /auth/login — lưu phiên, rồi GET /users/me để lấy hồ sơ đầy đủ. */
export async function login(email: string, password: string): Promise<UserProfile> {
  const d = await device();
  const res = await open<{ session: Session; user: UserProfile } | RawTokens>(
    'POST', '/auth/login',
    {
      email: email.trim().toLowerCase(), password, device_id: d.id, platform: d.platform, device_name: d.name,
      os_version: d.osVersion, app_version: d.appVersion, fid: pushToken,
    },
    () => mock.login(email, password, d),
  );
  if ('session' in res) {
    await setSession(res.session);
    return res.user;
  }
  await setSession(toSession(res));
  return getMe();
}

/** POST /auth/logout — server thu hồi refresh token + FCM token. Luôn xoá phiên cục bộ kể cả khi lỗi. */
export async function logout() {
  try {
    await authed('POST', '/auth/logout', undefined, (t) => mock.logout(t));
  } catch { /* vẫn đăng xuất ở máy */ }
  await setSession(null);
}

/** POST /auth/change-password */
export const changePassword = (current: string, next: string) =>
  authed('POST', '/auth/change-password', { old_password: current, new_password: next }, (t) => mock.changePassword(t, current, next))
    .then(() => undefined);

// ───────── /users ─────────
/** GET /users/me */
export const getMe = () => authed<unknown>('GET', '/users/me', undefined, (t) => mock.getMe(t)).then(asUser);

/** GET /users/{userId} */
export const getUser = (id: string) =>
  authed<unknown>('GET', `/users/${encodeURIComponent(id)}`, undefined, (t) => mock.getUser(t, id))
    .then((u): PublicProfile => asUser(u));

/** PUT /users/me — chỉ gửi các trường Swagger cho phép (full_name, bio, gender, date_of_birth, avatar_url). */
export const updateMe = (p: UpdateProfileInput) =>
  authed<unknown>('PUT', '/users/me', {
    full_name: p.fullName.trim(), bio: p.bio ?? '', gender: p.gender, date_of_birth: p.dateOfBirth, avatar_url: p.avatarUrl,
  }, (t) => mock.updateMe(t, p)).then(asUser);

/** DELETE /users/me — sau đó xoá phiên. */
export async function deleteMe() {
  await authed('DELETE', '/users/me', undefined, (t) => mock.deleteMe(t));
  await setSession(null);
}

// ───────── /devices ─────────
/** GET /devices — data.devices[] */
export const listDevices = () =>
  authed<unknown>('GET', '/devices', undefined, (t) => mock.listDevices(t))
    .then((d) => (isMock ? (d as Device[]) : ((d as { devices?: Raw[] })?.devices ?? []).map(toDevice)));

/** POST /devices/{deviceId}/logout — thu hồi phiên của một thiết bị khác. */
export const logoutDevice = (id: string) =>
  authed('POST', `/devices/${encodeURIComponent(id)}/logout`, undefined, (t) => mock.logoutDevice(t, id)).then(() => undefined);

/** DELETE /devices/{deviceId} — xoá hẳn bản ghi thiết bị. */
export const removeDevice = (id: string) =>
  authed('DELETE', `/devices/${encodeURIComponent(id)}`, undefined, (t) => mock.removeDevice(t, id)).then(() => undefined);

let pushToken: string | undefined;
/**
 * Module thông báo gọi khi có/mất Firebase Installation ID:
 * có FID => POST /devices/fid, mất (tắt thông báo) => POST /devices/fid/unregister.
 */
export async function setPushToken(fid: string | undefined) {
  const prev = pushToken;
  pushToken = fid;
  if (!session) return;
  if (fid) await authed('POST', '/devices/fid', { fid }, (t) => mock.syncFid(t, fid));
  else if (prev) await authed('POST', '/devices/fid/unregister', { fid: prev }, (t) => mock.unregisterFid(t, prev));
}

export { isMock };
