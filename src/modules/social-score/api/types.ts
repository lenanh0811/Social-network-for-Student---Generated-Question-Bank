<<<<<<< HEAD
import type { User } from '@/types';

export type MediaType = 'image' | 'video';
export type PostType = 'SOCIAL_POST' | 'LEARNING_VIDEO' | 'QUESTION_APPROVED_NOTIFICATION';
export type SearchType = 'ALL' | 'POST' | 'USER' | 'QUESTION';
export type ReactionType = 'LIKE' | 'LOVE' | 'WOW';
=======
export type MediaType = 'image' | 'video';
export type PostType = 'SOCIAL_POST' | 'LEARNING_VIDEO' | 'QUESTION_APPROVED_NOTIFICATION';
>>>>>>> fed398ac514d13c30ab4eca5ecc037814267bb1f

export interface MediaAsset {
  uri: string;
  name: string;
  mimeType: string;
  mediaType: MediaType;
  size?: number;
  url?: string;
<<<<<<< HEAD
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
=======
  /** object_key server trả về khi tải lên. */
  key?: string;
}

export interface SocialUser {
  id: string;
  name: string;
  avatarUrl?: string;
>>>>>>> fed398ac514d13c30ab4eca5ecc037814267bb1f
}

export interface Post {
  id: string;
  content: string;
  author: SocialUser;
  createdAt: string;
  mediaUrls: string[];
<<<<<<< HEAD
  visibility?: 'PUBLIC' | 'ONLY_ME' | 'FRIENDS';
  postType?: PostType;
  subjectId?: string;
  subjectName?: string;
  subjectCode?: string;
  sessionId?: string;
=======
  postType?: PostType;
>>>>>>> fed398ac514d13c30ab4eca5ecc037814267bb1f
  isEdited?: boolean;
  isOwner?: boolean;
  reactionCount: number;
  commentCount: number;
<<<<<<< HEAD
  myReaction: ReactionType | 'NONE';
=======
  myReaction: 'LIKE' | 'NONE';
>>>>>>> fed398ac514d13c30ab4eca5ecc037814267bb1f
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
<<<<<<< HEAD
  replies?: (Comment | string)[];
}

export interface SearchQuestion {
  id: string;
  subjectName: string;
  content: string;
  difficulty?: string;
=======
  replies?: Comment[];
>>>>>>> fed398ac514d13c30ab4eca5ecc037814267bb1f
}

export interface FeedPage {
  posts: Post[];
  after?: string;
  hasNext: boolean;
}
<<<<<<< HEAD

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
=======
>>>>>>> fed398ac514d13c30ab4eca5ecc037814267bb1f
