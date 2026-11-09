export type MediaType = 'image' | 'video';
export type PostType = 'SOCIAL_POST' | 'LEARNING_VIDEO' | 'QUESTION_APPROVED_NOTIFICATION';
export type SearchType = 'ALL' | 'POST' | 'USER' | 'QUESTION';

export interface MediaAsset {
  uri: string;
  name: string;
  mimeType: string;
  mediaType: MediaType;
  size?: number;
  url?: string;
  /** object_key server trả về khi tải lên. */
  key?: string;
}

export interface SocialUser {
  id: string;
  name: string;
  avatarUrl?: string;
}

export interface Post {
  id: string;
  content: string;
  author: SocialUser;
  createdAt: string;
  mediaUrls: string[];
  postType?: PostType;
  isEdited?: boolean;
  isOwner?: boolean;
  reactionCount: number;
  commentCount: number;
  myReaction: 'LIKE' | 'NONE';
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
  replies?: Comment[];
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

export interface SearchResults {
  posts: Post[];
  users: SocialUser[];
  questions: SearchQuestion[];
  after?: string;
  hasNext: boolean;
}
