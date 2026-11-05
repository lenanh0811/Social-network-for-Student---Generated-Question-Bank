/**
 * SQB HUST - STOMP Types
 */

// ==================== COMMON TYPES ====================
export type MessageType = "TEXT" | "IMAGE" | "FILE";
export type StompIdentifier = string | number;
// ==================== USER ====================
export interface WsUserInfo {
  user_id: string;
  full_name: string;
  avatar_url: string;
  frame_url: string;
}
// ==================== MESSAGE REQUEST ====================
/**
 * SEND /app/chat.send
 */
export interface SendWsMessageRequest {
  conversation_id: string;
  content: string;
  message_type: MessageType;
  media_urls: string[];
  reply_to_message_id: string;
}

/**
 * SEND /app/chat.read
 */
export interface ReadWsMessageRequest {
  conversation_id: string;
  message_id: string;
}

/**
 * SEND /app/chat.typing
 */
export interface TypingWsRequest {
  conversation_id: string;
  is_typing: string;
}

export interface WsReaction {
  emoji: string;
  count: string;
  user_ids: number[];
}

export interface WsReadBy {
  user_id: string;
  read_at: string;
}
/**
 * SUB /user/queue/messages
 * event_type: NEW_MESSAGE
 */
export interface WsNewMessageEvent {
  event_type: "NEW_MESSAGE";
  message_id: StompIdentifier;
  conversation_id: StompIdentifier;
  conversation_type: string;
  sender: WsUserInfo[];
  content: string;
  message_type: MessageType;
  media_urls: string[];
  reply_to_message_id: string;
  created_at: string;
  is_edited: string;
  reactions: WsReaction[];
  read_by: WsReadBy[];
}

/**
 * Broadcast: MESSAGE_READ
 */
export interface WsMessageReadEvent {
  event_type: "MESSAGE_READ";
  conversation_id: StompIdentifier;
  message_id: StompIdentifier;
  reader: WsUserInfo[];
  read_at: string;
}

/**
 * SUB /topic/conv.{conversation_id}.typing
 * event_type: TYPING_STATUS
 */
export interface WsTypingBroadcast {
  event_type: "TYPING_STATUS";
  conversation_id: string;
  user_id: string;
  full_name: string;
  avatar_url: string;
  frame_url: string;
  is_typing: string;
  timestamp: string;
}

export type WsUserQueueEvent = WsNewMessageEvent | WsMessageReadEvent;
