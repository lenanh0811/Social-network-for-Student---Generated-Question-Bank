import { AppState, Platform, type AppStateStatus } from "react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/auth";
import { getAccessToken } from "@/modules/auth-user/api/client";
import { refreshAccessToken } from '@/api/http';
import { getConversationMessages, getConversations } from "@/modules/messaging-notification/api/messages";
import { getChatStompClient } from "@/modules/messaging-notification/api/realtime/stomp.client";
import {
  isWsMessageReadEvent,
  isWsNewMessageEvent,
  isWsTypingBroadcast,
  normalizeWsTypingBroadcast,
  normalizeWsNewMessageEvent,
  parseWsPayload,
  type Id,
  type SendWsMessageRequest,
  type WsNewMessageEvent,
} from "@/modules/messaging-notification/api/realtime/stomp.types";
import { useChatStore, type ChatMessage } from "@/modules/messaging-notification/store/chat-store";

const toMessage = (event: WsNewMessageEvent): ChatMessage => ({
  ...event,
  pending: false,
});

export function useChatSocket(activeConversationId: Id | null) {
  const { status, user } = useAuth();
  const [error, setError] = useState('');
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const clientRef = useRef<ReturnType<typeof getChatStompClient> | null>(null);
  const requestGeneration = useRef(0);
  const clearChat = useChatStore((state) => state.clearChat);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingState = useRef(new Map<Id, boolean>());
  const lastRead = useRef(new Map<Id, Id>());
  const activeConversationRef = useRef(activeConversationId);
  const appState = useRef<AppStateStatus>(
    (AppState.currentState as AppStateStatus | null) ?? "active",
  );
  const setConnection = useChatStore((state) => state.setConnection);
  const setConversations = useChatStore((state) => state.setConversations);
  const setMessages = useChatStore((state) => state.setMessages);
  const addMessage = useChatStore((state) => state.addMessage);
  const markMessageSent = useChatStore((state) => state.markMessageSent);
  const applyRead = useChatStore((state) => state.applyRead);
  const applyTyping = useChatStore((state) => state.applyTyping);
  const markRead = useChatStore((state) => state.markRead);
  const incrementUnread = useChatStore((state) => state.incrementUnread);

  useEffect(() => {
    activeConversationRef.current = activeConversationId;
  }, [activeConversationId]);

  const sendRead = useCallback((conversationId: Id, messageId: Id) => {
    if (appState.current !== "active") return;
    if (lastRead.current.get(conversationId) === messageId) return;
    lastRead.current.set(conversationId, messageId);
    clientRef.current?.markAsRead({
      conversationId: conversationId,
      messageId: messageId,
    });
  }, []);

  const loadConversations = useCallback(async (silent = false) => {
    const generation = requestGeneration.current;
    if (!silent) { setLoadingConversations(true); setError(''); }
    try {
      const result = await getConversations();
      if (generation !== requestGeneration.current) return;
      setConversations(result.items);
    } catch (error) {
      if (generation === requestGeneration.current) setError(error instanceof Error ? error.message : 'Không tải được danh sách cuộc trò chuyện.');
      console.error("[Chat] Không tải được danh sách cuộc trò chuyện", error);
    } finally {
      if (!silent && generation === requestGeneration.current) setLoadingConversations(false);
    }
  }, [setConversations]);

  const loadMessages = useCallback(async (conversationId: Id) => {
    const generation = requestGeneration.current;
    const showLoading = !(useChatStore.getState().messages[conversationId]?.length);
    if (showLoading) setLoadingMessages(true);
    try {
      const result = await getConversationMessages(conversationId);
      if (generation !== requestGeneration.current) return;
      const messages: ChatMessage[] = result.messages
        .filter((message) => !message.hidden)
        .sort((left, right) => left.messageId - right.messageId)
        .map((message) => ({
          eventType: "new-message",
          messageId: message.messageId,
          conversationId: conversationId,
          conversationType: result.conversationType,
          sender: {
            userId: message.senderId,
            fullName: message.senderName ?? "",
            avatarUrl: message.avatarUrl,
            frameUrl: message.frameUrl,
          },
          content: message.content,
          messageType: message.messageType,
          mediaUrls: message.mediaUrls,
          replyToMessageId:
            message.repliedMessageId ?? message.replyToMessageId ?? null,
          createdAt: message.createdAt,
          isEdited: message.isEdited ?? message.edited ?? false,
          reactions: message.reactions ?? [],
          readBy: message.readBy ?? [],
          revoked: message.revoked ?? false,
        }));
      setMessages(conversationId, messages);
      const last = messages.at(-1);
      if (last && activeConversationRef.current === conversationId) {
        markRead(conversationId);
        sendRead(conversationId, last.messageId);
      }
    } catch (error) {
      if (generation === requestGeneration.current) setError(error instanceof Error ? error.message : 'Không tải được tin nhắn.');
      console.error("[Chat] Không tải được tin nhắn", error);
    } finally {
      if (generation === requestGeneration.current && activeConversationRef.current === conversationId) setLoadingMessages(false);
    }
  }, [markRead, sendRead, setMessages]);

  const handleUserMessage = useCallback((frame: { body: string }) => {
    const payload = parseWsPayload(frame.body);
    if (__DEV__) console.info("[Chat] MESSAGE tới /user/queue/messages");
    if (isWsTypingBroadcast(payload)) {
      const event = normalizeWsTypingBroadcast(payload);
      if (event.userId !== Number(user.id)) applyTyping(event);
      return;
    }
    if (isWsNewMessageEvent(payload)) {
      const event = normalizeWsNewMessageEvent(payload);
      const state = useChatStore.getState();
      const knownConversation = state.conversations.some(item => item.conversationId === event.conversationId);
      const alreadyReceived = state.messages[event.conversationId]?.some(item => item.messageId === event.messageId && !item.pending);
      addMessage(toMessage(event));
      if (event.conversationId === activeConversationRef.current) {
        markRead(event.conversationId);
        sendRead(event.conversationId, event.messageId);
      } else if (!alreadyReceived && event.sender.userId !== Number(user.id)) {
        incrementUnread(event.conversationId);
      }
      // Only unknown conversations need REST metadata; known chats update from STOMP.
      if (!knownConversation) void loadConversations(true);
      return;
    }
    if (isWsMessageReadEvent(payload)) {
      applyRead(payload);
      return;
    }
    console.warn(
      "[Chat] Payload /user/queue/messages không nhận dạng được",
      { keys: payload && typeof payload === "object" ? Object.keys(payload) : [] },
    );
  }, [addMessage, applyRead, applyTyping, incrementUnread, loadConversations, markRead, sendRead, user.id]);

  const connectHandlers = useCallback(() => ({
    onMessage: handleUserMessage,
    onConnect: () => {
      setConnection("connected");
      void loadConversations();
      const conversationId = activeConversationRef.current;
      if (conversationId !== null) void loadMessages(conversationId);
    },
    onDisconnect: () => {
      typingState.current.clear();
      setConnection("disconnected");
    },
    onError: (message: string) => {
      console.error("[Chat] STOMP", message);
      setError(message);
      setConnection("disconnected");
    },
  }), [handleUserMessage, loadConversations, loadMessages, setConnection]);

  useEffect(() => {
    if (status !== "signedIn") return;
    const readReceipts = lastRead.current;
    const typingStatuses = typingState.current;
    if (!process.env.EXPO_PUBLIC_WS_URL?.trim()) {
      const timer = setTimeout(() => setError('EXPO_PUBLIC_WS_URL chưa được cấu hình.'), 0);
      return () => clearTimeout(timer);
    }
    const initialLoad = setTimeout(() => void loadConversations(), 0);
    setConnection("connecting");
    const client = getChatStompClient(
      getAccessToken,
      refreshAccessToken,
    );
    clientRef.current = client;
    client.connect(connectHandlers());
    const appStateSubscription = AppState.addEventListener(
      "change",
      (nextState) => {
        if (appState.current === nextState) return;
        appState.current = nextState;
        // Browser visibility is not a network disconnect. Keep receiving messages
        // while testing in another tab/window; only mobile pauses the socket.
        if (Platform.OS === "web") return;
        if (nextState === "background" || nextState === "inactive") {
          if (typingTimer.current) clearTimeout(typingTimer.current);
          for (const [conversationId, typing] of typingStatuses) {
            if (typing) client.sendTyping({ conversationId, typing: false });
          }
          typingStatuses.clear();
          client.disconnect();
          setConnection("disconnected");
        }
        if (nextState === "active") {
          setConnection("connecting");
          client.connect(connectHandlers());
        }
      },
    );
    return () => {
      requestGeneration.current += 1;
      clearTimeout(initialLoad);
      appStateSubscription?.remove();
      if (typingTimer.current) clearTimeout(typingTimer.current);
      for (const [conversationId, typing] of typingStatuses) {
        if (typing) client.sendTyping({ conversationId, typing: false });
      }
      client.dispose();
      clientRef.current = null;
      readReceipts.clear();
      typingStatuses.clear();
      setConnection("disconnected");
      clearChat();
    };
  }, [status, user.id, connectHandlers, setConnection, clearChat, loadConversations]);

  useEffect(() => {
    const client = clientRef.current;
    if (!client || activeConversationId === null) return;
    const typingStatuses = typingState.current;
    const timer = client.client.connected ? setTimeout(() => void loadMessages(activeConversationId), 0) : undefined;
    return () => {
      if (timer !== undefined) clearTimeout(timer);
      if (typingTimer.current) clearTimeout(typingTimer.current);
      if (typingStatuses.get(activeConversationId)) {
        client.sendTyping({ conversationId: activeConversationId, typing: false });
        typingStatuses.delete(activeConversationId);
      }
    };
  }, [activeConversationId, loadMessages]);

  const sendTyping = (conversationId: Id, isTyping: boolean) => {
    if (!clientRef.current?.client.connected) return;
    if (typingTimer.current) clearTimeout(typingTimer.current);
    if (!isTyping) {
      if (typingState.current.get(conversationId)) {
        clientRef.current?.sendTyping({
          conversationId: conversationId,
          typing: false,
        });
        typingState.current.set(conversationId, false);
      }
      return;
    }
    if (!typingState.current.get(conversationId)) {
      clientRef.current?.sendTyping({
        conversationId: conversationId,
        typing: true,
      });
      typingState.current.set(conversationId, true);
    }
    typingTimer.current = setTimeout(
      () => sendTyping(conversationId, false),
      2000,
    );
  };

  const sendMessage = (payload: SendWsMessageRequest) => {
    sendTyping(payload.conversationId, false);
    const temporaryMessageId = -Date.now();
    addMessage({
      eventType: "new-message",
      messageId: temporaryMessageId,
      conversationId: payload.conversationId,
      conversationType: "direct",
      sender: { userId: Number(user.id), fullName: user.name },
      content: payload.content,
      messageType: payload.messageType,
      mediaUrls: payload.mediaUrls,
      replyToMessageId: payload.replyToMessageId,
      createdAt: new Date().toISOString(),
      isEdited: false,
      reactions: [],
      readBy: [],
      pending: true,
    });
    const client = clientRef.current;
    client?.sendMessage(payload);
    // Restore the previous UI behaviour: stop showing "sending" after publishing
    // on an open connection. This is transport status, not proof of persistence.
    if (client?.client.connected) {
      markMessageSent(payload.conversationId, temporaryMessageId);
    }
  };

  return {
    error,
    loadingConversations,
    loadingMessages,
    retry: () => {
      setError('');
      clientRef.current?.connect(connectHandlers());
      void loadConversations();
      if (activeConversationId !== null) void loadMessages(activeConversationId);
    },
    sendMessage,
    sendTyping,
    connection: useChatStore((state) => state.connection),
  };
}
