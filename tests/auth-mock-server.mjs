/**
 * Mock server cho API Authentication & User Management — CHỈ dùng để chạy thử bộ test khi chưa có backend.
 * Cài đặt đúng hợp đồng API mà app đang gọi (src/modules/auth-user/api/client.ts):
 * envelope { code, message, data }, code '1000' = thành công, lỗi trả HTTP status tương ứng.
 *
 * Chạy độc lập: node tests/auth-mock-server.mjs  (cổng 4010, base http://localhost:4010/api/v1)
 */
import { randomBytes, randomInt } from 'node:crypto';
import { createServer } from 'node:http';
import { pathToFileURL } from 'node:url';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const strongPassword = (p) => typeof p === 'string' && p.length >= 8 && /[A-Za-z]/.test(p) && /\d/.test(p);

export function createAuthMockServer({ accessTtlMs = 15 * 60_000 } = {}) {
  const users = new Map(); // id -> user
  const codes = new Map(); // email -> code
  const access = new Map(); // token -> { userId, deviceId, exp }
  const refresh = new Map(); // token -> { userId, deviceId }
  const devices = new Map(); // deviceId -> thiết bị đã POST /devices/register
  const token = (p) => `${p}_${randomBytes(18).toString('hex')}`;
  const byEmail = (e) => [...users.values()].find((u) => u.email === e);

  const ok = (res, data, status = 200) => send(res, status, { code: '1000', message: 'OK', data });
  const fail = (res, status, code, message, errors) => send(res, status, { code, message, ...(errors ? { errors } : {}) });
  function send(res, status, body) {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(body));
  }
  const publicUser = (u) => ({ user_id: u.id, full_name: u.full_name, role: u.role, avatar_url: u.avatar_url ?? null, faculty: u.faculty ?? null, class_name: u.class_name ?? null, bio: u.bio ?? null });
  const privateUser = (u) => ({ ...publicUser(u), email: u.email, is_verified: u.verified, student_id: u.student_id ?? null, phone: u.phone ?? null, created_at: u.created_at });

  function issue(userId, deviceId) {
    const at = token('at');
    const rt = token('rt');
    access.set(at, { userId, deviceId, exp: Date.now() + accessTtlMs });
    refresh.set(rt, { userId, deviceId });
    return { access_token: at, refresh_token: rt, token_type: 'Bearer', expires_in: Math.round(accessTtlMs / 1000) };
  }
  function revokeTokens(deviceId) {
    for (const [k, v] of access) if (v.deviceId === deviceId) access.delete(k);
    for (const [k, v] of refresh) if (v.deviceId === deviceId) refresh.delete(k);
  }
  function authenticate(req, res) {
    const m = /^Bearer (.+)$/.exec(req.headers.authorization ?? '');
    const t = m && access.get(m[1]);
    if (!t) return void fail(res, 401, 'UNAUTHORIZED', 'Missing or invalid access token');
    if (t.exp < Date.now()) return void fail(res, 401, 'TOKEN_EXPIRED', 'Access token expired');
    const user = users.get(t.userId);
    if (!user) return void fail(res, 401, 'UNAUTHORIZED', 'User not found');
    return { user, deviceId: t.deviceId };
  }

  const routes = {
    'POST /auth/register': (req, res, b) => {
      const errors = {};
      if (!b.full_name?.trim()) errors.full_name = 'required';
      if (!b.email || !EMAIL_RE.test(b.email)) errors.email = 'invalid';
      if (!strongPassword(b.password)) errors.password = 'weak';
      if (Object.keys(errors).length) return fail(res, 400, 'VALIDATION_ERROR', 'Invalid input', errors);
      const email = b.email.toLowerCase();
      if (byEmail(email)) return fail(res, 409, 'EMAIL_EXISTS', 'Email already registered');
      const id = `u_${randomBytes(6).toString('hex')}`;
      users.set(id, { id, email, password: b.password, full_name: b.full_name.trim(), role: b.role ?? 'STUDENT', student_id: b.student_id, verified: false, created_at: new Date().toISOString() });
      codes.set(email, String(randomInt(100000, 1000000)));
      ok(res, { user_id: id, email, verification_required: true }, 201);
    },
    'POST /auth/verify': (req, res, b) => {
      if (!b.email || !b.code) return fail(res, 400, 'VALIDATION_ERROR', 'email and code are required');
      const u = byEmail(String(b.email).toLowerCase());
      if (!u) return fail(res, 404, 'NOT_FOUND', 'Account not found');
      if (codes.get(u.email) !== String(b.code)) return fail(res, 400, 'INVALID_CODE', 'Invalid or expired code');
      u.verified = true;
      codes.delete(u.email);
      ok(res, { verified: true });
    },
    'POST /auth/login': (req, res, b) => {
      if (!b.email || !b.password) return fail(res, 400, 'VALIDATION_ERROR', 'email and password are required');
      const u = byEmail(String(b.email).toLowerCase());
      if (!u || u.password !== b.password) return fail(res, 401, 'INVALID_CREDENTIALS', 'Wrong email or password');
      if (!u.verified) return fail(res, 403, 'NOT_VERIFIED', 'Email not verified');
      const deviceId = b.device_id || `dev_${randomBytes(4).toString('hex')}`;
      revokeTokens(deviceId);
      ok(res, { ...issue(u.id, deviceId), user: privateUser(u) });
    },
    'POST /auth/refresh': (req, res, b) => {
      const r = b.refresh_token && refresh.get(b.refresh_token);
      if (!r) return fail(res, 401, 'INVALID_REFRESH_TOKEN', 'Invalid refresh token');
      refresh.delete(b.refresh_token); // rotation
      ok(res, issue(r.userId, r.deviceId));
    },
    'POST /auth/logout': (req, res) => {
      const a = authenticate(req, res);
      if (!a) return;
      revokeTokens(a.deviceId);
      ok(res, null);
    },
    'POST /auth/change-password': (req, res, b) => {
      const a = authenticate(req, res);
      if (!a) return;
      if (a.user.password !== b.current_password) return fail(res, 400, 'WRONG_PASSWORD', 'Current password is incorrect');
      if (!strongPassword(b.new_password)) return fail(res, 400, 'VALIDATION_ERROR', 'Weak password', { new_password: 'weak' });
      a.user.password = b.new_password;
      ok(res, null);
    },
    'GET /users/me': (req, res) => {
      const a = authenticate(req, res);
      if (a) ok(res, privateUser(a.user));
    },
    'PUT /users/me': (req, res, b) => {
      const a = authenticate(req, res);
      if (!a) return;
      if (b.full_name !== undefined && !String(b.full_name).trim()) return fail(res, 400, 'VALIDATION_ERROR', 'full_name must not be empty', { full_name: 'required' });
      if (b.phone && !/^0\d{9,10}$/.test(b.phone)) return fail(res, 400, 'VALIDATION_ERROR', 'Invalid phone', { phone: 'invalid' });
      for (const k of ['full_name', 'student_id', 'faculty', 'class_name', 'phone', 'bio', 'avatar_url']) if (b[k] !== undefined) a.user[k] = b[k];
      ok(res, privateUser(a.user));
    },
    'DELETE /users/me': (req, res, b) => {
      const a = authenticate(req, res);
      if (!a) return;
      if (a.user.password !== b.password) return fail(res, 400, 'WRONG_PASSWORD', 'Password is incorrect');
      for (const [id, d] of devices) if (d.userId === a.user.id) devices.delete(id);
      for (const [k, v] of access) if (v.userId === a.user.id) access.delete(k);
      for (const [k, v] of refresh) if (v.userId === a.user.id) refresh.delete(k);
      users.delete(a.user.id);
      ok(res, null);
    },
    'GET /users/:id': (req, res, b, id) => {
      const a = authenticate(req, res);
      if (!a) return;
      const u = users.get(id);
      if (!u) return fail(res, 404, 'NOT_FOUND', 'User not found');
      ok(res, publicUser(u));
    },
    'POST /devices/register': (req, res, b) => {
      const a = authenticate(req, res);
      if (!a) return;
      if (!b.device_id) return fail(res, 400, 'VALIDATION_ERROR', 'device_id is required', { device_id: 'required' });
      devices.set(b.device_id, { device_id: b.device_id, device_name: b.device_name ?? 'Unknown', platform: b.platform ?? '', push_token: b.push_token ?? null, userId: a.user.id, registered_at: new Date().toISOString() });
      ok(res, { device_id: b.device_id, registered: true });
    },
    'DELETE /devices/register': (req, res, b) => {
      const a = authenticate(req, res);
      if (!a) return;
      if (!b.device_id) return fail(res, 400, 'VALIDATION_ERROR', 'device_id is required', { device_id: 'required' });
      const d = devices.get(b.device_id);
      if (!d || d.userId !== a.user.id) return fail(res, 404, 'NOT_FOUND', 'Device not registered');
      devices.delete(b.device_id);
      ok(res, null);
    },
  };

  const server = createServer(async (req, res) => {
    const url = new URL(req.url, 'http://x');
    const path = url.pathname.replace(/^\/api\/v1/, '');
    let raw = '';
    for await (const chunk of req) raw += chunk;
    let body = {};
    try { body = raw ? JSON.parse(raw) : {}; } catch { return fail(res, 400, 'BAD_JSON', 'Malformed JSON'); }
    const exact = routes[`${req.method} ${path}`];
    if (exact) return exact(req, res, body);
    const m = /^\/(users)\/([^/]+)$/.exec(path);
    const param = m && routes[`${req.method} /${m[1]}/:id`];
    if (param) return param(req, res, body, decodeURIComponent(m[2]));
    fail(res, 404, 'NOT_FOUND', 'Route not found');
  });

  return {
    server,
    /** Chỉ có ở mock: thiết bị đã đăng ký chưa (spec không có API GET thiết bị). */
    isDeviceRegistered: (deviceId) => devices.has(deviceId),
    /** Chỉ có ở mock: đọc mã xác thực "đã gửi qua email". */
    getVerificationCode: (email) => codes.get(email.toLowerCase()),
    listen: (port = 0) => new Promise((r) => server.listen(port, '127.0.0.1', () => r(`http://127.0.0.1:${server.address().port}/api/v1`))),
    close: () => new Promise((r) => server.close(r)),
  };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  createAuthMockServer().listen(4010).then((url) => console.log(`Auth mock server: ${url}`));
}
