import {
  View,
  Text,
  FlatList,
  Pressable,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, glass } from "@/theme";
import { ConversationItemData, MessageItemData } from "@/modules/messaging-notification/api/types/types";
import { Avatar } from "./avatar";
import { MessageBubble } from "./message-bubble";
import { MessageInput } from "./message-input";

type Props = {
  conversation: ConversationItemData | null;
  messages: MessageItemData[];
  loading?: boolean;
  onSend: (text: string) => void;
  onBack?: () => void;
};

export function ChatWindow({
  conversation,
  messages,
  loading,
  onSend,
  onBack,
}: Props) {
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
          style={styles.list}
          contentContainerStyle={styles.listContent}
          data={messages}
          keyExtractor={(m) => m.id}
          renderItem={({ item }) => <MessageBubble data={item} />}
          ListEmptyComponent={
            <Text style={styles.empty}>Hãy bắt đầu cuộc trò chuyện</Text>
          }
        />
      )}

      <MessageInput onSend={onSend} />
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
    fontWeight: "600",
    color: colors.text,
  },
  list: { flex: 1 },
  listContent: { paddingVertical: 12, flexGrow: 1 },
  loading: { flex: 1 },
  empty: { textAlign: "center", color: colors.muted, marginTop: 40 },
  placeholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  placeholderTitle: { fontSize: 18, fontWeight: "600", color: colors.text },
  placeholderSub: { color: colors.muted },
});
