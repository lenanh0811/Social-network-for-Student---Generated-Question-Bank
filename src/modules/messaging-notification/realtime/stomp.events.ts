import {
  type Client,
  type IMessage,
  type StompSubscription,
} from "@stomp/stompjs";

import {
  STOMP_DESTINATIONS,
  getConversationTypingDestination,
} from "./stomp.config";

import type {
  SendWsMessageRequest,
  ReadWsMessageRequest,
  TypingWsRequest,
  WsUserQueueEvent,
  WsTypingBroadcast,
} from "./stomp.types";
// ==================== TYPES ====================

export type StompMessageHandler<TPayload> = (
  payload: TPayload,
  frame: IMessage,
) => void;

export type StompParseErrorHandler = (error: unknown) => void;

/**
 * Kiểm tra STOMP client đã kết nối hay chưa.
 */
const ensureConnected = (client: Client): void => {
  if (!client.connected) {
    throw new Error("STOMP client chưa được kết nối.");
  }
};

/**
 * Publish JSON payload đến STOMP destination.
 */
const publishJson = <TPayload extends object>(
  client: Client,
  destination: string,
  payload: TPayload,
): void => {
  ensureConnected(client);

  client.publish({
    destination,
    body: JSON.stringify(payload),
  });
};

/**
 * Subscribe destination và parse JSON response.
 * Trả về subscription để caller chủ động unsubscribe.
 */
const subscribeJson = <TPayload>(
  client: Client,
  destination: string,
  handler: StompMessageHandler<TPayload>,
  onParseError?: StompParseErrorHandler,
): StompSubscription => {
  ensureConnected(client);

  return client.subscribe(destination, (frame) => {
    let payload: TPayload;

    try {
      payload = JSON.parse(frame.body) as TPayload;
    } catch (error) {
      if (onParseError) {
        onParseError(error);
      } else {
        console.error("[STOMP] Không thể parse dữ liệu nhận được.", error);
      }

      return;
    }

    handler(payload, frame);
  });
};
/**
 * Gửi tin nhắn mới.
 * Destination: /app/chat.send
 * Không cần gọi REST API để gửi tin nhắn.
 */
export const publishChatMessage = (
  client: Client,
  payload: SendWsMessageRequest,
): void => {
  publishJson(client, STOMP_DESTINATIONS.SEND_MESSAGE, payload);
};

/**
 * Báo đã đọc tin nhắn.
 * Destination: /app/chat.read
 */
export const publishChatRead = (
  client: Client,
  payload: ReadWsMessageRequest,
): void => {
  publishJson(client, STOMP_DESTINATIONS.READ_MESSAGE, payload);
};

/**
 * Phát trạng thái đang soạn tin.
 * Destination: /app/chat.typing
 */
export const publishChatTyping = (
  client: Client,
  payload: TypingWsRequest,
): void => {
  publishJson(client, STOMP_DESTINATIONS.TYPING, payload);
};

/**
 * Nhận tin nhắn và biên nhận đọc cá nhân.
 * Các event đã có schema:
 * - NEW_MESSAGE
 * - MESSAGE_READ
 */
export const subscribeUserMessages = (
  client: Client,
  handler: StompMessageHandler<WsUserQueueEvent>,
  onParseError?: StompParseErrorHandler,
): StompSubscription => {
  return subscribeJson(
    client,
    STOMP_DESTINATIONS.USER_MESSAGES,
    handler,
    onParseError,
  );
};

/**
 
 * Destination:
 * /topic/conv.{conversation_id}.typing
 */
export const subscribeConversationTyping = (
  client: Client,
  conversationId: string | number,
  handler: StompMessageHandler<WsTypingBroadcast>,
  onParseError?: StompParseErrorHandler,
): StompSubscription => {
  const destination = getConversationTypingDestination(conversationId);

  return subscribeJson(client, destination, handler, onParseError);
};
