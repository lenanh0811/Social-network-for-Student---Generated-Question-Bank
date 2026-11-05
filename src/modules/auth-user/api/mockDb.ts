/**
 * Backend giả lập cho chế độ demo (chưa đặt EXPO_PUBLIC_API_URL).
 * Mô phỏng mã lỗi giống server thật (Swagger): 400/9990 sai tài khoản, 401/9998 chưa đăng nhập,
 * 400/1002 thiếu trường, 403 chưa kích hoạt, 409 email đã tồn tại.
 */
import { LECTURER, STUDENT } from '@/shared/mockUsers';
import { AuthError, type Device, type DeviceInfo, type PublicProfile, type RegisterInput, type UpdateProfileInput, type UserProfile } from './types';
import { checkEmail, checkPassword, collect } from './validate';

type MockUser = UserProfile & { password: string };
type MockDevice = DeviceInfo & { userId: string; lastActiveAt: string; active: boolean; fid?: string };

/** Mã xác thực cố định ở chế độ demo (server thật gửi mã qua email). */
export const MOCK_VERIFY_CODE = '123456';
/** Tài khoản demo hiển thị trên màn đăng nhập. */
export const DEMO_ACCOUNTS = [
  { label: 'Sinh viên', email: 'an.nv@sis.hust.edu.vn', password: 'Demo1234' },
  { label: 'Giảng viên', email: 'quan.tm@hust.edu.vn', password: 'Demo1234' },
];
const ACCESS_TTL = 15 * 60_000;

const users: MockUser[] = [
  { ...STUDENT, email: DEMO_ACCOUNTS[0].email, password: DEMO_ACCOUNTS[0].password, verified: true, profileCompleted: true, code: '20210001', faculty: 'Trường Công nghệ Thông tin và Truyền thông', major: 'Khoa học máy tính', className: 'KHMT 01-K66', gender: 'MALE', dateOfBirth: '2003-05-12', bio: 'Thích giải thuật và bóng rổ.', createdAt: '2024-09-01T00:00:00Z' },
  { ...LECTURER, email: DEMO_ACCOUNTS[1].email, password: DEMO_ACCOUNTS[1].password, verified: true, profileCompleted: true, code: 'CB0123', faculty: 'Trường Công nghệ Thông tin và Truyền thông', gender: 'MALE', bio: 'Giảng viên bộ môn Khoa học máy tính.', createdAt: '2020-01-01T00:00:00Z' },
];
/** Người dùng mẫu (không đăng nhập được) để demo kết bạn / theo dõi / chặn / báo cáo. */
const SOICT = 'Trường Công nghệ Thông tin và Truyền thông';
const PEOPLE: MockUser[] = ([
  { id: 's2', name: 'Lê Thị Bình', role: 'student', major: 'Khoa học máy tính', className: 'KHMT 01-K66', code: '20210002', bio: 'Mê Machine Learning.' },
  { id: 's3', name: 'Phạm Minh Châu', role: 'student', major: 'Kỹ thuật phần mềm', className: 'KTPM 02-K66', code: '20210003', bio: 'Frontend & UI/UX.' },
  { id: 's4', name: 'Hoàng Đức Dũng', role: 'student', major: 'Khoa học máy tính', className: 'KHMT 02-K66', code: '20210004' },
  { id: 's5', name: 'Vũ Thu Hà', role: 'student', major: 'An toàn thông tin', className: 'ATTT 01-K67', code: '20220005', bio: 'CTF player.' },
  { id: 's6', name: 'Đỗ Quang Huy', role: 'student', major: 'Kỹ thuật máy tính', className: 'KTMT 01-K66', code: '20210006' },
  { id: 'l2', name: 'PGS. Nguyễn Thị Lan', role: 'lecturer', code: 'CB0456', bio: 'Bộ môn Hệ thống thông tin.' },
] as const).map((p) => ({
  ...p, email: `${p.id}@demo.local`, password: Math.random().toString(36), verified: true, profileCompleted: true, faculty: SOICT, createdAt: '2024-09-01T00:00:00Z',
}));
users.push(...PEOPLE);
const access = new Map<string, { userId: string; deviceId: string; expiresAt: number }>();
const refresh = new Map<string, { userId: string; deviceId: string }>();
const devices = new Map<string, MockDevice>();

// Web: lưu mock DB vào localStorage để tải lại trang không bị mất tài khoản/phiên demo.
const DB_KEY = 'quizhub.mockAuthDb.v2';
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
    // Dữ liệu lưu từ bản cũ có thể chưa có người dùng mẫu.
    users.push(...PEOPLE.filter((p) => !users.some((u) => u.id === p.id)));
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

function revokeTokens(deviceId: string) {
  for (const [k, v] of access) if (v.deviceId === deviceId) access.delete(k);
  for (const [k, v] of refresh) if (v.deviceId === deviceId) refresh.delete(k);
}

function invalid(fields: Record<string, string>) {
  if (Object.keys(fields).length) throw new AuthError(Object.values(fields)[0], 400, '1002', fields);
}

/** Xác thực access token giống middleware của server. */
function me(token: string | null) {
  const t = token ? access.get(token) : undefined;
  if (!t || t.expiresAt < Date.now()) throw new AuthError('TOKEN_INVALID_OR_EXPIRED', 401, '9998');
  const u = users.find((x) => x.id === t.userId);
  if (!u) throw new AuthError('TOKEN_INVALID_OR_EXPIRED', 401, '9998');
  const d = devices.get(t.deviceId);
  if (d) d.lastActiveAt = new Date().toISOString();
  return { u, deviceId: t.deviceId };
}
const ownDevice = (userId: string, id: string) => {
  const d = devices.get(id);
  if (!d || d.userId !== userId) throw new AuthError('Không tìm thấy thiết bị (DEVICE_NOT_FOUND)', 404, 'DEVICE_NOT_FOUND');
  return d;
};

const handlers = {
  register(p: RegisterInput) {
    invalid(collect({ email: checkEmail(p.email), password: checkPassword(p.password) }));
    if (users.some((u) => u.email === p.email)) throw new AuthError('Email đã tồn tại trong hệ thống', 409, 'USER_ALREADY_EXISTS', { email: 'Email đã được sử dụng' });
    users.push({ id: `u${rand()}`, name: p.email.split('@')[0], email: p.email, password: p.password, role: p.role, verified: false, profileCompleted: false, createdAt: new Date().toISOString() });
  },
  verify(email: string, code: string) {
    const u = users.find((x) => x.email === email.trim().toLowerCase());
    if (!u) throw new AuthError('Không tìm thấy người dùng', 404, 'USER_NOT_FOUND');
    if (code !== MOCK_VERIFY_CODE) throw new AuthError('Mã OTP không chính xác hoặc đã hết hiệu lực', 400, 'VERIFICATION_CODE_INVALID', { code: 'Mã xác thực không đúng' });
    u.verified = true;
  },
  resendVerify(email: string) {
    if (!users.some((x) => x.email === email.trim().toLowerCase())) throw new AuthError('Không tìm thấy người dùng', 404, 'USER_NOT_FOUND');
  },
  login(email: string, password: string, device: DeviceInfo) {
    invalid(collect({ email: email.trim() ? undefined : 'Trường này là bắt buộc', password: password ? undefined : 'Trường này là bắt buộc' }));
    const u = users.find((x) => x.email === email.trim().toLowerCase());
    if (!u || u.password !== password) throw new AuthError('Tài khoản hoặc mật khẩu không chính xác', 400, '9990');
    if (!u.verified) throw new AuthError('Tài khoản chưa được kích hoạt (USER_NOT_VERIFIED)', 403, 'USER_NOT_VERIFIED');
    revokeTokens(device.id);
    devices.set(device.id, { ...device, userId: u.id, lastActiveAt: new Date().toISOString(), active: true, fid: devices.get(device.id)?.fid });
    return { session: issue(u.id, device.id), user: strip(u) };
  },
  refresh(refreshToken: string) {
    const r = refresh.get(refreshToken);
    if (!r) throw new AuthError('TOKEN_INVALID_OR_EXPIRED', 401, '9998');
    refresh.delete(refreshToken); // xoay vòng: refresh token chỉ dùng một lần
    return issue(r.userId, r.deviceId);
  },
  logout(token: string | null) {
    const { deviceId } = me(token);
    revokeTokens(deviceId);
    const d = devices.get(deviceId);
    if (d) Object.assign(d, { active: false, fid: undefined });
  },
  changePassword(token: string | null, current: string, next: string) {
    const { u } = me(token);
    if (u.password !== current) throw new AuthError('Mật khẩu cũ không chính xác', 400, '9990', { current: 'Mật khẩu cũ không chính xác' });
    invalid(collect({ next: checkPassword(next) }));
    u.password = next;
  },
  getMe: (token: string | null) => strip(me(token).u),
  getUser(token: string | null, id: string): PublicProfile {
    me(token);
    const u = users.find((x) => x.id === id);
    if (!u) throw new AuthError('Không tìm thấy người dùng (USER_NOT_FOUND)', 404, 'USER_NOT_FOUND');
    return { id: u.id, name: u.name, role: u.role, avatarUrl: u.avatarUrl, faculty: u.faculty, major: u.major, className: u.className, bio: u.bio };
  },
  updateMe(token: string | null, p: UpdateProfileInput) {
    const { u } = me(token);
    invalid(collect({ fullName: p.fullName.trim() ? undefined : 'Vui lòng nhập họ tên' }));
    Object.assign(u, { name: p.fullName.trim(), bio: p.bio, gender: p.gender, dateOfBirth: p.dateOfBirth, avatarUrl: p.avatarUrl ?? u.avatarUrl, profileCompleted: true });
    return strip(u);
  },
  deleteMe(token: string | null) {
    const { u } = me(token);
    users.splice(users.indexOf(u), 1);
    for (const [id, d] of devices) if (d.userId === u.id) { revokeTokens(id); devices.delete(id); }
  },
  listDevices(token: string | null): Device[] {
    const { u, deviceId } = me(token);
    return [...devices.values()].filter((d) => d.userId === u.id)
      .map((d) => ({ id: d.id, name: d.name, platform: d.platform, osVersion: d.osVersion, appVersion: d.appVersion, lastActiveAt: d.lastActiveAt, active: d.active, current: d.id === deviceId }));
  },
  logoutDevice(token: string | null, id: string) {
    const { u } = me(token);
    const d = ownDevice(u.id, id);
    revokeTokens(id);
    d.active = false;
  },
  removeDevice(token: string | null, id: string) {
    const { u } = me(token);
    ownDevice(u.id, id);
    revokeTokens(id);
    devices.delete(id);
  },
  syncFid(token: string | null, fid: string) {
    const { deviceId } = me(token);
    const d = devices.get(deviceId);
    if (d) d.fid = fid;
  },
  unregisterFid(token: string | null, fid: string) {
    me(token);
    for (const d of devices.values()) if (d.fid === fid) d.fid = undefined;
  },
};

/** Cho mock của module khác (vd relationship-privacy): ai đang đăng nhập, tra hồ sơ công khai. */
export const mockSession = {
  /** Id người dùng của access token; token sai/hết hạn => 401 như server. */
  userId: (token: string | null) => me(token).u.id,
  user: (id: string): PublicProfile | undefined => {
    const u = users.find((x) => x.id === id);
    return u && { id: u.id, name: u.name, role: u.role, avatarUrl: u.avatarUrl, faculty: u.faculty, major: u.major, className: u.className, bio: u.bio };
  },
  code: (id: string) => users.find((x) => x.id === id)?.code,
};

/** Mỗi lần gọi xong (kể cả khi ném lỗi) đều lưu lại trạng thái. */
export const mock = Object.fromEntries(Object.entries(handlers).map(([k, fn]) => [k, (...args: never[]) => {
  try { return (fn as (...a: never[]) => unknown)(...args); } finally { persist(); }
}])) as typeof handlers;
