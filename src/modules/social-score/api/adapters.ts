import type {
  comment,
  comment_page,
  feed_page,
  media_asset,
  post,
  raw_author,
  raw_comment,
  raw_cursor_page,
  raw_media_item,
  raw_post,
  raw_search_response,
  raw_subject,
  raw_uploaded_media,
  search_results,
  social_user,
  subject,
} from './types';

type raw_record = Record<string, unknown>;

function asRecord(value: unknown): raw_record {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as raw_record)
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

export function toApiId(value: string): number | string {
  if (!/^-?\d+$/.test(value)) return value;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : value;
}

export function toUser(value: unknown, fallbackName = 'Người dùng'): social_user {
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

export function toPost(value: raw_post | unknown, actor?: unknown): post {
  const rawPost = asRecord(value);
  const counts = asRecord(rawPost.reaction_counts);
  const reactedByMe = asBoolean(rawPost.reacted_by_me);
  const reaction = String(rawPost.my_reaction ?? (reactedByMe ? 'LIKE' : 'NONE'));
  const visibility = rawPost.visibility;

  return {
    id: String(rawPost.post_id ?? rawPost.id ?? ''),
    content: String(rawPost.content ?? rawPost.text ?? ''),
    author: toUser(rawPost.author ?? actor),
    createdAt: String(rawPost.created_at ?? rawPost.createdAt ?? ''),
    mediaUrls: toMediaUrls(rawPost.media_urls ?? rawPost.mediaUrls ?? rawPost.media_url),
    visibility: visibility === 'ONLY_ME' || visibility === 'FRIENDS' ? visibility : 'PUBLIC',
    postType: typeof rawPost.post_type === 'string' ? rawPost.post_type as post['postType'] : undefined,
    subjectId: rawPost.subject_id === undefined ? undefined : String(rawPost.subject_id),
    subjectName: typeof rawPost.subject_name === 'string' ? rawPost.subject_name : undefined,
    subjectCode: typeof rawPost.subject_code === 'string' ? rawPost.subject_code : undefined,
    sessionId: rawPost.session_id === undefined ? undefined : String(rawPost.session_id),
    isEdited: rawPost.is_edited === undefined ? undefined : asBoolean(rawPost.is_edited),
    isOwner: rawPost.is_owner === undefined ? undefined : asBoolean(rawPost.is_owner),
    reactionCount: asNumber(counts.LIKE ?? rawPost.react_count ?? rawPost.like_count),
    commentCount: asNumber(rawPost.comment_count),
    myReaction: reaction === 'LIKE' || reaction === 'LOVE' || reaction === 'WOW' ? reaction : 'NONE',
  };
}

export function toComment(value: raw_comment | unknown): comment {
  const rawComment = asRecord(value);
  const deleted = asBoolean(rawComment.deleted ?? rawComment.hidden);
  return {
    id: String(rawComment.comment_id ?? rawComment.id ?? ''),
    targetId: String(rawComment.target_id ?? rawComment.targetId ?? ''),
    content: String(rawComment.content ?? ''),
    author: toUser(rawComment.author, deleted ? 'Bình luận đã ẩn' : 'Người dùng'),
    createdAt: String(rawComment.created_at ?? ''),
    parentCommentId:
      rawComment.parent_comment_id === null || rawComment.parent_comment_id === undefined
        ? undefined
        : String(rawComment.parent_comment_id),
    isHidden: deleted,
    isOwner: rawComment.is_owner === undefined ? undefined : asBoolean(rawComment.is_owner),
    replies: asList(rawComment.replies)
      .filter((reply): reply is raw_comment => reply !== null && typeof reply === 'object' && !Array.isArray(reply))
      .map(toComment),
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

export function toFeedPage(value: raw_cursor_page<raw_post> | unknown): feed_page {
  const page = asRecord(value);
  return {
    posts: asList(page.items).map((item) => toPost(item)),
    ...toPage(value),
  };
}

export function toCommentPage(value: raw_cursor_page<raw_comment> | unknown): comment_page {
  const page = asRecord(value);
  return {
    comments: asList(page.items).map((item) => toComment(item)),
    ...toPage(value),
  };
}

export function toSubject(value: raw_subject): subject {
  return { id: String(value.subject_id), code: value.code, name: value.name };
}

export function toMediaItems(items: (string | media_asset)[]): raw_media_item[] {
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

export function toUploadedMedia(value: raw_uploaded_media | unknown, source: media_asset): media_asset {
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

function toSearchPost(value: unknown): post {
  const rawPost = asRecord(value);
  return toPost({
    ...rawPost,
    post_id: rawPost.post_id as string | number,
    author: {
      user_id: rawPost.author_id as string | number,
      full_name: rawPost.author_name as string,
      avatar_url: rawPost.author_avatar_url as string,
      frame_url: rawPost.author_frame_url as string,
    } satisfies raw_author,
  });
}

export function toSearchResults(value: raw_search_response | unknown): search_results {
  const response = asRecord(value);
  const posts: post[] = [];
  const users: social_user[] = [];
  const questions: search_results['questions'] = [];

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
    questions.push(...asList(results.questions).map((value) => {
      const question = asRecord(value);
      return {
        id: String(question.question_id ?? question.id ?? ''),
        subjectName: String(question.subject_name ?? ''),
        content: String(question.content ?? ''),
        difficulty: typeof question.difficulty === 'string' ? question.difficulty : undefined,
      };
    }));
  }

  return { posts, users, questions, ...toPage(value) };
}
