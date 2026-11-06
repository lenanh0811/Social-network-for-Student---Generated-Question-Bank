import { Client, type IFrame } from "@stomp/stompjs";

import { STOMP_CONFIG } from "./stomp.config";

// ==================== TYPES ====================

export type AccessTokenProvider = () => string | null | Promise<string | null>;

export interface StompClientOptions {
  brokerURL: string;

  getAccessToken: AccessTokenProvider;

  reconnectDelay?: number;

  onConnect?: (frame: IFrame) => void;

  onDisconnect?: (frame: IFrame) => void;

  onStompError?: (frame: IFrame) => void;

  onWebSocketError?: (event: Event) => void;

  onWebSocketClose?: (event: CloseEvent) => void;

  debug?: (message: string) => void;
}

// ==================== CLIENT ====================

/**
 * Tạo STOMP client.
 *
 * Lưu ý:
 * - Hàm này chỉ tạo client, chưa kết nối.
 * - Phải gọi client.activate() để kết nối.
 * - Access token được lấy lại mỗi lần reconnect.
 */
export const createStompClient = ({
  brokerURL,
  reconnectDelay = STOMP_CONFIG.reconnectDelay,
  onConnect,
  onDisconnect,
  onStompError,
  onWebSocketError,
  onWebSocketClose,
  debug,
}: StompClientOptions): Client => {
  if (!brokerURL.trim()) {
    throw new Error("STOMP brokerURL không được để trống.");
  }

  let client: Client;

  client = new Client({
    brokerURL,

    // Authorization sẽ được cập nhật trong beforeConnect.
    connectHeaders: {},

    // Tự động reconnect.
    reconnectDelay,

    /**
     * Chạy trước mỗi lần kết nối STOMP.
     */
    beforeConnect: async () => {
      const accessToken = localStorage.getItem("access_token") || null;

      if (!accessToken?.trim()) {
        throw new Error("Không tìm thấy access_token để kết nối STOMP.");
      }

      client.connectHeaders = {
        Authorization: `Bearer ${accessToken}`,
      };
    },
    onConnect: (frame) => {
      onConnect?.(frame);
    },

    onDisconnect: (frame) => {
      onDisconnect?.(frame);
    },

    onStompError: (frame) => {
      onStompError?.(frame);
    },

    onWebSocketError: (event) => {
      onWebSocketError?.(event);
    },

    onWebSocketClose: (event) => {
      onWebSocketClose?.(event);
    },

    // Không log nội dung tin nhắn mặc định.
    debug: debug ?? (() => undefined),
  });

  return client;
};
