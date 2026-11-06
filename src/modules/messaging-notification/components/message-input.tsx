import { useState } from "react";
import { View, TextInput, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, glass } from "@/theme";

type Props = { onSend: (text: string) => void };

export function MessageInput({ onSend }: Props) {
  const [text, setText] = useState("");
  const canSend = text.trim().length > 0;

  const submit = () => {
    if (!canSend) return;
    onSend(text.trim());
    setText("");
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder="Aa"
        placeholderTextColor={colors.muted}
        value={text}
        onChangeText={setText}
        onSubmitEditing={submit}
        returnKeyType="send"
      />
      <Pressable
        style={[styles.send, !canSend && styles.sendDisabled]}
        onPress={submit}
        disabled={!canSend}
      >
        <Ionicons name="send" size={18} color={colors.card} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingTop: 12,
  },
  input: {
    flex: 1,
    height: 44,
    borderRadius: radius.pill,
    paddingHorizontal: 16,
    backgroundColor: glass.tintStrong,
    borderWidth: 1,
    borderColor: glass.border,
    color: colors.text,
    fontSize: 15,
    outlineStyle: "none" as any,
  },
  send: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  sendDisabled: { opacity: 0.4 },
});
