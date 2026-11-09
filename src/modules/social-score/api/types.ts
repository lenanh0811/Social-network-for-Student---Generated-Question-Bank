import type { User } from '@/types';

export type MediaType = 'image' | 'video';
export type PostType = 'SOCIAL_POST' | 'LEARNING_VIDEO' | 'QUESTION_APPROVED_NOTIFICATION';
export type SearchType = 'ALL' | 'POST' | 'USER' | 'QUESTION';
export type ReactionType = 'LIKE' | 'LOVE' | 'WOW';

export interface MediaAsset {
  uri: string;
  name: string;
  mimeType: string;
  mediaType: MediaType;
  size?: number;
  url?: string;
  key?: string;
  width?: number;
  height?: number;
  duration?: number;
  thumbnailUrl?: string;
}

export interface Subject {
  id: string;
  code: string;
  name: string;
}

export interface SocialUser extends Pick<User, 'id' | 'name'> {
  avatarUrl?: string;
  frameUrl?: string;
}

export interface Post {
  id: string;
  content: string;
  author: SocialUser;
  createdAt: string;
  mediaUrls: string[];
  visibility?: 'PUBLIC' | 'ONLY_ME' | 'FRIENDS';
  postType?: PostType;
  subjectId?: string;
  subjectName?: string;
  subjectCode?: string;
  sessionId?: string;
  isEdited?: boolean;
  isOwner?: boolean;
  reactionCount: number;
  commentCount: number;
  myReaction: ReactionType | 'NONE';
}

export interface Comment {
  id: string;
  targetId: string;
  content: string;
  author: SocialUser;
  createdAt: string;
  parentCommentId?: string;
  isHidden?: boolean;
  isOwner?: boolean;
  replies?: (Comment | string)[];
}

export interface SearchQuestion {
  id: string;
  subjectName: string;
  content: string;
  difficulty?: string;
}

export interface FeedPage {
  posts: Post[];
  after?: string;
  hasNext: boolean;
}

export interface CommentPage {
  comments: Comment[];
  after?: string;
  hasNext: boolean;
}

export interface SearchResults {
  posts: Post[];
  users: SocialUser[];
  questions: SearchQuestion[];
  after?: string;
  hasNext: boolean;
}
