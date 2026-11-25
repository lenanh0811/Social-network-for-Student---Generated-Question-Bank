import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { glass } from '@/theme';

/** Bề mặt trắng phẳng kiểu Facebook (giữ tên `Glass` để không phải đổi chỗ dùng). */
export function Glass({ children, style, strong }: {
  children?: ReactNode; style?: StyleProp<ViewStyle>; strong?: boolean; intensity?: number;
}) {
  return <View style={[styles.surface, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  surface: { overflow: 'hidden', backgroundColor: glass.tint, borderWidth: 1, borderColor: glass.border, ...glass.shadow },
});
