export type ConversationItemData = {
  id: string;
  name: string;
  avatarUrl?: string | null;
  lastMessage?: string;
  time?: string;
  unreadCount?: number;
};

export type MessageItemData = {
  id: string;
  content: string;
  mine: boolean;
  time?: string;
};
