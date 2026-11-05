import { Stack } from 'expo-router';

export const unstable_settings = { initialRouteName: 'login' };

/** Nhóm màn hình dành cho khách (chưa đăng nhập). */
export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: 'transparent' } }} />;
}
