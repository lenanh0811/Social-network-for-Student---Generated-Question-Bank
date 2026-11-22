import { useMemo, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, glass } from "@/theme";
import { ConversationItemData, MessageItemData } from "@/modules/messaging-notification/api/types/types";
import { Avatar } from "@/modules/messaging-notification/components/avatar";
import { MessageBubble } from "@/modules/messaging-notification/components/message-bubble";
import { MessageInput } from "@/modules/messaging-notification/components/message-input";
import type { DeleteMessageScope } from "@/modules/messaging-notification/api/interfaces/messages.interface";
import { Button } from "@/components/button";

type Props = {
  conversation: ConversationItemData | null;
  messages: MessageItemData[];
  loading?: boolean;
  onSend: (text: string) => void;
  onTypingChange?: (typing: boolean) => void;
  typingText?: string;
  onBack?: () => void;
  onDelete?: (id: string, scope: DeleteMessageScope) => Promise<void>;
};

export function ChatWindow({
  conversation,
  messages,
  loading,
  onSend,
  onTypingChange,
  typingText,
  onBack,
  onDelete,
}: Props) {
  const [actionMessage, setActionMessage] = useState<MessageItemData | null>(null);
  const [deleteScope, setDeleteScope] = useState<DeleteMessageScope | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const closeActions = () => { if (!deleting) { setActionMessage(null); setDeleteScope(null); setDeleteError(""); } };
  const confirmDelete = async () => {
    if (!actionMessage || !deleteScope || !onDelete || deleting) return;
    setDeleting(true); setDeleteError("");
    try {
      await onDelete(actionMessage.id, deleteScope);
      setActionMessage(null); setDeleteScope(null);
    } catch (error) { setDeleteError(error instanceof Error ? error.message : "Không thể xóa tin nhắn."); }
    finally { setDeleting(false); }
  };
  // Offset zero is the newest message, so opening a chat requires no scroll.
  const newestFirst = useMemo(() => [...messages].reverse(), [messages]);
  if (!conversation) {
    return (
      <View style={styles.placeholder}>
        <Ionicons
          name="chatbubble-ellipses-outline"
          size={56}
          color={colors.primary}
        />
        <Text style={styles.placeholderTitle}>Chọn một cuộc trò chuyện</Text>
        <Text style={styles.placeholderSub}>
          Tin nhắn của bạn sẽ hiển thị ở đây
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        {onBack && (
          <Pressable onPress={onBack} hitSlop={8}>
            <Ionicons name="chevron-back" size={24} color={colors.primary} />
          </Pressable>
        )}
        <Avatar
          name={conversation.name}
          uri={conversation.avatarUrl}
          size={40}
        />
        <Text style={styles.headerName} numberOfLines={1}>
          {conversation.name}
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator style={styles.loading} color={colors.primary} />
      ) : (
        <FlatList
          key={`messages-${conversation.id}`}
          inverted
          style={styles.list}
          contentContainerStyle={styles.listContent}
          data={newestFirst}
          keyExtractor={(m) => m.id}
          renderItem={({ item }) => <MessageBubble data={item} onActions={onDelete ? () => { setActionMessage(item); setDeleteScope(null); setDeleteError(""); } : undefined} />}
          ListEmptyComponent={
            <Text style={styles.empty}>Hãy bắt đầu cuộc trò chuyện</Text>
          }
        />
      )}

      <Text style={styles.typing}>{typingText || " "}</Text>
      <MessageInput key={`composer-${conversation.id}`} onSend={onSend} onTypingChange={onTypingChange} />
      <Modal visible={!!actionMessage} transparent animationType="fade" onRequestClose={closeActions}>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 24, backgroundColor: "rgba(0,0,0,0.4)" }}>
          <View style={{ width: "100%", maxWidth: 400, backgroundColor: colors.card, borderRadius: 20, padding: 20, gap: 14 }}>
            <Text style={{ fontSize: 18, fontWeight: "700", color: colors.text }}>Xóa tin nhắn</Text>
            {deleteScope ? <>
              <Text>{deleteScope === "me" ? "Tin nhắn sẽ chỉ bị xóa ở phía bạn." : "Tin nhắn sẽ được thu hồi với tất cả thành viên."}</Text>
              <Button title="Xác nhận" variant="danger" onPress={confirmDelete} loading={deleting} />
            </> : <>
              <Button title="Xóa ở phía tôi" variant="outline" onPress={() => setDeleteScope("me")} />
              {actionMessage?.mine && !actionMessage.revoked ? <Button title="Thu hồi với mọi người" variant="danger" onPress={() => setDeleteScope("everyone")} /> : null}
            </>}
            {!!deleteError && <Text accessibilityRole="alert" style={{ color: colors.danger }}>{deleteError}</Text>}
            <Button title="Hủy" variant="outline" onPress={closeActions} disabled={deleting} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: glass.edge,
  },
  headerName: {
    flex: 1,
    fontSize: 17,
    fontWeight: "700",
    color: colors.text,
  },
  list: { flex: 1 },
  listContent: { paddingVertical: 12, flexGrow: 1 },
  loading: { flex: 1 },
  empty: { textAlign: "center", color: colors.muted, marginTop: 40 },
  typing: { color: colors.muted, fontSize: 12, height: 20, marginTop: 4 },
  placeholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  placeholderTitle: { fontSize: 18, fontWeight: "700", color: colors.text },
  placeholderSub: { color: colors.muted },
});
