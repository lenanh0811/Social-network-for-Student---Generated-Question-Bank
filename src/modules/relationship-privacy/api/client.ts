/**
 * API Quan hệ & Quyền riêng tư — khớp Swagger https://snsqb.duckdns.org/api/v1/swagger-ui/index.html
 * (07 Friendships, 08 Follows, 09 Blocks, 26 Reports).
 * Dùng `apiRequest` của module auth để có chung envelope, mã lỗi và cơ chế refresh token.
 * Không đặt EXPO_PUBLIC_API_URL => chạy trên `relationMock`.
 */
import { apiRequest, isMock } from '@/modules/auth-user/api/client';
import type { Role } from '@/shared/types';
import { relationMock as mock } from './mockDb';
import type { FriendState, Person, PersonList, Relationship, ReportInput, ReportResult } from './types';

type Raw = Record<string, unknown>;
const str = (v: unknown) => (typeof v === 'string' && v ? v : undefined);
const num = (v: unknown) => (typeof v === 'number' ? v : Number(v) || 0);
const toRole = (v: unknown): Role | undefined => (v === 'LECTURER' ? 'lecturer' : v === 'STUDENT' ? 'student' : undefined);
/** Id trên server là số (int64). */
const sid = (id: string) => (/^\d+$/.test(id) ? Number(id) : id);
const enc = encodeURIComponent;
/** Mỗi danh sách lấy tối đa 50 (giới hạn của server), đủ cho màn hình hiện tại. */
const PAGE = '?limit=50';

/** FriendDto / AuthorDto / FollowerUserDto / FollowingUserDto / BlockedUserDto => Person */
function toPerson(raw: Raw, since?: unknown, extra?: Raw): Person {
  return {
    id: String(raw.user_id ?? ''),
    name: str(raw.full_name) ?? 'Người dùng',
    avatarUrl: str(raw.avatar_url),
    role: toRole(raw.role),
    faculty: str(raw.school_faculty),
    code: str(raw.code),
    since: str(since),
    mutualFriends: extra?.mutual_friends_count === undefined ? undefined : num(extra.mutual_friends_count),
    friend: raw.friend === undefined ? undefined : Boolean(raw.friend),
  };
}
const page = (d: unknown, totalKey: string, map: (r: Raw) => Person): PersonList => {
  const data = (d ?? {}) as Raw;
  const items = ((data.items as Raw[]) ?? []).map(map);
  return { items, total: data[totalKey] === undefined ? items.length : num(data[totalKey]) };
};
const get = <T>(path: string, mockFn: (t: string | null) => T, map: (d: unknown) => T) =>
  apiRequest<unknown>('GET', path, undefined, mockFn).then((d) => (isMock ? (d as T) : map(d)));
const done = () => undefined;

// ───────── Kết bạn (07) ─────────
/** GET /friendships */
export const listFriends = () =>
  get('/friendships' + PAGE, (t) => mock.friends(t), (d) => page(d, 'total_friends', (r) => ({ ...toPerson(r, r.friends_since, r), friend: true })));

/** GET /friendships/requests/received */
export const listReceivedRequests = () =>
  get('/friendships/requests/received' + PAGE, (t) => mock.received(t), (d) => page(d, 'total_pending', (r) => toPerson((r.requester ?? {}) as Raw, r.created_at, r)));

/** GET /friendships/requests/sent */
export const listSentRequests = () =>
  get('/friendships/requests/sent' + PAGE, (t) => mock.sent(t), (d) => page(d, 'total_sent', (r) => toPerson((r.receiver ?? {}) as Raw, r.created_at, r)));

/**
 * POST /friendships/request — trả trạng thái mới: `outgoing` (đang chờ) hoặc `friends`
 * (người kia đã mời trước nên server tự chấp nhận).
 */
export const sendFriendRequest = (userId: string) =>
  apiRequest<unknown>('POST', '/friendships/request', { addressee_id: sid(userId) }, (t) => mock.request(t, userId))
    .then((d): FriendState => ((isMock ? d : (d as Raw)?.status) === 'ACCEPTED' ? 'friends' : 'outgoing'));

/** POST /friendships/accept */
export const acceptFriendRequest = (requesterId: string) =>
  apiRequest('POST', '/friendships/accept', { requester_id: sid(requesterId) }, (t) => mock.accept(t, requesterId)).then(done);

/** POST /friendships/decline */
export const declineFriendRequest = (requesterId: string) =>
  apiRequest('POST', '/friendships/decline', { requester_id: sid(requesterId) }, (t) => mock.decline(t, requesterId)).then(done);

/** DELETE /friendships/{friendId} */
export const unfriend = (userId: string) =>
  apiRequest('DELETE', `/friendships/${enc(userId)}`, undefined, (t) => mock.unfriend(t, userId)).then(done);

// ───────── Theo dõi (08) ─────────
/** GET /follows/followers */
export const listFollowers = () =>
  get('/follows/followers' + PAGE, (t) => mock.followers(t), (d) => page(d, 'total_followers', (r) => ({
    ...toPerson(r, r.followed_me_at), followsMe: true, iFollow: Boolean(r.following_back),
  })));

/** GET /follows/following */
export const listFollowing = () =>
  get('/follows/following' + PAGE, (t) => mock.following(t), (d) => page(d, 'total_following', (r) => ({
    ...toPerson(r, r.followed_at), iFollow: true, followsMe: Boolean(r.following_me),
  })));

/** POST /follows/{targetUserId} — trả số người theo dõi mới của người đó. */
export const follow = (userId: string) =>
  apiRequest<unknown>('POST', `/follows/${enc(userId)}`, undefined, (t) => mock.follow(t, userId))
    .then((d) => (isMock ? (d as number) : num((d as Raw)?.new_followers_count)));

/** DELETE /follows/{targetUserId} — trả số người theo dõi mới của người đó. */
export const unfollow = (userId: string) =>
  apiRequest<unknown>('DELETE', `/follows/${enc(userId)}`, undefined, (t) => mock.unfollow(t, userId))
    .then((d) => (isMock ? (d as number) : num((d as Raw)?.new_followers_count)));

// ───────── Chặn (09) ─────────
/** GET /blocks */
export const listBlocked = () =>
  get('/blocks' + PAGE, (t) => mock.blocked(t), (d) => page(d, 'total_blocked', (r) => toPerson(r, r.blocked_at)));

/** POST /blocks/{targetUserId} — server tự huỷ kết bạn và theo dõi 2 chiều. */
export const block = (userId: string) =>
  apiRequest('POST', `/blocks/${enc(userId)}`, undefined, (t) => mock.block(t, userId)).then(done);

/** DELETE /blocks/{targetUserId} */
export const unblock = (userId: string) =>
  apiRequest('DELETE', `/blocks/${enc(userId)}`, undefined, (t) => mock.unblock(t, userId)).then(done);

// ───────── Thống kê quan hệ ─────────
/**
 * GET /users/{userId}/relationship-stats.
 * `friend_request_status = PENDING` không cho biết ai gửi ⇒ tra thêm danh sách lời mời đã nhận.
 */
export async function getRelationship(userId: string): Promise<Relationship> {
  const d = await apiRequest<unknown>('GET', `/users/${enc(userId)}/relationship-stats`, undefined, (t) => mock.stats(t, userId));
  if (isMock) return d as Relationship;
  const data = (d ?? {}) as Raw;
  const c = (data.counts ?? {}) as Raw;
  const r = (data.relationship_with_me ?? {}) as Raw;
  let friend: FriendState = r.friend || r.friend_request_status === 'ACCEPTED' ? 'friends' : 'none';
  if (friend === 'none' && r.friend_request_status === 'PENDING') {
    const received = await listReceivedRequests().catch(() => null);
    friend = received?.items.some((p) => p.id === userId) ? 'incoming' : 'outgoing';
  }
  return {
    counts: { friends: num(c.friends_count), followers: num(c.followers_count), following: num(c.following_count) },
    friend,
    following: Boolean(r.following),
    followedBy: Boolean(r.followed_by),
    blocked: Boolean(r.blocked),
  };
}

// ───────── Báo cáo vi phạm (26) ─────────
/** POST /report */
export const report = (p: ReportInput) =>
  apiRequest<unknown>('POST', '/report', {
    target_type: p.targetType,
    target_id: sid(p.targetId),
    violation_type: p.violationType,
    description: p.description?.trim() || undefined,
    evidence_urls: p.evidenceUrls?.length ? p.evidenceUrls : undefined,
  }, (t) => mock.report(t, p)).then((d): ReportResult => {
    if (isMock) return d as ReportResult;
    const r = (d ?? {}) as Raw;
    return { id: String(r.report_id ?? ''), status: r.status === 'RESOLVED' ? 'RESOLVED' : 'PENDING', createdAt: str(r.created_at) ?? new Date().toISOString() };
  });
