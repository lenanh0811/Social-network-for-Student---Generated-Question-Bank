import { useState, useSyncExternalStore } from 'react';
import { Text, View } from 'react-native';
import { device, isDeviceRegistered, isMock, subscribeDevice } from '@/modules/auth-user/api/client';
import { ActionRow, Avatar, InfoRow } from '@/modules/auth-user/components/AuthUi';
import { useAuth } from '@/shared/context/Auth';
import { useLoad } from '@/shared/hooks';
import { colors } from '@/shared/theme';
import { Badge, Button, Card, go, H1, H2, Muted, Row, Screen, Segmented } from '@/shared/ui';

/** Trang Cá nhân (GET /users/me) + đăng xuất. */
export default function ProfileScreen() {
  const { user, role, setRole, reload, signOut } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const dev = useLoad(device);
  const registered = useSyncExternalStore(subscribeDevice, isDeviceRegistered, isDeviceRegistered);

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
        {role === 'student' ? <InfoRow icon="id-card-outline" label="MSSV" value={user.studentId} /> : null}
        <InfoRow icon="business-outline" label="Khoa / Trường" value={user.faculty} />
        {role === 'student' ? <InfoRow icon="people-outline" label="Lớp" value={user.className} /> : null}
        {isMock ? <InfoRow icon="call-outline" label="Điện thoại" value={user.phone} /> : null}
      </Card>

      {isMock ? <Card>
        <H2>Thiết bị này</H2>
        <InfoRow icon={dev.data?.platform === 'web' ? 'desktop-outline' : 'phone-portrait-outline'} label="Tên thiết bị" value={dev.data?.name} />
        <Row>
          {registered
            ? <Badge label="✓ Đã đăng ký nhận thông báo" fg={colors.success} bg={colors.successSoft} />
            : <Badge label="Chưa đăng ký thiết bị" fg={colors.warning} bg={colors.warningSoft} />}
        </Row>
        <Muted>Thiết bị được đăng ký khi đăng nhập và huỷ đăng ký khi bạn đăng xuất.</Muted>
      </Card> : null}

      <Card style={{ paddingVertical: 4 }}>
        <ActionRow icon="create-outline" label="Chỉnh sửa hồ sơ" onPress={() => go('/account/edit')} />
        <ActionRow icon="key-outline" label="Đổi mật khẩu" onPress={() => go('/account/password')} />
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
