/**
 * SQB HUST - STOMP Configuration
 *
 * Protocol: STOMP over WebSocket
 * Application prefix: /app
 * User broker prefix: /user
 * Topic broker prefix: /topic
 */

// WebSocket endpoint theo tài liệu backend.
export const STOMP_BROKER_URL = "ws://snsqb.duckdns.org/api/v1/ws";

// Cấu hình kết nối client.
export const STOMP_CONFIG = {
  reconnectDelay: 5000,
} as const;

// STOMP destinations.
export const STOMP_DESTINATIONS = {
  // Client -> Server
  SEND_MESSAGE: "/app/chat.send",
  READ_MESSAGE: "/app/chat.read",
  TYPING: "/app/chat.typing",

  // Server -> Client
  USER_MESSAGES: "/user/queue/messages",
} as const;

/**
 * Topic nhận trạng thái typing của một conversation.
 *
 * Format:
 * /topic/conv.{conversation_id}.typing
 */
export const getConversationTypingDestination = (
  conversationId: string | number,
): string => {
  return `/topic/conv.${conversationId}.typing`;
};
