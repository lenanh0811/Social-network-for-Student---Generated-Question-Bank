import { Ionicons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors, glass } from '@/theme';

/** Tuỳ chọn thanh tiêu đề trong mờ dùng cho mọi màn hình. */
export const screenOptions = (title: string) => ({
  title,
  headerTransparent: true,
  headerTintColor: colors.primary,
  headerTitleStyle: { fontWeight: '600' as const, color: colors.text },
  headerShadowVisible: false,
  // Mũi tên quay lại đỏ, tự vẽ vì nút mặc định không hiện trên web. Không có trang trước thì về trang Cá nhân.
  headerLeft: () => (
    <Pressable
      onPress={() => (router.canGoBack() ? router.back() : router.replace('/profile' as never))}
      accessibilityRole="button" accessibilityLabel="Quay lại" hitSlop={10}
      style={({ pressed }) => ({ marginLeft: 16, marginRight: 8, opacity: pressed ? 0.6 : 1 })}
    >
      <Ionicons name="arrow-back" size={26} color={colors.primary} />
    </Pressable>
  ),
  headerBackground: () => <View style={[StyleSheet.absoluteFill, { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: glass.border, ...glass.shadow }]} />,
});

export function Header({ title }: { title: string }) {
  return <Stack.Screen options={screenOptions(title)} />;
}
