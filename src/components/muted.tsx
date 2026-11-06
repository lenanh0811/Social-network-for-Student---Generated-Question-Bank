import type { ReactNode } from 'react';
import { StyleSheet, Text } from 'react-native';
import { colors } from '@/theme';

/** Chữ phụ nhỏ, màu xám. */
export function Muted({ children, style }: { children: ReactNode; style?: object }) {
  return <Text style={[styles.muted, style]}>{children}</Text>;
}

const styles = StyleSheet.create({
  muted: { fontSize: 13, color: colors.muted },
});
