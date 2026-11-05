import { View, Text, StyleSheet } from "react-native";
import { colors, glass } from "@/shared/theme";
import { MessageItemData } from "../types/types";

export function MessageBubble({ data }: { data: MessageItemData }) {
  return (
    <View style={[styles.row, data.mine ? styles.rowMine : styles.rowOther]}>
      <View style={[styles.bubble, data.mine ? styles.mine : styles.other]}>
        <Text style={data.mine ? styles.textMine : styles.textOther}>
          {data.content}
        </Text>
        {!!data.time && (
          <Text style={[styles.time, data.mine && styles.timeMine]}>
            {data.time}
          </Text>
        )}
      </View>
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
});
