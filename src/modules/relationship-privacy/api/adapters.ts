/**
 * Chuyển dữ liệu backend (snake_case, chữ HOA) sang kiểu dùng trong giao diện.
 * Giao diện không đọc trực tiếp snake_case; ID luôn là chuỗi, gửi lên server thì đổi sang số.
 */
import type { Role } from '@/types';
import type { FriendState, Person, PersonList, Relationship, ReportResult } from './types';

type Raw = Record<string, unknown>;
const str = (v: unknown) => (typeof v === 'string' && v ? v : undefined);
const num = (v: unknown) => (typeof v === 'number' ? v : Number(v) || 0);
const toRole = (v: unknown): Role | undefined => (v === 'LECTURER' ? 'lecturer' : v === 'STUDENT' ? 'student' : undefined);

/** Id trên server là số (int64). */
export const toServerId = (id: string) => (/^\d+$/.test(id) ? Number(id) : id);

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

const toList = (d: unknown, totalKey: string, map: (r: Raw) => Person): PersonList => {
  const data = (d ?? {}) as Raw;
  const items = ((data.items as Raw[]) ?? []).map(map);
  return { items, total: data[totalKey] === undefined ? items.length : num(data[totalKey]) };
};

export const toFriends = (d: unknown) =>
  toList(d, 'total_friends', (r) => ({ ...toPerson(r, r.friends_since, r), friend: true }));
export const toReceivedRequests = (d: unknown) =>
  toList(d, 'total_pending', (r) => toPerson((r.requester ?? {}) as Raw, r.created_at, r));
export const toSentRequests = (d: unknown) =>
  toList(d, 'total_sent', (r) => toPerson((r.receiver ?? {}) as Raw, r.created_at, r));
export const toFollowers = (d: unknown) =>
  toList(d, 'total_followers', (r) => ({ ...toPerson(r, r.followed_me_at), followsMe: true, iFollow: Boolean(r.following_back) }));
export const toFollowing = (d: unknown) =>
  toList(d, 'total_following', (r) => ({ ...toPerson(r, r.followed_at), iFollow: true, followsMe: Boolean(r.following_me) }));
export const toBlocked = (d: unknown) =>
  toList(d, 'total_blocked', (r) => toPerson(r, r.blocked_at));

/** FriendshipResponseDto => trạng thái sau khi gửi lời mời. */
export const toRequestState = (status: unknown): FriendState => (status === 'ACCEPTED' ? 'friends' : 'outgoing');

/** FollowResponseDto / UnfollowResponseDto => số người theo dõi mới. */
export const toFollowerCount = (d: unknown) => num((d as Raw)?.new_followers_count);

/**
 * RelationshipStatsResponseDto => Relationship.
 * `PENDING` không cho biết ai gửi nên tạm coi là `outgoing`; client.ts tra lời mời đã nhận để sửa thành `incoming`.
 */
export function toRelationship(d: unknown): Relationship {
  const data = (d ?? {}) as Raw;
  const c = (data.counts ?? {}) as Raw;
  const r = (data.relationship_with_me ?? {}) as Raw;
  const friend: FriendState = r.friend || r.friend_request_status === 'ACCEPTED'
    ? 'friends'
    : r.friend_request_status === 'PENDING' ? 'outgoing' : 'none';
  return {
    counts: { friends: num(c.friends_count), followers: num(c.followers_count), following: num(c.following_count) },
    friend,
    following: Boolean(r.following),
    followedBy: Boolean(r.followed_by),
    blocked: Boolean(r.blocked),
  };
}

/** ReportResponseDto => ReportResult */
export function toReportResult(d: unknown): ReportResult {
  const r = (d ?? {}) as Raw;
  return { id: String(r.report_id ?? ''), status: r.status === 'RESOLVED' ? 'RESOLVED' : 'PENDING', createdAt: str(r.created_at) ?? new Date().toISOString() };
}
