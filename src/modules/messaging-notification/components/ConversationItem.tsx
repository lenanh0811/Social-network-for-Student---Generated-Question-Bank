import { View, Text, Pressable, StyleSheet } from "react-native";
import { colors, radius, glass } from "@/shared/theme";
import { ConversationItemData } from "../types/types";
import { Avatar } from "./Avatar";

type Props = {
  data: ConversationItemData;
  active?: boolean;
  onPress: (data: ConversationItemData) => void;
};

export function ConversationItem({ data, active, onPress }: Props) {
  const unread = (data.unreadCount ?? 0) > 0;
  return (
    <Pressable
      style={[styles.item, active && styles.active]}
      onPress={() => onPress(data)}
    >
      <Avatar name={data.name} uri={data.avatarUrl} />
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>
          {data.name}
        </Text>
        <Text
          style={[styles.preview, unread && styles.previewUnread]}
          numberOfLines={1}
        >
          {data.lastMessage || "Chưa có tin nhắn"}
        </Text>
      </View>
      <View style={styles.meta}>
        {!!data.time && <Text style={styles.time}>{data.time}</Text>}
        {unread && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{data.unreadCount}</Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 10,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: "transparent",
  },
  active: {
    backgroundColor: glass.tintStrong,
    borderColor: glass.border,
  },
  body: { flex: 1 },
  name: { fontSize: 16, fontWeight: "700", color: colors.text },
  preview: { fontSize: 14, color: colors.muted, marginTop: 2 },
  previewUnread: { color: colors.text, fontWeight: "600" },
  meta: { alignItems: "flex-end", gap: 6 },
  time: { fontSize: 12, color: colors.muted },
  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { color: colors.card, fontSize: 12, fontWeight: "700" },
});
