/**
 * Test script — API Quan hệ & Báo cáo vi phạm, theo Swagger
 * https://snsqb.duckdns.org/api/v1/swagger-ui/index.html (07 Friendships, 08 Follows, 09 Blocks, 26 Reports)
 *
 * Chạy:  npm run test:relationship
 * - Có REL_API_URL (hoặc AUTH_API_URL / EXPO_PUBLIC_API_URL / .env) => test backend thật.
 * - Đặt REL_API_URL= (rỗng) => tự bật tests/relationship-mock-server.mjs.
 *
 * Biến môi trường cho backend thật:
 *   REL_EMAIL_A / REL_PASSWORD_A   tài khoản A (mặc định lấy AUTH_TEST_EMAIL / AUTH_TEST_PASSWORD)
 *   REL_EMAIL_B / REL_PASSWORD_B   tài khoản B CÙNG VAI TRÒ với A (cho luồng kết bạn / theo dõi / chặn giữa 2 người)
 *   REL_OTHER_ROLE_ID              (tuỳ chọn) user_id của người KHÁC vai trò => test luật "chỉ kết bạn cùng vai trò"
 *   REL_ALLOW_REPORT=1             (tuỳ chọn) cho phép gửi 1 báo cáo THẬT về tài khoản B. Mặc định chỉ test các case báo cáo bị từ chối.
 * Quan hệ ban đầu giữa A và B được ghi lại và khôi phục sau khi chạy.
 *
 * Kết quả ghi ra tests/reports/relationship-api-report(.live).md
 */
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { after, before, test } from 'node:test';
import { createRelationshipMockServer, MOCK_ACCOUNTS } from './relationship-mock-server.mjs';

// ───────── Cấu hình ─────────
function readEnvFile() {
  try {
    const m = readFileSync(new URL('../.env', import.meta.url), 'utf8').match(/^\s*EXPO_PUBLIC_API_URL\s*=\s*(.*?)\s*$/m);
    return m?.[1]?.replace(/^["']|["']$/g, '') ?? '';
  } catch {
    return '';
  }
}
const configured = (process.env.REL_API_URL ?? process.env.AUTH_API_URL ?? process.env.EXPO_PUBLIC_API_URL ?? readEnvFile()).replace(/\/+$/, '');
const USE_MOCK = !configured;
let API = configured && (configured.endsWith('/api/v1') ? configured : `${configured}/api/v1`);
let mockServer;

const env = USE_MOCK
  ? { a: MOCK_ACCOUNTS.a, b: MOCK_ACCOUNTS.b, otherRoleId: '201', allowReport: true }
  : {
    a: { email: process.env.REL_EMAIL_A ?? process.env.AUTH_TEST_EMAIL, password: process.env.REL_PASSWORD_A ?? process.env.AUTH_TEST_PASSWORD },
    b: { email: process.env.REL_EMAIL_B, password: process.env.REL_PASSWORD_B },
    otherRoleId: process.env.REL_OTHER_ROLE_ID,
    allowReport: process.env.REL_ALLOW_REPORT === '1',
  };

/** Trạng thái dùng chung (case chạy tuần tự theo thứ tự khai báo). */
const S = { a: null, b: null, initial: null };
const NOBODY = '999999999';

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
const brief = (r) => JSON.stringify(r.json)?.slice(0, 200);
function expectOk(r) {
  assert.ok(r.ok, `Mong đợi thành công, nhận ${show(r)} ${brief(r)}`);
  return show(r);
}
function expectFail(r, statuses) {
  assert.equal(r.ok, false, `Mong đợi lỗi, nhận ${show(r)}`);
  assert.ok(statuses.includes(r.status), `Mong đợi HTTP ${statuses.join('/')}, nhận ${show(r)} ${brief(r)}`);
  return `${show(r)}${r.json?.message ? ` — ${String(r.json.message).slice(0, 60)}` : ''}`;
}
const has = (obj, keys) => keys.filter((k) => !(k in (obj ?? {})));
function expectShape(obj, keys, what) {
  const miss = has(obj, keys);
  assert.equal(miss.length, 0, `${what} thiếu trường: ${miss.join(', ')} — nhận ${JSON.stringify(obj)?.slice(0, 200)}`);
}

async function signIn(acc) {
  const r = await req('POST', '/auth/login', {
    body: { email: acc.email, password: acc.password, device_id: `rel-test-${acc.email}`, platform: 'WEB', device_name: 'node-test-relationship' },
  });
  expectOk(r);
  const token = r.data.access_token;
  const me = await req('GET', '/users/me', { token });
  expectOk(me);
  return { token, id: String(me.data.user_id), role: me.data.role, name: me.data.full_name };
}
const as = (who) => ({ token: S[who].token });
const stats = async (who, target) => (await req('GET', `/users/${target}/relationship-stats`, as(who))).data;
const ids = (r, key) => (r.data?.items ?? []).map((x) => String((key ? x[key] : x)?.user_id));

/** Đưa quan hệ A–B về "không có gì" (bỏ qua lỗi). */
async function resetPair() {
  const A = S.a.id;
  const B = S.b.id;
  await req('DELETE', `/blocks/${B}`, as('a'));
  await req('DELETE', `/blocks/${A}`, as('b'));
  await req('DELETE', `/friendships/${B}`, as('a'));
  await req('POST', '/friendships/decline', { ...as('a'), body: { requester_id: Number(B) } });
  await req('POST', '/friendships/decline', { ...as('b'), body: { requester_id: Number(A) } });
  await req('DELETE', `/follows/${B}`, as('a'));
  await req('DELETE', `/follows/${A}`, as('b'));
}

// ───────── Ghi kết quả ─────────
const results = [];
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
const needA = () => (!S.a ? 'Chưa đăng nhập được tài khoản A (đặt REL_EMAIL_A/REL_PASSWORD_A hoặc AUTH_TEST_EMAIL/AUTH_TEST_PASSWORD)' : undefined);
const needAB = () => needA() ?? (!S.b ? 'Cần tài khoản B cùng vai trò (đặt REL_EMAIL_B/REL_PASSWORD_B)' : undefined);

before(async () => {
  if (USE_MOCK) {
    mockServer = createRelationshipMockServer();
    API = await mockServer.listen();
  }
  if (env.a.email && env.a.password) S.a = await signIn(env.a).catch((e) => { console.error('Đăng nhập A lỗi:', e.message); return null; });
  if (S.a && env.b.email && env.b.password) S.b = await signIn(env.b).catch((e) => { console.error('Đăng nhập B lỗi:', e.message); return null; });
  if (S.b && S.b.role !== S.a.role) {
    console.error('Tài khoản B khác vai trò với A — bỏ qua các case 2 người.');
    S.b = null;
  }
  if (S.b) {
    // Ghi lại quan hệ ban đầu để khôi phục, rồi đưa về trạng thái sạch.
    const [ab, ba, aReceived] = await Promise.all([stats('a', S.b.id), stats('b', S.a.id), req('GET', '/friendships/requests/received?limit=50', as('a'))]);
    S.initial = {
      friend: ab?.relationship_with_me?.friend === true,
      pendingFromB: ab?.relationship_with_me?.friend_request_status === 'PENDING' && ids(aReceived, 'requester').includes(S.b.id),
      pendingFromA: ab?.relationship_with_me?.friend_request_status === 'PENDING' && !ids(aReceived, 'requester').includes(S.b.id),
      aFollowsB: ab?.relationship_with_me?.following === true,
      bFollowsA: ba?.relationship_with_me?.following === true,
      aBlocksB: ab?.relationship_with_me?.blocked === true,
      bBlocksA: ba?.relationship_with_me?.blocked === true,
    };
    await resetPair();
  }
});

// ═════════ 1. Chưa đăng nhập ═════════
tc('RL01', 'Lấy danh sách bạn bè khi chưa đăng nhập', 'GET /friendships', '401 · 9998', async () => expectFail(await req('GET', '/friendships'), [401]));
tc('RL02', 'Theo dõi khi chưa đăng nhập', 'POST /follows/{id}', '401 · 9998', async () => expectFail(await req('POST', '/follows/1'), [401]));
tc('RL03', 'Chặn khi chưa đăng nhập', 'POST /blocks/{id}', '401 · 9998', async () => expectFail(await req('POST', '/blocks/1'), [401]));
tc('RL04', 'Báo cáo khi chưa đăng nhập', 'POST /report', '401 · 9998', async () =>
  expectFail(await req('POST', '/report', { body: { target_type: 'USER', target_id: 1, violation_type: 'SPAM' } }), [401]));
tc('RL05', 'Token giả mạo', 'GET /blocks', '401 · 9998', async () => expectFail(await req('GET', '/blocks', { token: 'abc.def.ghi' }), [401]));

// ═════════ 2. Danh sách & cấu trúc dữ liệu (1 tài khoản) ═════════
const listCase = (id, name, path, totalKey, itemKeys, nested) => tc(id, name, `GET ${path}`, `200, items[] + ${totalKey}`, async () => {
  const r = await req('GET', `${path}?limit=20`, as('a'));
  const out = expectOk(r);
  expectShape(r.data, ['items', totalKey], 'data');
  assert.ok(Array.isArray(r.data.items), 'items không phải mảng');
  const first = r.data.items[0];
  if (first) expectShape(nested ? first[nested] : first, itemKeys, 'item');
  return `${out}; ${r.data.items.length} mục, ${totalKey}=${r.data[totalKey]}`;
}, needA);
listCase('RL06', 'Danh sách bạn bè', '/friendships', 'total_friends', ['user_id', 'full_name']);
listCase('RL07', 'Lời mời kết bạn đã nhận', '/friendships/requests/received', 'total_pending', ['user_id', 'full_name'], 'requester');
listCase('RL08', 'Lời mời kết bạn đã gửi', '/friendships/requests/sent', 'total_sent', ['user_id', 'full_name'], 'receiver');
listCase('RL09', 'Người theo dõi tôi', '/follows/followers', 'total_followers', ['user_id', 'full_name']);
listCase('RL10', 'Người tôi đang theo dõi', '/follows/following', 'total_following', ['user_id', 'full_name']);
listCase('RL11', 'Danh sách đã chặn', '/blocks', 'total_blocked', ['user_id', 'full_name']);
tc('RL12', 'Thống kê quan hệ của chính mình', 'GET /users/{id}/relationship-stats', '200, counts + relationship_with_me', async () => {
  const r = await req('GET', `/users/${S.a.id}/relationship-stats`, as('a'));
  const out = expectOk(r);
  expectShape(r.data, ['counts', 'relationship_with_me'], 'data');
  expectShape(r.data.counts, ['followers_count', 'following_count', 'friends_count'], 'counts');
  expectShape(r.data.relationship_with_me, ['friend_request_status', 'following', 'followed_by', 'friend', 'blocked'], 'relationship_with_me');
  return `${out}; ${JSON.stringify(r.data.counts)}`;
}, needA);
tc('RL13', 'Thống kê quan hệ user không tồn tại', 'GET /users/{id}/relationship-stats', '404 USER_NOT_FOUND', async () =>
  expectFail(await req('GET', `/users/${NOBODY}/relationship-stats`, as('a')), [404]), needA);

// ═════════ 3. Tự tương tác / dữ liệu sai ═════════
tc('RL14', 'Tự theo dõi chính mình', 'POST /follows/{id}', '400 CANNOT_INTERACT_WITH_SELF', async () =>
  expectFail(await req('POST', `/follows/${S.a.id}`, as('a')), [400]), needA);
tc('RL15', 'Tự gửi lời mời cho chính mình', 'POST /friendships/request', '400 CANNOT_INTERACT_WITH_SELF', async () =>
  expectFail(await req('POST', '/friendships/request', { ...as('a'), body: { addressee_id: Number(S.a.id) } }), [400]), needA);
tc('RL16', 'Tự chặn chính mình', 'POST /blocks/{id}', '400 CANNOT_INTERACT_WITH_SELF', async () =>
  expectFail(await req('POST', `/blocks/${S.a.id}`, as('a')), [400]), needA);
tc('RL17', 'Gửi lời mời thiếu addressee_id', 'POST /friendships/request', '400 · 1002', async () =>
  expectFail(await req('POST', '/friendships/request', { ...as('a'), body: {} }), [400]), needA);
tc('RL18', 'Theo dõi user không tồn tại', 'POST /follows/{id}', '404 USER_NOT_FOUND', async () =>
  expectFail(await req('POST', `/follows/${NOBODY}`, as('a')), [404]), needA);
tc('RL19', 'Chặn user không tồn tại', 'POST /blocks/{id}', '404 USER_NOT_FOUND', async () =>
  expectFail(await req('POST', `/blocks/${NOBODY}`, as('a')), [404]), needA);
tc('RL20', 'Chấp nhận lời mời không tồn tại', 'POST /friendships/accept', '404 RESOURCE_NOT_FOUND', async () =>
  expectFail(await req('POST', '/friendships/accept', { ...as('a'), body: { requester_id: Number(NOBODY) } }), [404]), needA);

// ═════════ 4. Theo dõi giữa A và B ═════════
tc('RL21', 'A theo dõi B', 'POST /follows/{id}', '200, following=true, new_followers_count', async () => {
  const r = await req('POST', `/follows/${S.b.id}`, as('a'));
  const out = expectOk(r);
  expectShape(r.data, ['new_followers_count'], 'data');
  const st = await stats('a', S.b.id);
  assert.equal(st.relationship_with_me.following, true, 'relationship-stats chưa ghi nhận following');
  const fl = await req('GET', '/follows/followers?limit=50', as('b'));
  assert.ok(ids(fl).includes(S.a.id), 'B không thấy A trong followers');
  return `${out}; followers của B = ${r.data.new_followers_count}`;
}, needAB);
tc('RL22', 'B thấy A đang theo dõi mình (followed_by)', 'GET /users/{id}/relationship-stats', 'followed_by=true', async () => {
  const st = await stats('b', S.a.id);
  assert.equal(st.relationship_with_me.followed_by, true, `followed_by = ${st.relationship_with_me.followed_by}`);
  return 'followed_by=true';
}, needAB);
tc('RL23', 'A bỏ theo dõi B', 'DELETE /follows/{id}', '200, following=false', async () => {
  const out = expectOk(await req('DELETE', `/follows/${S.b.id}`, as('a')));
  assert.equal((await stats('a', S.b.id)).relationship_with_me.following, false);
  return out;
}, needAB);
tc('RL24', 'Bỏ theo dõi người chưa theo dõi', 'DELETE /follows/{id}', '404 RESOURCE_NOT_FOUND', async () =>
  expectFail(await req('DELETE', `/follows/${S.b.id}`, as('a')), [404]), needAB);

// ═════════ 5. Kết bạn giữa A và B ═════════
tc('RL25', 'A gửi lời mời kết bạn cho B', 'POST /friendships/request', '200, status=PENDING', async () => {
  const r = await req('POST', '/friendships/request', { ...as('a'), body: { addressee_id: Number(S.b.id) } });
  const out = expectOk(r);
  assert.equal(r.data?.status, 'PENDING');
  return `${out}; status=PENDING`;
}, needAB);
tc('RL26', 'Gửi lại lời mời đang chờ', 'POST /friendships/request', '409 FRIEND_REQUEST_PENDING', async () =>
  expectFail(await req('POST', '/friendships/request', { ...as('a'), body: { addressee_id: Number(S.b.id) } }), [409]), needAB);
tc('RL27', 'Lời mời xuất hiện ở cả 2 phía', 'GET /friendships/requests/sent · received', 'A.sent có B, B.received có A, stats PENDING', async () => {
  const sent = await req('GET', '/friendships/requests/sent?limit=50', as('a'));
  const recv = await req('GET', '/friendships/requests/received?limit=50', as('b'));
  assert.ok(ids(sent, 'receiver').includes(S.b.id), 'A.sent không có B');
  assert.ok(ids(recv, 'requester').includes(S.a.id), 'B.received không có A');
  assert.equal((await stats('a', S.b.id)).relationship_with_me.friend_request_status, 'PENDING');
  return 'OK';
}, needAB);
tc('RL28', 'B từ chối lời mời', 'POST /friendships/decline', '200; B.received không còn A', async () => {
  const out = expectOk(await req('POST', '/friendships/decline', { ...as('b'), body: { requester_id: Number(S.a.id) } }));
  const recv = await req('GET', '/friendships/requests/received?limit=50', as('b'));
  assert.ok(!ids(recv, 'requester').includes(S.a.id), 'Lời mời vẫn còn sau khi từ chối');
  return out;
}, needAB);
tc('RL29', 'A mời lại, B chấp nhận', 'POST /friendships/accept', '200, status=ACCEPTED; 2 bên có nhau trong /friendships', async () => {
  expectOk(await req('POST', '/friendships/request', { ...as('a'), body: { addressee_id: Number(S.b.id) } }));
  const r = await req('POST', '/friendships/accept', { ...as('b'), body: { requester_id: Number(S.a.id) } });
  const out = expectOk(r);
  assert.ok(ids(await req('GET', '/friendships?limit=50', as('a'))).includes(S.b.id), 'A không thấy B trong bạn bè');
  assert.ok(ids(await req('GET', '/friendships?limit=50', as('b'))).includes(S.a.id), 'B không thấy A trong bạn bè');
  assert.equal((await stats('a', S.b.id)).relationship_with_me.friend, true);
  return `${out}; status=${r.data?.status}`;
}, needAB);
tc('RL30', 'Gửi lời mời khi đã là bạn', 'POST /friendships/request', '409 ALREADY_FRIENDS', async () =>
  expectFail(await req('POST', '/friendships/request', { ...as('a'), body: { addressee_id: Number(S.b.id) } }), [409]), needAB);
tc('RL31', 'Huỷ kết bạn', 'DELETE /friendships/{friendId}', '200; không còn trong /friendships', async () => {
  const out = expectOk(await req('DELETE', `/friendships/${S.b.id}`, as('a')));
  assert.ok(!ids(await req('GET', '/friendships?limit=50', as('b'))).includes(S.a.id), 'B vẫn thấy A trong bạn bè');
  return out;
}, needAB);
tc('RL32', 'Huỷ kết bạn khi chưa là bạn', 'DELETE /friendships/{friendId}', '404 RESOURCE_NOT_FOUND', async () =>
  expectFail(await req('DELETE', `/friendships/${S.b.id}`, as('a')), [404]), needAB);
tc('RL33', 'Hai người cùng mời nhau => tự thành bạn bè', 'POST /friendships/request', 'Lời mời thứ 2: 200, status=ACCEPTED', async () => {
  expectOk(await req('POST', '/friendships/request', { ...as('b'), body: { addressee_id: Number(S.a.id) } }));
  const r = await req('POST', '/friendships/request', { ...as('a'), body: { addressee_id: Number(S.b.id) } });
  const out = expectOk(r);
  assert.equal(r.data?.status, 'ACCEPTED', `status = ${r.data?.status}`);
  return `${out}; status=ACCEPTED`;
}, needAB);
tc('RL34', 'Kết bạn khác vai trò (SV–GV)', 'POST /friendships/request', '403 ACTION_NOT_ALLOWED', async () =>
  expectFail(await req('POST', '/friendships/request', { ...as('a'), body: { addressee_id: Number(env.otherRoleId) } }), [403]),
() => needA() ?? (!env.otherRoleId ? 'Đặt REL_OTHER_ROLE_ID (user_id khác vai trò)' : undefined));

// ═════════ 6. Chặn ═════════
tc('RL35', 'A chặn B => huỷ kết bạn và theo dõi 2 chiều', 'POST /blocks/{id}', '200, blocked=true; hết bạn bè & theo dõi', async () => {
  // Đang là bạn (RL33); thêm theo dõi 2 chiều trước khi chặn.
  await req('POST', `/follows/${S.b.id}`, as('a'));
  await req('POST', `/follows/${S.a.id}`, as('b'));
  const r = await req('POST', `/blocks/${S.b.id}`, as('a'));
  const out = expectOk(r);
  assert.ok(ids(await req('GET', '/blocks?limit=50', as('a'))).includes(S.b.id), 'B không có trong /blocks');
  const st = await stats('a', S.b.id);
  assert.equal(st.relationship_with_me.blocked, true, 'blocked chưa = true');
  assert.equal(st.relationship_with_me.friend, false, 'Vẫn là bạn bè sau khi chặn');
  assert.equal(st.relationship_with_me.following, false, 'A vẫn theo dõi B sau khi chặn');
  assert.equal(st.relationship_with_me.followed_by, false, 'B vẫn theo dõi A sau khi chặn');
  return `${out}; bạn bè & theo dõi đã bị huỷ`;
}, needAB);
tc('RL36', 'Chặn lại người đã chặn', 'POST /blocks/{id}', '409 ALREADY_BLOCKED', async () =>
  expectFail(await req('POST', `/blocks/${S.b.id}`, as('a')), [409]), needAB);
tc('RL37', 'Người bị chặn theo dõi / mời kết bạn', 'POST /follows/{id} · /friendships/request', '403 USER_IS_BLOCKED', async () => {
  const f = expectFail(await req('POST', `/follows/${S.a.id}`, as('b')), [403]);
  expectFail(await req('POST', '/friendships/request', { ...as('b'), body: { addressee_id: Number(S.a.id) } }), [403]);
  return `follow: ${f}; request: 403`;
}, needAB);
tc('RL38', 'Bỏ chặn', 'DELETE /blocks/{id}', '200, blocked=false', async () => {
  const out = expectOk(await req('DELETE', `/blocks/${S.b.id}`, as('a')));
  assert.equal((await stats('a', S.b.id)).relationship_with_me.blocked, false);
  return out;
}, needAB);
tc('RL39', 'Bỏ chặn người chưa chặn', 'DELETE /blocks/{id}', '404 RESOURCE_NOT_FOUND', async () =>
  expectFail(await req('DELETE', `/blocks/${S.b.id}`, as('a')), [404]), needAB);

// ═════════ 7. Báo cáo vi phạm ═════════
tc('RL40', 'Báo cáo thiếu violation_type', 'POST /report', '400 · 1002', async () =>
  expectFail(await req('POST', '/report', { ...as('a'), body: { target_type: 'USER', target_id: Number(S.a.id) } }), [400]), needA);
tc('RL41', 'Báo cáo với violation_type không hợp lệ', 'POST /report', '400', async () =>
  expectFail(await req('POST', '/report', { ...as('a'), body: { target_type: 'USER', target_id: 1, violation_type: 'NOT_A_TYPE' } }), [400]), needA);
tc('RL42', 'Tự báo cáo chính mình', 'POST /report', '400 CANNOT_INTERACT_WITH_SELF', async () =>
  expectFail(await req('POST', '/report', { ...as('a'), body: { target_type: 'USER', target_id: Number(S.a.id), violation_type: 'SPAM' } }), [400]), needA);
tc('RL43', 'Báo cáo user không tồn tại', 'POST /report', '404 USER_NOT_FOUND', async () =>
  expectFail(await req('POST', '/report', { ...as('a'), body: { target_type: 'USER', target_id: Number(NOBODY), violation_type: 'SPAM' } }), [404]), needA);
tc('RL44', 'Báo cáo người dùng hợp lệ', 'POST /report', '201, report_id, status=PENDING', async () => {
  const r = await req('POST', '/report', {
    ...as('a'),
    body: { target_type: 'USER', target_id: Number(S.b.id), violation_type: 'OTHER', description: '[TEST TỰ ĐỘNG] Báo cáo kiểm thử, vui lòng bỏ qua.' },
  });
  const out = expectOk(r);
  expectShape(r.data, ['report_id', 'status'], 'data');
  assert.equal(r.data.status, 'PENDING');
  return `${out}; report_id=${r.data.report_id}`;
}, () => needAB() ?? (!env.allowReport ? 'Không gửi báo cáo thật (đặt REL_ALLOW_REPORT=1 để bật)' : undefined));

// ───────── Khôi phục + bảng kết quả ─────────
after(async () => {
  if (S.b && S.initial && !USE_MOCK) {
    const i = S.initial;
    await resetPair();
    const A = Number(S.a.id);
    const B = Number(S.b.id);
    if (i.friend) {
      await req('POST', '/friendships/request', { ...as('a'), body: { addressee_id: B } });
      await req('POST', '/friendships/accept', { ...as('b'), body: { requester_id: A } });
    } else if (i.pendingFromA) await req('POST', '/friendships/request', { ...as('a'), body: { addressee_id: B } });
    else if (i.pendingFromB) await req('POST', '/friendships/request', { ...as('b'), body: { addressee_id: A } });
    if (i.aFollowsB) await req('POST', `/follows/${B}`, as('a'));
    if (i.bFollowsA) await req('POST', `/follows/${A}`, as('b'));
    if (i.aBlocksB) await req('POST', `/blocks/${B}`, as('a'));
    if (i.bBlocksA) await req('POST', `/blocks/${A}`, as('b'));
  }
  await mockServer?.close();

  const pass = results.filter((r) => r.result === 'PASS').length;
  const fail = results.filter((r) => r.result === 'FAIL').length;
  const skip = results.length - pass - fail;
  const esc = (s) => String(s).replace(/\|/g, '\\|');
  const icon = { PASS: '✅ PASS', FAIL: '❌ FAIL', SKIP: '⏭️ SKIP' };
  const md = [
    '# Kết quả test API Quan hệ & Báo cáo vi phạm',
    '',
    `- Thời điểm chạy: ${new Date().toLocaleString('vi-VN')}`,
    `- Môi trường: ${USE_MOCK ? 'Mock server (tests/relationship-mock-server.mjs, mô phỏng theo Swagger)' : API}`,
    `- Tài khoản: ${USE_MOCK ? 'A, B (SV), C (GV) trên mock' : `A ${S.a ? 'đã đăng nhập' : 'không có'}, B ${S.b ? 'đã đăng nhập' : 'không có'}`}`,
    `- Tổng: **${results.length}** · Đạt: **${pass}** · Lỗi: **${fail}** · Bỏ qua: **${skip}**`,
    '',
    '| Mã | Kịch bản | Endpoint | Kết quả mong đợi | Kết quả thực tế | Trạng thái | Thời gian |',
    '|---|---|---|---|---|---|---|',
    ...results.map((r) => `| ${r.id} | ${esc(r.name)} | \`${r.endpoint}\` | ${esc(r.expected)} | ${esc(r.actual)} | ${icon[r.result]} | ${r.ms} ms |`),
    '',
  ].join('\n');
  const file = USE_MOCK ? 'relationship-api-report.md' : 'relationship-api-report.live.md';
  mkdirSync(new URL('./reports/', import.meta.url), { recursive: true });
  writeFileSync(new URL(`./reports/${file}`, import.meta.url), md);
  console.log(`\nBảng kết quả: tests/reports/${file} (${pass}/${results.length} đạt, ${fail} lỗi, ${skip} bỏ qua)`);
});
