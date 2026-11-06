import type { Role } from '@/types';

/** Một người trong danh sách bạn bè / lời mời / theo dõi / chặn. */
export interface Person {
  id: string;
  name: string;
  avatarUrl?: string;
  role?: Role;
  faculty?: string;
  /** MSSV / mã cán bộ. */
  code?: string;
  /** Thời điểm kết bạn / gửi lời mời / theo dõi / chặn (tuỳ danh sách). */
  since?: string;
  mutualFriends?: number;
  friend?: boolean;
  /** Người này đang theo dõi tôi. */
  followsMe?: boolean;
  /** Tôi đang theo dõi người này. */
  iFollow?: boolean;
}

export interface PersonList { items: Person[]; total: number }

/**
 * Trạng thái kết bạn nhìn từ phía tôi.
 * Server chỉ trả `PENDING` không kèm chiều ⇒ client tra danh sách lời mời đã nhận để biết là `incoming` hay `outgoing`.
 */
export type FriendState = 'none' | 'friends' | 'outgoing' | 'incoming';

export interface RelationCounts { friends: number; followers: number; following: number }

/** GET /users/{userId}/relationship-stats */
export interface Relationship {
  counts: RelationCounts;
  friend: FriendState;
  following: boolean;
  followedBy: boolean;
  blocked: boolean;
}

export type ViolationType = 'HARASSMENT' | 'HATE_STATEMENT' | 'SPAM' | 'OTHER';
export type ReportTarget = 'USER' | 'POST' | 'COMMENT';

export interface ReportInput {
  targetType: ReportTarget;
  targetId: string;
  violationType: ViolationType;
  description?: string;
  evidenceUrls?: string[];
}

export interface ReportResult { id: string; status: 'PENDING' | 'RESOLVED'; createdAt: string }
