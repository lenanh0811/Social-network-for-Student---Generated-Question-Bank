import { View, Text, Image, StyleSheet } from "react-native";
import { colors } from "@/theme";

type Props = { name: string; uri?: string | null; size?: number };

export function Avatar({ name, uri, size = 48 }: Props) {
  const box = { width: size, height: size, borderRadius: size / 2 };
  if (uri) return <Image source={{ uri }} style={box} />;
  return (
    <View style={[styles.fallback, box]}>
      <Text style={[styles.letter, { fontSize: size * 0.4 }]}>
        {name.trim().charAt(0).toUpperCase() || "?"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  letter: { color: colors.primary, fontWeight: "600" },
});
