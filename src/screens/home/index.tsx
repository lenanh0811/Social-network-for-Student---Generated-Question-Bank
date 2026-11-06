import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';
import { listNeedsEdit, listPendingSessions } from '@/modules/exam-bank/api/client';
import { useAuth } from '@/context/auth';
import { useLoad } from '@/hooks/use-load';
import { MENU_ITEMS } from '@/constants';
import { colors } from '@/theme';
import { Badge } from '@/components/badge';
import { Card } from '@/components/card';
import { go } from '@/utils/navigation';
import { H1, H2 } from '@/components/heading';
import { Muted } from '@/components/muted';
import { Row } from '@/components/row';
import { Screen } from '@/components/screen';

/** Trang chủ theo vai trò. Các module khác bổ sung khối nội dung của mình tại đây. */
export function Home() {
  const { user, role } = useAuth();
  const shortcuts = MENU_ITEMS.filter((i) => i.href !== '/' && i.href !== '/profile' && (!i.roles || i.roles.includes(role)));
  return (
    <Screen wide>
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

/** Việc cần xử lý của giảng viên: danh sách gọn, bấm để mở màn duyệt. */
function LecturerTodo() {
  const pending = useLoad(listPendingSessions);
  const needs = useLoad(listNeedsEdit);
  const item = (label: string, n: number | undefined, last?: boolean) => (
    <Pressable onPress={() => go('/review')} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: last ? 0 : 1, borderBottomColor: 'rgba(0,0,0,0.06)' }}>
      <Text style={{ color: colors.text, fontWeight: '600' }}>{label}</Text>
      <Row style={{ gap: 6 }}>
        {n ? <Badge label={String(n)} fg="#fff" bg={colors.primary} /> : <Muted>Không có</Muted>}
        <Ionicons name="chevron-forward" size={18} color={colors.muted} />
      </Row>
    </Pressable>
  );
  return (
    <>
      <H2>Cần xử lý</H2>
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        {item('Phiên chờ duyệt', pending.data?.length)}
        {item('Câu hỏi “Cần edit”', needs.data?.length, true)}
      </Card>
    </>
  );
}
