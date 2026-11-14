import type { comment, media_asset, post, search_results, search_type, subject } from './types';

const currentUser = { id: '1', name: 'Nguyễn Minh Anh' };
let nextPostId = 4;
let nextCommentId = 4;

export const MOCK_SUBJECTS: subject[] = [
  { id: '1', code: 'IT4409', name: 'Công nghệ Web' },
  { id: '2', code: 'IT3090', name: 'Cơ sở dữ liệu' },
  { id: '3', code: 'IT3080', name: 'Mạng máy tính' },
];

export const MOCK_POSTS: post[] = [
  {
    id: '1',
    content: 'Chào mọi người! Cùng chia sẻ tài liệu và kinh nghiệm học tập nhé.',
    author: currentUser,
    createdAt: '2026-11-04T08:30:00.000Z',
    mediaUrls: [],
    visibility: 'PUBLIC',
    postType: 'SOCIAL_POST',
    reactionCount: 8,
    commentCount: 1,
    myReaction: 'NONE',
  },
  {
    id: '2',
    content: 'Mình vừa tổng hợp một số ghi chú về HTTP và REST API.',
    author: { id: '2', name: 'Trần Quang Huy' },
    createdAt: '2026-11-03T14:00:00.000Z',
    mediaUrls: [],
    visibility: 'PUBLIC',
    postType: 'SOCIAL_POST',
    reactionCount: 3,
    commentCount: 0,
    myReaction: 'LIKE',
  },
  {
    id: '3',
    content: 'Video ôn tập các khái niệm cơ bản của môn học.',
    author: { id: '3', name: 'Lê Thu Hà' },
    createdAt: '2026-11-02T09:00:00.000Z',
    mediaUrls: [],
    visibility: 'PUBLIC',
    postType: 'LEARNING_VIDEO',
    reactionCount: 12,
    commentCount: 2,
    myReaction: 'NONE',
  },
];

export const MOCK_COMMENTS: comment[] = [
  {
    id: '1',
    targetId: '1',
    content: 'Cảm ơn bạn đã chia sẻ!',
    author: { id: '2', name: 'Trần Quang Huy' },
    createdAt: '2026-11-04T09:00:00.000Z',
    isOwner: false,
    replies: [],
  },
];

export function mockFeed(after?: string, limit = 10) {
  const start = after ? Math.max(0, MOCK_POSTS.findIndex((post) => post.id === after) + 1) : 0;
  const posts = MOCK_POSTS.slice(start, start + limit);
  const hasNext = start + posts.length < MOCK_POSTS.length;
  return { posts, after: hasNext ? posts[posts.length - 1]?.id : undefined, hasNext };
}

export function mockUserPosts(userId: string, after?: string, limit = 10) {
  const posts = MOCK_POSTS.filter((post) => post.author.id === userId);
  const start = after ? Math.max(0, posts.findIndex((post) => post.id === after) + 1) : 0;
  const items = posts.slice(start, start + limit);
  const hasNext = start + items.length < posts.length;
  return { posts: items, after: hasNext ? items[items.length - 1]?.id : undefined, hasNext };
}

export function mockVideoPosts(subjectId?: string, after?: string, limit = 2) {
  void subjectId;
  const posts = MOCK_POSTS.filter((post) => post.postType === 'LEARNING_VIDEO');
  const start = after ? Math.max(0, posts.findIndex((post) => post.id === after) + 1) : 0;
  const items = posts.slice(start, start + limit);
  const hasNext = start + items.length < posts.length;
  return { posts: items, after: hasNext ? items[items.length - 1]?.id : undefined, hasNext };
}

export function mockGetPost(id: string) {
  const post = MOCK_POSTS.find((item) => item.id === id);
  if (!post) throw new Error('Không tìm thấy bài viết.');
  return post;
}

export function mockSubjects() {
  return MOCK_SUBJECTS;
}

export function mockCreatePost(input: {
  content: string;
  media: media_asset[];
  subjectId: string;
  postType: post['postType'];
}) {
  const subject = MOCK_SUBJECTS.find((item) => item.id === input.subjectId);
  const post: post = {
    id: String(nextPostId++),
    content: input.content,
    author: currentUser,
    createdAt: new Date().toISOString(),
    mediaUrls: input.media.flatMap((asset) => asset.url ? [asset.url] : []),
    visibility: 'PUBLIC',
    postType: input.postType,
    subjectId: input.subjectId,
    subjectName: subject?.name,
    subjectCode: subject?.code,
    reactionCount: 0,
    commentCount: 0,
    myReaction: 'NONE',
  };
  MOCK_POSTS.unshift(post);
  return post;
}

export function mockUpdatePost(id: string, patch: { content?: string; mediaUrls?: string[] }) {
  const post = mockGetPost(id);
  if (patch.content !== undefined) post.content = patch.content;
  if (patch.mediaUrls !== undefined) post.mediaUrls = [...patch.mediaUrls];
  post.isEdited = true;
  return post;
}

export function mockDeletePost(id: string) {
  const index = MOCK_POSTS.findIndex((post) => post.id === id);
  if (index >= 0) MOCK_POSTS.splice(index, 1);
}

export function mockComments(targetId: string, after?: string, limit = 20) {
  const comments = MOCK_COMMENTS.filter((comment) => comment.targetId === targetId);
  const start = after ? Math.max(0, comments.findIndex((comment) => comment.id === after) + 1) : 0;
  const items = comments.slice(start, start + limit);
  const hasNext = start + items.length < comments.length;
  return { comments: items, after: hasNext ? items[items.length - 1]?.id : undefined, hasNext };
}

export function mockCreateComment(targetId: string, content: string, parentCommentId?: string) {
  const comment: comment = {
    id: String(nextCommentId++),
    targetId,
    content,
    author: currentUser,
    createdAt: new Date().toISOString(),
    parentCommentId,
    isOwner: true,
    replies: [],
  };
  MOCK_COMMENTS.push(comment);
  const post = MOCK_POSTS.find((item) => item.id === targetId);
  if (post) post.commentCount += 1;
  return comment;
}

export function mockUpdateComment(id: string, content: string) {
  const comment = MOCK_COMMENTS.find((item) => item.id === id);
  if (!comment) throw new Error('Không tìm thấy bình luận.');
  comment.content = content;
  return comment;
}

export function mockDeleteComment(id: string) {
  const index = MOCK_COMMENTS.findIndex((comment) => comment.id === id);
  if (index < 0) return;
  const [comment] = MOCK_COMMENTS.splice(index, 1);
  const post = MOCK_POSTS.find((item) => item.id === comment.targetId);
  if (post) post.commentCount = Math.max(0, post.commentCount - 1);
}

export function mockReact(postId: string, reactionType: post['myReaction']) {
  const post = mockGetPost(postId);
  const next = post.myReaction === reactionType ? 'NONE' : reactionType;
  if (post.myReaction === 'NONE' && next !== 'NONE') post.reactionCount += 1;
  else if (post.myReaction !== 'NONE' && next === 'NONE') post.reactionCount = Math.max(0, post.reactionCount - 1);
  post.myReaction = next;
  return { myReaction: post.myReaction, likeCount: post.reactionCount };
}

export function mockSearch(query: string, type: search_type, after?: string, limit = 20) {
  const term = query.toLocaleLowerCase();
  const posts = type === 'USER' || type === 'QUESTION'
    ? []
    : MOCK_POSTS.filter((post) => post.content.toLocaleLowerCase().includes(term));
  const users = type === 'POST' || type === 'QUESTION'
    ? []
    : [...new Map(MOCK_POSTS.map((post) => [post.author.id, post.author])).values()]
      .filter((user) => user.name.toLocaleLowerCase().includes(term));
  const questions: search_results['questions'] = [];
  const all = [...posts.map((post) => ({ kind: 'post' as const, item: post })), ...users.map((user) => ({ kind: 'user' as const, item: user }))];
  const start = after ? Math.max(0, all.findIndex((entry) => entry.item.id === after) + 1) : 0;
  const items = all.slice(start, start + limit);
  const pagedPosts = items.flatMap((entry) => entry.kind === 'post' ? [entry.item] : []);
  const pagedUsers = items.flatMap((entry) => entry.kind === 'user' ? [entry.item] : []);
  const hasNext = start + items.length < all.length;
  return { posts: pagedPosts, users: pagedUsers, questions, after: hasNext ? items[items.length - 1]?.item.id : undefined, hasNext };
}

export function mockUploadMedia(asset: media_asset): media_asset {
  return {
    ...asset,
    key: `mock/${asset.name}`,
    url: `https://example.invalid/mock/${encodeURIComponent(asset.name)}`,
  };
}
