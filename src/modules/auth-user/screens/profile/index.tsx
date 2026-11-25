import { Ionicons } from '@expo/vector-icons';
import { Image, Pressable, Text, useWindowDimensions, View } from 'react-native';
import { useState } from 'react';
import { socialApi } from '@/modules/social-score/api/social-api';
import { PostCard } from '@/modules/social-score/components/post-card';
import { ActivityIndicator } from 'react-native';
import { countApprovedQuestions, getCheckIn, getLeaderboard, listReviewableSessions } from '@/modules/exam-bank/api/client';
import { isMock } from '@/modules/auth-user/api/client';
import { ProfileHero } from '@/modules/auth-user/components/profile-hero';
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

  const [tab, setTab] = useState<'posts' | 'about' | 'more'>('posts');

  const about = (
    <Card>
      <H2>Giới thiệu</H2>
      <InfoRow icon="id-card-outline" label={role === 'student' ? 'MSSV' : role === 'lecturer' ? 'Mã cán bộ' : 'Mã quản trị viên'} value={user.code} />
      <InfoRow icon="business-outline" label="Khoa / Trường" value={user.faculty} />
      {role === 'student' ? <InfoRow icon="school-outline" label="Chuyên ngành" value={user.major} /> : null}
      {role === 'student' ? <InfoRow icon="people-outline" label="Lớp" value={user.className} /> : null}
      <InfoRow icon="male-female-outline" label="Giới tính" value={user.gender ? GENDER[user.gender] : undefined} />
      <InfoRow icon="calendar-outline" label="Ngày sinh" value={user.dateOfBirth ? fmtDate(user.dateOfBirth) : undefined} />
      <InfoRow icon="mail-outline" label="Email" value={user.email} />
      {user.createdAt ? <InfoRow icon="time-outline" label="Tham gia" value={fmtDate(user.createdAt)} /> : null}
    </Card>
  );
  const more = (
    <>
      {role === 'lecturer' ? <LecturerStats /> : role === 'student' ? <StudentStats /> : null}
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
      <View style={{ width: '100%', maxWidth: 940, alignSelf: 'center', gap: 12 }}>
        <Hero tab={tab} setTab={setTab} />
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
        {wide && tab === 'posts' ? (
          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
            <View style={{ flex: 4, minWidth: 0 }}>{about}</View>
            <View style={{ flex: 6, gap: 12, minWidth: 0 }}><MyPosts /></View>
          </View>
        ) : tab === 'posts' ? <MyPosts /> : tab === 'about' ? about : more}
      </View>
    </Screen>
  );
}

function MyPosts() {
  const [posts, setPosts] = useState<import('@/modules/social-score/api/types').post[]>([]);
  const { loading, error } = useLoad(async () => { const p = await socialApi.getMyPosts(); setPosts(p.posts); return p; });
  return (
    <>
      {loading ? <ActivityIndicator color={colors.primary} style={{ margin: 20 }} /> : null}
      {error ? <Card><Muted>{error}</Muted></Card> : null}
      {!loading && !error && posts.length === 0 ? <Card style={{ alignItems: 'center', paddingVertical: 28 }}><Muted>Bạn chưa có bài viết nào.</Muted></Card> : null}
      {posts.map((p) => (
        <PostCard key={p.id} post={p} onOpen={() => go(`/posts/${p.id}`)} onUpdate={(u) => setPosts((c) => c.map((x) => (x.id === u.id ? u : x)))} />
      ))}
    </>
  );
}

/** Đầu trang cá nhân của tôi. */
function Hero({ tab, setTab }: { tab: 'posts' | 'about' | 'more'; setTab: (t: 'posts' | 'about' | 'more') => void }) {
  const { user, role } = useAuth();
  return (
    <ProfileHero
      name={user.name} avatarUrl={user.avatarUrl} coverUrl={user.coverUrl}
      subtitle={[role === 'student' ? 'Sinh viên' : role === 'lecturer' ? 'Giảng viên' : 'Quản trị viên', user.faculty, role === 'student' ? user.major : undefined].filter(Boolean).join(' · ')}
      bio={user.bio}
      badge={user.verified ? null : <Badge label="Chưa xác thực" fg={colors.warning} bg={colors.warningSoft} />}
      action={<Button small icon="create-outline" title="Chỉnh sửa hồ sơ" onPress={() => go('/account/edit')} />}
      tabs={[['posts', 'Bài viết'], ['about', 'Giới thiệu'], ['more', 'Tiện ích & tài khoản']] as const}
      tab={tab} setTab={setTab}
    />
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
              <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
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
