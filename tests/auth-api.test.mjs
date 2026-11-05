/**
 * Test script — API Authentication & User Management (/auth/*, /users/*, /devices/register).
 *
 * Chạy:  npm run test:auth
 * - Có AUTH_API_URL (hoặc SOCIAL_API_URL / EXPO_PUBLIC_API_URL / .env) => test backend thật.
 * - Không có => tự bật tests/auth-mock-server.mjs để kiểm tra chính bộ test và hợp đồng API.
 *
 * Biến môi trường cho backend thật:
 *   AUTH_TEST_EMAIL / AUTH_TEST_PASSWORD  tài khoản ĐÃ xác thực, dùng cho các case cần đăng nhập
 *   AUTH_VERIFY_CODE                      mã xác thực email của tài khoản vừa đăng ký (nếu lấy được)
 *   AUTH_EXPIRED_TOKEN                    một access token đã hết hạn (case TC17)
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
const configured = (process.env.AUTH_API_URL ?? process.env.SOCIAL_API_URL ?? process.env.EXPO_PUBLIC_API_URL ?? readEnvFile()).replace(/\/+$/, '');
const USE_MOCK = !configured;
let API = configured && (configured.endsWith('/api/v1') ? configured : `${configured}/api/v1`);
let mockServer;

const env = {
  email: process.env.AUTH_TEST_EMAIL,
  password: process.env.AUTH_TEST_PASSWORD,
  verifyCode: process.env.AUTH_VERIFY_CODE,
  expiredToken: process.env.AUTH_EXPIRED_TOKEN,
};

/** Trạng thái dùng chung giữa các case (chạy tuần tự theo thứ tự khai báo). */
const S = {
  fresh: { email: `auth.test.${randomUUID().slice(0, 8)}@example.com`, password: 'Test1234a', verified: false },
  deviceId: `test-device-${randomUUID().slice(0, 8)}`,
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
const SUCCESS = new Set(['1000', '0000', 'SUCCESS']);
async function req(method, path, { body, token, headers } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      Accept: 'application/json',
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = res.status === 204 ? '' : await res.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { json = text; }
  const code = json && typeof json === 'object' && 'code' in json ? String(json.code) : undefined;
  const data = json && typeof json === 'object' ? json.data ?? json : json;
  return { status: res.status, code, data, json, ok: res.ok && (code === undefined || SUCCESS.has(code)) };
}
const show = (r) => `HTTP ${r.status}${r.code ? ` · ${r.code}` : ''}`;

function expectOk(r) {
  assert.ok(r.ok, `Mong đợi thành công, nhận ${show(r)} ${JSON.stringify(r.json)?.slice(0, 200)}`);
  return show(r);
}
function expectFail(r, statuses) {
  assert.equal(r.ok, false, `Mong đợi lỗi, nhận ${show(r)}`);
  assert.ok(statuses.includes(r.status), `Mong đợi HTTP ${statuses.join('/')}, nhận ${show(r)}`);
  return show(r);
}
const login = (email, password) => req('POST', '/auth/login', { body: { email, password, device_id: S.deviceId, device_name: 'node-test', platform: 'test' } });
const tokensOf = (r) => ({ access: r.data?.access_token, refresh: r.data?.refresh_token });

// ───────── Ghi kết quả ─────────
const results = [];
/**
 * Khai báo 1 test case. `fn` trả về chuỗi mô tả kết quả thực tế (vd "HTTP 401 · UNAUTHORIZED").
 * `skip` là hàm để đánh giá điều kiện tại thời điểm chạy (phụ thuộc case trước).
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
const needLogin = () => (!S.access ? 'Chưa có access token (case đăng nhập không chạy/không đạt)' : undefined);
const needMain = () => (!S.main ? 'Không có tài khoản đã xác thực (đặt AUTH_TEST_EMAIL/AUTH_TEST_PASSWORD)' : undefined);

// ═════════ 1. Đăng ký ═════════
tc('TC01', 'Đăng ký với thông tin hợp lệ', 'POST /auth/register', '2xx, trả về email/user_id', async () => {
  const r = await req('POST', '/auth/register', { body: { full_name: 'Auth Tester', email: S.fresh.email, password: S.fresh.password, role: 'STUDENT' } });
  return expectOk(r);
});
tc('TC02', 'Đăng ký thiếu trường bắt buộc', 'POST /auth/register', '400/422', async () =>
  expectFail(await req('POST', '/auth/register', { body: { email: `x.${randomUUID()}@example.com` } }), [400, 422]));
tc('TC03', 'Đăng ký với email sai định dạng', 'POST /auth/register', '400/422', async () =>
  expectFail(await req('POST', '/auth/register', { body: { full_name: 'A', email: 'not-an-email', password: 'Test1234a' } }), [400, 422]));
tc('TC04', 'Đăng ký với mật khẩu yếu', 'POST /auth/register', '400/422', async () =>
  expectFail(await req('POST', '/auth/register', { body: { full_name: 'A', email: `weak.${randomUUID()}@example.com`, password: '123' } }), [400, 422]));
tc('TC05', 'Đăng ký trùng email', 'POST /auth/register', '409 (hoặc 400/422)', async () =>
  expectFail(await req('POST', '/auth/register', { body: { full_name: 'Dup', email: S.fresh.email, password: S.fresh.password } }), [409, 400, 422]));

// ═════════ 2. Xác thực email ═════════
tc('TC06', 'Đăng nhập khi chưa xác thực email', 'POST /auth/login', '403 (hoặc 401)', async () =>
  expectFail(await login(S.fresh.email, S.fresh.password), [403, 401]));
tc('TC07', 'Xác thực với mã sai', 'POST /auth/verify', '400/422', async () =>
  expectFail(await req('POST', '/auth/verify', { body: { email: S.fresh.email, code: '000000' } }), [400, 422]));
tc('TC08', 'Xác thực với mã đúng', 'POST /auth/verify', '2xx', async () => {
  const code = USE_MOCK ? mockServer.getVerificationCode(S.fresh.email) : env.verifyCode;
  const r = await req('POST', '/auth/verify', { body: { email: S.fresh.email, code } });
  const out = expectOk(r);
  S.fresh.verified = true;
  return out;
}, () => (!USE_MOCK && !env.verifyCode ? 'Backend thật: cần AUTH_VERIFY_CODE (mã gửi qua email)' : undefined));

// ═════════ 3. Đăng nhập ═════════
tc('TC09', 'Đăng nhập với thông tin hợp lệ', 'POST /auth/login', '200 + access_token + refresh_token', async () => {
  S.main = S.fresh.verified ? { ...S.fresh, fresh: true } : { email: env.email, password: env.password, fresh: false };
  const r = await login(S.main.email, S.main.password);
  const out = expectOk(r);
  const t = tokensOf(r);
  assert.ok(t.access, 'Thiếu access_token');
  assert.ok(t.refresh, 'Thiếu refresh_token');
  Object.assign(S, t);
  S.userId = r.data?.user?.user_id ?? r.data?.user?.id ?? null;
  return out;
}, () => (!S.fresh.verified && !(env.email && env.password) ? 'Không có tài khoản đã xác thực (đặt AUTH_TEST_EMAIL/AUTH_TEST_PASSWORD)' : undefined));
tc('TC10', 'Đăng nhập sai mật khẩu', 'POST /auth/login', '401', async () =>
  expectFail(await login(S.main.email, 'WrongPass999'), [401]), needMain);
tc('TC11', 'Đăng nhập email không tồn tại', 'POST /auth/login', '401 (hoặc 404)', async () =>
  expectFail(await login(`nobody.${randomUUID()}@example.com`, 'Test1234a'), [401, 404]));
tc('TC12', 'Đăng nhập thiếu mật khẩu', 'POST /auth/login', '400/422', async () =>
  expectFail(await req('POST', '/auth/login', { body: { email: S.fresh.email } }), [400, 422]));
tc('TC13', 'Đăng nhập body rỗng', 'POST /auth/login', '400/422', async () =>
  expectFail(await req('POST', '/auth/login', { body: {} }), [400, 422]));

// ═════════ 4. Truy cập khi chưa đăng nhập / token ═════════
tc('TC14', 'Lấy hồ sơ khi chưa đăng nhập (không token)', 'GET /users/me', '401', async () =>
  expectFail(await req('GET', '/users/me'), [401]));
tc('TC15', 'Lấy hồ sơ với token giả', 'GET /users/me', '401', async () =>
  expectFail(await req('GET', '/users/me', { token: 'invalid.token.value' }), [401]));
tc('TC16', 'Lấy hồ sơ với token hợp lệ', 'GET /users/me', '200, đúng email, không lộ mật khẩu', async () => {
  const r = await req('GET', '/users/me', { token: S.access });
  const out = expectOk(r);
  assert.equal(String(r.data.email).toLowerCase(), S.main.email.toLowerCase());
  assert.equal(r.data.password, undefined, 'Response không được chứa password');
  S.userId ??= r.data.user_id ?? r.data.id;
  return out;
}, needLogin);
tc('TC17', 'Truy cập với access token đã hết hạn', 'GET /users/me', '401', async () => {
  if (USE_MOCK) {
    // Server phụ có TTL 200ms để tạo token hết hạn thật.
    const short = createAuthMockServer({ accessTtlMs: 200 });
    const url = await short.listen();
    try {
      const email = `exp.${randomUUID().slice(0, 8)}@example.com`;
      const call = (m, p, o = {}) => fetch(`${url}${p}`, { method: m, headers: { 'Content-Type': 'application/json', ...(o.token ? { Authorization: `Bearer ${o.token}` } : {}) }, body: o.body && JSON.stringify(o.body) }).then(async (x) => ({ status: x.status, ...(await x.json()) }));
      await call('POST', '/auth/register', { body: { full_name: 'Exp', email, password: 'Test1234a' } });
      await call('POST', '/auth/verify', { body: { email, code: short.getVerificationCode(email) } });
      const l = await call('POST', '/auth/login', { body: { email, password: 'Test1234a' } });
      await new Promise((r) => setTimeout(r, 400));
      const r = await call('GET', '/users/me', { token: l.data.access_token });
      assert.equal(r.status, 401);
      return `HTTP ${r.status} · ${r.code}`;
    } finally {
      await short.close();
    }
  }
  return expectFail(await req('GET', '/users/me', { token: env.expiredToken }), [401]);
}, () => (!USE_MOCK && !env.expiredToken ? 'Backend thật: cần AUTH_EXPIRED_TOKEN' : undefined));

// ═════════ 5. Refresh token ═════════
tc('TC18', 'Refresh token hợp lệ => access token mới dùng được', 'POST /auth/refresh', '200 + access_token mới', async () => {
  const r = await req('POST', '/auth/refresh', { body: { refresh_token: S.refresh } });
  const out = expectOk(r);
  const t = tokensOf(r);
  assert.ok(t.access, 'Thiếu access_token');
  S.access = t.access;
  if (t.refresh) S.refresh = t.refresh;
  expectOk(await req('GET', '/users/me', { token: S.access }));
  return `${out}; token mới gọi /users/me OK`;
}, needLogin);
tc('TC19', 'Refresh với token không hợp lệ', 'POST /auth/refresh', '401 (hoặc 400/403)', async () =>
  expectFail(await req('POST', '/auth/refresh', { body: { refresh_token: 'not-a-real-refresh-token' } }), [401, 400, 403]));
tc('TC20', 'Refresh thiếu refresh_token', 'POST /auth/refresh', '400/401/422', async () =>
  expectFail(await req('POST', '/auth/refresh', { body: {} }), [400, 401, 422]));

// ═════════ 6. Hồ sơ người dùng ═════════
tc('TC21', 'Xem hồ sơ công khai theo userId', 'GET /users/{userId}', '200, không lộ mật khẩu', async () => {
  const r = await req('GET', `/users/${encodeURIComponent(S.userId)}`, { token: S.access });
  const out = expectOk(r);
  assert.equal(r.data.password, undefined, 'Response không được chứa password');
  return out;
}, () => needLogin() ?? (!S.userId ? 'Không lấy được userId' : undefined));
tc('TC22', 'Xem hồ sơ userId không tồn tại', 'GET /users/{userId}', '404', async () =>
  expectFail(await req('GET', `/users/does-not-exist-${randomUUID()}`, { token: S.access }), [404, 400]), needLogin);
tc('TC23', 'Cập nhật hồ sơ hợp lệ', 'PUT /users/me', '200, GET /users/me trả dữ liệu mới', async () => {
  const bio = `bio-${randomUUID().slice(0, 6)}`;
  const out = expectOk(await req('PUT', '/users/me', { token: S.access, body: { full_name: 'Auth Tester Updated', bio, phone: '0912345678' } }));
  const me = await req('GET', '/users/me', { token: S.access });
  assert.equal(me.data.full_name, 'Auth Tester Updated');
  assert.equal(me.data.bio, bio);
  return `${out}; dữ liệu đã lưu`;
}, needLogin);
tc('TC24', 'Cập nhật hồ sơ với họ tên rỗng', 'PUT /users/me', '400/422', async () =>
  expectFail(await req('PUT', '/users/me', { token: S.access, body: { full_name: '   ' } }), [400, 422]), needLogin);
tc('TC25', 'Cập nhật hồ sơ khi chưa đăng nhập', 'PUT /users/me', '401', async () =>
  expectFail(await req('PUT', '/users/me', { body: { full_name: 'Hacker' } }), [401]));

// ═════════ 7. Đổi mật khẩu ═════════
tc('TC26', 'Đổi mật khẩu với mật khẩu hiện tại sai', 'POST /auth/change-password', '400 (hoặc 401/403)', async () =>
  expectFail(await req('POST', '/auth/change-password', { token: S.access, body: { current_password: 'Wrong0000', new_password: 'NewPass123' } }), [400, 401, 403, 422]), needLogin);
tc('TC27', 'Đổi mật khẩu khi chưa đăng nhập', 'POST /auth/change-password', '401', async () =>
  expectFail(await req('POST', '/auth/change-password', { body: { current_password: 'x', new_password: 'NewPass123' } }), [401]));
tc('TC28', 'Đổi mật khẩu thành công', 'POST /auth/change-password', '2xx; mk mới đăng nhập được, mk cũ bị từ chối', async () => {
  const next = 'NewPass123x';
  const out = expectOk(await req('POST', '/auth/change-password', { token: S.access, body: { current_password: S.main.password, new_password: next } }));
  const old = S.main.password;
  S.main.password = next;
  expectFail(await login(S.main.email, old), [401]);
  const relog = await login(S.main.email, next);
  expectOk(relog);
  Object.assign(S, tokensOf(relog));
  if (!S.main.fresh) {
    // Tài khoản thật dùng chung: trả lại mật khẩu cũ.
    expectOk(await req('POST', '/auth/change-password', { token: S.access, body: { current_password: next, new_password: old } }));
    S.main.password = old;
  }
  return `${out}; mk cũ 401, mk mới OK`;
}, needLogin);

// ═════════ 8. Thiết bị ═════════
const devBody = () => ({ device_id: S.deviceId, device_name: 'node-test', platform: 'test', push_token: 'test-push-token' });
tc('TC29', 'Đăng ký thiết bị hợp lệ', 'POST /devices/register', '2xx; gọi lại lần 2 vẫn 2xx', async () => {
  const out = expectOk(await req('POST', '/devices/register', { token: S.access, body: devBody() }));
  expectOk(await req('POST', '/devices/register', { token: S.access, body: devBody() }));
  if (USE_MOCK) assert.ok(mockServer.isDeviceRegistered(S.deviceId), 'Server chưa lưu thiết bị');
  return `${out}; đăng ký lại OK`;
}, needLogin);
tc('TC30', 'Đăng ký thiết bị thiếu device_id', 'POST /devices/register', '400/422', async () =>
  expectFail(await req('POST', '/devices/register', { token: S.access, body: { device_name: 'x' } }), [400, 422]), needLogin);
tc('TC31', 'Đăng ký thiết bị khi chưa đăng nhập', 'POST /devices/register', '401', async () =>
  expectFail(await req('POST', '/devices/register', { body: devBody() }), [401]));
tc('TC32', 'Huỷ đăng ký thiết bị khi chưa đăng nhập', 'DELETE /devices/register', '401', async () =>
  expectFail(await req('DELETE', '/devices/register', { body: { device_id: S.deviceId } }), [401]));
tc('TC33', 'Huỷ đăng ký thiết bị hợp lệ', 'DELETE /devices/register', '2xx', async () => {
  const out = expectOk(await req('DELETE', '/devices/register', { token: S.access, body: { device_id: S.deviceId } }));
  if (USE_MOCK) assert.equal(mockServer.isDeviceRegistered(S.deviceId), false, 'Thiết bị vẫn còn đăng ký');
  return out;
}, needLogin);

// ═════════ 9. Đăng xuất ═════════
tc('TC34', 'Đăng xuất khi chưa đăng nhập', 'POST /auth/logout', '401', async () =>
  expectFail(await req('POST', '/auth/logout', { body: {} }), [401]));
tc('TC35', 'Đăng xuất => refresh token cũ bị thu hồi', 'POST /auth/logout', '2xx; refresh sau đó 401', async () => {
  const out = expectOk(await req('POST', '/auth/logout', { token: S.access, body: { refresh_token: S.refresh } }));
  expectFail(await req('POST', '/auth/refresh', { body: { refresh_token: S.refresh } }), [401, 400, 403]);
  S.access = S.refresh = null;
  return `${out}; refresh cũ bị từ chối`;
}, needLogin);

// ═════════ 10. Xoá tài khoản (chỉ tài khoản tạo trong lần chạy này) ═════════
tc('TC36', 'Xoá tài khoản => không đăng nhập lại được', 'DELETE /users/me', '2xx; đăng nhập sau đó 401', async () => {
  const l = await login(S.main.email, S.main.password);
  expectOk(l);
  const out = expectOk(await req('DELETE', '/users/me', { token: tokensOf(l).access, body: { password: S.main.password } }));
  expectFail(await login(S.main.email, S.main.password), [401, 403, 404]);
  return `${out}; đăng nhập lại bị từ chối`;
}, () => (!S.main?.fresh ? 'Chỉ xoá tài khoản tạo trong lần chạy này (cần TC08 đạt)' : undefined));

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
    `- Môi trường: ${USE_MOCK ? 'Mock server (tests/auth-mock-server.mjs) — chưa cấu hình AUTH_API_URL' : API}`,
    `- Tổng: **${results.length}** · Đạt: **${pass}** · Lỗi: **${fail}** · Bỏ qua: **${skip}**`,
    '',
    '| Mã | Kịch bản | Endpoint | Kết quả mong đợi | Kết quả thực tế | Trạng thái | Thời gian |',
    '|---|---|---|---|---|---|---|',
    ...results.map((r) => `| ${r.id} | ${esc(r.name)} | \`${r.endpoint}\` | ${esc(r.expected)} | ${esc(r.actual)} | ${icon[r.result]} | ${r.ms} ms |`),
    '',
  ].join('\n');
  mkdirSync(new URL('./reports/', import.meta.url), { recursive: true });
  writeFileSync(new URL('./reports/auth-api-report.md', import.meta.url), md);
  console.log(`\nBảng kết quả: tests/reports/auth-api-report.md (${pass}/${results.length} đạt, ${fail} lỗi, ${skip} bỏ qua)`);
});
