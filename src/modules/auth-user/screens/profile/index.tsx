import { Ionicons } from '@expo/vector-icons';
import { Image, Pressable, Text, useWindowDimensions, View } from 'react-native';
import { useState } from 'react';
import { countApprovedQuestions, getCheckIn, getLeaderboard, listReviewableSessions } from '@/modules/exam-bank/api/client';
import { isMock } from '@/modules/auth-user/api/client';
import { ActionRow, InfoRow, Notice } from '@/modules/auth-user/components/auth-ui';
import { useAuth } from '@/context/auth';
import { useLoad } from '@/hooks/use-load';
import { MENU_ITEMS } from '@/constants';
import { colors } from '@/theme';
import { Badge } from '@/components/badge';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { fmtDate } from '@/utils/format-date';
import { go } from '@/utils/navigation';
import { H2 } from '@/components/heading';
import { Muted } from '@/components/muted';
import { Row } from '@/components/row';
import { Screen } from '@/components/screen';
import { Segmented } from '@/components/segmented';

const GENDER = { MALE: 'Nam', FEMALE: 'Nữ' } as const;

/** Trang Cá nhân: trang đích sau khi đăng nhập. Hồ sơ (GET /users/me) + số liệu + lối tắt + tài khoản. */
export default function ProfileScreen() {
  const { user, role, setRole, reload } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const wide = useWindowDimensions().width >= 960;

  const onRefresh = async () => {
    setRefreshing(true);
    try { await reload(); } catch { /* lỗi 401 đã được AuthProvider xử lý */ } finally { setRefreshing(false); }
  };

  const left = (
    <>
      <Hero />
      <Card>
        <H2>Thông tin cá nhân</H2>
        <InfoRow icon="id-card-outline" label={role === 'lecturer' ? 'Mã cán bộ' : 'MSSV'} value={user.code} />
        <InfoRow icon="business-outline" label="Khoa / Trường" value={user.faculty} />
        {role === 'student' ? <InfoRow icon="school-outline" label="Chuyên ngành" value={user.major} /> : null}
        {role === 'student' ? <InfoRow icon="people-outline" label="Lớp" value={user.className} /> : null}
        <InfoRow icon="male-female-outline" label="Giới tính" value={user.gender ? GENDER[user.gender] : undefined} />
        <InfoRow icon="calendar-outline" label="Ngày sinh" value={user.dateOfBirth ? fmtDate(user.dateOfBirth) : undefined} />
        <InfoRow icon="mail-outline" label="Email" value={user.email} />
        {user.createdAt ? <InfoRow icon="time-outline" label="Tham gia" value={fmtDate(user.createdAt)} /> : null}
      </Card>
    </>
  );
  const right = (
    <>
      {role === 'lecturer' ? <LecturerStats /> : <StudentStats />}
      <Shortcuts />
      <Card style={{ paddingVertical: 4 }}>
        <ActionRow icon="key-outline" label="Đổi mật khẩu" onPress={() => go('/account/password')} />
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
    </>
  );

  return (
    <Screen wide onRefresh={onRefresh} refreshing={refreshing}>
      {user.verified ? null : (
        <Notice tone="info" action={<Button small variant="outline" title="Xác thực ngay" onPress={() => go('/account/verify-email')} />}>
          Email của bạn chưa được xác thực. Hãy xác thực để dùng đầy đủ tính năng.
        </Notice>
      )}
      {user.profileCompleted === false ? (
        <Notice tone="info" action={<Button small variant="outline" title="Cập nhật ngay" onPress={() => go('/account/edit')} />}>
          Hồ sơ của bạn chưa hoàn thiện. Hãy bổ sung họ tên, ngày sinh và giới thiệu.
        </Notice>
      ) : null}
      {wide ? (
        <View style={{ flexDirection: 'row', gap: 16, alignItems: 'flex-start' }}>
          <View style={{ flex: 5, gap: 12, minWidth: 0 }}>{left}</View>
          <View style={{ flex: 6, gap: 12, minWidth: 0 }}>{right}</View>
        </View>
      ) : <>{left}{right}</>}
    </Screen>
  );
}

/** Ảnh bìa đỏ + ảnh đại diện + tên, vai trò, giới thiệu. */
function Hero() {
  const { user, role } = useAuth();
  const initials = user.name.trim().split(/\s+/).slice(-2).map((w) => w[0]).join('').toUpperCase() || '?';
  return (
    <Card style={{ padding: 0, overflow: 'hidden', gap: 0 }}>
      <View style={{ height: 110, backgroundColor: colors.primary }}>
        {user.coverUrl ? <Image source={{ uri: user.coverUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" /> : null}
      </View>
      <View style={{ paddingHorizontal: 20, paddingBottom: 20, gap: 6 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: -44 }}>
          <View style={{ width: 92, height: 92, borderRadius: 46, borderWidth: 4, borderColor: '#fff', backgroundColor: colors.primaryDark, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            {user.avatarUrl
              ? <Image source={{ uri: user.avatarUrl }} style={{ width: '100%', height: '100%' }} />
              : <Text style={{ color: '#fff', fontWeight: '600', fontSize: 32 }}>{initials}</Text>}
          </View>
          <Button small variant="outline" icon="create-outline" title="Chỉnh sửa hồ sơ" onPress={() => go('/account/edit')} />
        </View>
        <Text style={{ fontSize: 24, fontWeight: '700', color: colors.text, letterSpacing: -0.4, marginTop: 6 }}>{user.name}</Text>
        {user.faculty ? <Muted style={{ fontSize: 14 }}>{[user.faculty, role === 'student' ? user.major : undefined].filter(Boolean).join(' · ')}</Muted> : null}
        <Row>
          <Badge label={role === 'lecturer' ? 'Giảng viên' : 'Sinh viên'} fg={colors.primary} bg={colors.primarySoft} />
          {user.verified
            ? <Badge label="Đã xác thực" fg={colors.success} bg={colors.successSoft} />
            : <Badge label="Chưa xác thực" fg={colors.warning} bg={colors.warningSoft} />}
        </Row>
        {user.bio ? <Text style={{ color: colors.text, marginTop: 4, lineHeight: 21 }}>{user.bio}</Text> : <Muted>Chưa có giới thiệu bản thân.</Muted>}
      </View>
    </Card>
  );
}

function StatGrid({ items }: { items: { label: string; value?: number | string; onPress?: () => void }[] }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
      {items.map((it) => (
        <Pressable key={it.label} disabled={!it.onPress} onPress={it.onPress} style={({ pressed }) => ({ flexGrow: 1, flexBasis: 130, opacity: pressed ? 0.8 : 1 })}>
          <Card style={{ gap: 2 }}>
            <Text style={{ fontSize: 26, fontWeight: '700', color: colors.primary }}>{it.value ?? '–'}</Text>
            <Muted>{it.label}</Muted>
          </Card>
        </Pressable>
      ))}
    </View>
  );
}

function StudentStats() {
  const { user } = useAuth();
  const board = useLoad(() => getLeaderboard('SEMESTER'));
  const checkin = useLoad(getCheckIn);
  const approved = useLoad(() => countApprovedQuestions(user.id), [user.id]);
  const me = board.data?.myRank;
  return (
    <StatGrid items={[
      { label: 'Điểm học kỳ', value: me?.points, onPress: () => go('/games') },
      { label: 'Hạng', value: me ? `#${me.rank}` : undefined, onPress: () => go('/games') },
      { label: 'Chuỗi điểm danh (ngày)', value: checkin.data?.streak },
      { label: 'Câu hỏi đã duyệt', value: approved.data, onPress: () => go(`/exam-bank/user/${user.id}`) },
    ]} />
  );
}

function LecturerStats() {
  const pending = useLoad(listReviewableSessions);
  return (
    <StatGrid items={[
      { label: 'Phiên chờ duyệt', value: pending.data?.length, onPress: () => go('/review') },
    ]} />
  );
}

/** Lối tắt tới các chức năng chính (theo vai trò), thay cho trang chủ cũ. */
function Shortcuts() {
  const { role } = useAuth();
  const items = MENU_ITEMS.filter((i) => i.href !== '/profile' && (!i.roles || i.roles.includes(role)));
  return (
    <>
      <H2>Truy cập nhanh</H2>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        {items.map((i) => (
          <View key={i.href} style={{ flexGrow: 1, flexBasis: 150 }}>
            <Card onPress={() => go(i.href)} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 16 }}>
              <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name={i.icon} size={20} color={colors.primary} />
              </View>
              <Text style={{ flex: 1, fontWeight: '600', color: colors.text }} numberOfLines={2}>{i.label}</Text>
            </Card>
          </View>
        ))}
      </View>
    </>
  );
}
