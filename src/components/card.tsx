import type { ReactNode } from 'react';
import { Pressable, StyleSheet, type ViewStyle } from 'react-native';
import { Glass } from '@/components/glass';
import { space } from '@/theme';

export function Card({ children, style, onPress }: { children: ReactNode; style?: ViewStyle; onPress?: () => void }) {
  const inner = <Glass style={[styles.card, style]}>{children}</Glass>;
  return onPress ? <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1, transform: [{ scale: pressed ? 0.99 : 1 }] })}>{inner}</Pressable> : inner;
}

const styles = StyleSheet.create({
  card: { borderRadius: 24, padding: space.lg, gap: space.sm },
});
