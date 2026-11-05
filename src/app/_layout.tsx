import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#f0f2f5' } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="create" options={{ presentation: 'modal', contentStyle: { backgroundColor: '#fff' } }} />
        <Stack.Screen name="posts/[id]" />
      </Stack>
    </>
  );
}
