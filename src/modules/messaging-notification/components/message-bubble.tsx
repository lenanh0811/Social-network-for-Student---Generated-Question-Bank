import { View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, glass } from "@/theme";
import { MessageItemData } from "@/modules/messaging-notification/api/types/types";

export function MessageBubble({ data, onActions }: { data: MessageItemData; onActions?: () => void }) {
  return (
    <View style={[styles.row, data.mine ? styles.rowMine : styles.rowOther]}>
      <View style={[styles.bubble, data.mine ? styles.mine : styles.other]}>
        <Text style={data.mine ? styles.textMine : styles.textOther}>
          {data.revoked ? "Tin nhắn đã được thu hồi" : data.content}
        </Text>
        {data.pending && <Text style={styles.status}>Đang gửi...</Text>}
        {data.failed && <Text style={styles.status}>Gửi thất bại</Text>}
        {!!data.time && (
          <Text style={[styles.time, data.mine && styles.timeMine]}>
            {data.time}
          </Text>
        )}
      </View>
      {onActions && Number(data.id) > 0 && !data.pending ? (
        <Pressable onPress={onActions} hitSlop={8} accessibilityRole="button" accessibilityLabel="Tùy chọn tin nhắn" style={{ padding: 8, alignSelf: "center" }}>
          <Ionicons name="ellipsis-horizontal" size={20} color={colors.muted} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", marginVertical: 3 },
  rowMine: { justifyContent: "flex-end" },
  rowOther: { justifyContent: "flex-start" },
  bubble: {
    maxWidth: "70%",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  mine: { backgroundColor: colors.primary, borderBottomRightRadius: 6 },
  other: {
    backgroundColor: glass.tintStrong,
    borderBottomLeftRadius: 6,
    borderWidth: 1,
    borderColor: glass.border,
  },
  textMine: { color: colors.card, fontSize: 15 },
  textOther: { color: colors.text, fontSize: 15 },
  time: { fontSize: 11, color: colors.muted, marginTop: 4 },
  timeMine: { color: "rgba(255,255,255,0.8)" },
  status: { fontSize: 10, color: colors.muted, marginTop: 2 },
});
