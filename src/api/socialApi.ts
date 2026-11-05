import type {
  Comment,
  FeedPage,
  MediaAsset,
  Post,
  PostType,
  SearchResults,
  SearchType,
  SocialUser,
} from '../types/social';

const API_ORIGIN = (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000').replace(/\/+$/, '');
const API_BASE_URL = API_ORIGIN.endsWith('/api/v1') ? API_ORIGIN : `${API_ORIGIN}/api/v1`;
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const SUCCESS_CODES = new Set(['0000', '1000', 'SUCCESS']);

type TokenProvider = () => Promise<string | null>;
let tokenProvider: TokenProvider = async () => null;

export function configureSocialApiAuth(provider: TokenProvider) {
  tokenProvider = provider;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    const token = await tokenProvider();
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        Accept: 'application/json',
        ...(init?.body !== undefined && !(init.body instanceof FormData)
          ? { 'Content-Type': 'application/json' }
          : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(init?.headers ?? {}),
      },
    });
  } catch (error) {
    throw new Error(
      `Không thể kết nối máy chủ API (${API_BASE_URL}). Kiểm tra EXPO_PUBLIC_API_URL và phiên đăng nhập.`,
      { cause: error },
    );
  }

  const text = response.status === 204 ? '' : await response.text();
  let payload: unknown;
  try {
    payload = text ? JSON.parse(text) : undefined;
  } catch {
    if (!response.ok) throw new ApiError(text.slice(0, 250) || `Yêu cầu thất bại (${response.status}).`, response.status);
    throw new Error('Máy chủ trả về JSON không hợp lệ.');
  }

  if (!response.ok) {
    const failure = asRecord(payload);
    throw new ApiError(
      String(failure.message ?? failure.error ?? `Yêu cầu thất bại (${response.status}).`),
      response.status,
      failure.code === undefined ? undefined : String(failure.code),
    );
  }

  const envelope = asRecord(payload);
  if (envelope.code !== undefined && !SUCCESS_CODES.has(String(envelope.code))) {
    throw new ApiError(
      String(envelope.message ?? 'Yêu cầu không thành công.'),
      response.status,
      String(envelope.code),
    );
  }
  if (response.status === 204 || payload === undefined) return undefined as T;
  return (envelope.data ?? payload) as T;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
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

function mapUser(value: unknown, fallbackName = 'Người dùng'): SocialUser {
  const user = asRecord(value);
  return {
    id: String(user.id ?? ''),
    name: String(user.full_name ?? user.name ?? fallbackName),
    avatarUrl: typeof user.avatar_url === 'string' ? user.avatar_url : typeof user.avatarUrl === 'string' ? user.avatarUrl : undefined,
  };
}

function getMediaUrls(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((url): url is string => typeof url === 'string');
  if (typeof value === 'string' && value.length > 0) return [value];
  return [];
}

function mapPost(value: unknown, actor?: unknown): Post {
  const post = asRecord(value);
  const myReaction = String(post.my_reaction ?? (asBoolean(post.reacted_by_me) ? 'LIKE' : 'NONE'));
  const reactionCounts = asRecord(post.reaction_counts);
  return {
    id: String(post.post_id ?? post.id ?? ''),
    content: String(post.content ?? post.text ?? ''),
    author: mapUser(post.author ?? actor),
    createdAt: String(post.created_at ?? post.createdAt ?? ''),
    mediaUrls: getMediaUrls(post.media_urls ?? post.mediaUrls ?? post.media_url),
    postType: post.post_type as PostType | undefined,
    isEdited: asBoolean(post.is_edited),
    isOwner: post.is_owner === undefined ? undefined : asBoolean(post.is_owner),
    reactionCount: asNumber(reactionCounts.LIKE ?? post.react_count ?? post.like_count),
    commentCount: asNumber(post.comment_count),
    myReaction: myReaction === 'LIKE' ? 'LIKE' : 'NONE',
  };
}

function mapComment(value: unknown): Comment {
  const comment = asRecord(value);
  const replies = asList(comment.replies).map(mapComment);
  return {
    id: String(comment.comment_id ?? comment.id ?? ''),
    targetId: String(comment.target_id ?? comment.targetId ?? ''),
    content: String(comment.content ?? ''),
    author: mapUser(comment.author, comment.hidden === 'true' ? 'Bình luận đã ẩn' : 'Người dùng'),
    createdAt: String(comment.created_at ?? ''),
    parentCommentId: typeof comment.parent_comment_id === 'string' ? comment.parent_comment_id : undefined,
    isHidden: asBoolean(comment.hidden),
    isOwner: comment.is_owner === undefined ? undefined : asBoolean(comment.is_owner),
    replies,
  };
}

function parsePage(value: unknown) {
  const pagination = asRecord(asRecord(value).pagination);
  return {
    after: typeof pagination.after === 'string' ? pagination.after : undefined,
    hasNext: asBoolean(pagination.has_next),
  };
}

function toQuery(values: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined) params.set(key, value);
  }
  return `?${params.toString()}`;
}

function postFromActivity(value: unknown): Post | null {
  const item = asRecord(value);
  if (item.target_type !== 'POST') return null;
  const content = asRecord(item.content);
  return mapPost(
    {
      ...content,
      post_id: content.post_id ?? item.target_id,
      content: content.text ?? content.content,
      react_count: content.like_count ?? content.react_count,
      comment_count: content.comment_count,
    },
    item.actor,
  );
}

export const socialApi = {
  async getFeed(after?: string, limit = 20): Promise<FeedPage> {
    const data = await request<unknown>(`/activity-feeds${toQuery({ after, limit: String(limit) })}`);
    const record = asRecord(data);
    const page = parsePage(data);
    return {
      posts: asList(record.items).map(postFromActivity).filter((post): post is Post => post !== null),
      ...page,
    };
  },

  async getPost(id: string): Promise<Post> {
    return mapPost(await request<unknown>(`/posts/${encodeURIComponent(id)}`));
  },

  async createPost(input: {
    content: string;
    mediaUrls: string[];
    subjectId: string;
    postType: PostType;
  }): Promise<Post> {
    return mapPost(
      await request<unknown>('/posts', {
        method: 'POST',
        body: JSON.stringify({
          content: input.content,
          media_urls: input.mediaUrls,
          subject_id: input.subjectId,
          post_type: input.postType,
        }),
      }),
    );
  },

  async updatePost(
    id: string,
    input: { content?: string; mediaUrls?: string[] },
  ): Promise<Post> {
    const body: Record<string, unknown> = {};
    if (input.content !== undefined) body.content = input.content;
    if (input.mediaUrls !== undefined) body.media_urls = input.mediaUrls;
    await request<unknown>(`/posts/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
    return socialApi.getPost(id);
  },

  async deletePost(id: string): Promise<void> {
    await request<unknown>(`/posts/${encodeURIComponent(id)}`, { method: 'DELETE' });
  },

  async getComments(targetId: string, after?: string, limit = 20): Promise<Comment[]> {
    const query = toQuery({ target_type: 'POST', target_id: targetId, after, limit: String(limit) });
    const data = await request<unknown>(`/comments${query}`);
    return asList(asRecord(data).items).map(mapComment);
  },

  async createComment(targetId: string, content: string, parentCommentId?: string): Promise<Comment> {
    return mapComment(
      await request<unknown>('/comments', {
        method: 'POST',
        body: JSON.stringify({
          target_type: 'POST',
          target_id: targetId,
          content,
          ...(parentCommentId ? { parent_comment_id: parentCommentId } : {}),
        }),
      }),
    );
  },

  async updateComment(id: string, targetId: string, content: string): Promise<Comment> {
    const updated = await request<unknown>(`/comments/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify({ content }),
    });
    if (updated) {
      const mapped = mapComment(updated);
      if (mapped.author.id) return mapped;
    }
    const comments = await socialApi.getComments(targetId);
    const comment = comments.find((item) => item.id === id);
    if (!comment) throw new Error('Không tải lại được bình luận vừa sửa.');
    return comment;
  },

  async deleteComment(id: string): Promise<void> {
    await request<unknown>(`/comments/${encodeURIComponent(id)}`, { method: 'DELETE' });
  },

  async react(postId: string, reactionType: 'LIKE' | 'NONE'): Promise<{ myReaction: 'LIKE' | 'NONE'; likeCount: number }> {
    const data = await request<unknown>('/react', {
      method: 'POST',
      body: JSON.stringify({ target_type: 'POST', target_id: postId, reaction_type: reactionType }),
    });
    const record = asRecord(data);
    const counts = asRecord(record.reaction_counts);
    return {
      myReaction: record.my_reaction === 'LIKE' ? 'LIKE' : reactionType,
      likeCount: asNumber(counts.LIKE ?? record.react_count),
    };
  },

  async search(query: string, type: SearchType = 'ALL', after?: string, limit = 20): Promise<SearchResults> {
    const data = await request<unknown>(
      `/search${toQuery({ query, type, after, limit: String(limit) })}`,
    );
    const record = asRecord(data);
    const results = asRecord(record.results);
    const page = parsePage(record);
    return {
      posts: asList(results.posts).map(mapPost),
      users: asList(results.users).map((user) => mapUser(user)),
      questions: asList(results.questions).map((value) => {
        const question = asRecord(value);
        return {
          id: String(question.id ?? ''),
          subjectName: String(question.subject_name ?? ''),
          content: String(question.content ?? ''),
          difficulty: typeof question.difficulty === 'string' ? question.difficulty : undefined,
        };
      }),
      ...page,
    };
  },

  async uploadMedia(asset: MediaAsset): Promise<MediaAsset> {
    if (asset.mediaType === 'image' && (asset.size ?? 0) > MAX_IMAGE_BYTES) {
      throw new Error('Ảnh tải lên vượt quá giới hạn 4 MB.');
    }
    if (asset.mimeType === 'image/gif') {
      throw new Error('Ảnh động không được hỗ trợ.');
    }
    if (!asset.mimeType.startsWith('image/') && !asset.mimeType.startsWith('video/')) {
      throw new Error('Tệp không hợp lệ. Chỉ hỗ trợ ảnh hoặc video.');
    }

    let file: Blob;
    try {
      const localResponse = await fetch(asset.uri);
      if (!localResponse.ok) throw new Error('Không đọc được tệp đã chọn.');
      const localFile = await localResponse.blob();
      file = new Blob([localFile], { type: asset.mimeType });
    } catch (error) {
      throw new Error('Không thể đọc tệp media trên thiết bị.', { cause: error });
    }
    if (asset.mediaType === 'image' && file.size > MAX_IMAGE_BYTES) {
      throw new Error('Ảnh tải lên vượt quá giới hạn 4 MB.');
    }

    const formData = new FormData();
    formData.append('file', file, asset.name);
    formData.append('purpose', 'POST');
    const uploaded = asRecord(
      await request<unknown>('/medias/upload', {
        method: 'POST',
        body: formData,
      }),
    );
    if (typeof uploaded.url !== 'string') throw new Error('Máy chủ tải lên không trả về URL media.');
    return { ...asset, url: uploaded.url };
  },
};
