import { BlurView } from 'expo-blur';
import { Stack } from 'expo-router';
import { StyleSheet } from 'react-native';
import { colors, glass } from '@/theme';

/** Tuỳ chọn thanh tiêu đề trong mờ dùng cho mọi màn hình. */
export const screenOptions = (title: string) => ({
  title,
  headerTransparent: true,
  headerTintColor: colors.primary,
  headerTitleStyle: { fontWeight: '700' as const, color: colors.text },
  headerShadowVisible: false,
  headerBackground: () => <BlurView intensity={60} tint="light" style={[StyleSheet.absoluteFill, { borderBottomWidth: 1, borderBottomColor: glass.border, backgroundColor: 'rgba(255,255,255,0.45)' }]} />,
});

export function Header({ title }: { title: string }) {
  return <Stack.Screen options={screenOptions(title)} />;
}
