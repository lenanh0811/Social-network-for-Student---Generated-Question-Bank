import { useState } from 'react';
import { Text, View } from 'react-native';
import { isMock } from '@/modules/auth-user/api/client';
import { ActionRow, Avatar, InfoRow, Notice } from '@/modules/auth-user/components/AuthUi';
import { useAuth } from '@/shared/context/Auth';
import { colors } from '@/shared/theme';
import { Badge, Button, Card, fmtDate, go, H1, H2, Muted, Row, Screen, Segmented } from '@/shared/ui';

const GENDER = { MALE: 'Nam', FEMALE: 'Nữ' } as const;

/** Trang Cá nhân (GET /users/me) + đăng xuất (POST /auth/logout). */
export default function ProfileScreen() {
  const { user, role, setRole, reload, signOut } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    try { await reload(); } catch { /* lỗi 401 đã được AuthProvider xử lý */ } finally { setRefreshing(false); }
  };
  const logout = async () => {
    setLoggingOut(true);
    await signOut(); // guard ở _layout tự đưa về /login
  };

  return (
    <Screen wide onRefresh={onRefresh} refreshing={refreshing}>
      {user.profileCompleted === false ? (
        <Notice tone="info" action={<Button small variant="outline" title="Cập nhật ngay" onPress={() => go('/account/edit')} />}>
          Hồ sơ của bạn chưa hoàn thiện. Hãy bổ sung họ tên, ngày sinh và giới thiệu.
        </Notice>
      ) : null}
      <Card style={{ alignItems: 'center', paddingVertical: 28 }}>
        <Avatar name={user.name} size={88} />
        <H1>{user.name}</H1>
        <Muted style={{ fontSize: 14 }}>{user.email}</Muted>
        <Row style={{ justifyContent: 'center' }}>
          <Badge label={role === 'lecturer' ? 'Giảng viên' : 'Sinh viên'} fg={colors.primary} bg={colors.primarySoft} />
          {user.verified
            ? <Badge label="✓ Đã xác thực" fg={colors.success} bg={colors.successSoft} />
            : <Badge label="Chưa xác thực" fg={colors.warning} bg={colors.warningSoft} />}
        </Row>
        {user.bio ? <Text style={{ color: colors.text, textAlign: 'center', marginTop: 4 }}>{user.bio}</Text> : null}
      </Card>

      <Card>
        <H2>Thông tin cá nhân</H2>
        <InfoRow icon="id-card-outline" label={role === 'lecturer' ? 'Mã cán bộ' : 'MSSV'} value={user.code} />
        <InfoRow icon="business-outline" label="Khoa / Trường" value={user.faculty} />
        {role === 'student' ? <InfoRow icon="school-outline" label="Chuyên ngành" value={user.major} /> : null}
        {role === 'student' ? <InfoRow icon="people-outline" label="Lớp" value={user.className} /> : null}
        <InfoRow icon="male-female-outline" label="Giới tính" value={user.gender ? GENDER[user.gender] : undefined} />
        <InfoRow icon="calendar-outline" label="Ngày sinh" value={user.dateOfBirth ? fmtDate(user.dateOfBirth) : undefined} />
      </Card>

      <Card style={{ paddingVertical: 4 }}>
        <ActionRow icon="create-outline" label="Chỉnh sửa hồ sơ" onPress={() => go('/account/edit')} />
        <ActionRow icon="key-outline" label="Đổi mật khẩu" onPress={() => go('/account/password')} />
        <ActionRow icon="people-outline" label="Bạn bè & theo dõi" onPress={() => go('/friends')} />
        <ActionRow icon="ban-outline" label="Người dùng đã chặn" onPress={() => go('/account/blocked')} />
        <ActionRow icon="phone-portrait-outline" label="Thiết bị đăng nhập" onPress={() => go('/account/devices')} />
        <ActionRow icon="albums-outline" label="Câu hỏi đã được duyệt của tôi" onPress={() => go(`/exam-bank/user/${user.id}`)} last />
      </Card>

      {isMock ? (
        <Card>
          <H2>Vai trò (chế độ demo)</H2>
          <Muted>Chuyển vai trò để xem giao diện duyệt câu hỏi dành cho giảng viên.</Muted>
          <Segmented value={role} onChange={setRole} options={[{ value: 'student', label: 'Sinh viên' }, { value: 'lecturer', label: 'Giảng viên' }]} />
        </Card>
      ) : null}

      {confirmLogout ? (
        <Card>
          <H2>Đăng xuất khỏi thiết bị này?</H2>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}><Button title="Huỷ" variant="outline" onPress={() => setConfirmLogout(false)} /></View>
            <View style={{ flex: 1 }}><Button title="Đăng xuất" variant="danger" icon="log-out-outline" onPress={logout} loading={loggingOut} /></View>
          </View>
        </Card>
      ) : (
        <Button title="Đăng xuất" variant="outline" icon="log-out-outline" onPress={() => setConfirmLogout(true)} />
      )}
      <Muted style={{ textAlign: 'center' }}>{isMock ? 'Đang dùng dữ liệu mô phỏng (chưa đặt EXPO_PUBLIC_API_URL)' : 'Đã kết nối API'}</Muted>
    </Screen>
  );
}
