import { Ionicons } from '@expo/vector-icons';
import { Text } from 'react-native';
import { isMock } from '@/shared/api/http';
import { Card, go, H1, H2, Muted, Row, Screen, Segmented } from '@/shared/ui';
import { useAuth } from '@/shared/context/Auth';
import { colors } from '@/shared/theme';

export default function Profile() {
  const { user, role, setRole } = useAuth();
  return (
    <Screen wide>
      <Card>
        <Row>
          <Ionicons name="person-circle" size={56} color={colors.primary} />
          <Text style={{ flex: 1 }}><H1>{user.name}</H1>{'\n'}<Muted>{user.id} · {role === 'student' ? 'Sinh viên' : 'Giảng viên'}</Muted></Text>
        </Row>
      </Card>
      <Card>
        <H2>Vai trò (chế độ demo)</H2>
        <Muted>Chuyển vai trò để xem giao diện duyệt câu hỏi dành cho giảng viên.</Muted>
        <Segmented value={role} onChange={setRole} options={[{ value: 'student', label: 'Sinh viên' }, { value: 'lecturer', label: 'Giảng viên' }]} />
      </Card>
      <Card onPress={() => go(`/exam-bank/user/${user.id}`)}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Row><Ionicons name="albums-outline" size={22} color={colors.primary} /><H2>Câu hỏi đã được duyệt của tôi</H2></Row>
          <Ionicons name="chevron-forward" size={20} color={colors.muted} />
        </Row>
      </Card>
      <Muted style={{ textAlign: 'center' }}>{isMock ? 'Đang dùng dữ liệu mô phỏng (chưa đặt EXPO_PUBLIC_API_URL)' : 'Đã kết nối API'}</Muted>
    </Screen>
  );
}
