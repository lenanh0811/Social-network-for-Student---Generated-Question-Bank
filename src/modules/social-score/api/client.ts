import { api } from '@/api/backend';
import { isMock } from '@/api/http';
import * as A from './adapters';
import * as M from './mock-db';
import type {
  Comment,
  CommentPage,
  FeedPage,
  MediaAsset,
  Post,
  PostType,
  ReactionType,
  SearchResults,
  SearchType,
  Subject,
} from './types';

const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const pageSize = (limit: number, max: number) => Math.min(Math.max(Math.trunc(limit) || 1, 1), max);

type PostInput = {
  content: string;
  media: MediaAsset[];
  subjectId: string;
  postType: PostType;
};

/** GET /subjects — danh sách môn dùng để chọn khi tạo bài viết. */
export const getSubjects = () =>
  api<A.RawSubject[] | Subject[]>('GET', '/subjects', {
    mock: M.mockSubjects,
  }).then((result) => (isMock ? result as Subject[] : (result as A.RawSubject[]).map(A.toSubject)));

/** GET /posts/me — feed bài viết của người dùng hiện tại. */
export const getFeed = (after?: string, limit = 10) =>
  api<A.RawCursorPage<A.RawPost> | FeedPage>('GET', '/posts/me', {
    query: { after: after ? A.toApiId(after) : undefined, limit: pageSize(limit, 50) },
    mock: () => M.mockFeed(after, pageSize(limit, 50)),
  }).then((result) => (isMock ? result as FeedPage : A.toFeedPage(result as A.RawCursorPage<A.RawPost>)));

/** GET /users/{userId}/posts — bài viết của một người dùng. */
export const getUserPosts = (userId: string, after?: string, limit = 10) =>
  api<A.RawCursorPage<A.RawPost> | FeedPage>('GET', `/users/${encodeURIComponent(userId)}/posts`, {
    query: { after: after ? A.toApiId(after) : undefined, limit: pageSize(limit, 50) },
    mock: () => M.mockUserPosts(userId, after, pageSize(limit, 50)),
  }).then((result) => (isMock ? result as FeedPage : A.toFeedPage(result as A.RawCursorPage<A.RawPost>)));

/** GET /video-posts — video theo môn học. */
export const getVideoPosts = (subjectId?: string, after?: string, limit = 2) =>
  api<A.RawCursorPage<A.RawPost> | FeedPage>('GET', '/video-posts', {
    query: {
      subject_id: subjectId ? A.toApiId(subjectId) : undefined,
      after: after ? A.toApiId(after) : undefined,
      limit: pageSize(limit, 50),
    },
    mock: () => M.mockVideoPosts(subjectId, after, pageSize(limit, 50)),
  }).then((result) => (isMock ? result as FeedPage : A.toFeedPage(result as A.RawCursorPage<A.RawPost>)));

/** GET /posts/{id} — chi tiết bài viết. */
export const getPost = (id: string) =>
  api<A.RawPost | Post>('GET', `/posts/${encodeURIComponent(id)}`, {
    mock: () => M.mockGetPost(id),
  }).then((result) => (isMock ? result as Post : A.toPost(result as A.RawPost)));

/** POST /posts — mọi bài mới mặc định công khai. */
export const createPost = (input: PostInput) => {
  const subjectId = input.subjectId.trim();
  if (!/^\d+$/.test(subjectId) || !Number.isSafeInteger(Number(subjectId)) || Number(subjectId) <= 0) {
    throw new Error('ID môn học phải là số nguyên dương hợp lệ.');
  }
  return api<A.RawPost | Post>('POST', '/posts', {
    body: {
      content: input.content,
      media_urls: A.toMediaItems(input.media),
      visibility: 'PUBLIC',
      post_type: input.postType,
      subject_id: A.toApiId(subjectId),
    },
    mock: () => M.mockCreatePost(input),
  }).then((result) => (isMock ? result as Post : A.toPost(result as A.RawPost)));
};

/** PUT /posts/{id} — preserve visibility because the backend requires it on update. */
export async function updatePost(
  id: string,
  input: { content?: string; mediaUrls?: string[]; visibility?: Post['visibility'] },
): Promise<Post> {
  const current = await getPost(id);
  const body: Record<string, unknown> = {
    visibility: input.visibility ?? current.visibility ?? 'PUBLIC',
  };
  if (input.content !== undefined) body.content = input.content;
  if (input.mediaUrls !== undefined) body.media_urls = A.toMediaItems(input.mediaUrls);

  await api<unknown>('PUT', `/posts/${encodeURIComponent(id)}`, {
    body,
    mock: () => M.mockUpdatePost(id, input),
  });
  return getPost(id);
}

/** DELETE /posts/{id}. */
export const deletePost = (id: string) =>
  api<void>('DELETE', `/posts/${encodeURIComponent(id)}`, {
    mock: () => M.mockDeletePost(id),
  });

/** GET /comments?target_type=POST&target_id=... */
export const getCommentsPage = (
  targetId: string,
  after?: string,
  limit = 20,
  parentCommentId?: string,
  sort?: 'newest' | 'oldest',
) =>
  api<A.RawCursorPage<A.RawComment> | CommentPage>('GET', '/comments', {
    query: {
      target_type: 'POST',
      target_id: A.toApiId(targetId),
      parent_comment_id: parentCommentId ? A.toApiId(parentCommentId) : undefined,
      sort,
      after: after ? A.toApiId(after) : undefined,
      limit: pageSize(limit, 50),
    },
    mock: () => M.mockComments(targetId, after, pageSize(limit, 50)),
  }).then((result) =>
    isMock ? result as CommentPage : A.toCommentPage(result as A.RawCursorPage<A.RawComment>),
  );

export const getComments = async (targetId: string, after?: string, limit = 20): Promise<Comment[]> =>
  (await getCommentsPage(targetId, after, limit)).comments;

/** POST /comments — supports replies via parent_comment_id. */
export const createComment = (
  targetId: string,
  content: string,
  parentCommentId?: string,
) =>
  api<A.RawComment | Comment>('POST', '/comments', {
    body: {
      target_type: 'POST',
      target_id: A.toApiId(targetId),
      content,
      ...(parentCommentId ? { parent_comment_id: A.toApiId(parentCommentId) } : {}),
    },
    mock: () => M.mockCreateComment(targetId, content, parentCommentId),
  }).then((result) => (isMock ? result as Comment : A.toComment(result as A.RawComment)));

/** PUT /comments/{commentId}. */
export async function updateComment(id: string, targetId: string, content: string): Promise<Comment> {
  const updated = await api<A.RawComment | Comment | undefined>('PUT', `/comments/${encodeURIComponent(id)}`, {
    body: { content },
    mock: () => M.mockUpdateComment(id, content),
  });
  if (isMock) return updated as Comment;
  if (updated && (updated as A.RawComment).comment_id !== undefined) return A.toComment(updated as A.RawComment);

  const comments = await getComments(targetId);
  const comment = comments.find((item) => item.id === id);
  if (!comment) throw new Error('Không tải lại được bình luận vừa sửa.');
  return comment;
}

/** DELETE /comments/{commentId}. */
export const deleteComment = (id: string) =>
  api<void>('DELETE', `/comments/${encodeURIComponent(id)}`, {
    mock: () => M.mockDeleteComment(id),
  });

/** POST /react. The backend decides whether repeated LIKE toggles or is idempotent. */
export const react = (
  postId: string,
  reactionType: ReactionType,
): Promise<{ myReaction: Post['myReaction']; likeCount: number }> =>
  api<
    { my_reaction?: string; reaction_counts?: { LIKE?: number | string }; total_count?: number | string }
    | { myReaction: Post['myReaction']; likeCount: number }
  >('POST', '/react', {
    body: {
      target_type: 'POST',
      target_id: A.toApiId(postId),
      reaction_type: reactionType,
    },
    mock: () => M.mockReact(postId, reactionType),
  }).then((result) => {
    if (isMock) return result as { myReaction: Post['myReaction']; likeCount: number };
    const data = result as { my_reaction?: string; reaction_counts?: { LIKE?: number | string }; total_count?: number | string };
    const count = Number(data.reaction_counts?.LIKE ?? data.total_count ?? 0);
    const current = data.my_reaction;
    const myReaction: Post['myReaction'] =
      current === 'LIKE' || current === 'LOVE' || current === 'WOW' ? current : 'NONE';
    return {
      myReaction,
      likeCount: Number.isFinite(count) ? count : 0,
    };
  });

/** GET /search — normalize grouped or typed-item search responses. */
export const search = (
  query: string,
  type: SearchType = 'ALL',
  after?: string,
  limit = 20,
) =>
  api<A.RawSearchResponse | SearchResults>('GET', '/search', {
    query: {
      query,
      type,
      after: after ? A.toApiId(after) : undefined,
      limit: pageSize(limit, 50),
    },
    mock: () => M.mockSearch(query, type, after, pageSize(limit, 50)),
  }).then((result) => (isMock ? result as SearchResults : A.toSearchResults(result as A.RawSearchResponse)));

/** POST /medias/upload — upload multipart data through the shared api() transport. */
export async function uploadMedia(asset: MediaAsset): Promise<MediaAsset> {
  if (asset.mediaType === 'image' && (asset.size ?? 0) > MAX_IMAGE_BYTES) {
    throw new Error('Ảnh tải lên vượt quá giới hạn 4 MB.');
  }
  if (asset.mimeType === 'image/gif') throw new Error('Ảnh động không được hỗ trợ.');
  if (!asset.mimeType.startsWith('image/') && !asset.mimeType.startsWith('video/')) {
    throw new Error('Tệp không hợp lệ. Chỉ hỗ trợ ảnh hoặc video.');
  }

  if (isMock) {
    return api<MediaAsset>('POST', '/medias/upload', {
      mock: () => M.mockUploadMedia(asset),
    });
  }

  let file: Blob;
  try {
    const localResponse = await fetch(asset.uri);
    if (!localResponse.ok) throw new Error('Không đọc được tệp đã chọn.');
    file = new Blob([await localResponse.blob()], { type: asset.mimeType });
  } catch (error) {
    throw new Error('Không thể đọc tệp media trên thiết bị.', { cause: error });
  }
  if (asset.mediaType === 'image' && file.size > MAX_IMAGE_BYTES) {
    throw new Error('Ảnh tải lên vượt quá giới hạn 4 MB.');
  }

  const body = new FormData();
  body.append('file', file, asset.name);
  body.append('purpose', 'POST');
  const uploaded = await api<A.RawUploadedMedia>('POST', '/medias/upload', {
    body,
    mock: () => ({
      object_key: `mock/${asset.name}`,
      url: asset.url ?? `https://example.invalid/mock/${encodeURIComponent(asset.name)}`,
      file_size: asset.size,
      content_type: asset.mimeType,
      media_type: asset.mediaType === 'video' ? 'VIDEO' : 'IMAGE',
      width: asset.width,
      height: asset.height,
      duration_seconds: asset.duration,
      name: asset.name,
      thumbnail_url: asset.thumbnailUrl,
    }),
  });
  const media = A.toMediaAsset(uploaded, asset);
  if (!media.url) throw new Error('Máy chủ tải lên không trả về URL media.');
  return media;
}

export const socialApi = {
  getFeed,
  getUserPosts,
  getVideoPosts,
  getPost,
  getSubjects,
  createPost,
  updatePost,
  deletePost,
  getComments,
  getCommentsPage,
  createComment,
  updateComment,
  deleteComment,
  react,
  search,
  uploadMedia,
};
