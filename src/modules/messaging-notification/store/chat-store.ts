import { create } from "zustand";
import type {
  Id,
  WsMessageReadEvent,
  WsNewMessageEvent,
  WsTypingBroadcast,
} from "@/modules/messaging-notification/api/realtime/stomp.types";
import type { Conversation, DeleteMessageScope } from "@/modules/messaging-notification/api/interfaces/messages.interface";

export type ChatMessage = WsNewMessageEvent & {
  pending?: boolean;
  failed?: boolean;
  revoked?: boolean;
};
type ChatState = {
  clearChat: () => void;
  conversations: Conversation[];
  messages: Record<Id, ChatMessage[]>;
  typing: Record<Id, WsTypingBroadcast | null>;
  deleted: Record<Id, Record<Id, DeleteMessageScope>>;
  applyDelete: (conversationId: Id, messageId: Id, scope: DeleteMessageScope) => void;
  connection: "disconnected" | "connecting" | "connected";
  setConnection: (connection: ChatState["connection"]) => void;
  setConversations: (conversations: Conversation[]) => void;
  setMessages: (conversationId: Id, messages: ChatMessage[]) => void;
  addMessage: (message: ChatMessage) => void;
  markMessageSent: (conversationId: Id, tempId: number) => void;
  applyRead: (event: WsMessageReadEvent) => void;
  applyTyping: (event: WsTypingBroadcast) => void;
  markRead: (conversationId: Id) => void;
  incrementUnread: (conversationId: Id) => void;
};

export const useChatStore = create<ChatState>((set) => ({
  clearChat: () => set({ conversations: [], messages: {}, deleted: {}, typing: {}, connection: "disconnected" }),
  conversations: [],
  messages: {},
  typing: {},
  deleted: {},
  applyDelete: (conversationId, messageId, scope) => set((state) => ({
    deleted: { ...state.deleted, [conversationId]: { ...state.deleted[conversationId], [messageId]: scope } },
    messages: { ...state.messages, [conversationId]: (state.messages[conversationId] ?? [])
      .filter((message) => scope !== "me" || message.messageId !== messageId)
      .map((message) => message.messageId === messageId
        ? { ...message, revoked: true, content: "", mediaUrls: [], pending: false } : message) },
    conversations: state.conversations.map((conversation) => {
      if (conversation.conversationId !== conversationId ||
        (conversation.lastMessage?.messageId ?? conversation.lastMessage?.id) !== messageId) return conversation;
      return { ...conversation, lastMessage: scope === "me" ? null :
        { ...conversation.lastMessage!, content: "Tin nhắn đã được thu hồi" } };
    }),
  })),
  connection: "disconnected",
  setConnection: (connection) => set({ connection }),
  setConversations: (conversations) => set({
    conversations: [...new Map(conversations.map((conversation) => [
      String(conversation.conversationId), conversation,
    ])).values()],
  }),
  setMessages: (conversationId, messages) =>
    set((state) => {
      // A REST snapshot may arrive after a newer WebSocket message.
      // REST can return a string ID while STOMP normalizes the same ID to a number.
      const merged = new Map(messages.map((message) => [String(message.messageId), message]));
      for (const message of state.messages[conversationId] ?? []) {
        const key = String(message.messageId);
        if (!merged.get(key)?.revoked) merged.set(key, message);
      }
      return { messages: { ...state.messages, [conversationId]:
        [...merged.values()]
          .filter((message) => state.deleted[conversationId]?.[message.messageId] !== "me")
          .map((message) => state.deleted[conversationId]?.[message.messageId] === "everyone"
            ? { ...message, revoked: true, content: "", mediaUrls: [] } : message)
          .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.messageId - b.messageId),
      } };
    }),
  addMessage: (message) =>
    set((state) => {
      const current = state.messages[message.conversationId] ?? [];
      const scope = state.deleted[message.conversationId]?.[message.messageId];
      if (scope === "me") return state;
      if (scope === "everyone") message = { ...message, revoked: true, content: "", mediaUrls: [] };
      if (
        current.some(
          (item) => String(item.messageId) === String(message.messageId) && !item.pending,
        )
      )
        return state;
      // Match one local send only; another user's identical text is a separate message.
      const pendingIndex = message.pending ? -1 : current.findIndex(
        (item) => item.messageId < 0 && item.sender.userId === message.sender.userId &&
          item.content === message.content && item.messageType === message.messageType,
      );
      const withoutPending = current.filter((item, index) =>
        index !== pendingIndex && String(item.messageId) !== String(message.messageId),
      );
      return {
        conversations: state.conversations.map((conversation) => {
          if (conversation.conversationId !== message.conversationId) return conversation;
          const lastTime = conversation.lastMessage?.createdAt;
          if (lastTime && Date.parse(lastTime) > Date.parse(message.createdAt)) return conversation;
          return { ...conversation, updatedAt: message.createdAt, lastMessage: {
            messageId: message.messageId,
            content: message.revoked ? "Tin nhắn đã được thu hồi" : message.content,
            messageType: message.messageType, createdAt: message.createdAt,
          } };
        }).sort((left, right) =>
          Date.parse(right.lastMessage?.createdAt ?? right.updatedAt ?? '1970-01-01') -
          Date.parse(left.lastMessage?.createdAt ?? left.updatedAt ?? '1970-01-01')),
        messages: {
          ...state.messages,
          [message.conversationId]: [...withoutPending, message],
        },
      };
    }),
  markMessageSent: (conversationId, tempId) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [conversationId]: (state.messages[conversationId] ?? []).map(
          (message) =>
            message.messageId === tempId
              ? { ...message, pending: false }
              : message,
        ),
      },
    })),
  applyRead: (event) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [event.conversationId]: (
          state.messages[event.conversationId] ?? []
        ).map((message) =>
          message.messageId === event.messageId
            ? {
                ...message,
                readBy: [
                  ...(message.readBy ?? []),
                  { userId: event.reader.userId, readAt: event.readAt },
                ],
              }
            : message,
        ),
      },
    })),
  applyTyping: (event) =>
    set((state) => ({
      typing: {
        ...state.typing,
        [event.conversationId]: event.isTyping ? event : null,
      },
    })),
  markRead: (conversationId) =>
    set((state) => ({
      conversations: state.conversations.map((item) =>
        item.conversationId === conversationId
          ? { ...item, unreadCount: 0 }
          : item,
      ),
    })),
  incrementUnread: (conversationId) =>
    set((state) => ({
      conversations: state.conversations.map((item) =>
        item.conversationId === conversationId
          ? { ...item, unreadCount: item.unreadCount + 1 }
          : item,
      ),
    })),
}));
