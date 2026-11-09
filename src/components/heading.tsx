import type { ReactNode } from 'react';
import { StyleSheet, Text } from 'react-native';
import { colors } from '@/theme';

export function H1({ children }: { children: ReactNode }) {
  return <Text style={styles.h1}>{children}</Text>;
}
export function H2({ children }: { children: ReactNode }) {
  return <Text style={styles.h2}>{children}</Text>;
}

const styles = StyleSheet.create({
  h1: { fontSize: 26, fontWeight: "700", color: colors.text, letterSpacing: -0.5 },
  h2: { fontSize: 16, fontWeight: '600', color: colors.text },
});
