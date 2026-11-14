import { api } from '@/api/backend';
import { isMock } from '@/api/http';
import * as A from './adapters';
import * as M from './mock-db';
import type {
  comment,
  comment_page,
  feed_count,
  feed_page,
  media_asset,
  media_presign_item,
  media_presign_request,
  media_verify_request,
  post,
  post_type,
  raw_comment,
  raw_cursor_page,
  raw_post,
  raw_saved_search,
  raw_search_response,
  raw_subject,
  raw_uploaded_media,
  reaction_result,
  reaction_type,
  saved_search,
  saved_searches,
  search_results,
  search_type,
  subject,
  target_type,
  visibility_type,
} from './types';

const maxImageBytes = 4 * 1024 * 1024;
const pageSize = (limit: number, max = 50) => Math.min(Math.max(Math.trunc(limit) || 1, 1), max);
const toId = A.toApiId;

type post_input = {
  content: string;
  media: media_asset[];
  subjectId: string;
  postType: post_type;
  visibility?: visibility_type;
};

const mockSavedSearches: saved_searches = { recent: [], trending: [] };

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function asList(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asNumber(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function pageFromActivity(value: unknown): feed_page {
  const record = asRecord(value);
  const posts = asList(record.items).flatMap((rawItem) => {
    const item = asRecord(rawItem);
    if (item.target_type !== 'POST') return [];
    const content = asRecord(item.content);
    return [A.toPost({
      ...content,
      post_id: content.post_id ?? item.target_id,
      content: content.text ?? content.content,
      react_count: content.like_count ?? content.react_count,
      comment_count: content.comment_count,
    }, item.actor)];
  });
  return { posts, ...A.toPage(value) };
}

function normalizeSavedSearches(value: unknown): saved_searches {
  const record = asRecord(value);
  const recent = asList(record.recent ?? record.history ?? record.saved_searches ?? record.items)
    .map((item): saved_search => {
      const entry = asRecord(item);
      return {
        id: String(entry.id ?? entry.search_id ?? ''),
        query: String(entry.query ?? entry.keyword ?? entry.search_query ?? ''),
        createdAt: typeof entry.created_at === 'string' ? entry.created_at : undefined,
      };
    })
    .filter((entry) => entry.query.length > 0);
  const trending = asList(record.trending ?? record.trending_searches ?? record.popular)
    .map((item) => typeof item === 'string'
      ? item
      : String(asRecord(item).query ?? asRecord(item).keyword ?? ''))
    .filter(Boolean);
  return { recent, trending };
}

function normalizeReaction(value: unknown): reaction_result {
  const record = asRecord(value);
  const rawCounts = asRecord(record.reaction_counts ?? record.counts);
  const counts: reaction_result['counts'] = {};
  for (const type of ['LIKE', 'LOVE', 'WOW'] as const) {
    if (rawCounts[type] !== undefined) counts[type] = asNumber(rawCounts[type]);
  }
  const reaction = String(record.my_reaction ?? record.reaction_type ?? 'NONE');
  const myReaction: reaction_type = reaction === 'LIKE' || reaction === 'LOVE' || reaction === 'WOW'
    ? reaction
    : 'NONE';
  return {
    myReaction,
    counts,
    totalCount: asNumber(record.total_count ?? Object.values(counts).reduce((sum, count) => sum + count, 0)),
  };
}

/** GET /subjects — danh sách môn dùng khi tạo bài viết. */
export async function getSubjects(): Promise<subject[]> {
  const result = await api<raw_subject[] | { items?: raw_subject[] } | subject[]>('GET', '/subjects', {
    mock: M.mockSubjects,
  });
  if (isMock) return result as subject[];
  const items = Array.isArray(result) ? result : asList(asRecord(result).items);
  return items.map((item) => A.toSubject(item as raw_subject));
}

/** GET /activity-feeds — dòng hoạt động cá nhân hóa. */
export async function getFeed(after?: string, limit = 20): Promise<feed_page> {
  const result = await api<unknown>('GET', '/activity-feeds', {
    query: { after: after ? toId(after) : undefined, limit: pageSize(limit) },
    mock: () => M.mockFeed(after, pageSize(limit)),
  });
  return isMock ? result as feed_page : pageFromActivity(result);
}

/** GET /activity-feeds/new-count — số hoạt động mới. */
export async function getNewFeedCount(): Promise<feed_count> {
  const result = await api<unknown>('GET', '/activity-feeds/new-count', {
    mock: () => ({ count: 0 }),
  });
  if (isMock) return result as feed_count;
  const record = asRecord(result);
  return { count: asNumber(record.count ?? record.new_count ?? record.new_feed_count ?? record.total_count) };
}

/** GET /posts/me — danh sách bài viết của người dùng hiện tại. */
export async function getMyPosts(after?: string, limit = 10): Promise<feed_page> {
  const result = await api<raw_cursor_page<raw_post> | feed_page>('GET', '/posts/me', {
    query: { after: after ? toId(after) : undefined, limit: pageSize(limit) },
    mock: () => M.mockFeed(after, pageSize(limit)),
  });
  return isMock ? result as feed_page : A.toFeedPage(result as raw_cursor_page<raw_post>);
}

/** GET /users/{userId}/posts — danh sách bài viết của một người dùng. */
export async function getUserPosts(userId: string, after?: string, limit = 10): Promise<feed_page> {
  const result = await api<raw_cursor_page<raw_post> | feed_page>('GET', `/users/${encodeURIComponent(userId)}/posts`, {
    query: { after: after ? toId(after) : undefined, limit: pageSize(limit) },
    mock: () => M.mockUserPosts(userId, after, pageSize(limit)),
  });
  return isMock ? result as feed_page : A.toFeedPage(result as raw_cursor_page<raw_post>);
}

/** GET /video-posts — video bài giảng, có thể lọc theo môn học. */
export async function getVideoPosts(subjectId?: string, after?: string, limit = 10): Promise<feed_page> {
  const result = await api<raw_cursor_page<raw_post> | feed_page>('GET', '/video-posts', {
    query: {
      subject_id: subjectId ? toId(subjectId) : undefined,
      after: after ? toId(after) : undefined,
      limit: pageSize(limit),
    },
    mock: () => M.mockVideoPosts(subjectId, after, pageSize(limit)),
  });
  return isMock ? result as feed_page : A.toFeedPage(result as raw_cursor_page<raw_post>);
}

/** GET /posts/{id} — chi tiết bài viết. */
export async function getPost(id: string): Promise<post> {
  const result = await api<raw_post | post>('GET', `/posts/${encodeURIComponent(id)}`, {
    mock: () => M.mockGetPost(id),
  });
  return isMock ? result as post : A.toPost(result as raw_post);
}

/** POST /posts — đăng bài viết hoặc video bài giảng. */
export async function createPost(input: post_input): Promise<post> {
  const subjectId = input.subjectId.trim();
  if (!/^\d+$/.test(subjectId) || !Number.isSafeInteger(Number(subjectId)) || Number(subjectId) <= 0) {
    throw new Error('ID môn học phải là số nguyên dương hợp lệ.');
  }
  const result = await api<raw_post | post>('POST', '/posts', {
    body: {
      content: input.content,
      media_urls: A.toMediaItems(input.media),
      visibility: input.visibility ?? 'PUBLIC',
      post_type: input.postType,
      subject_id: toId(subjectId),
    },
    mock: () => M.mockCreatePost(input),
  });
  return isMock ? result as post : A.toPost(result as raw_post);
}

/** PUT /posts/{id} — giữ nguyên quyền hiển thị nếu request không chỉ định. */
export async function updatePost(
  id: string,
  input: { content?: string; media?: media_asset[]; mediaUrls?: string[]; visibility?: visibility_type },
): Promise<post> {
  const current = await getPost(id);
  const body: Record<string, unknown> = {
    visibility: input.visibility ?? current.visibility ?? 'PUBLIC',
  };
  if (input.content !== undefined) body.content = input.content;
  if (input.media !== undefined) body.media_urls = A.toMediaItems(input.media);
  else if (input.mediaUrls !== undefined) body.media_urls = A.toMediaItems(input.mediaUrls);

  await api<unknown>('PUT', `/posts/${encodeURIComponent(id)}`, {
    body,
    mock: () => M.mockUpdatePost(id, {
      content: input.content,
      mediaUrls: input.media?.flatMap((item) => item.url ? [item.url] : []) ?? input.mediaUrls,
    }),
  });
  return getPost(id);
}

/** DELETE /posts/{id}. */
export async function deletePost(id: string): Promise<void> {
  await api<void>('DELETE', `/posts/${encodeURIComponent(id)}`, {
    mock: () => M.mockDeletePost(id),
  });
}

/** PUT /posts/{id}/lecturer-notes. */
export async function updateLecturerNote(id: string, note: string): Promise<unknown> {
  return api<unknown>('PUT', `/posts/${encodeURIComponent(id)}/lecturer-notes`, {
    body: { lecturer_note: note },
    mock: () => ({ post_id: id, lecturer_note: note }),
  });
}

/** GET /comments?target_type=POST&target_id=... */
export async function getCommentsPage(
  targetId: string,
  after?: string,
  limit = 20,
  parentCommentId?: string,
  sort?: 'newest' | 'oldest',
): Promise<comment_page> {
  const result = await api<raw_cursor_page<raw_comment> | comment_page>('GET', '/comments', {
    query: {
      target_type: 'POST',
      target_id: toId(targetId),
      parent_comment_id: parentCommentId ? toId(parentCommentId) : undefined,
      sort,
      after: after ? toId(after) : undefined,
      limit: pageSize(limit),
    },
    mock: () => M.mockComments(targetId, after, pageSize(limit)),
  });
  return isMock ? result as comment_page : A.toCommentPage(result as raw_cursor_page<raw_comment>);
}

export async function getComments(targetId: string, after?: string, limit = 20): Promise<comment[]> {
  return (await getCommentsPage(targetId, after, limit)).comments;
}

/** POST /comments — supports nested replies with parent_comment_id. */
export async function createComment(
  targetId: string,
  content: string,
  parentCommentId?: string,
): Promise<comment> {
  const result = await api<raw_comment | comment>('POST', '/comments', {
    body: {
      target_type: 'POST',
      target_id: toId(targetId),
      content,
      ...(parentCommentId ? { parent_comment_id: toId(parentCommentId) } : {}),
    },
    mock: () => M.mockCreateComment(targetId, content, parentCommentId),
  });
  return isMock ? result as comment : A.toComment(result as raw_comment);
}

/** PUT /comments/{commentId}. */
export async function updateComment(id: string, targetId: string, content: string): Promise<comment> {
  const result = await api<raw_comment | comment | undefined>('PUT', `/comments/${encodeURIComponent(id)}`, {
    body: { content },
    mock: () => M.mockUpdateComment(id, content),
  });
  if (isMock) return result as comment;
  if (result && (result as raw_comment).comment_id !== undefined) return A.toComment(result as raw_comment);
  const current = await getComments(targetId);
  const updated = current.find((item) => item.id === id);
  if (!updated) throw new Error('Không tải lại được bình luận vừa sửa.');
  return updated;
}

/** DELETE /comments/{commentId}. */
export async function deleteComment(id: string): Promise<void> {
  await api<void>('DELETE', `/comments/${encodeURIComponent(id)}`, {
    mock: () => M.mockDeleteComment(id),
  });
}

/** POST /react — toggle reaction on a post, comment, or question. */
export async function react(
  targetId: string,
  reactionType: Exclude<reaction_type, 'NONE'> = 'LIKE',
  targetType: target_type = 'POST',
): Promise<reaction_result> {
  const result = await api<unknown>('POST', '/react', {
    body: {
      target_type: targetType,
      target_id: toId(targetId),
      reaction_type: reactionType,
    },
    mock: () => targetType === 'POST'
      ? M.mockReact(targetId, reactionType)
      : { myReaction: reactionType, counts: { [reactionType]: 1 }, totalCount: 1 },
  });
  if (isMock && targetType === 'POST') {
    const mockResult = result as { myReaction: reaction_type; likeCount: number };
    return { myReaction: mockResult.myReaction, counts: { LIKE: mockResult.likeCount }, totalCount: mockResult.likeCount };
  }
  return normalizeReaction(result);
}

/** GET /search — tìm kiếm toàn văn, có thể lọc kiểu thực thể và phân trang. */
export async function search(
  query: string,
  type: search_type = 'ALL',
  after?: string,
  limit = 20,
): Promise<search_results> {
  const result = await api<raw_search_response | search_results>('GET', '/search', {
    query: { query, type, after: after ? toId(after) : undefined, limit: pageSize(limit) },
    mock: () => M.mockSearch(query, type, after, pageSize(limit)),
  });
  return isMock ? result as search_results : A.toSearchResults(result as raw_search_response);
}

/** GET /search/saved — lịch sử cá nhân và các từ khóa thịnh hành. */
export async function getSavedSearches(): Promise<saved_searches> {
  const result = await api<unknown>('GET', '/search/saved', {
    mock: () => mockSavedSearches,
  });
  return isMock ? result as saved_searches : normalizeSavedSearches(result);
}

/** POST /search/saved — lưu một lượt tìm kiếm đã xác nhận. */
export async function recordSavedSearch(query: string): Promise<saved_search> {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) throw new Error('Từ khóa tìm kiếm không được để trống.');
  const result = await api<raw_saved_search | saved_search>('POST', '/search/saved', {
    body: { query: normalizedQuery },
    mock: () => {
      const entry = { id: String(Date.now()), query: normalizedQuery, createdAt: new Date().toISOString() };
      mockSavedSearches.recent = [entry, ...mockSavedSearches.recent.filter((item) => item.query !== normalizedQuery)];
      return entry;
    },
  });
  if (isMock) return result as saved_search;
  const entry = result as raw_saved_search;
  return {
    id: String(entry.id ?? entry.search_id ?? ''),
    query: String(entry.query ?? entry.keyword ?? normalizedQuery),
    createdAt: entry.created_at,
  };
}

/** DELETE /search/saved/{id}. */
export async function deleteSavedSearch(id: string): Promise<void> {
  await api<void>('DELETE', `/search/saved/${encodeURIComponent(id)}`, {
    mock: () => {
      mockSavedSearches.recent = mockSavedSearches.recent.filter((item) => item.id !== id);
    },
  });
}

/** POST /medias/presign — obtain upload URLs; payload follows the Swagger request schema. */
export async function getPresignedUrls(input: media_presign_request): Promise<media_presign_item[]> {
  const result = await api<unknown>('POST', '/medias/presign', {
    body: input,
    mock: () => input.files.map((file, index) => ({
      object_key: `mock/${Date.now()}-${index}-${file.file_name}`,
      upload_url: `https://example.invalid/upload/${encodeURIComponent(file.file_name)}`,
      public_url: `https://example.invalid/media/${encodeURIComponent(file.file_name)}`,
    })),
  });
  if (isMock) return result as media_presign_item[];
  const record = asRecord(result);
  const items = Array.isArray(result) ? result : asList(record.items ?? record.files ?? record.presigned_urls);
  return items.map((item) => {
    const media = asRecord(item);
    return {
      object_key: String(media.object_key ?? media.key ?? ''),
      upload_url: String(media.upload_url ?? media.presigned_url ?? media.url ?? ''),
      public_url: typeof media.public_url === 'string' ? media.public_url : undefined,
      headers: asRecord(media.headers) as Record<string, string>,
    };
  });
}

/** POST /medias/upload — direct multipart upload through the backend. */
export async function uploadMedia(asset: media_asset): Promise<media_asset> {
  if (asset.mediaType === 'image' && (asset.size ?? 0) > maxImageBytes) {
    throw new Error('Ảnh tải lên vượt quá giới hạn 4 MB.');
  }
  if (asset.mimeType.toLowerCase() === 'image/gif') throw new Error('Ảnh động không được hỗ trợ.');
  if (!asset.mimeType.startsWith('image/') && !asset.mimeType.startsWith('video/')) {
    throw new Error('Tệp không hợp lệ. Chỉ hỗ trợ ảnh hoặc video.');
  }

  if (isMock) {
    return api<media_asset>('POST', '/medias/upload', {
      mock: () => M.mockUploadMedia(asset),
    });
  }

  let file: Blob;
  try {
    const response = await fetch(asset.uri);
    if (!response.ok) throw new Error('Không đọc được tệp đã chọn.');
    file = await response.blob();
  } catch (error) {
    throw new Error('Không thể đọc tệp media trên thiết bị.', { cause: error });
  }
  if (asset.mediaType === 'image' && file.size > maxImageBytes) {
    throw new Error('Ảnh tải lên vượt quá giới hạn 4 MB.');
  }
  const formData = new FormData();
  formData.append('file', file, asset.name);
  formData.append('purpose', 'POST');
  const result = await api<raw_uploaded_media>('POST', '/medias/upload', {
    body: formData,
    mock: () => ({
      object_key: `mock/${asset.name}`,
      url: asset.url ?? `https://example.invalid/mock/${encodeURIComponent(asset.name)}`,
      file_size: asset.size,
      content_type: asset.mimeType,
      media_type: asset.mediaType === 'video' ? 'VIDEO' : 'IMAGE',
      name: asset.name,
    }),
  });
  const uploaded = A.toUploadedMedia(result, asset);
  if (!uploaded.url) throw new Error('Máy chủ tải lên không trả về URL media.');
  return uploaded;
}

/** POST /medias/verify — verify uploaded R2 objects. */
export async function verifyMedias(input: media_verify_request): Promise<unknown> {
  return api<unknown>('POST', '/medias/verify', {
    body: input,
    mock: () => ({ items: input.object_keys.map((objectKey) => ({ object_key: objectKey, exists: true })) }),
  });
}

export const socialApi = {
  getSubjects,
  getFeed,
  getNewFeedCount,
  getMyPosts,
  getUserPosts,
  getVideoPosts,
  getPost,
  createPost,
  updatePost,
  deletePost,
  updateLecturerNote,
  getComments,
  getCommentsPage,
  createComment,
  updateComment,
  deleteComment,
  react,
  search,
  getSavedSearches,
  recordSavedSearch,
  deleteSavedSearch,
  getPresignedUrls,
  uploadMedia,
  verifyMedias,
};
