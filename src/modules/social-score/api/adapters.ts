import type {
  Comment,
  CommentPage,
  FeedPage,
  MediaAsset,
  Post,
  SearchResults,
  SocialUser,
  Subject,
} from './types';

type RawRecord = Record<string, unknown>;

export interface RawMediaItem {
  key?: string;
  url?: string;
  type?: string;
  width?: number;
  height?: number;
  size?: number;
  duration?: number;
  name?: string;
  thumbnail_url?: string;
}

export interface RawAuthor {
  user_id?: number;
  id?: number;
  full_name?: string;
  avatar_url?: string;
  frame_url?: string;
}

export interface RawPost {
  post_id: number;
  content: string;
  media_urls?: (RawMediaItem | string)[];
  visibility?: string;
  post_type?: string;
  subject_id?: number;
  subject_name?: string;
  subject_code?: string;
  session_id?: number;
  author?: RawAuthor;
  react_count?: number;
  comment_count?: number;
  reacted_by_me?: boolean;
  my_reaction?: string;
  is_edited?: boolean;
  is_owner?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface RawComment {
  comment_id: number;
  target_id: number;
  content?: string | null;
  author?: RawAuthor | null;
  created_at?: string;
  parent_comment_id?: number | null;
  deleted?: boolean;
  is_owner?: boolean;
  replies?: (RawComment | string)[];
}

export interface RawCursorPage<T> {
  items?: T[];
  pagination?: {
    after?: number | string | null;
    has_next?: boolean | string;
  };
}

export interface RawSearchItem {
  type?: string;
  post?: RawPost;
  user?: RawRecord;
  question?: RawRecord;
}

export interface RawSearchResponse {
  items?: RawSearchItem[];
  results?: {
    posts?: RawPost[];
    users?: RawRecord[];
    questions?: RawRecord[];
  };
  pagination?: RawCursorPage<unknown>['pagination'];
}

export interface RawUploadedMedia {
  object_key?: string;
  url?: string;
  file_size?: number;
  content_type?: string;
  media_type?: string;
  width?: number;
  height?: number;
  duration_seconds?: number;
  name?: string;
  thumbnail_url?: string;
}

export interface RawSubject {
  subject_id: number;
  code: string;
  name: string;
}

export function toApiId(value: string): number | string {
  if (!/^-?\d+$/.test(value)) return value;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : value;
}

function asRecord(value: unknown): RawRecord {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as RawRecord)
    : {};
}

function asList(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asNumber(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function asBoolean(value: unknown): boolean {
  return value === true || value === 'true' || value === 1;
}

export function toUser(value: unknown, fallbackName = 'Người dùng'): SocialUser {
  const user = asRecord(value);
  const userId = user.user_id ?? user.id;
  return {
    id: userId === undefined || userId === null ? '' : String(userId),
    name: String(user.full_name ?? user.name ?? fallbackName),
    avatarUrl: typeof user.avatar_url === 'string' ? user.avatar_url : undefined,
    frameUrl: typeof user.frame_url === 'string' ? user.frame_url : undefined,
  };
}

export function toMediaUrls(value: unknown): string[] {
  return asList(value).flatMap((media) => {
    if (typeof media === 'string') return [media];
    const url = asRecord(media).url;
    return typeof url === 'string' ? [url] : [];
  });
}

export function toPost(value: RawPost | unknown, actor?: unknown): Post {
  const post = asRecord(value);
  const counts = asRecord(post.reaction_counts);
  const reactedByMe = asBoolean(post.reacted_by_me);
  const reaction = String(post.my_reaction ?? (reactedByMe ? 'LIKE' : 'NONE'));
  const visibility = post.visibility;

  return {
    id: String(post.post_id ?? post.id ?? ''),
    content: String(post.content ?? post.text ?? ''),
    author: toUser(post.author ?? actor),
    createdAt: String(post.created_at ?? post.createdAt ?? ''),
    mediaUrls: toMediaUrls(post.media_urls ?? post.mediaUrls ?? post.media_url),
    visibility: visibility === 'ONLY_ME' || visibility === 'FRIENDS' ? visibility : 'PUBLIC',
    postType: typeof post.post_type === 'string' ? post.post_type as Post['postType'] : undefined,
    subjectId: post.subject_id === undefined ? undefined : String(post.subject_id),
    subjectName: typeof post.subject_name === 'string' ? post.subject_name : undefined,
    subjectCode: typeof post.subject_code === 'string' ? post.subject_code : undefined,
    sessionId: post.session_id === undefined ? undefined : String(post.session_id),
    isEdited: post.is_edited === undefined ? undefined : asBoolean(post.is_edited),
    isOwner: post.is_owner === undefined ? undefined : asBoolean(post.is_owner),
    reactionCount: asNumber(counts.LIKE ?? post.react_count ?? post.like_count),
    commentCount: asNumber(post.comment_count),
    myReaction: reaction === 'LIKE' || reaction === 'LOVE' || reaction === 'WOW' ? reaction : 'NONE',
  };
}

export function toComment(value: RawComment | unknown): Comment {
  const comment = asRecord(value);
  const deleted = asBoolean(comment.deleted ?? comment.hidden);
  return {
    id: String(comment.comment_id ?? comment.id ?? ''),
    targetId: String(comment.target_id ?? comment.targetId ?? ''),
    content: String(comment.content ?? ''),
    author: toUser(comment.author, deleted ? 'Bình luận đã ẩn' : 'Người dùng'),
    createdAt: String(comment.created_at ?? ''),
    parentCommentId:
      comment.parent_comment_id === null || comment.parent_comment_id === undefined
        ? undefined
        : String(comment.parent_comment_id),
    isHidden: deleted,
    isOwner: comment.is_owner === undefined ? undefined : asBoolean(comment.is_owner),
    replies: asList(comment.replies).flatMap<Comment | string>((reply): (Comment | string)[] => {
      if (typeof reply === 'string') return [reply];
      if (reply !== null && typeof reply === 'object' && !Array.isArray(reply)) return [toComment(reply)];
      return [];
    }),
  };
}

export function toPage(value: unknown) {
  const pagination = asRecord(asRecord(value).pagination);
  const cursor = pagination.after;
  return {
    after: cursor === null || cursor === undefined ? undefined : String(cursor),
    hasNext: asBoolean(pagination.has_next),
  };
}

export function toFeedPage(value: RawCursorPage<RawPost> | unknown): FeedPage {
  const page = asRecord(value);
  return {
    posts: asList(page.items).map((post) => toPost(post)),
    ...toPage(value),
  };
}

export function toCommentPage(value: RawCursorPage<RawComment> | unknown): CommentPage {
  const page = asRecord(value);
  return {
    comments: asList(page.items).map((comment) => toComment(comment)),
    ...toPage(value),
  };
}

export function toSubject(value: RawSubject): Subject {
  return { id: String(value.subject_id), code: value.code, name: value.name };
}

export function toMediaItems(items: (string | MediaAsset)[]): RawMediaItem[] {
  return items.map((item) => {
    if (typeof item === 'string') {
      return {
        url: item,
        type: /\.(mp4|mov|m4v|webm)(?:$|[?#])/i.test(item) ? 'VIDEO' : 'IMAGE',
      };
    }
    return {
      key: item.key,
      url: item.url,
      type: item.mediaType === 'video' ? 'VIDEO' : 'IMAGE',
      width: item.width,
      height: item.height,
      size: item.size,
      duration: item.duration,
      name: item.name,
      thumbnail_url: item.thumbnailUrl,
    };
  });
}

export function toUploadedMedia(value: RawUploadedMedia | unknown, source: MediaAsset): MediaAsset {
  const media = asRecord(value);
  const contentType = String(media.content_type ?? source.mimeType);
  return {
    ...source,
    url: typeof media.url === 'string' ? media.url : source.url,
    key: typeof media.object_key === 'string' ? media.object_key : undefined,
    size: asNumber(media.file_size) || source.size,
    mimeType: contentType,
    mediaType: contentType.startsWith('video/') || media.media_type === 'VIDEO' ? 'video' : 'image',
    width: typeof media.width === 'number' ? media.width : undefined,
    height: typeof media.height === 'number' ? media.height : undefined,
    duration: typeof media.duration_seconds === 'number' ? media.duration_seconds : undefined,
    name: typeof media.name === 'string' ? media.name : source.name,
    thumbnailUrl: typeof media.thumbnail_url === 'string' ? media.thumbnail_url : undefined,
  };
}

function toSearchPost(value: unknown): Post {
  const post = asRecord(value);
  return toPost({
    ...post,
    post_id: asNumber(post.post_id),
    author: {
      user_id: post.author_id,
      full_name: post.author_name,
      avatar_url: post.author_avatar_url,
      frame_url: post.author_frame_url,
    },
  });
}

export function toSearchResults(value: RawSearchResponse | unknown): SearchResults {
  const response = asRecord(value);
  const posts: Post[] = [];
  const users: SocialUser[] = [];
  const questions: SearchResults['questions'] = [];

  if (Array.isArray(response.items)) {
    for (const rawItem of response.items) {
      const item = asRecord(rawItem);
      if (item.type === 'POST' && item.post) posts.push(toSearchPost(item.post));
      if (item.type === 'USER' && item.user) users.push(toUser(item.user));
      if (item.type === 'QUESTION' && item.question) {
        const question = asRecord(item.question);
        questions.push({
          id: String(question.question_id ?? question.id ?? ''),
          subjectName: String(question.subject_name ?? ''),
          content: String(question.content ?? ''),
          difficulty: typeof question.difficulty === 'string' ? question.difficulty : undefined,
        });
      }
    }
  } else {
    const results = asRecord(response.results);
    posts.push(...asList(results.posts).map(toSearchPost));
    users.push(...asList(results.users).map((user) => toUser(user)));
    questions.push(
      ...asList(results.questions).map((value) => {
        const question = asRecord(value);
        return {
          id: String(question.question_id ?? question.id ?? ''),
          subjectName: String(question.subject_name ?? ''),
          content: String(question.content ?? ''),
          difficulty: typeof question.difficulty === 'string' ? question.difficulty : undefined,
        };
      }),
    );
  }

  return { posts, users, questions, ...toPage(value) };
}

export function toMediaAsset(value: RawUploadedMedia | unknown, source: MediaAsset): MediaAsset {
  return toUploadedMedia(value, source);
}
