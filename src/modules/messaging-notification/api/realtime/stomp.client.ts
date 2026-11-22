import { toApi } from '../adapters';
import {
  Client,
  type IFrame,
  type IMessage,
  type StompSubscription,
} from "@stomp/stompjs";
import {
  STOMP_CONFIG,
  STOMP_DESTINATIONS,
  STOMP_WEBSOCKET_URL,
} from "@/modules/messaging-notification/api/realtime/stomp.config";
import type {
  AccessTokenProvider,
  ReadWsMessageRequest,
  SendWsMessageRequest,
  TypingWsRequest,
} from "@/modules/messaging-notification/api/realtime/stomp.types";

export type StompClientHandlers = {
  onMessage: (frame: IMessage) => void;
  onConnect?: (frame: IFrame) => void;
  onDisconnect?: () => void;
  onError?: (message: string) => void;
};

type QueuedPublish = { destination: string; body: object };
const isAuthError = (message: string) =>
  /unauthorized|jwt\s*(expired|invalid)|access\s*token/i.test(message);

export class ChatStompClient {
  readonly client: Client;
  private userSubscription: StompSubscription | null = null;
  private readonly publishQueue: QueuedPublish[] = [];
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private handlers: StompClientHandlers | null = null;
  private shouldReconnect = false;
  private reconnectAttempt = 0;
  private authRetryCount = 0;

  constructor(
    private readonly getAccessToken: AccessTokenProvider,
    private readonly refreshAccessToken?: AccessTokenProvider,
  ) {
    this.client = new Client({
      webSocketFactory: () => new WebSocket(STOMP_WEBSOCKET_URL),
      reconnectDelay: 0,
      heartbeatIncoming: STOMP_CONFIG.heartbeatIncoming,
      heartbeatOutgoing: STOMP_CONFIG.heartbeatOutgoing,
      connectHeaders: {},
      debug: () => undefined,
    });
    this.client.beforeConnect = async () => {
      const token = await this.getAccessToken();
      if (!token)
        throw new Error("Không tìm thấy access token để kết nối STOMP.");
      this.client.connectHeaders = { Authorization: `Bearer ${token}` };
    };
  }

  connect(handlers: StompClientHandlers) {
    // Repeated lifecycle notifications must not start another connection or
    // cancel a reconnect that is already in progress.
    if (this.shouldReconnect && this.client.active) return;
    this.handlers = handlers;
    this.shouldReconnect = true;
    this.authRetryCount = 0;
    this.clearReconnectTimer();
    this.client.onConnect = (frame) => {
      this.reconnectAttempt = 0;
      this.authRetryCount = 0;
      // Subscription handles belong to the previous socket and must not be reused.
      this.userSubscription = null;
      this.subscribeUserMessages(handlers.onMessage);
      if (__DEV__) console.info("[Chat] STOMP CONNECTED; đã gửi SUBSCRIBE /user/queue/messages", {
        subscription: "chat-user-messages",
        serverUser: frame.headers["user-name"] ?? "(server không cung cấp header user-name)",
      });
      this.flushPublishQueue();
      handlers.onConnect?.(frame);
    };
    this.client.onDisconnect = () => handlers.onDisconnect?.();
    this.client.onStompError = (frame) => {
      const message = `${frame.headers.message ?? ""} ${frame.body}`.trim();
      if (isAuthError(message)) {
        if (this.authRetryCount >= STOMP_CONFIG.maxAuthRetries) {
          this.shouldReconnect = false;
          handlers.onError?.("Xác thực realtime thất bại sau khi làm mới token.");
          return;
        }
        this.authRetryCount += 1;
        void this.retryAfterAuthError();
        return;
      }
      handlers.onError?.(message || "STOMP ERROR frame không có nội dung.");
    };
    this.client.onWebSocketError = () =>
      handlers.onError?.("Không thể mở WebSocket STOMP.");
    this.client.onWebSocketClose = (event) => {
      if (__DEV__ && this.shouldReconnect) console.warn("[Chat] WebSocket đóng; sẽ thử kết nối lại", {
        code: event.code,
        wasClean: event.wasClean,
      });
      handlers.onDisconnect?.();
      this.scheduleReconnect();
    };
    this.client.onUnhandledMessage = (frame) => {
      // No body or CONNECT headers: diagnostics must not expose tokens/chat content.
      console.warn("[Chat] MESSAGE không khớp subscription", {
        destination: frame.headers.destination,
        subscription: frame.headers.subscription,
      });
    };
    if (!this.client.active) this.client.activate();
  }

  disconnect() {
    this.shouldReconnect = false;
    this.clearReconnectTimer();
    this.unsubscribeAll();
    void this.client.deactivate();
  }

  dispose() {
    this.disconnect();
    this.publishQueue.length = 0;
    if (singleton === this) singleton = null;
  }

  sendMessage(body: SendWsMessageRequest) {
    this.publish(STOMP_DESTINATIONS.SEND_MESSAGE, body);
  }

  markAsRead(body: ReadWsMessageRequest) {
    this.publish(STOMP_DESTINATIONS.READ_MESSAGE, body);
  }

  sendTyping(body: TypingWsRequest) {
    // Typing is transient: never replay stale keystrokes after reconnecting.
    if (this.client.connected) this.publish(STOMP_DESTINATIONS.TYPING, body);
  }

  private publish(destination: string, body: object) {
    if (!this.client.connected) {
      this.publishQueue.push({ destination, body });
      return;
    }
    try {
      this.client.publish({
        destination,
        body: JSON.stringify(toApi(body)),
        headers: { "content-type": "application/json" },
      });
    } catch (error) {
      this.handlers?.onError?.(
        error instanceof Error
          ? error.message
          : "Không thể gửi dữ liệu realtime.",
      );
    }
  }

  private flushPublishQueue() {
    while (this.client.connected && this.publishQueue.length) {
      const item = this.publishQueue.shift();
      if (item) this.publish(item.destination, item.body);
    }
  }

  private async retryAfterAuthError() {
    try {
      await this.client.deactivate();
      await (this.refreshAccessToken?.() ?? this.getAccessToken());
      this.scheduleReconnect(0);
    } catch (error) {
      this.handlers?.onError?.(
        error instanceof Error
          ? error.message
          : "Không thể làm mới access token.",
      );
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(delay?: number) {
    if (!this.shouldReconnect || this.reconnectTimer) return;
    const backoff = Math.min(
      STOMP_CONFIG.reconnectInitialDelay * 2 ** this.reconnectAttempt,
      STOMP_CONFIG.reconnectMaxDelay,
    );
    const wait = delay ?? backoff;
    this.reconnectAttempt += 1;
    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;
      // STOMP remains active after an unexpected close, even with reconnectDelay=0.
      // Reset its lifecycle before activating a new socket.
      await this.client.deactivate();
      if (this.shouldReconnect) this.client.activate();
    }, wait);
  }

  private clearReconnectTimer() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
  }

  private unsubscribeAll() {
    if (this.client.connected) this.userSubscription?.unsubscribe();
    this.userSubscription = null;
  }

  private subscribeUserMessages(handler: (frame: IMessage) => void) {
    this.userSubscription?.unsubscribe();
    this.userSubscription = this.client.subscribe(
      STOMP_DESTINATIONS.USER_MESSAGES,
      handler,
      { id: "chat-user-messages", ack: "auto" },
    );
  }


}

let singleton: ChatStompClient | null = null;
export const getChatStompClient = (
  getAccessToken: AccessTokenProvider,
  refreshAccessToken?: AccessTokenProvider,
) => {
  if (!singleton)
    singleton = new ChatStompClient(getAccessToken, refreshAccessToken);
  return singleton;
};
