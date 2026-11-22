import { toConversationItem, toMessageItem } from '../../api/adapters';
import { useState } from "react";
import { View, StyleSheet, useWindowDimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { messageBackground } from "../../theme";
import { useAuth } from "@/context/auth";
import { useChatSocket } from "@/modules/messaging-notification/hooks/use-chat-socket";
import { useChatStore } from "@/modules/messaging-notification/store/chat-store";
import type { DeleteMessageScope } from "@/modules/messaging-notification/api/interfaces/messages.interface";
import type { Id } from "@/modules/messaging-notification/api/realtime/stomp.types";
import type { ConversationItemData, MessageItemData } from "@/modules/messaging-notification/api/types/types";
import { GlassCard } from "@/modules/messaging-notification/components/glass-card";
import { ConversationList } from "@/modules/messaging-notification/components/conversation-list";
import { ChatWindow } from "@/modules/messaging-notification/components/chat-window";
import { deleteMessage } from "@/modules/messaging-notification/api/messages";

const HEADER_HEIGHT = 72;
const EMPTY_MESSAGES: ReturnType<
  typeof useChatStore.getState
>["messages"][number] = [];
export default function MessageScreen() {
  const { user } = useAuth();
  const { width } = useWindowDimensions();
  const isWide = width >= 900;
  const [selected, setSelected] = useState<ConversationItemData | null>(null);
  const conversationData = useChatStore((state) => state.conversations);
  const rawMessages = useChatStore((state) =>
    selected
      ? (state.messages[Number(selected.id)] ?? EMPTY_MESSAGES)
      : EMPTY_MESSAGES,
  );
  const typing = useChatStore((state) =>
    selected ? state.typing[Number(selected.id)] : null,
  );
  const { sendMessage, sendTyping, connection, error, loadingConversations, loadingMessages, retry } = useChatSocket(
    selected ? (Number(selected.id) as Id) : null,
  );
  const conversations = conversationData.map(toConversationItem);
  const messages: MessageItemData[] = rawMessages.map(message => toMessageItem(message, user.id));

  const handleSend = (content: string) => {
    if (!selected) return;
    sendMessage({
      conversationId: Number(selected.id),
      content,
      messageType: "text",
      mediaUrls: [],
      replyToMessageId: null,
    });
    sendTyping(Number(selected.id), false);
  };

  const handleDelete = async (messageId: string, scope: DeleteMessageScope) => {
    if (!selected) return;
    const conversationId = Number(selected.id);
    await deleteMessage(Number(messageId), scope);
    useChatStore.getState().applyDelete(conversationId, Number(messageId), scope);
  };

  const list = (
    <GlassCard style={isWide ? styles.sidebar : styles.full}>
      <ConversationList
        items={conversations}
        loading={loadingConversations}
        error={
          error || (connection === "disconnected" ? "Đang mất kết nối realtime" : null)
        }
        selectedId={selected?.id}
        onSelect={setSelected}
        onRetry={retry}
      />
    </GlassCard>
  );
  const chat = (
    <GlassCard style={isWide ? styles.main : styles.full}>
      <ChatWindow
        conversation={selected}
        messages={messages}
        loading={loadingMessages}
        onSend={handleSend}
        onDelete={handleDelete}
        onTypingChange={(typingState) =>
          selected && sendTyping(Number(selected.id), typingState)
        }
        typingText={
          typing && typing.isTyping ? `${typing.fullName} đang nhập...` : ""
        }
        onBack={isWide ? undefined : () => setSelected(null)}
      />
    </GlassCard>
  );

  return (
    <LinearGradient colors={messageBackground} style={styles.fill}>
      <View style={[styles.root, { paddingTop: HEADER_HEIGHT + 16 }]}>
        {isWide ? (
          <>
            {list}
            {chat}
          </>
        ) : selected ? (
          chat
        ) : (
          list
        )}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  root: { flex: 1, flexDirection: "row", gap: 16, padding: 16 },
  sidebar: { width: 360 },
  main: { flex: 1 },
  full: { flex: 1 },
});
