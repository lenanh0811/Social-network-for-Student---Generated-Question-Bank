export type media_type = 'image' | 'video';
export type post_type = 'SOCIAL_POST' | 'LEARNING_VIDEO' | 'QUESTION_APPROVED_NOTIFICATION';
export type reaction_type = 'LIKE' | 'LOVE' | 'WOW' | 'NONE';
export type target_type = 'POST' | 'COMMENT' | 'QUESTION';
export type search_type = 'ALL' | 'POST' | 'USER' | 'QUESTION';
export type visibility_type = 'PUBLIC' | 'ONLY_ME' | 'FRIENDS';

export interface media_asset {
  uri: string;
  name: string;
  mimeType: string;
  mediaType: media_type;
  size?: number;
  url?: string;
  key?: string;
  width?: number;
  height?: number;
  duration?: number;
  thumbnailUrl?: string;
}

export interface social_user {
  id: string;
  name: string;
  avatarUrl?: string;
  frameUrl?: string;
}

export interface post {
  id: string;
  content: string;
  author: social_user;
  createdAt: string;
  mediaUrls: string[];
  visibility?: visibility_type;
  postType?: post_type;
  subjectId?: string;
  subjectName?: string;
  subjectCode?: string;
  sessionId?: string;
  isEdited?: boolean;
  isOwner?: boolean;
  reactionCount: number;
  commentCount: number;
  myReaction: reaction_type;
}

export interface comment {
  id: string;
  targetId: string;
  content: string;
  author: social_user;
  createdAt: string;
  parentCommentId?: string;
  isHidden?: boolean;
  isOwner?: boolean;
  replies?: comment[];
}

export interface feed_page {
  posts: post[];
  after?: string;
  hasNext: boolean;
}

export interface comment_page {
  comments: comment[];
  after?: string;
  hasNext: boolean;
}

export interface search_question {
  id: string;
  subjectName: string;
  content: string;
  difficulty?: string;
}

export interface search_results {
  posts: post[];
  users: social_user[];
  questions: search_question[];
  after?: string;
  hasNext: boolean;
}

export interface subject {
  id: string;
  code: string;
  name: string;
}

export interface saved_search {
  id: string;
  query: string;
  createdAt?: string;
}

export interface saved_searches {
  recent: saved_search[];
  trending: string[];
}

export interface feed_count {
  count: number;
}

export interface reaction_result {
  myReaction: reaction_type;
  counts: Partial<Record<reaction_type, number>>;
  totalCount: number;
}

export interface media_presign_request {
  files: {
    file_name: string;
    content_type: string;
    file_size: number;
    purpose: string;
  }[];
}

export interface media_presign_item {
  object_key: string;
  upload_url: string;
  public_url?: string;
  headers?: Record<string, string>;
}

export interface media_verify_request {
  object_keys: string[];
}

export interface raw_media_item {
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

export interface raw_author {
  user_id?: number | string;
  id?: number | string;
  full_name?: string;
  avatar_url?: string;
  frame_url?: string;
}

export interface raw_post {
  post_id: number | string;
  content: string;
  media_urls?: (raw_media_item | string)[];
  visibility?: string;
  post_type?: string;
  subject_id?: number | string;
  subject_name?: string;
  subject_code?: string;
  session_id?: number | string;
  author?: raw_author;
  react_count?: number;
  reaction_counts?: Record<string, number>;
  comment_count?: number;
  reacted_by_me?: boolean;
  my_reaction?: string;
  is_edited?: boolean;
  is_owner?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface raw_comment {
  comment_id: number | string;
  target_id: number | string;
  content?: string | null;
  author?: raw_author | null;
  created_at?: string;
  parent_comment_id?: number | string | null;
  deleted?: boolean;
  hidden?: boolean;
  is_owner?: boolean;
  replies?: (raw_comment | string)[];
}

export interface raw_cursor_page<T> {
  items?: T[];
  pagination?: {
    after?: number | string | null;
    has_next?: boolean | string;
  };
}

export interface raw_search_item {
  type?: string;
  post?: raw_post;
  user?: Record<string, unknown>;
  question?: Record<string, unknown>;
}

export interface raw_search_response {
  items?: raw_search_item[];
  results?: {
    posts?: raw_post[];
    users?: Record<string, unknown>[];
    questions?: Record<string, unknown>[];
  };
  pagination?: raw_cursor_page<unknown>['pagination'];
}

export interface raw_uploaded_media {
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

export interface raw_subject {
  subject_id: number | string;
  code: string;
  name: string;
}

export interface raw_saved_search {
  id?: number | string;
  search_id?: number | string;
  query?: string;
  keyword?: string;
  created_at?: string;
}
