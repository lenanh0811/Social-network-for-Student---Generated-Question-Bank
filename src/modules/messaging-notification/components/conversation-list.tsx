import { useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  Pressable,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, glass } from "@/theme";
import { ConversationItemData } from "@/modules/messaging-notification/api/types/types";
import { ConversationItem } from "./conversation-item";

type Props = {
  items: ConversationItemData[];
  loading?: boolean;
  error?: string | null;
  selectedId?: string | null;
  onSelect: (data: ConversationItemData) => void;
  onRetry?: () => void;
};

export function ConversationList({
  items,
  loading,
  error,
  selectedId,
  onSelect,
  onRetry,
}: Props) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(
    () =>
      items.filter((c) =>
        c.name.toLowerCase().includes(query.trim().toLowerCase()),
      ),
    [items, query],
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Tin nhắn</Text>

      <View style={styles.search}>
        <Ionicons name="search" size={18} color={colors.muted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm kiếm cuộc trò chuyện..."
          placeholderTextColor={colors.muted}
          value={query}
          onChangeText={setQuery}
        />
      </View>

      {loading ? (
        <ActivityIndicator style={styles.state} color={colors.primary} />
      ) : error ? (
        <View style={styles.state}>
          <Text style={styles.stateText}>{error}</Text>
          {onRetry && (
            <Pressable style={styles.retry} onPress={onRetry}>
              <Text style={styles.retryText}>Thử lại</Text>
            </Pressable>
          )}
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(c) => c.id}
          renderItem={({ item }) => (
            <ConversationItem
              data={item}
              active={item.id === selectedId}
              onPress={onSelect}
            />
          )}
          ListEmptyComponent={
            <View style={styles.state}>
              <Ionicons
                name="chatbubbles-outline"
                size={40}
                color={colors.primary}
              />
              <Text style={styles.stateText}>Chưa có cuộc trò chuyện nào</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.text,
    marginBottom: 12,
  },
  search: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: glass.tintStrong,
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    height: 42,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: glass.border,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
    outlineStyle: "none" as any,
  },
  state: { alignItems: "center", marginTop: 40, gap: 10 },
  stateText: { color: colors.muted, fontSize: 15 },
  retry: {
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  retryText: { color: colors.card, fontWeight: "600" },
});
