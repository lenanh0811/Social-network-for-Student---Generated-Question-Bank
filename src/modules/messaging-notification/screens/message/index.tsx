import { useState } from "react";
import { View, StyleSheet, useWindowDimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { bgGradient } from "@/theme";
import { ConversationItemData, MessageItemData } from "@/modules/messaging-notification/api/types/types";
import { GlassCard } from "@/modules/messaging-notification/components/glass-card";
import { ConversationList } from "@/modules/messaging-notification/components/conversation-list";
import { ChatWindow } from "@/modules/messaging-notification/components/chat-window";

// Đặt false khi đã nối API, rồi xóa hai mảng PREVIEW_*
const PREVIEW_MODE = true;
const HEADER_HEIGHT = 72;
const PREVIEW_CONVERSATIONS: ConversationItemData[] = [
  {
    id: "1",
    name: "Trần Minh",
    lastMessage: "Bạn làm xong bài tập chưa?",
    time: "10:30",
    unreadCount: 2,
  },
  {
    id: "2",
    name: "Lê Thu Hà",
    lastMessage: "Cảm ơn bạn nhé!",
    time: "Hôm qua",
  },
  {
    id: "3",
    name: "Nhóm ôn thi Giải tích",
    lastMessage: "Mai 8h học ở thư viện",
    time: "T2",
  },
];

const PREVIEW_MESSAGES: MessageItemData[] = [
  {
    id: "m1",
    content: "Chào bạn, bạn làm xong bài tập chưa?",
    mine: false,
    time: "10:28",
  },
  {
    id: "m2",
    content: "Mình xong rồi, để mình gửi cho.",
    mine: true,
    time: "10:29",
  },
  { id: "m3", content: "Cảm ơn nhiều nha!", mine: false, time: "10:30" },
];

export default function MessageScreen() {
  const { width } = useWindowDimensions();
  const isWide = width >= 900;

  const [selected, setSelected] = useState<ConversationItemData | null>(null);

  // gọi API danh sách hội thoại -> map sang ConversationItemData[]
  const conversations: ConversationItemData[] = PREVIEW_MODE
    ? PREVIEW_CONVERSATIONS
    : [];
  const loadingConversations = false;
  const conversationsError: string | null = null;

  // gọi API lấy tin nhắn theo selected.id -> map sang MessageItemData[]
  const messages: MessageItemData[] =
    PREVIEW_MODE && selected ? PREVIEW_MESSAGES : [];
  const loadingMessages = false;

  // gọi API gửi tin nhắn tới selected.id
  const handleSend = (text: string) => {};

  // gọi lại API danh sách hội thoại
  const handleRetry = () => {};

  const list = (
    <GlassCard style={isWide ? styles.sidebar : styles.full}>
      <ConversationList
        items={conversations}
        loading={loadingConversations}
        error={conversationsError}
        selectedId={selected?.id}
        onSelect={setSelected}
        onRetry={handleRetry}
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
        onBack={isWide ? undefined : () => setSelected(null)}
      />
    </GlassCard>
  );

  return (
    <LinearGradient colors={bgGradient} style={styles.fill}>
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
