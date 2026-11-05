import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import { listNeedsEdit, listPendingSessions } from '@/modules/exam-bank/api/client';
import { useAuth } from '@/shared/context/Auth';
import { useLoad } from '@/shared/hooks';
import { MENU_ITEMS } from '@/shared/menu';
import { colors } from '@/shared/theme';
import { Card, go, H1, H2, Muted, Row, Screen } from '@/shared/ui';

/** Trang chủ theo vai trò. Các module khác bổ sung khối nội dung của mình tại đây. */
export default function Home() {
  const { user, role } = useAuth();
  const shortcuts = MENU_ITEMS.filter((i) => i.href !== '/' && i.href !== '/profile' && (!i.roles || i.roles.includes(role)));
  return (
    <Screen>
      <Card style={{ paddingVertical: 28 }}>
        <Ionicons name={role === 'lecturer' ? 'ribbon' : 'school'} size={40} color={colors.primary} />
        <Text style={{ color: colors.muted, fontWeight: '600' }}>Xin chào{role === 'lecturer' ? ' giảng viên' : ''},</Text>
        <H1>{user.name}</H1>
        <Muted>{role === 'lecturer' ? 'Duyệt câu hỏi, chỉnh sửa cùng AI và sinh đề thi từ ngân hàng câu hỏi.' : 'Đóng góp câu hỏi, chơi minigame và luyện tập cùng bạn học.'}</Muted>
      </Card>
      {role === 'lecturer' ? <LecturerTodo /> : null}
      <H2>Truy cập nhanh</H2>
      <Row style={{ gap: 12 }}>
        {shortcuts.map((i) => (
          <View key={i.href} style={{ flexGrow: 1, flexBasis: 150 }}>
            <Card onPress={() => go(i.href)} style={{ alignItems: 'center', paddingVertical: 24 }}>
              <Ionicons name={i.icon} size={30} color={colors.primary} />
              <Text style={{ fontWeight: '700', color: colors.text, textAlign: 'center' }}>{i.label}</Text>
            </Card>
          </View>
        ))}
      </Row>
    </Screen>
  );
}

/** Việc cần xử lý của giảng viên. */
function LecturerTodo() {
  const pending = useLoad(listPendingSessions);
  const needs = useLoad(listNeedsEdit);
  const stat = (n: number | undefined, label: string, icon: 'time' | 'create', color: string) => (
    <View style={{ flexGrow: 1, flexBasis: 150 }}>
      <Card onPress={() => go('/review')} style={{ alignItems: 'center', paddingVertical: 20 }}>
        <Ionicons name={icon} size={24} color={color} />
        <Text style={{ fontSize: 32, fontWeight: '800', color }}>{n ?? '–'}</Text>
        <Muted>{label}</Muted>
      </Card>
    </View>
  );
  return (
    <>
      <H2>Cần xử lý</H2>
      <Row style={{ gap: 12 }}>
        {stat(pending.data?.length, 'Phiên chờ duyệt', 'time', colors.warning)}
        {stat(needs.data?.length, 'Câu “Cần edit”', 'create', colors.blue)}
      </Row>
    </>
  );
}
