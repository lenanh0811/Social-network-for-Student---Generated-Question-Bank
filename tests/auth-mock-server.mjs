/**
 * Mock server cho API Authentication & User Management — CHỈ dùng để chạy thử bộ test khi chưa trỏ tới backend.
 * Mô phỏng đúng hợp đồng trong Swagger https://snsqb.duckdns.org/api/v1/swagger-ui/index.html
 * (đã đối chiếu với phản hồi thật của server):
 *   envelope { code, message, data }, thành công code "0000"
 *   400 code "1002" + data [{field, message}] khi thiếu trường / sai định dạng
 *   400 code "9990" khi sai tài khoản/mật khẩu (kể cả mật khẩu cũ khi đổi mật khẩu)
 *   401 code "9998" khi thiếu/sai/hết hạn token
 *
 * Chạy độc lập: node tests/auth-mock-server.mjs  (cổng 4010, base http://localhost:4010/api/v1)
 */
import { randomBytes, randomInt } from 'node:crypto';
import { createServer } from 'node:http';
import { pathToFileURL } from 'node:url';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PLATFORMS = ['IOS', 'ANDROID', 'DESKTOP', 'WEB'];

export function createAuthMockServer({ accessTtlMs = 15 * 60_000 } = {}) {
  let seq = 100;
  const users = new Map(); // id -> user
  const codes = new Map(); // email -> OTP
  const access = new Map(); // token -> { userId, deviceId, exp }
  const refresh = new Map(); // token -> { userId, deviceId }
  const devices = new Map(); // `${userId}:${deviceId}` -> device
  const token = (p) => `${p}_${randomBytes(18).toString('hex')}`;
  const byEmail = (e) => [...users.values()].find((u) => u.email === e);

  const send = (res, status, body) => {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(body));
  };
  const ok = (res, data = null) => send(res, 200, { code: '0000', message: 'Thành công', data });
  const fail = (res, status, code, message, data = null) => send(res, status, { code, message, data });
  const missing = (res, b, fields) => {
    const miss = fields.filter((f) => b[f] === undefined || b[f] === null || b[f] === '');
    if (!miss.length) return false;
    fail(res, 400, '1002', `Trường '${miss[0]}' không hợp lệ (MISSING_REQUIRED_PARAMETER)`, miss.map((field) => ({ field, message: 'MISSING_REQUIRED_PARAMETER' })));
    return true;
  };

  const publicUser = (u) => ({
    user_id: u.id, full_name: u.full_name, avatar_url: u.avatar_url ?? null, cover_url: null, frame_url: null, bio: u.bio ?? null,
    school_faculty: u.school_faculty ?? null, major: u.major ?? null, class_name: u.class_name ?? null, role: u.role,
  });
  const privateUser = (u) => ({
    ...publicUser(u), email: u.email, gender: u.gender ?? null, date_of_birth: u.date_of_birth ?? null,
    student_lecturer_code: u.code ?? null, timezone: u.timezone ?? 'Asia/Ho_Chi_Minh', verified: u.verified,
    profile_completed: Boolean(u.full_name), created_at: u.created_at,
  });
  const authResponse = (u, tokens) => ({
    user_id: u.id, username: u.email, role: u.role, ...tokens, avatar_url: null, cover_url: null, frame_url: null,
    verified: u.verified, profile_completed: Boolean(u.full_name),
  });

  function issue(userId, deviceId) {
    const at = token('at');
    const rt = token('rt');
    access.set(at, { userId, deviceId, exp: Date.now() + accessTtlMs });
    refresh.set(rt, { userId, deviceId });
    return { access_token: at, refresh_token: rt };
  }
  function revokeTokens(userId, deviceId) {
    for (const [k, v] of access) if (v.userId === userId && v.deviceId === deviceId) access.delete(k);
    for (const [k, v] of refresh) if (v.userId === userId && v.deviceId === deviceId) refresh.delete(k);
  }
  function authenticate(req, res) {
    const m = /^Bearer (.+)$/.exec(req.headers.authorization ?? '');
    if (!m) return void fail(res, 401, '9998', 'Full authentication is required to access this resource');
    const t = access.get(m[1]);
    const user = t && users.get(t.userId);
    if (!t || t.exp < Date.now() || !user) return void fail(res, 401, '9998', 'TOKEN_INVALID_OR_EXPIRED');
    const d = devices.get(`${user.id}:${t.deviceId}`);
    if (d) d.last_active_at = new Date().toISOString();
    return { user, deviceId: t.deviceId };
  }
  const deviceOf = (a, id) => devices.get(`${a.user.id}:${id}`);

  const routes = {
    // ── API admin (app thật không gọi), vẫn mô phỏng để test chạy được trên mock ──
    'POST /auth/admin/register': (req, res, b) => {
      if (missing(res, b, ['email', 'password', 'device_id', 'role'])) return;
      if (!EMAIL_RE.test(b.email)) return fail(res, 400, '1002', "Trường 'email' không hợp lệ", [{ field: 'email', message: 'INVALID_FORMAT' }]);
      if (String(b.password).length < 8) return fail(res, 400, '1002', "Trường 'password' không hợp lệ", [{ field: 'password', message: 'INVALID_LENGTH' }]);
      if (!['STUDENT', 'LECTURER'].includes(b.role)) return fail(res, 400, '1002', "Trường 'role' không hợp lệ", [{ field: 'role', message: 'INVALID_VALUE' }]);
      const email = b.email.toLowerCase();
      if (byEmail(email)) return fail(res, 409, 'USER_ALREADY_EXISTS', 'Email đã tồn tại trong hệ thống');
      const id = ++seq;
      users.set(id, { id, email, password: b.password, role: b.role, verified: false, created_at: new Date().toISOString() });
      codes.set(email, String(randomInt(100000, 1000000)));
      ok(res);
    },
    'POST /auth/admin/verify': (req, res, b) => {
      if (missing(res, b, ['email', 'verify_code', 'device_id'])) return;
      const u = byEmail(String(b.email).toLowerCase());
      if (!u || codes.get(u.email) !== String(b.verify_code)) return fail(res, 400, 'VERIFICATION_CODE_INVALID', 'Mã OTP không chính xác hoặc đã hết hiệu lực');
      u.verified = true;
      codes.delete(u.email);
      ok(res, authResponse(u, issue(u.id, b.device_id)));
    },
    'POST /auth/admin/resend-verify': (req, res, b) => {
      if (missing(res, b, ['email'])) return;
      const u = byEmail(String(b.email).toLowerCase());
      if (!u) return fail(res, 404, 'USER_NOT_FOUND', 'Không tìm thấy người dùng');
      if (codes.has(u.email)) return fail(res, 409, 'ACTION_ALREADY_PERFORMED', 'Mã OTP trước đó vẫn còn hiệu lực');
      codes.set(u.email, String(randomInt(100000, 1000000)));
      ok(res);
    },
    // ── /auth ──
    'POST /auth/login': (req, res, b) => {
      if (missing(res, b, ['email', 'password', 'device_id', 'platform'])) return;
      if (!PLATFORMS.includes(b.platform)) return fail(res, 400, '1003', 'Dữ liệu JSON gửi lên không đúng định dạng');
      const u = byEmail(String(b.email).toLowerCase());
      if (!u || u.password !== b.password) return fail(res, 400, '9990', 'Tài khoản hoặc mật khẩu không chính xác');
      if (!u.verified) return fail(res, 403, 'USER_NOT_VERIFIED', 'Tài khoản chưa được kích hoạt');
      revokeTokens(u.id, b.device_id);
      devices.set(`${u.id}:${b.device_id}`, {
        user_device_id: ++seq, device_id: b.device_id, device_name: b.device_name ?? null, platform: b.platform,
        os_version: b.os_version ?? null, app_version: b.app_version ?? null, fid: b.fid ?? null,
        last_active_at: new Date().toISOString(), is_active: true, userId: u.id,
      });
      ok(res, authResponse(u, issue(u.id, b.device_id)));
    },
    'POST /auth/refresh': (req, res, b) => {
      if (missing(res, b, ['refresh_token'])) return;
      const r = refresh.get(b.refresh_token);
      if (!r) return fail(res, 401, '9998', 'TOKEN_INVALID_OR_EXPIRED');
      refresh.delete(b.refresh_token); // rotation
      ok(res, issue(r.userId, r.deviceId));
    },
    'POST /auth/logout': (req, res) => {
      const a = authenticate(req, res);
      if (!a) return;
      revokeTokens(a.user.id, a.deviceId);
      const d = deviceOf(a, a.deviceId);
      if (d) Object.assign(d, { is_active: false, fid: null });
      ok(res);
    },
    'POST /auth/change-password': (req, res, b) => {
      const a = authenticate(req, res);
      if (!a) return;
      if (missing(res, b, ['old_password', 'new_password'])) return;
      if (a.user.password !== b.old_password) return fail(res, 400, '9990', 'Mật khẩu cũ không chính xác');
      a.user.password = b.new_password;
      ok(res);
    },
    // ── /users ──
    'GET /users/me': (req, res) => {
      const a = authenticate(req, res);
      if (a) ok(res, privateUser(a.user));
    },
    'PUT /users/me': (req, res, b) => {
      const a = authenticate(req, res);
      if (!a) return;
      if (b.full_name !== undefined && !String(b.full_name).trim()) return fail(res, 400, '1002', "Trường 'full_name' không hợp lệ", [{ field: 'fullName', message: 'MUST_NOT_BE_BLANK' }]);
      if (b.gender !== undefined && b.gender !== null && !['MALE', 'FEMALE'].includes(b.gender)) return fail(res, 400, '1003', 'Dữ liệu JSON gửi lên không đúng định dạng');
      if (b.date_of_birth && !/^\d{4}-\d{2}-\d{2}$/.test(b.date_of_birth)) return fail(res, 400, '1003', 'Dữ liệu JSON gửi lên không đúng định dạng');
      for (const k of ['full_name', 'avatar_url', 'bio', 'gender', 'date_of_birth', 'timezone']) if (b[k] !== undefined) a.user[k] = b[k];
      ok(res, privateUser(a.user));
    },
    'DELETE /users/me': (req, res) => {
      const a = authenticate(req, res);
      if (!a) return;
      for (const [k, v] of access) if (v.userId === a.user.id) access.delete(k);
      for (const [k, v] of refresh) if (v.userId === a.user.id) refresh.delete(k);
      for (const [k, d] of devices) if (d.userId === a.user.id) devices.delete(k);
      users.delete(a.user.id);
      ok(res);
    },
    'GET /users/:id': (req, res, b, id) => {
      const a = authenticate(req, res);
      if (!a) return;
      const u = users.get(Number(id));
      if (!u) return fail(res, 404, 'USER_NOT_FOUND', 'Không tìm thấy người dùng');
      ok(res, publicUser(u));
    },
    // ── /devices ──
    'GET /devices': (req, res) => {
      const a = authenticate(req, res);
      if (!a) return;
      const list = [...devices.values()].filter((d) => d.userId === a.user.id)
        .map(({ userId, fid, ...d }) => ({ ...d, is_current_device: d.device_id === a.deviceId }));
      ok(res, { devices: list });
    },
    'POST /devices/fid': (req, res, b) => {
      const a = authenticate(req, res);
      if (!a) return;
      if (missing(res, b, ['fid'])) return;
      const d = deviceOf(a, a.deviceId);
      if (d) d.fid = b.fid;
      ok(res);
    },
    'POST /devices/fid/unregister': (req, res, b) => {
      const a = authenticate(req, res);
      if (!a) return;
      if (missing(res, b, ['fid'])) return;
      for (const d of devices.values()) if (d.userId === a.user.id && d.fid === b.fid) Object.assign(d, { fid: null });
      ok(res);
    },
    'POST /devices/:id/logout': (req, res, b, id) => {
      const a = authenticate(req, res);
      if (!a) return;
      const d = deviceOf(a, id);
      if (!d) return fail(res, 404, 'DEVICE_NOT_FOUND', 'Không tìm thấy thiết bị');
      revokeTokens(a.user.id, id);
      d.is_active = false;
      ok(res);
    },
    'DELETE /devices/:id': (req, res, b, id) => {
      const a = authenticate(req, res);
      if (!a) return;
      if (!deviceOf(a, id)) return fail(res, 404, 'DEVICE_NOT_FOUND', 'Không tìm thấy thiết bị');
      revokeTokens(a.user.id, id);
      devices.delete(`${a.user.id}:${id}`);
      ok(res);
    },
  };

  const server = createServer(async (req, res) => {
    const url = new URL(req.url, 'http://x');
    const path = url.pathname.replace(/^\/api\/v1/, '');
    let raw = '';
    for await (const chunk of req) raw += chunk;
    let body = {};
    try { body = raw ? JSON.parse(raw) : {}; } catch { return fail(res, 400, '1003', 'Dữ liệu JSON gửi lên không đúng định dạng'); }
    const exact = routes[`${req.method} ${path}`];
    if (exact) return exact(req, res, body);
    let m = /^\/devices\/([^/]+)\/logout$/.exec(path);
    if (m && req.method === 'POST') return routes['POST /devices/:id/logout'](req, res, body, decodeURIComponent(m[1]));
    m = /^\/(users|devices)\/([^/]+)$/.exec(path);
    const param = m && routes[`${req.method} /${m[1]}/:id`];
    if (param) return param(req, res, body, decodeURIComponent(m[2]));
    fail(res, 404, '9992', 'Route not found');
  });

  return {
    server,
    /** Chỉ có ở mock: đọc mã OTP "đã gửi qua email". */
    getVerificationCode: (email) => codes.get(email.toLowerCase()),
    /** Chỉ có ở mock: FID đang gắn với thiết bị. */
    getFid: (deviceId) => [...devices.values()].find((d) => d.device_id === deviceId)?.fid ?? null,
    listen: (port = 0) => new Promise((r) => server.listen(port, '127.0.0.1', () => r(`http://127.0.0.1:${server.address().port}/api/v1`))),
    close: () => new Promise((r) => server.close(r)),
  };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  createAuthMockServer().listen(4010).then((url) => console.log(`Auth mock server: ${url}`));
}
