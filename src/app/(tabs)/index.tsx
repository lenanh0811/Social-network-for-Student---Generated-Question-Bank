import { Ionicons } from '@expo/vector-icons';
import { Card, H1, Muted, Screen } from '@/shared/ui';
import { colors } from '@/shared/theme';

/** Trang chủ chung của nhóm — các module khác bổ sung nội dung tại đây. */
export default function Home() {
  return (
    <Screen>
      <Card style={{ alignItems: 'center', paddingVertical: 32 }}>
        <Ionicons name="school" size={48} color={colors.primary} />
        <H1>Mạng xã hội sinh viên</H1>
        <Muted>Trang chủ đang chờ nội dung từ các module khác.</Muted>
      </Card>
    </Screen>
  );
}
