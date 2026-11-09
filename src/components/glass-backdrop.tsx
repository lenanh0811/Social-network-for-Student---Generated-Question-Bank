import type { ReactNode } from 'react';
import { View } from 'react-native';
import { colors } from '@/theme';

/** Nền phẳng, sáng, không gradient/đốm màu để giao diện không rối mắt. */
export function GlassBackdrop({ children }: { children: ReactNode }) {
  return <View style={{ flex: 1, backgroundColor: colors.bg }}>{children}</View>;
}
