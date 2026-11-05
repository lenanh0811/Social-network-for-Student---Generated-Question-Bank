import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from '@/shared/context/Auth';
import { GlassBackdrop, Loading, screenOptions } from '@/shared/ui';

/** Các route cần đăng nhập. Route mới cần bảo vệ thì thêm tên vào đây. */
const PRIVATE_ROUTES = [
  'exam-bank/exam/[id]', 'exam-bank/exam/chat', 'exam-bank/exam/generate',
  'exam-bank/question/[id]', 'exam-bank/question/ai/[id]', 'exam-bank/question/edit/[id]',
  'exam-bank/review/[id]', 'exam-bank/submission/[id]', 'exam-bank/submission/form', 'exam-bank/user/[userId]',
  'account/edit', 'account/password', 'users/[userId]',
];

function RootStack() {
  const { status } = useAuth();
  // Đang khôi phục phiên: chưa biết đưa người dùng tới đâu.
  if (status === 'loading') return <GlassBackdrop><Loading /></GlassBackdrop>;
  const signedIn = status === 'signedIn';
  return (
    <Stack screenOptions={screenOptions('')}>
      {/* Chưa đăng nhập mà mở link riêng tư => về /login; đăng nhập xong => rời nhóm (auth) về trang chủ. */}
      <Stack.Protected guard={signedIn} redirectTo="/login">
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="create" options={{ headerShown: false, presentation: 'modal', contentStyle: { backgroundColor: '#fff' } }} />
        <Stack.Screen name="posts/[id]" options={{ headerShown: false }} />
        {PRIVATE_ROUTES.map((name) => <Stack.Screen key={name} name={name} />)}
      </Stack.Protected>
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="light" />
      <RootStack />
    </AuthProvider>
  );
}
