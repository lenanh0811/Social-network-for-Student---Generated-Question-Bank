import { View, StyleSheet } from "react-native";
import { ViewProps } from "react-native";
import { glass } from "@/theme";

export function GlassCard({ style, ...props }: ViewProps) {
  return <View style={[styles.card, style]} {...props} />;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: glass.tint,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: glass.border,
    padding: 16,
    ...glass.shadow,
    elevation: 4,
  },
});