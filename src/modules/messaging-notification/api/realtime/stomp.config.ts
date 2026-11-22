const configuredEndpoint = process.env.EXPO_PUBLIC_WS_URL?.trim();

export const STOMP_BROKER_URL = (configuredEndpoint ?? "").replace(/\/$/, "");
export const STOMP_WEBSOCKET_URL =
  STOMP_BROKER_URL.replace(/^http/, "ws") + "/websocket";
export const STOMP_CONFIG = {
  heartbeatIncoming: 0,
  heartbeatOutgoing: 10000,
  reconnectInitialDelay: 1000,
  reconnectMaxDelay: 30000,
  maxAuthRetries: 1,
} as const;
export const STOMP_DESTINATIONS = {
  SEND_MESSAGE: "/app/chat.send",
  READ_MESSAGE: "/app/chat.read",
  TYPING: "/app/chat.typing",
  USER_MESSAGES: "/user/queue/messages",
} as const;
export const getConversationTypingDestination = (
  conversationId: string | number,
) => `/topic/conv.${conversationId}.typing`;
