/**
 * Test script — API Authentication & User Management, theo Swagger
 * https://snsqb.duckdns.org/api/v1/swagger-ui/index.html  (/auth/*, /users/*, /devices/*)
 *
 * Chạy:  npm run test:auth
 * - Có AUTH_API_URL (hoặc EXPO_PUBLIC_API_URL / .env), vd https://snsqb.duckdns.org => test backend thật.
 * - Không có => tự bật tests/auth-mock-server.mjs (mô phỏng đúng hợp đồng Swagger).
 *
 * Biến môi trường cho backend thật:
 *   AUTH_TEST_EMAIL / AUTH_TEST_PASSWORD  tài khoản đã kích hoạt (nhà trường cấp) cho các case cần đăng nhập
 *   AUTH_EXPIRED_TOKEN                    một access token đã hết hạn (case TC16)
 * Các API /auth/admin/* (đăng ký, xác thực OTP) là API admin, Swagger ghi "không được gọi" => chỉ test trên mock.
 * Với tài khoản thật, các case đổi mật khẩu / sửa hồ sơ đều trả lại giá trị cũ sau khi test.
 *
 * Kết quả ghi ra tests/reports/auth-api-report.md (bảng kết quả).
 */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { after, before, test } from 'node:test';
import { createAuthMockServer } from './auth-mock-server.mjs';

// ───────── Cấu hình ─────────
function readEnvFile() {
  try {
    const m = readFileSync(new URL('../.env', import.meta.url), 'utf8').match(/^\s*EXPO_PUBLIC_API_URL\s*=\s*(.*?)\s*$/m);
    return m?.[1]?.replace(/^["']|["']$/g, '') ?? '';
  } catch {
    return '';
  }
}
const configured = (process.env.AUTH_API_URL ?? process.env.EXPO_PUBLIC_API_URL ?? readEnvFile()).replace(/\/+$/, '');
const USE_MOCK = !configured;
let API = configured && (configured.endsWith('/api/v1') ? configured : `${configured}/api/v1`);
let mockServer;

const env = {
  email: process.env.AUTH_TEST_EMAIL,
  password: process.env.AUTH_TEST_PASSWORD,
  expiredToken: process.env.AUTH_EXPIRED_TOKEN,
};

/** Trạng thái dùng chung giữa các case (chạy tuần tự theo thứ tự khai báo). */
const S = {
  fresh: { email: `auth.test.${randomUUID().slice(0, 8)}@example.com`, password: 'Test1234a', verified: false },
  deviceId: `test-device-${randomUUID().slice(0, 8)}`,
  otherDeviceId: `test-device-b-${randomUUID().slice(0, 8)}`,
  otherRefresh: null,
  main: null, // { email, password, fresh }
  access: null,
  refresh: null,
  userId: null,
};

before(async () => {
  if (USE_MOCK) {
    mockServer = createAuthMockServer();
    API = await mockServer.listen();
  }
});

// ───────── HTTP helper ─────────
const SUCCESS = new Set(['0000', '1000', 'SUCCESS']);
async function req(method, path, { body, token } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      Accept: 'application/json',
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = res.status === 204 ? '' : await res.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { json = text; }
  const code = json && typeof json === 'object' && 'code' in json ? String(json.code) : undefined;
  const data = json && typeof json === 'object' ? json.data : null;
  return { status: res.status, code, data, json, ok: res.ok && (code === undefined || SUCCESS.has(code)) };
}
const show = (r) => `HTTP ${r.status}${r.code ? ` · ${r.code}` : ''}`;

function expectOk(r) {
  assert.ok(r.ok, `Mong đợi thành công, nhận ${show(r)} ${JSON.stringify(r.json)?.slice(0, 200)}`);
  return show(r);
}
function expectFail(r, statuses, codes) {
  assert.equal(r.ok, false, `Mong đợi lỗi, nhận ${show(r)}`);
  assert.ok(statuses.includes(r.status), `Mong đợi HTTP ${statuses.join('/')}, nhận ${show(r)} ${JSON.stringify(r.json)?.slice(0, 160)}`);
  if (codes) assert.ok(codes.includes(r.code), `Mong đợi code ${codes.join('/')}, nhận ${r.code}`);
  return show(r);
}
const login = (email, password, deviceId = S.deviceId) => req('POST', '/auth/login', {
  body: { email, password, device_id: deviceId, platform: 'WEB', device_name: 'node-test', os_version: process.platform, app_version: '1.0.0' },
});
const tokensOf = (r) => ({ access: r.data?.access_token, refresh: r.data?.refresh_token });

// ───────── Ghi kết quả ─────────
const results = [];
/**
 * Khai báo 1 test case. `fn` trả về chuỗi mô tả kết quả thực tế (vd "HTTP 401 · 9998").
 * `skip` là hàm đánh giá điều kiện lúc chạy (phụ thuộc case trước).
 */
function tc(id, name, endpoint, expected, fn, skip) {
  test(`${id} ${name}`, async (t) => {
    const reason = skip?.();
    const row = { id, name, endpoint, expected, actual: '', result: 'SKIP', ms: 0 };
    results.push(row);
    if (reason) {
      row.actual = reason;
      return t.skip(reason);
    }
    const start = performance.now();
    try {
      row.actual = (await fn()) ?? 'OK';
      row.result = 'PASS';
    } catch (e) {
      row.actual = e.message.split('\n')[0];
      row.result = 'FAIL';
      throw e;
    } finally {
      row.ms = Math.round(performance.now() - start);
    }
  });
}
const mockOnly = () => (!USE_MOCK ? 'API admin — Swagger ghi "không được gọi" (chỉ test trên mock)' : undefined);
const needLogin = () => (!S.access ? 'Chưa có access token (đặt AUTH_TEST_EMAIL/AUTH_TEST_PASSWORD)' : undefined);
const needMain = () => (!S.main ? 'Không có tài khoản đã kích hoạt (đặt AUTH_TEST_EMAIL/AUTH_TEST_PASSWORD)' : undefined);

// ═════════ 1. Đăng ký & kích hoạt (API admin — chỉ mock) ═════════
const reg = (body) => req('POST', '/auth/admin/register', { body: { device_id: S.deviceId, ...body } });
tc('TC01', 'Đăng ký với thông tin hợp lệ', 'POST /auth/admin/register', '200 · 0000', async () =>
  expectOk(await reg({ email: S.fresh.email, password: S.fresh.password, role: 'STUDENT' })), mockOnly);
tc('TC02', 'Đăng ký thiếu trường bắt buộc', 'POST /auth/admin/register', '400 · 1002', async () =>
  expectFail(await req('POST', '/auth/admin/register', { body: { email: `x.${randomUUID()}@example.com` } }), [400], ['1002']), mockOnly);
tc('TC03', 'Đăng ký trùng email', 'POST /auth/admin/register', '409 USER_ALREADY_EXISTS', async () =>
  expectFail(await reg({ email: S.fresh.email, password: S.fresh.password, role: 'STUDENT' }), [409]), mockOnly);
tc('TC04', 'Đăng nhập khi chưa kích hoạt', 'POST /auth/login', '403 USER_NOT_VERIFIED', async () =>
  expectFail(await login(S.fresh.email, S.fresh.password), [403]), mockOnly);
tc('TC05', 'Xác thực OTP sai', 'POST /auth/admin/verify', '400 VERIFICATION_CODE_INVALID', async () =>
  expectFail(await req('POST', '/auth/admin/verify', { body: { email: S.fresh.email, verify_code: '000000', device_id: S.deviceId } }), [400]), mockOnly);
tc('TC06', 'Gửi lại OTP khi mã cũ còn hiệu lực', 'POST /auth/admin/resend-verify', '409', async () =>
  expectFail(await req('POST', '/auth/admin/resend-verify', { body: { email: S.fresh.email } }), [409]), mockOnly);
tc('TC07', 'Xác thực OTP đúng => nhận token', 'POST /auth/admin/verify', '200 + access_token', async () => {
  const r = await req('POST', '/auth/admin/verify', { body: { email: S.fresh.email, verify_code: mockServer.getVerificationCode(S.fresh.email), device_id: S.deviceId } });
  const out = expectOk(r);
  assert.ok(r.data?.access_token, 'Thiếu access_token');
  S.fresh.verified = true;
  return out;
}, mockOnly);

// ═════════ 2. Đăng nhập ═════════
tc('TC08', 'Đăng nhập với thông tin hợp lệ', 'POST /auth/login', '200 + access_token, refresh_token, user_id, role', async () => {
  S.main = S.fresh.verified ? { ...S.fresh, fresh: true } : { email: env.email, password: env.password, fresh: false };
  const r = await login(S.main.email, S.main.password);
  const out = expectOk(r);
  const t = tokensOf(r);
  assert.ok(t.access, 'Thiếu access_token');
  assert.ok(t.refresh, 'Thiếu refresh_token');
  assert.ok(r.data.user_id, 'Thiếu user_id');
  assert.ok(['STUDENT', 'LECTURER', 'ADMIN'].includes(r.data.role), `role không hợp lệ: ${r.data.role}`);
  Object.assign(S, t);
  S.userId = r.data.user_id;
  return out;
}, () => (!S.fresh.verified && !(env.email && env.password) ? 'Không có tài khoản đã kích hoạt (đặt AUTH_TEST_EMAIL/AUTH_TEST_PASSWORD)' : undefined));
tc('TC09', 'Đăng nhập sai mật khẩu', 'POST /auth/login', '400 · 9990', async () =>
  expectFail(await login(S.main.email, 'WrongPass999'), [400, 401], ['9990']), needMain);
tc('TC10', 'Đăng nhập email không tồn tại', 'POST /auth/login', '400 · 9990', async () =>
  expectFail(await login(`nobody.${randomUUID().slice(0, 8)}@example.com`, 'Test1234a'), [400, 401], ['9990']));
tc('TC11', 'Đăng nhập thiếu trường bắt buộc', 'POST /auth/login', '400 · 1002, liệt kê trường thiếu', async () => {
  const r = await req('POST', '/auth/login', { body: {} });
  const out = expectFail(r, [400], ['1002']);
  assert.ok(Array.isArray(r.data) && r.data.length >= 3, 'data phải là danh sách [{field, message}]');
  return `${out}; thiếu ${r.data.map((f) => f.field).join(', ')}`;
});
tc('TC12', 'Đăng nhập với platform không hợp lệ', 'POST /auth/login', '400', async () =>
  expectFail(await req('POST', '/auth/login', { body: { email: 'a@example.com', password: 'Test1234a', device_id: S.deviceId, platform: 'NOKIA' } }), [400]));

// ═════════ 3. Truy cập khi chưa đăng nhập / token ═════════
tc('TC13', 'Lấy hồ sơ khi chưa đăng nhập (không token)', 'GET /users/me', '401 · 9998', async () =>
  expectFail(await req('GET', '/users/me'), [401], ['9998']));
tc('TC14', 'Lấy hồ sơ với token giả', 'GET /users/me', '401 · 9998', async () =>
  expectFail(await req('GET', '/users/me', { token: 'abc.def.ghi' }), [401], ['9998']));
tc('TC15', 'Lấy hồ sơ với token hợp lệ', 'GET /users/me', '200, đúng email, không lộ mật khẩu', async () => {
  const r = await req('GET', '/users/me', { token: S.access });
  const out = expectOk(r);
  assert.equal(String(r.data.email).toLowerCase(), S.main.email.toLowerCase());
  assert.equal(r.data.password, undefined, 'Response không được chứa password');
  return out;
}, needLogin);
tc('TC16', 'Truy cập với access token đã hết hạn', 'GET /users/me', '401 · 9998', async () => {
  if (USE_MOCK) {
    // Server phụ có TTL 200ms để tạo token hết hạn thật.
    const short = createAuthMockServer({ accessTtlMs: 200 });
    const url = await short.listen();
    try {
      const email = `exp.${randomUUID().slice(0, 8)}@example.com`;
      const call = (m, p, o = {}) => fetch(`${url}${p}`, { method: m, headers: { 'Content-Type': 'application/json', ...(o.token ? { Authorization: `Bearer ${o.token}` } : {}) }, body: o.body && JSON.stringify(o.body) }).then(async (x) => ({ status: x.status, ...(await x.json()) }));
      await call('POST', '/auth/admin/register', { body: { email, password: 'Test1234a', role: 'STUDENT', device_id: 'd1' } });
      const v = await call('POST', '/auth/admin/verify', { body: { email, verify_code: short.getVerificationCode(email), device_id: 'd1' } });
      await new Promise((r) => setTimeout(r, 400));
      const r = await call('GET', '/users/me', { token: v.data.access_token });
      assert.equal(r.status, 401);
      return `HTTP ${r.status} · ${r.code}`;
    } finally {
      await short.close();
    }
  }
  return expectFail(await req('GET', '/users/me', { token: env.expiredToken }), [401], ['9998']);
}, () => (!USE_MOCK && !env.expiredToken ? 'Backend thật: cần AUTH_EXPIRED_TOKEN' : undefined));

// ═════════ 4. Refresh token ═════════
tc('TC17', 'Refresh token hợp lệ => access token mới dùng được', 'POST /auth/refresh', '200 + access_token mới', async () => {
  const r = await req('POST', '/auth/refresh', { body: { refresh_token: S.refresh } });
  const out = expectOk(r);
  const t = tokensOf(r);
  assert.ok(t.access, 'Thiếu access_token');
  S.access = t.access;
  if (t.refresh) S.refresh = t.refresh;
  expectOk(await req('GET', '/users/me', { token: S.access }));
  return `${out}; token mới gọi /users/me OK`;
}, needLogin);
tc('TC18', 'Refresh với token không hợp lệ', 'POST /auth/refresh', '401 · 9998', async () =>
  expectFail(await req('POST', '/auth/refresh', { body: { refresh_token: 'not-a-real-refresh-token' } }), [401], ['9998']));
tc('TC19', 'Refresh thiếu refresh_token', 'POST /auth/refresh', '400 · 1002', async () =>
  expectFail(await req('POST', '/auth/refresh', { body: {} }), [400, 401]));

// ═════════ 5. Hồ sơ người dùng ═════════
tc('TC20', 'Xem hồ sơ công khai theo userId', 'GET /users/{userId}', '200, ẩn email & mật khẩu', async () => {
  const r = await req('GET', `/users/${S.userId}`, { token: S.access });
  const out = expectOk(r);
  assert.equal(r.data.password, undefined, 'Response không được chứa password');
  return out;
}, needLogin);
tc('TC21', 'Xem hồ sơ userId không tồn tại', 'GET /users/{userId}', '404 USER_NOT_FOUND', async () =>
  expectFail(await req('GET', '/users/999999999', { token: S.access }), [404]), needLogin);
tc('TC22', 'Cập nhật hồ sơ hợp lệ', 'PUT /users/me', '200, GET /users/me trả dữ liệu mới', async () => {
  const before = (await req('GET', '/users/me', { token: S.access })).data;
  const bio = `bio-${randomUUID().slice(0, 6)}`;
  const out = expectOk(await req('PUT', '/users/me', { token: S.access, body: { full_name: 'Auth Tester', bio, gender: 'MALE', date_of_birth: '2004-08-05' } }));
  const me = await req('GET', '/users/me', { token: S.access });
  assert.equal(me.data.full_name, 'Auth Tester');
  assert.equal(me.data.bio, bio);
  if (!S.main.fresh) {
    // Tài khoản thật: trả lại hồ sơ cũ.
    await req('PUT', '/users/me', { token: S.access, body: { full_name: before.full_name, bio: before.bio ?? '', gender: before.gender ?? undefined, date_of_birth: before.date_of_birth ?? undefined } });
  }
  return `${out}; dữ liệu đã lưu`;
}, needLogin);
tc('TC23', 'Cập nhật hồ sơ với họ tên rỗng', 'PUT /users/me', '400', async () =>
  expectFail(await req('PUT', '/users/me', { token: S.access, body: { full_name: '   ' } }), [400, 422]), needLogin);
tc('TC24', 'Cập nhật hồ sơ khi chưa đăng nhập', 'PUT /users/me', '401 · 9998', async () =>
  expectFail(await req('PUT', '/users/me', { body: { full_name: 'Hacker' } }), [401], ['9998']));

// ═════════ 6. Đổi mật khẩu ═════════
tc('TC25', 'Đổi mật khẩu với mật khẩu cũ sai', 'POST /auth/change-password', '400 · 9990', async () =>
  expectFail(await req('POST', '/auth/change-password', { token: S.access, body: { old_password: 'Wrong0000x', new_password: 'NewPass123x' } }), [400], ['9990']), needLogin);
tc('TC26', 'Đổi mật khẩu khi chưa đăng nhập', 'POST /auth/change-password', '401 · 9998', async () =>
  expectFail(await req('POST', '/auth/change-password', { body: { old_password: 'x', new_password: 'NewPass123x' } }), [401], ['9998']));
tc('TC27', 'Đổi mật khẩu thiếu trường', 'POST /auth/change-password', '400 · 1002', async () =>
  expectFail(await req('POST', '/auth/change-password', { token: S.access, body: {} }), [400], ['1002']), needLogin);
tc('TC28', 'Đổi mật khẩu thành công', 'POST /auth/change-password', '200; mk mới đăng nhập được, mk cũ bị từ chối', async () => {
  const next = 'NewPass123x';
  const old = S.main.password;
  const out = expectOk(await req('POST', '/auth/change-password', { token: S.access, body: { old_password: old, new_password: next } }));
  S.main.password = next;
  expectFail(await login(S.main.email, old), [400, 401]);
  const relog = await login(S.main.email, next);
  expectOk(relog);
  Object.assign(S, tokensOf(relog));
  if (!S.main.fresh) {
    // Tài khoản thật dùng chung: trả lại mật khẩu cũ.
    expectOk(await req('POST', '/auth/change-password', { token: S.access, body: { old_password: next, new_password: old } }));
    S.main.password = old;
  }
  return `${out}; mk cũ bị từ chối, mk mới OK`;
}, needLogin);

// ═════════ 7. Thiết bị ═════════
tc('TC29', 'Danh sách thiết bị có thiết bị hiện tại', 'GET /devices', '200, data.devices có is_current_device', async () => {
  const r = await req('GET', '/devices', { token: S.access });
  const out = expectOk(r);
  const list = r.data?.devices ?? [];
  const cur = list.find((d) => d.device_id === S.deviceId);
  assert.ok(cur, `Không thấy ${S.deviceId} trong danh sách`);
  assert.equal(cur.is_current_device, true, 'Thiết bị hiện tại phải có is_current_device = true');
  return `${out}; ${list.length} thiết bị`;
}, needLogin);
tc('TC30', 'Danh sách thiết bị khi chưa đăng nhập', 'GET /devices', '401', async () =>
  expectFail(await req('GET', '/devices'), [401]));
tc('TC31', 'Đồng bộ FID cho thiết bị hiện tại', 'POST /devices/fid', '200', async () => {
  const out = expectOk(await req('POST', '/devices/fid', { token: S.access, body: { fid: 'fid_test_xyz' } }));
  if (USE_MOCK) assert.equal(mockServer.getFid(S.deviceId), 'fid_test_xyz');
  return out;
}, needLogin);
tc('TC32', 'Đồng bộ FID thiếu trường fid', 'POST /devices/fid', '400 · 1002', async () =>
  expectFail(await req('POST', '/devices/fid', { token: S.access, body: {} }), [400], ['1002']), needLogin);
tc('TC33', 'Huỷ đăng ký FID', 'POST /devices/fid/unregister', '200', async () => {
  const out = expectOk(await req('POST', '/devices/fid/unregister', { token: S.access, body: { fid: 'fid_test_xyz' } }));
  if (USE_MOCK) assert.equal(mockServer.getFid(S.deviceId), null);
  return out;
}, needLogin);
tc('TC34', 'Đăng xuất thiết bị khác => refresh của thiết bị đó bị thu hồi', 'POST /devices/{deviceId}/logout', '200; refresh thiết bị B 401', async () => {
  const b = await login(S.main.email, S.main.password, S.otherDeviceId);
  expectOk(b);
  S.otherRefresh = b.data.refresh_token;
  const out = expectOk(await req('POST', `/devices/${encodeURIComponent(S.otherDeviceId)}/logout`, { token: S.access }));
  expectFail(await req('POST', '/auth/refresh', { body: { refresh_token: S.otherRefresh } }), [401, 403]);
  return `${out}; refresh của B bị từ chối`;
}, needLogin);
tc('TC35', 'Xoá thiết bị khỏi tài khoản', 'DELETE /devices/{deviceId}', '200; không còn trong GET /devices', async () => {
  const out = expectOk(await req('DELETE', `/devices/${encodeURIComponent(S.otherDeviceId)}`, { token: S.access }));
  const list = (await req('GET', '/devices', { token: S.access })).data?.devices ?? [];
  assert.ok(!list.some((d) => d.device_id === S.otherDeviceId), 'Thiết bị vẫn còn trong danh sách');
  return `${out}; đã biến mất khỏi danh sách`;
}, needLogin);
tc('TC36', 'Đăng xuất thiết bị không tồn tại', 'POST /devices/{deviceId}/logout', '404 DEVICE_NOT_FOUND', async () =>
  expectFail(await req('POST', `/devices/no-such-device-${randomUUID().slice(0, 6)}/logout`, { token: S.access }), [404]), needLogin);

// ═════════ 8. Đăng xuất ═════════
tc('TC37', 'Đăng xuất khi chưa đăng nhập', 'POST /auth/logout', '401 · 9998', async () =>
  expectFail(await req('POST', '/auth/logout'), [401], ['9998']));
tc('TC38', 'Đăng xuất => refresh token cũ bị thu hồi', 'POST /auth/logout', '200; refresh sau đó 401', async () => {
  const out = expectOk(await req('POST', '/auth/logout', { token: S.access }));
  expectFail(await req('POST', '/auth/refresh', { body: { refresh_token: S.refresh } }), [401, 403]);
  S.access = S.refresh = null;
  return `${out}; refresh cũ bị từ chối`;
}, needLogin);

// ═════════ 9. Xoá tài khoản (chỉ tài khoản tạo trong lần chạy này) ═════════
tc('TC39', 'Xoá tài khoản => không đăng nhập lại được', 'DELETE /users/me', '200; đăng nhập sau đó thất bại', async () => {
  const l = await login(S.main.email, S.main.password);
  expectOk(l);
  const out = expectOk(await req('DELETE', '/users/me', { token: tokensOf(l).access }));
  expectFail(await login(S.main.email, S.main.password), [400, 401, 403, 404]);
  return `${out}; đăng nhập lại bị từ chối`;
}, () => (!S.main?.fresh ? 'Không xoá tài khoản thật — chỉ chạy với tài khoản tạo trên mock' : undefined));

// ───────── Bảng kết quả ─────────
after(async () => {
  await mockServer?.close();
  const pass = results.filter((r) => r.result === 'PASS').length;
  const fail = results.filter((r) => r.result === 'FAIL').length;
  const skip = results.length - pass - fail;
  const esc = (s) => String(s).replace(/\|/g, '\\|');
  const icon = { PASS: '✅ PASS', FAIL: '❌ FAIL', SKIP: '⏭️ SKIP' };
  const md = [
    '# Kết quả test API Authentication & User Management',
    '',
    `- Thời điểm chạy: ${new Date().toLocaleString('vi-VN')}`,
    `- Môi trường: ${USE_MOCK ? 'Mock server (tests/auth-mock-server.mjs, mô phỏng theo Swagger)' : API}`,
    `- Tài khoản test: ${USE_MOCK ? 'tạo mới trên mock' : env.email ? 'AUTH_TEST_EMAIL' : 'không có (chỉ chạy các case không cần đăng nhập)'}`,
    `- Tổng: **${results.length}** · Đạt: **${pass}** · Lỗi: **${fail}** · Bỏ qua: **${skip}**`,
    '',
    '| Mã | Kịch bản | Endpoint | Kết quả mong đợi | Kết quả thực tế | Trạng thái | Thời gian |',
    '|---|---|---|---|---|---|---|',
    ...results.map((r) => `| ${r.id} | ${esc(r.name)} | \`${r.endpoint}\` | ${esc(r.expected)} | ${esc(r.actual)} | ${icon[r.result]} | ${r.ms} ms |`),
    '',
  ].join('\n');
  const file = USE_MOCK ? 'auth-api-report.md' : 'auth-api-report.live.md';
  mkdirSync(new URL('./reports/', import.meta.url), { recursive: true });
  writeFileSync(new URL(`./reports/${file}`, import.meta.url), md);
  console.log(`\nBảng kết quả: tests/reports/${file} (${pass}/${results.length} đạt, ${fail} lỗi, ${skip} bỏ qua)`);
});
