/**
 * Backend giả lập cho chế độ demo (chưa đặt EXPO_PUBLIC_API_URL).
 * Mô phỏng đúng các lỗi của server thật (401/403/409...) để giao diện xử lý được mọi nhánh.
 */
import { LECTURER, STUDENT } from '@/shared/mockUsers';
import { AuthError, type DeviceInfo, type PublicProfile, type RegisterInput, type UpdateProfileInput, type UserProfile } from './types';
import { checkEmail, checkName, checkPassword, checkPhone, collect } from './validate';

type MockUser = UserProfile & { password: string };

/** Mã xác thực cố định ở chế độ demo (server thật gửi mã qua email). */
export const MOCK_VERIFY_CODE = '123456';
/** Tài khoản demo hiển thị trên màn đăng nhập. */
export const DEMO_ACCOUNTS = [
  { label: 'Sinh viên', email: 'an.nv@sis.hust.edu.vn', password: 'Demo1234' },
  { label: 'Giảng viên', email: 'quan.tm@hust.edu.vn', password: 'Demo1234' },
];
const ACCESS_TTL = 15 * 60_000;

const users: MockUser[] = [
  { ...STUDENT, email: DEMO_ACCOUNTS[0].email, password: DEMO_ACCOUNTS[0].password, verified: true, studentId: '20210001', faculty: 'Trường CNTT&TT', className: 'IT1-01 K66', phone: '0912345678', bio: 'Thích giải thuật và bóng rổ.', createdAt: '2024-09-01T00:00:00Z' },
  { ...LECTURER, email: DEMO_ACCOUNTS[1].email, password: DEMO_ACCOUNTS[1].password, verified: true, faculty: 'Trường CNTT&TT', bio: 'Giảng viên bộ môn Khoa học máy tính.', createdAt: '2020-01-01T00:00:00Z' },
];
const access = new Map<string, { userId: string; deviceId: string; expiresAt: number }>();
const refresh = new Map<string, { userId: string; deviceId: string }>();
const devices = new Map<string, DeviceInfo & { userId: string; registeredAt: string }>();

// Web: lưu mock DB vào localStorage để tải lại trang không bị mất tài khoản/phiên demo.
const DB_KEY = 'quizhub.mockAuthDb';
const local = () => { try { return globalThis.localStorage ?? null; } catch { return null; } };
function persist() {
  try {
    local()?.setItem(DB_KEY, JSON.stringify({ users, access: [...access], refresh: [...refresh], devices: [...devices] }));
  } catch { /* bỏ qua */ }
}
(function load() {
  try {
    const raw = local()?.getItem(DB_KEY);
    if (!raw) return;
    const d = JSON.parse(raw);
    users.splice(0, users.length, ...d.users);
    d.access.forEach(([k, v]: [string, never]) => access.set(k, v));
    d.refresh.forEach(([k, v]: [string, never]) => refresh.set(k, v));
    d.devices.forEach(([k, v]: [string, never]) => devices.set(k, v));
  } catch { /* dữ liệu hỏng => dùng dữ liệu mặc định */ }
})();

const rand = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
const strip = ({ password: _p, ...u }: MockUser): UserProfile => ({ ...u });

function issue(userId: string, deviceId: string) {
  const accessToken = `mock-at-${rand()}`;
  const refreshToken = `mock-rt-${rand()}`;
  const expiresAt = Date.now() + ACCESS_TTL;
  access.set(accessToken, { userId, deviceId, expiresAt });
  refresh.set(refreshToken, { userId, deviceId });
  return { accessToken, refreshToken, expiresAt };
}

function revokeDeviceTokens(deviceId: string) {
  for (const [k, v] of access) if (v.deviceId === deviceId) access.delete(k);
  for (const [k, v] of refresh) if (v.deviceId === deviceId) refresh.delete(k);
}

function invalid(fields: Record<string, string>) {
  if (Object.keys(fields).length) throw new AuthError(Object.values(fields)[0], 400, 'VALIDATION_ERROR', fields);
}

/** Xác thực access token giống middleware của server. */
function me(token: string | null) {
  const t = token ? access.get(token) : undefined;
  if (!t) throw new AuthError('Bạn chưa đăng nhập', 401, 'UNAUTHORIZED');
  if (t.expiresAt < Date.now()) throw new AuthError('Phiên đăng nhập đã hết hạn', 401, 'TOKEN_EXPIRED');
  const u = users.find((x) => x.id === t.userId);
  if (!u) throw new AuthError('Tài khoản không tồn tại', 401, 'UNAUTHORIZED');
  return { u, deviceId: t.deviceId };
}

const handlers = {
  register(p: RegisterInput) {
    invalid(collect({ fullName: checkName(p.fullName), email: checkEmail(p.email), password: checkPassword(p.password) }));
    const email = p.email.trim().toLowerCase();
    if (users.some((u) => u.email === email)) throw new AuthError('Email đã được sử dụng', 409, 'EMAIL_EXISTS', { email: 'Email đã được sử dụng' });
    users.push({ id: `u${rand()}`, name: p.fullName.trim(), email, password: p.password, role: p.role, studentId: p.studentId, verified: false, createdAt: new Date().toISOString() });
    return { email };
  },
  verify(email: string, code: string) {
    const u = users.find((x) => x.email === email.trim().toLowerCase());
    if (!u) throw new AuthError('Không tìm thấy tài khoản', 404, 'NOT_FOUND');
    if (u.verified) return { verified: true };
    if (code !== MOCK_VERIFY_CODE) throw new AuthError('Mã xác thực không đúng hoặc đã hết hạn', 400, 'INVALID_CODE', { code: 'Mã xác thực không đúng' });
    u.verified = true;
    return { verified: true };
  },
  login(email: string, password: string, device: { id: string; name: string; platform: string }) {
    invalid(collect({ email: email.trim() ? undefined : 'Vui lòng nhập email', password: password ? undefined : 'Vui lòng nhập mật khẩu' }));
    const u = users.find((x) => x.email === email.trim().toLowerCase());
    if (!u || u.password !== password) throw new AuthError('Email hoặc mật khẩu không đúng', 401, 'INVALID_CREDENTIALS');
    if (!u.verified) throw new AuthError('Tài khoản chưa được xác thực email', 403, 'NOT_VERIFIED');
    revokeDeviceTokens(device.id);
    return { session: issue(u.id, device.id), user: strip(u) };
  },
  refresh(refreshToken: string) {
    const r = refresh.get(refreshToken);
    if (!r) throw new AuthError('Refresh token không hợp lệ', 401, 'INVALID_REFRESH_TOKEN');
    refresh.delete(refreshToken); // xoay vòng: refresh token chỉ dùng một lần
    return issue(r.userId, r.deviceId);
  },
  logout(token: string | null) {
    const { deviceId } = me(token);
    revokeDeviceTokens(deviceId);
  },
  changePassword(token: string | null, current: string, next: string) {
    const { u } = me(token);
    if (u.password !== current) throw new AuthError('Mật khẩu hiện tại không đúng', 400, 'WRONG_PASSWORD', { current: 'Mật khẩu hiện tại không đúng' });
    invalid(collect({ next: checkPassword(next) }));
    u.password = next;
  },
  getMe: (token: string | null) => strip(me(token).u),
  getUser(token: string | null, id: string): PublicProfile {
    me(token);
    const u = users.find((x) => x.id === id);
    if (!u) throw new AuthError('Không tìm thấy người dùng', 404, 'NOT_FOUND');
    return { id: u.id, name: u.name, role: u.role, avatarUrl: u.avatarUrl, faculty: u.faculty, className: u.className, bio: u.bio };
  },
  updateMe(token: string | null, p: UpdateProfileInput) {
    const { u } = me(token);
    invalid(collect({ fullName: checkName(p.fullName), phone: checkPhone(p.phone) }));
    Object.assign(u, { name: p.fullName.trim(), studentId: p.studentId, faculty: p.faculty, className: p.className, phone: p.phone, bio: p.bio, avatarUrl: p.avatarUrl });
    return strip(u);
  },
  deleteMe(token: string | null, password: string) {
    const { u } = me(token);
    if (u.password !== password) throw new AuthError('Mật khẩu không đúng', 400, 'WRONG_PASSWORD', { password: 'Mật khẩu không đúng' });
    users.splice(users.indexOf(u), 1);
    for (const [id, d] of devices) if (d.userId === u.id) { revokeDeviceTokens(id); devices.delete(id); }
  },
  /** POST /devices/register — đăng ký (hoặc cập nhật) thiết bị hiện tại cho tài khoản. */
  registerDevice(token: string | null, d: DeviceInfo) {
    const { u } = me(token);
    invalid(collect({ deviceId: d.id ? undefined : 'Thiếu device_id' }));
    devices.set(d.id, { ...d, userId: u.id, registeredAt: new Date().toISOString() });
    return { device_id: d.id, registered: true };
  },
  /** DELETE /devices/register — huỷ đăng ký thiết bị (gọi khi đăng xuất). */
  unregisterDevice(token: string | null, deviceId: string) {
    const { u } = me(token);
    const d = devices.get(deviceId);
    if (d && d.userId === u.id) devices.delete(deviceId);
  },
};

/** Mỗi lần gọi xong (kể cả khi ném lỗi) đều lưu lại trạng thái. */
export const mock = Object.fromEntries(Object.entries(handlers).map(([k, fn]) => [k, (...args: never[]) => {
  try { return (fn as (...a: never[]) => unknown)(...args); } finally { persist(); }
}])) as typeof handlers;
