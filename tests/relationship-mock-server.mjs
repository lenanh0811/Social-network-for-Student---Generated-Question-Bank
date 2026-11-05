/**
 * Mock server cho API Quan hệ & Báo cáo — CHỈ dùng để chạy bộ test khi chưa trỏ tới backend.
 * Mô phỏng hợp đồng Swagger https://snsqb.duckdns.org/api/v1/swagger-ui/index.html
 * (07 Friendships, 08 Follows, 09 Blocks, 26 Reports, GET /users/{id}/relationship-stats) + POST /auth/login, GET /users/me.
 *   envelope { code, message, data }, thành công "0000"; 401 "9998"; 400 "1002" + data [{field, message}].
 *   Lỗi nghiệp vụ trả mã chữ như Swagger mô tả (CANNOT_INTERACT_WITH_SELF, USER_IS_BLOCKED, ...).
 *
 * Tài khoản mẫu (mật khẩu Test1234a): a@test.local (SV, id 101), b@test.local (SV, id 102), c@test.local (GV, id 201).
 * Chạy độc lập: node tests/relationship-mock-server.mjs  (cổng 4011)
 */
import { randomBytes } from 'node:crypto';
import { createServer } from 'node:http';
import { pathToFileURL } from 'node:url';

export const MOCK_ACCOUNTS = {
  a: { email: 'a@test.local', password: 'Test1234a' },
  b: { email: 'b@test.local', password: 'Test1234a' },
  c: { email: 'c@test.local', password: 'Test1234a' },
};

export function createRelationshipMockServer() {
  const users = new Map([
    [101, { id: 101, email: MOCK_ACCOUNTS.a.email, full_name: 'Sinh viên A', role: 'STUDENT', code: '20210101' }],
    [102, { id: 102, email: MOCK_ACCOUNTS.b.email, full_name: 'Sinh viên B', role: 'STUDENT', code: '20210102' }],
    [201, { id: 201, email: MOCK_ACCOUNTS.c.email, full_name: 'Giảng viên C', role: 'LECTURER', code: 'CB0201' }],
  ]);
  const access = new Map();
  let friendships = []; // { requester, addressee, status, created_at, accepted_at }
  let follows = []; // { from, to, at }
  let blocks = []; // { from, to, at }
  const reports = [];

  const send = (res, status, body) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(body)); };
  const ok = (res, data = null, status = 200) => send(res, status, { code: '0000', message: 'Thành công', data });
  const fail = (res, status, code, message, data = null) => send(res, status, { code, message, data });
  const now = () => new Date().toISOString();
  const author = (id) => { const u = users.get(id); return { user_id: id, full_name: u.full_name, avatar_url: null, frame_url: null }; };
  const pair = (a, b) => friendships.find((f) => (f.requester === a && f.addressee === b) || (f.requester === b && f.addressee === a));
  const friendsOf = (id) => friendships.filter((f) => f.status === 'ACCEPTED' && (f.requester === id || f.addressee === id)).map((f) => (f.requester === id ? f.addressee : f.requester));
  const mutual = (a, b) => { const s = new Set(friendsOf(a)); return friendsOf(b).filter((x) => s.has(x)).length; };
  const following = (a, b) => follows.some((f) => f.from === a && f.to === b);
  const blocked = (a, b) => blocks.some((x) => (x.from === a && x.to === b) || (x.from === b && x.to === a));
  const pagination = { before: null, after: null, has_prev: false, has_next: false };

  const server = createServer(async (req, res) => {
    let raw = '';
    for await (const chunk of req) raw += chunk;
    let body = {};
    if (raw) { try { body = JSON.parse(raw); } catch { return fail(res, 400, '1003', 'Định dạng JSON không hợp lệ'); } }
    const url = new URL(req.url, 'http://x');
    const path = url.pathname.replace(/^\/api\/v1/, '');
    const m = req.method;

    if (m === 'POST' && path === '/auth/login') {
      const u = [...users.values()].find((x) => x.email === body.email);
      if (!u || body.password !== 'Test1234a') return fail(res, 400, '9990', 'Tài khoản hoặc mật khẩu không chính xác');
      const at = `at_${randomBytes(16).toString('hex')}`;
      access.set(at, u.id);
      return ok(res, { user_id: u.id, role: u.role, access_token: at, refresh_token: `rt_${randomBytes(16).toString('hex')}` });
    }

    const token = (req.headers.authorization ?? '').replace(/^Bearer\s+/i, '');
    const me = access.get(token);
    if (!me) return fail(res, 401, '9998', 'Full authentication is required to access this resource');
    const id = (s) => (/^\d+$/.test(s) ? Number(s) : NaN);
    const target = (t) => {
      if (t === me) { fail(res, 400, 'CANNOT_INTERACT_WITH_SELF', 'Không thể tương tác với chính mình'); return null; }
      if (!users.has(t)) { fail(res, 404, 'USER_NOT_FOUND', 'Không tìm thấy người dùng'); return null; }
      return users.get(t);
    };
    const needBody = (fields) => {
      const miss = fields.filter((f) => body[f] === undefined || body[f] === null || body[f] === '');
      if (!miss.length) return false;
      fail(res, 400, '1002', `Trường '${miss[0]}' không hợp lệ (MISSING_REQUIRED_PARAMETER)`, miss.map((field) => ({ field, message: 'MISSING_REQUIRED_PARAMETER' })));
      return true;
    };
    let p;

    if (m === 'GET' && path === '/users/me') {
      const u = users.get(me);
      return ok(res, { user_id: u.id, email: u.email, full_name: u.full_name, role: u.role, student_lecturer_code: u.code, verified: true });
    }

    // ───── 07 Friendships ─────
    if (m === 'GET' && path === '/friendships') {
      const items = friendships.filter((f) => f.status === 'ACCEPTED' && (f.requester === me || f.addressee === me)).map((f) => {
        const other = f.requester === me ? f.addressee : f.requester;
        return { ...author(other), friends_since: f.accepted_at, mutual_friends_count: mutual(me, other) };
      });
      return ok(res, { items, pagination, total_friends: items.length });
    }
    if (m === 'GET' && path === '/friendships/requests/received') {
      const items = friendships.filter((f) => f.status === 'PENDING' && f.addressee === me)
        .map((f) => ({ requester: author(f.requester), status: 'PENDING', created_at: f.created_at, mutual_friends_count: mutual(me, f.requester) }));
      return ok(res, { items, pagination, total_pending: items.length });
    }
    if (m === 'GET' && path === '/friendships/requests/sent') {
      const items = friendships.filter((f) => f.status === 'PENDING' && f.requester === me)
        .map((f) => ({ receiver: author(f.addressee), status: 'PENDING', created_at: f.created_at, mutual_friends_count: mutual(me, f.addressee) }));
      return ok(res, { items, pagination, total_sent: items.length });
    }
    if (m === 'POST' && path === '/friendships/request') {
      if (needBody(['addressee_id'])) return;
      const t = Number(body.addressee_id);
      const u = target(t);
      if (!u) return;
      if (blocked(me, t)) return fail(res, 403, 'USER_IS_BLOCKED', 'Mối quan hệ bị chặn');
      if (users.get(me).role !== u.role) return fail(res, 403, 'ACTION_NOT_ALLOWED', 'Chỉ kết bạn với người cùng vai trò');
      const f = pair(me, t);
      if (f?.status === 'ACCEPTED') return fail(res, 409, 'ALREADY_FRIENDS', 'Hai người đã là bạn bè');
      if (f?.requester === me) return fail(res, 409, 'FRIEND_REQUEST_PENDING', 'Lời mời đang chờ xử lý');
      if (f) Object.assign(f, { status: 'ACCEPTED', accepted_at: now() });
      else friendships.push({ requester: me, addressee: t, status: 'PENDING', created_at: now() });
      const r = pair(me, t);
      return ok(res, { requester_id: r.requester, addressee_id: r.addressee, status: r.status, created_at: r.created_at, accepted_at: r.accepted_at ?? null });
    }
    if (m === 'POST' && (path === '/friendships/accept' || path === '/friendships/decline')) {
      if (needBody(['requester_id'])) return;
      const from = Number(body.requester_id);
      const f = friendships.find((x) => x.requester === from && x.addressee === me && x.status === 'PENDING');
      if (!f) return fail(res, 404, 'RESOURCE_NOT_FOUND', 'Không tìm thấy lời mời kết bạn');
      if (path.endsWith('decline')) { friendships = friendships.filter((x) => x !== f); return ok(res, {}); }
      if (blocked(me, from)) return fail(res, 403, 'USER_IS_BLOCKED', 'Mối quan hệ bị chặn');
      Object.assign(f, { status: 'ACCEPTED', accepted_at: now() });
      return ok(res, { requester_id: f.requester, addressee_id: f.addressee, status: 'ACCEPTED', created_at: f.created_at, accepted_at: f.accepted_at });
    }
    if (m === 'DELETE' && (p = path.match(/^\/friendships\/([^/]+)$/))) {
      const t = id(p[1]);
      const f = pair(me, t);
      if (f?.status !== 'ACCEPTED') return fail(res, 404, 'RESOURCE_NOT_FOUND', 'Hai người chưa là bạn bè');
      friendships = friendships.filter((x) => x !== f);
      return ok(res, {});
    }

    // ───── 08 Follows ─────
    const followItems = (list, mapper) => list.map(mapper);
    if (m === 'GET' && path === '/follows/followers') {
      const items = followItems(follows.filter((f) => f.to === me), (f) => {
        const u = users.get(f.from);
        return { ...author(f.from), role: u.role, school_faculty: null, code: u.code, followed_me_at: f.at, friend: pair(me, f.from)?.status === 'ACCEPTED', following_back: following(me, f.from) };
      });
      return ok(res, { items, pagination, total_followers: items.length });
    }
    if (m === 'GET' && path === '/follows/following') {
      const items = followItems(follows.filter((f) => f.from === me), (f) => {
        const u = users.get(f.to);
        return { ...author(f.to), role: u.role, school_faculty: null, code: u.code, followed_at: f.at, friend: pair(me, f.to)?.status === 'ACCEPTED', following_me: following(f.to, me) };
      });
      return ok(res, { items, pagination, total_following: items.length });
    }
    if ((p = path.match(/^\/follows\/([^/]+)$/)) && (m === 'POST' || m === 'DELETE')) {
      const t = id(p[1]);
      if (m === 'POST') {
        if (!target(t)) return;
        if (blocked(me, t)) return fail(res, 403, 'USER_IS_BLOCKED', 'Mối quan hệ bị chặn');
        if (!following(me, t)) follows.push({ from: me, to: t, at: now() });
        return ok(res, { target_user_id: t, new_followers_count: follows.filter((f) => f.to === t).length, followed_at: now(), following: true });
      }
      if (!users.has(t)) return fail(res, 404, 'USER_NOT_FOUND', 'Không tìm thấy người dùng');
      if (!following(me, t)) return fail(res, 404, 'RESOURCE_NOT_FOUND', 'Chưa theo dõi người này');
      follows = follows.filter((f) => !(f.from === me && f.to === t));
      return ok(res, { target_user_id: t, new_followers_count: follows.filter((f) => f.to === t).length, following: false });
    }

    // ───── 09 Blocks ─────
    if (m === 'GET' && path === '/blocks') {
      const items = blocks.filter((b) => b.from === me).map((b) => ({ ...author(b.to), blocked_at: b.at }));
      return ok(res, { items, pagination, total_blocked: items.length });
    }
    if ((p = path.match(/^\/blocks\/([^/]+)$/)) && (m === 'POST' || m === 'DELETE')) {
      const t = id(p[1]);
      if (m === 'POST') {
        if (!target(t)) return;
        if (blocks.some((b) => b.from === me && b.to === t)) return fail(res, 409, 'ALREADY_BLOCKED', 'Đã chặn người dùng này');
        blocks.push({ from: me, to: t, at: now() });
        friendships = friendships.filter((f) => f !== pair(me, t));
        follows = follows.filter((f) => !((f.from === me && f.to === t) || (f.from === t && f.to === me)));
        return ok(res, { blocked_user_id: t, blocked: true });
      }
      if (!blocks.some((b) => b.from === me && b.to === t)) return fail(res, 404, 'RESOURCE_NOT_FOUND', 'Chưa chặn người dùng này');
      blocks = blocks.filter((b) => !(b.from === me && b.to === t));
      return ok(res, { unblocked_user_id: t, blocked: false });
    }

    // ───── relationship-stats ─────
    if (m === 'GET' && (p = path.match(/^\/users\/([^/]+)\/relationship-stats$/))) {
      const t = id(p[1]);
      if (!users.has(t)) return fail(res, 404, 'USER_NOT_FOUND', 'Không tìm thấy người dùng');
      const f = pair(me, t);
      return ok(res, {
        user_id: t,
        counts: { followers_count: follows.filter((x) => x.to === t).length, following_count: follows.filter((x) => x.from === t).length, friends_count: friendsOf(t).length },
        relationship_with_me: {
          friend_request_status: f ? f.status : 'NONE', followed_by: following(t, me), friend: f?.status === 'ACCEPTED',
          blocked: blocks.some((b) => b.from === me && b.to === t), following: following(me, t),
        },
      });
    }

    // ───── 26 Reports ─────
    if (m === 'POST' && path === '/report') {
      if (needBody(['target_id', 'target_type', 'violation_type'])) return;
      if (!['POST', 'COMMENT', 'USER'].includes(body.target_type) || !['HARASSMENT', 'HATE_STATEMENT', 'SPAM', 'OTHER'].includes(body.violation_type)) {
        return fail(res, 400, '1003', 'Giá trị không hợp lệ');
      }
      const t = Number(body.target_id);
      if (body.target_type === 'USER' && !target(t)) return;
      if (body.target_type !== 'USER') return fail(res, 404, 'POST_NOT_FOUND', 'Không tìm thấy đối tượng');
      const r = { report_id: reports.length + 1, target_type: body.target_type, target_id: t, status: 'PENDING', created_at: now() };
      reports.push(r);
      return ok(res, r, 201);
    }

    return fail(res, 404, '9992', `Không có endpoint ${m} ${path}`);
  });

  return {
    listen: (port = 0) => new Promise((r) => server.listen(port, '127.0.0.1', () => r(`http://127.0.0.1:${server.address().port}/api/v1`))),
    close: () => new Promise((r) => server.close(r)),
  };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  createRelationshipMockServer().listen(4011).then((url) => console.log(`Relationship mock server: ${url}`));
}
