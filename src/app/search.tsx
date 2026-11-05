import { Stack, useLocalSearchParams } from 'expo-router';
import { Card, Empty, H1, Muted, Screen, screenOptions } from '@/shared/ui';

/** Kết quả tìm kiếm. TODO: nối API tìm kiếm (social-core / exam-bank) khi có. */
export default function Search() {
  const { q } = useLocalSearchParams<{ q?: string }>();
  return (
    <Screen>
      <Stack.Screen options={screenOptions('Tìm kiếm')} />
      <H1>Kết quả cho “{q}”</H1>
      <Muted>Tính năng tìm kiếm sẽ hiển thị câu hỏi, môn học và người dùng khi API sẵn sàng.</Muted>
      <Card><Empty icon="search-outline" text="Chưa có kết quả." /></Card>
    </Screen>
  );
}
