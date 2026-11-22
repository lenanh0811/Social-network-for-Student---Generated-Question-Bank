import { fromApi } from '../adapters';
/** Backend Long hiện được biểu diễn bằng number; đổi một chỗ nếu API chuyển sang string. */
export type Id = number;
export type AccessTokenProvider = () => string | null | Promise<string | null>;
export type MessageType = "text" | "image" | "video" | "gif";
export type WsUserInfo = {
  userId: Id;
  fullName: string;
  avatarUrl?: string | null;
  frameUrl?: string | null;
};
export type SendWsMessageRequest = {
  conversationId: Id;
  content: string;
  messageType: MessageType;
  mediaUrls: string[];
  replyToMessageId: Id | null;
};
export type ReadWsMessageRequest = { conversationId: Id; messageId: Id };
export type TypingWsRequest = { conversationId: Id; typing: boolean };
export type WsReaction = { emoji: string; count: number; userIds: Id[] };
export type WsReadBy = { userId: Id; readAt: string };
export type WsNewMessageEvent = {
  eventType: "new-message";
  messageId: Id;
  conversationId: Id;
  conversationType: "direct" | "group";
  sender: WsUserInfo;
  content: string;
  messageType: MessageType;
  mediaUrls: string[];
  replyToMessageId: Id | null;
  createdAt: string;
  isEdited: boolean;
  reactions: WsReaction[];
  readBy: WsReadBy[];
};
type WsNewMessagePayload = WsNewMessageEvent | Record<string, unknown>;
export type WsMessageReadEvent = {
  eventType: "message-read";
  conversationId: Id;
  messageId: Id;
  reader: WsUserInfo;
  readAt: string;
};
export type WsTypingBroadcast = {
  eventType: "typing-status";
  conversationId: Id;
  userId: Id;
  fullName: string;
  avatarUrl?: string | null;
  frameUrl?: string | null;
  isTyping: boolean;
  timestamp: string;
};
type WsTypingBroadcastRaw = {
  eventType: "typing-status";
  conversationId: Id;
  timestamp: string;
  typing: boolean;
  user: WsUserInfo;
};

export const isWsNewMessageEvent = (
  value: unknown,
): value is WsNewMessagePayload => {
  if (!value || typeof value !== "object") return false;
  const raw = unwrapMessagePayload(value as Record<string, unknown>);
  const event = raw as Partial<WsNewMessageEvent> & Record<string, unknown>;
  const sender = event.sender ?? event.user ?? event.senderId ?? event.userId;
  return (
    isNumericId(event.messageId ?? event.id) &&
    isNumericId(event.conversationId) &&
    (isNumericId(sender) ||
      (sender !== null && typeof sender === "object" &&
        isNumericId((sender as Record<string, unknown>).userId))) &&
    (typeof event.content === "string" || typeof event.text === "string")
  );
};

const isNumericId = (value: unknown) =>
  (typeof value === "number" ||
    (typeof value === "string" && /^\d+$/.test(value))) &&
  Number.isSafeInteger(Number(value)) && Number(value) > 0;

const unwrapMessagePayload = (value: Record<string, unknown>) => {
  const candidate = value.data ?? value.message ?? value.payload;
  return candidate && typeof candidate === "object"
    ? (candidate as Record<string, unknown>)
    : value;
};

export const normalizeWsNewMessageEvent = (
  value: WsNewMessagePayload,
): WsNewMessageEvent => {
  const event = unwrapMessagePayload(
    value as Record<string, unknown>,
  ) as Partial<WsNewMessageEvent> & Record<string, unknown>;
  const sender = toWsUserInfo(event);
  return {
    ...event,
    eventType: "new-message",
    messageId: Number(event.messageId ?? event.id),
    conversationId: Number(event.conversationId),
    conversationType: event.conversationType ?? "direct",
    sender,
    content: event.content ?? event.text ?? "",
    messageType: event.messageType ?? "text",
    createdAt: event.createdAt ?? new Date().toISOString(),
    mediaUrls: Array.isArray(event.mediaUrls) ? event.mediaUrls : [],
    replyToMessageId: event.replyToMessageId ?? null,
    isEdited: event.isEdited ?? false,
    reactions: event.reactions ?? [],
    readBy: event.readBy ?? [],
  } as WsNewMessageEvent;
};

const toWsUserInfo = (event: Record<string, unknown>): WsUserInfo => {
  const nested = event.sender ?? event.user;
  if (nested && typeof nested === "object") {
    const user = nested as WsUserInfo;
    return { ...user, userId: Number(user.userId) };
  }
  return {
    userId: Number(event.senderId ?? event.userId),
    fullName: String(event.senderName ?? event.fullName ?? "Người dùng"),
    avatarUrl: (event.avatarUrl as string | null | undefined) ?? null,
    frameUrl: (event.frameUrl as string | null | undefined) ?? null,
  };
};

export const isWsMessageReadEvent = (
  value: unknown,
): value is WsMessageReadEvent => {
  if (!value || typeof value !== "object") return false;
  const event = value as Partial<WsMessageReadEvent>;
  return (
    event.eventType === "message-read" &&
    typeof event.messageId === "number" &&
    typeof event.conversationId === "number" &&
    typeof event.reader === "object" &&
    event.reader !== null
  );
};

export const isWsTypingBroadcast = (
  value: unknown,
): value is WsTypingBroadcast | WsTypingBroadcastRaw => {
  if (!value || typeof value !== "object") return false;
  const event = value as Partial<WsTypingBroadcast & WsTypingBroadcastRaw>;
  return (
    event.eventType === "typing-status" &&
    typeof event.conversationId === "number" &&
    typeof event.timestamp === "string" &&
    (typeof event.isTyping === "boolean" ||
      (typeof event.typing === "boolean" &&
        typeof event.user === "object" &&
        event.user !== null))
  );
};

export const normalizeWsTypingBroadcast = (
  value: WsTypingBroadcast | WsTypingBroadcastRaw,
): WsTypingBroadcast => {
  if ("isTyping" in value) return value;
  return {
    eventType: value.eventType,
    conversationId: value.conversationId,
    userId: value.user.userId,
    fullName: value.user.fullName,
    avatarUrl: value.user.avatarUrl,
    frameUrl: value.user.frameUrl,
    isTyping: value.typing,
    timestamp: value.timestamp,
  };
};

export const parseWsPayload = (body: string): unknown => {
  try {
    return fromApi<unknown>(JSON.parse(body));
  } catch {
    return null;
  }
};
