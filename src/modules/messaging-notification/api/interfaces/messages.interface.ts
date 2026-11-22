import type {
  Id,
  MessageType,
  WsReaction,
  WsReadBy,
} from "@/modules/messaging-notification/api/realtime/stomp.types";

export type DeleteMessageScope = "me" | "everyone";
export type DeleteMessageResult = { messageId: Id; scope: DeleteMessageScope; note?: string };
export type Pagination = {
  before?: Id;
  after?: Id;
  hasPrev?: boolean;
  hasNext: boolean;
};
export type Conversation = {
  conversationId: Id;
  type: "direct" | "group";
  displayName: string;
  displayAvatarUrl?: string | null;
  memberCount?: number;
  lastMessage: {
    messageId?: Id;
    id?: Id;
    content: string;
    messageType?: MessageType;
    createdAt?: string;
  } | null;
  unreadCount: number;
  hiddenAt?: string | null;
  updatedAt?: string;
  muted?: boolean;
};
export type GetConversationsData = {
  items: Conversation[];
  pagination: Pagination;
  totalConversations?: number;
};
export type ConversationMessage = {
  messageId: Id;
  conversationId?: Id;
  senderId: Id;
  senderName?: string;
  avatarUrl?: string | null;
  frameUrl?: string | null;
  content: string;
  messageType: MessageType;
  createdAt: string;
  mediaUrls: string[];
  repliedMessageId?: Id | null;
  replyToMessageId?: Id | null;
  isEdited?: boolean;
  edited?: boolean;
  hidden?: boolean;
  revoked?: boolean;
  reactions?: WsReaction[];
  readBy?: WsReadBy[];
};
export type GetConversationMessagesData = {
  conversationId: Id;
  conversationType: "direct" | "group";
  messages: ConversationMessage[];
  pagination: Pagination;
};
