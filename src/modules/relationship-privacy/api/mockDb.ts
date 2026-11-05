/**
 * Backend giả lập cho kết bạn / theo dõi / chặn / báo cáo (chế độ demo, chưa đặt EXPO_PUBLIC_API_URL).
 * Luật và mã lỗi lấy theo Swagger:
 * - Kết bạn chỉ giữa người cùng vai trò (SV–SV, GV–GV), khác vai trò => 403 ACTION_NOT_ALLOWED.
 * - Gửi lời mời khi người kia đã mời mình => tự động thành bạn bè.
 * - Chặn => huỷ kết bạn, lời mời và theo dõi 2 chiều; đang chặn thì không kết bạn/theo dõi được (403 USER_IS_BLOCKED).
 * - Tự tương tác với chính mình => 400 CANNOT_INTERACT_WITH_SELF.
 */
import { mockSession } from '@/modules/auth-user/api/mockDb';
import { AuthError } from '@/modules/auth-user/api/types';
import type { Person, PersonList, Relationship, ReportInput, ReportResult } from './types';

type Friendship = { requester: string; addressee: string; status: 'PENDING' | 'ACCEPTED'; createdAt: string; acceptedAt?: string };
type Edge = { from: string; to: string; at: string };
type Report = ReportInput & { id: string; reporter: string; status: 'PENDING'; createdAt: string };

const DAY = 86_400_000;
const ago = (days: number) => new Date(Date.now() - days * DAY).toISOString();

// u1 = SV demo (an.nv), l1 = GV demo (quan.tm). Xem PEOPLE trong auth-user/api/mockDb.ts.
let friendships: Friendship[] = [
  { requester: 'u1', addressee: 's2', status: 'ACCEPTED', createdAt: ago(60), acceptedAt: ago(59) },
  { requester: 's6', addressee: 'u1', status: 'ACCEPTED', createdAt: ago(30), acceptedAt: ago(29) },
  { requester: 's2', addressee: 's6', status: 'ACCEPTED', createdAt: ago(20), acceptedAt: ago(20) },
  { requester: 's3', addressee: 'u1', status: 'PENDING', createdAt: ago(1) },
  { requester: 's5', addressee: 'u1', status: 'PENDING', createdAt: ago(3) },
  { requester: 'u1', addressee: 's4', status: 'PENDING', createdAt: ago(2) },
  { requester: 'l2', addressee: 'l1', status: 'ACCEPTED', createdAt: ago(300), acceptedAt: ago(300) },
];
let follows: Edge[] = [
  { from: 'u1', to: 'l1', at: ago(40) }, { from: 'u1', to: 's2', at: ago(58) }, { from: 's2', to: 'u1', at: ago(58) },
  { from: 's5', to: 'u1', at: ago(5) }, { from: 's3', to: 'u1', at: ago(1) }, { from: 's2', to: 'l1', at: ago(10) },
  { from: 's6', to: 'l1', at: ago(9) }, { from: 'l2', to: 'l1', at: ago(200) },
];
let blocks: Edge[] = [];
let reports: Report[] = [];

const KEY = 'quizhub.mockRelations.v1';
const local = () => { try { return globalThis.localStorage ?? null; } catch { return null; } };
(function load() {
  try {
    const raw = local()?.getItem(KEY);
    if (raw) ({ friendships, follows, blocks, reports } = JSON.parse(raw));
  } catch { /* dữ liệu hỏng => dùng dữ liệu mặc định */ }
})();
const persist = () => { try { local()?.setItem(KEY, JSON.stringify({ friendships, follows, blocks, reports })); } catch { /* bỏ qua */ } };

const err = (message: string, status: number, code: string) => new AuthError(message, status, code);
const pair = (a: string, b: string) => friendships.find((f) => (f.requester === a && f.addressee === b) || (f.requester === b && f.addressee === a));
const areFriends = (a: string, b: string) => pair(a, b)?.status === 'ACCEPTED';
const friendIds = (id: string) => friendships.filter((f) => f.status === 'ACCEPTED' && (f.requester === id || f.addressee === id))
  .map((f) => (f.requester === id ? f.addressee : f.requester));
const isFollowing = (from: string, to: string) => follows.some((f) => f.from === from && f.to === to);
const isBlocked = (a: string, b: string) => blocks.some((x) => (x.from === a && x.to === b) || (x.from === b && x.to === a));
const mutual = (a: string, b: string) => { const fa = new Set(friendIds(a)); return friendIds(b).filter((x) => fa.has(x)).length; };

function target(meId: string, id: string) {
  if (id === meId) throw err('Không thể tương tác với chính mình (CANNOT_INTERACT_WITH_SELF)', 400, 'CANNOT_INTERACT_WITH_SELF');
  const u = mockSession.user(id);
  if (!u) throw err('Không tìm thấy người dùng (USER_NOT_FOUND)', 404, 'USER_NOT_FOUND');
  return u;
}
function notBlocked(meId: string, id: string) {
  if (isBlocked(meId, id)) throw err('Mối quan hệ đang bị chặn (USER_IS_BLOCKED)', 403, 'USER_IS_BLOCKED');
}
function person(meId: string, id: string, since?: string): Person {
  const u = mockSession.user(id);
  return {
    id, name: u?.name ?? 'Người dùng', avatarUrl: u?.avatarUrl, role: u?.role, faculty: u?.faculty, code: mockSession.code(id), since,
    mutualFriends: mutual(meId, id), friend: areFriends(meId, id), followsMe: isFollowing(id, meId), iFollow: isFollowing(meId, id),
  };
}
const list = (items: Person[]): PersonList => ({ items: items.sort((a, b) => (b.since ?? '').localeCompare(a.since ?? '')), total: items.length });

const handlers = {
  // ───── Kết bạn ─────
  friends(token: string | null) {
    const me = mockSession.userId(token);
    return list(friendships.filter((f) => f.status === 'ACCEPTED' && (f.requester === me || f.addressee === me))
      .map((f) => person(me, f.requester === me ? f.addressee : f.requester, f.acceptedAt)));
  },
  received(token: string | null) {
    const me = mockSession.userId(token);
    return list(friendships.filter((f) => f.status === 'PENDING' && f.addressee === me).map((f) => person(me, f.requester, f.createdAt)));
  },
  sent(token: string | null) {
    const me = mockSession.userId(token);
    return list(friendships.filter((f) => f.status === 'PENDING' && f.requester === me).map((f) => person(me, f.addressee, f.createdAt)));
  },
  request(token: string | null, id: string) {
    const me = mockSession.userId(token);
    const u = target(me, id);
    notBlocked(me, id);
    if (mockSession.user(me)?.role !== u.role) throw err('Chỉ kết bạn được với người cùng vai trò (ACTION_NOT_ALLOWED)', 403, 'ACTION_NOT_ALLOWED');
    const f = pair(me, id);
    if (f?.status === 'ACCEPTED') throw err('Hai người đã là bạn bè (ALREADY_FRIENDS)', 409, 'ALREADY_FRIENDS');
    if (f?.requester === me) throw err('Lời mời kết bạn đang chờ xử lý (FRIEND_REQUEST_PENDING)', 409, 'FRIEND_REQUEST_PENDING');
    if (f) { // người kia đã mời trước => tự chấp nhận
      Object.assign(f, { status: 'ACCEPTED', acceptedAt: new Date().toISOString() });
      return 'ACCEPTED' as const;
    }
    friendships.push({ requester: me, addressee: id, status: 'PENDING', createdAt: new Date().toISOString() });
    return 'PENDING' as const;
  },
  accept(token: string | null, requester: string) {
    const me = mockSession.userId(token);
    const f = friendships.find((x) => x.requester === requester && x.addressee === me && x.status === 'PENDING');
    if (!f) throw err('Không tìm thấy lời mời kết bạn (RESOURCE_NOT_FOUND)', 404, 'RESOURCE_NOT_FOUND');
    notBlocked(me, requester);
    Object.assign(f, { status: 'ACCEPTED', acceptedAt: new Date().toISOString() });
  },
  decline(token: string | null, requester: string) {
    const me = mockSession.userId(token);
    const f = friendships.find((x) => x.requester === requester && x.addressee === me && x.status === 'PENDING');
    if (!f) throw err('Không tìm thấy lời mời kết bạn (RESOURCE_NOT_FOUND)', 404, 'RESOURCE_NOT_FOUND');
    friendships = friendships.filter((x) => x !== f);
  },
  unfriend(token: string | null, id: string) {
    const me = mockSession.userId(token);
    if (!areFriends(me, id)) throw err('Hai người chưa là bạn bè (RESOURCE_NOT_FOUND)', 404, 'RESOURCE_NOT_FOUND');
    friendships = friendships.filter((x) => x !== pair(me, id));
  },

  // ───── Theo dõi ─────
  followers(token: string | null) {
    const me = mockSession.userId(token);
    return list(follows.filter((f) => f.to === me).map((f) => person(me, f.from, f.at)));
  },
  following(token: string | null) {
    const me = mockSession.userId(token);
    return list(follows.filter((f) => f.from === me).map((f) => person(me, f.to, f.at)));
  },
  follow(token: string | null, id: string) {
    const me = mockSession.userId(token);
    target(me, id);
    notBlocked(me, id);
    if (!isFollowing(me, id)) follows.push({ from: me, to: id, at: new Date().toISOString() });
    return follows.filter((f) => f.to === id).length;
  },
  unfollow(token: string | null, id: string) {
    const me = mockSession.userId(token);
    if (!mockSession.user(id)) throw err('Không tìm thấy người dùng (USER_NOT_FOUND)', 404, 'USER_NOT_FOUND');
    if (!isFollowing(me, id)) throw err('Bạn chưa theo dõi người này (RESOURCE_NOT_FOUND)', 404, 'RESOURCE_NOT_FOUND');
    follows = follows.filter((f) => !(f.from === me && f.to === id));
    return follows.filter((f) => f.to === id).length;
  },

  // ───── Chặn ─────
  blocked(token: string | null) {
    const me = mockSession.userId(token);
    return list(blocks.filter((b) => b.from === me).map((b) => person(me, b.to, b.at)));
  },
  block(token: string | null, id: string) {
    const me = mockSession.userId(token);
    target(me, id);
    if (blocks.some((b) => b.from === me && b.to === id)) throw err('Bạn đã chặn người dùng này rồi (ALREADY_BLOCKED)', 409, 'ALREADY_BLOCKED');
    blocks.push({ from: me, to: id, at: new Date().toISOString() });
    friendships = friendships.filter((f) => f !== pair(me, id));
    follows = follows.filter((f) => !((f.from === me && f.to === id) || (f.from === id && f.to === me)));
  },
  unblock(token: string | null, id: string) {
    const me = mockSession.userId(token);
    if (!blocks.some((b) => b.from === me && b.to === id)) throw err('Bạn chưa chặn người dùng này (RESOURCE_NOT_FOUND)', 404, 'RESOURCE_NOT_FOUND');
    blocks = blocks.filter((b) => !(b.from === me && b.to === id));
  },

  // ───── Thống kê quan hệ ─────
  stats(token: string | null, id: string): Relationship {
    const me = mockSession.userId(token);
    if (!mockSession.user(id)) throw err('Không tìm thấy người dùng (USER_NOT_FOUND)', 404, 'USER_NOT_FOUND');
    const f = pair(me, id);
    return {
      counts: { friends: friendIds(id).length, followers: follows.filter((x) => x.to === id).length, following: follows.filter((x) => x.from === id).length },
      friend: !f ? 'none' : f.status === 'ACCEPTED' ? 'friends' : f.requester === me ? 'outgoing' : 'incoming',
      following: isFollowing(me, id),
      followedBy: isFollowing(id, me),
      blocked: blocks.some((b) => b.from === me && b.to === id),
    };
  },

  // ───── Báo cáo ─────
  report(token: string | null, p: ReportInput): ReportResult {
    const me = mockSession.userId(token);
    if (p.targetType === 'USER') target(me, p.targetId);
    if (p.violationType === 'OTHER' && !p.description?.trim()) throw new AuthError('Vui lòng mô tả vi phạm', 400, '1002', { description: 'Vui lòng mô tả vi phạm' });
    const r: Report = { ...p, id: String(reports.length + 1), reporter: me, status: 'PENDING', createdAt: new Date().toISOString() };
    reports.push(r);
    return { id: r.id, status: r.status, createdAt: r.createdAt };
  },
};

/** Mỗi lần gọi xong (kể cả khi lỗi) đều lưu lại để tải lại trang không mất dữ liệu demo. */
export const relationMock = Object.fromEntries(Object.entries(handlers).map(([k, fn]) => [k, (...args: never[]) => {
  try { return (fn as (...a: never[]) => unknown)(...args); } finally { persist(); }
}])) as typeof handlers;
