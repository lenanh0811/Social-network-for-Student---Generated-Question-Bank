/**
 * API Quan hệ & Quyền riêng tư — khớp Swagger https://snsqb.duckdns.org/api/v1/swagger-ui/index.html
 * (07 Friendships, 08 Follows, 09 Blocks, 26 Reports).
 * Gọi qua `api()` dùng chung của nhóm; đổi dữ liệu server ở `adapters.ts`.
 * Không đặt EXPO_PUBLIC_API_URL => chạy trên `relationMock`.
 */
import { api } from '@/api/backend';
import { isMock } from '@/api/http';
import { getAccessToken } from '@/modules/auth-user/api/client';
import * as A from './adapters';
import { relationMock as mock } from './mock-db';
import type { FriendState, PersonList, Relationship, ReportInput, ReportResult } from './types';

const enc = encodeURIComponent;
/** Mỗi danh sách lấy tối đa 50 (giới hạn của server), đủ cho màn hình hiện tại. */
const PAGE = { limit: 50 };

/** Mock cần biết ai đang đăng nhập nên lấy token hiện tại rồi truyền vào. */
const asMe = <R>(fn: (token: string | null) => R) => async () => fn(await getAccessToken());
const list = (path: string, mockFn: (t: string | null) => PersonList, map: (d: unknown) => PersonList) =>
  api<unknown>('GET', path, { query: PAGE, mock: asMe(mockFn) }).then((d) => (isMock ? (d as PersonList) : map(d)));
const done = () => undefined;

// ───────── Kết bạn (07) ─────────
/** GET /friendships */
export const listFriends = () => list('/friendships', (t) => mock.friends(t), A.toFriends);

/** GET /friendships/requests/received */
export const listReceivedRequests = () => list('/friendships/requests/received', (t) => mock.received(t), A.toReceivedRequests);

/** GET /friendships/requests/sent */
export const listSentRequests = () => list('/friendships/requests/sent', (t) => mock.sent(t), A.toSentRequests);

/**
 * POST /friendships/request — trả trạng thái mới: `outgoing` (đang chờ) hoặc `friends`
 * (người kia đã mời trước nên server tự chấp nhận).
 */
export const sendFriendRequest = (userId: string) =>
  api<unknown>('POST', '/friendships/request', { body: { addressee_id: A.toServerId(userId) }, mock: asMe((t) => mock.request(t, userId)) })
    .then((d): FriendState => A.toRequestState(isMock ? d : (d as { status?: unknown } | undefined)?.status));

/** POST /friendships/accept */
export const acceptFriendRequest = (requesterId: string) =>
  api<unknown>('POST', '/friendships/accept', { body: { requester_id: A.toServerId(requesterId) }, mock: asMe((t) => mock.accept(t, requesterId)) }).then(done);

/** POST /friendships/decline */
export const declineFriendRequest = (requesterId: string) =>
  api<unknown>('POST', '/friendships/decline', { body: { requester_id: A.toServerId(requesterId) }, mock: asMe((t) => mock.decline(t, requesterId)) }).then(done);

/** DELETE /friendships/requests/sent/{receiverId} — rút lời mời kết bạn đã gửi. */
export const cancelFriendRequest = (receiverId: string) =>
  api<unknown>('DELETE', `/friendships/requests/sent/${enc(A.toServerId(receiverId))}`, { mock: asMe((t) => mock.cancel(t, receiverId)) }).then(done);

/** DELETE /friendships/{friendId} */
export const unfriend = (userId: string) =>
  api<unknown>('DELETE', `/friendships/${enc(userId)}`, { mock: asMe((t) => mock.unfriend(t, userId)) }).then(done);

// ───────── Theo dõi (08) ─────────
/** GET /follows/followers */
export const listFollowers = () => list('/follows/followers', (t) => mock.followers(t), A.toFollowers);

/** GET /follows/following */
export const listFollowing = () => list('/follows/following', (t) => mock.following(t), A.toFollowing);

/** POST /follows/{targetUserId} — trả số người theo dõi mới của người đó. */
export const follow = (userId: string) =>
  api<unknown>('POST', `/follows/${enc(userId)}`, { mock: asMe((t) => mock.follow(t, userId)) })
    .then((d) => (isMock ? (d as number) : A.toFollowerCount(d)));

/** DELETE /follows/{targetUserId} — trả số người theo dõi mới của người đó. */
export const unfollow = (userId: string) =>
  api<unknown>('DELETE', `/follows/${enc(userId)}`, { mock: asMe((t) => mock.unfollow(t, userId)) })
    .then((d) => (isMock ? (d as number) : A.toFollowerCount(d)));

// ───────── Chặn (09) ─────────
/** GET /blocks */
export const listBlocked = () => list('/blocks', (t) => mock.blocked(t), A.toBlocked);

/** POST /blocks/{targetUserId} — server tự huỷ kết bạn và theo dõi 2 chiều. */
export const block = (userId: string) =>
  api<unknown>('POST', `/blocks/${enc(userId)}`, { mock: asMe((t) => mock.block(t, userId)) }).then(done);

/** DELETE /blocks/{targetUserId} */
export const unblock = (userId: string) =>
  api<unknown>('DELETE', `/blocks/${enc(userId)}`, { mock: asMe((t) => mock.unblock(t, userId)) }).then(done);

// ───────── Thống kê quan hệ ─────────
/**
 * GET /users/{userId}/relationship-stats.
 * `friend_request_status = PENDING` không cho biết ai gửi ⇒ tra thêm danh sách lời mời đã nhận.
 */
export async function getRelationship(userId: string): Promise<Relationship> {
  const d = await api<unknown>('GET', `/users/${enc(userId)}/relationship-stats`, { mock: asMe((t) => mock.stats(t, userId)) });
  if (isMock) return d as Relationship;
  const rel = A.toRelationship(d);
  if (rel.friend !== 'outgoing') return rel;
  const received = await listReceivedRequests().catch(() => null);
  return received?.items.some((p) => p.id === userId) ? { ...rel, friend: 'incoming' } : rel;
}

// ───────── Báo cáo vi phạm (26) ─────────
/** POST /report */
export const report = (p: ReportInput) =>
  api<unknown>('POST', '/report', {
    body: {
      target_type: p.targetType,
      target_id: A.toServerId(p.targetId),
      violation_type: p.violationType,
      description: p.description?.trim() || undefined,
      evidence_urls: p.evidenceUrls?.length ? p.evidenceUrls : undefined,
    },
    mock: asMe((t) => mock.report(t, p)),
  }).then((d): ReportResult => (isMock ? (d as ReportResult) : A.toReportResult(d)));
