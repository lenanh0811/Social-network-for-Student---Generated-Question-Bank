import { Ionicons } from '@expo/vector-icons';
import { router, usePathname } from 'expo-router';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';
import { listFriends } from '@/modules/relationship-privacy/api/client';
import { useLoad } from '@/hooks/use-load';
import { useAuth } from '@/context/auth';
import { MENU_ITEMS } from '@/constants';
import { colors } from '@/theme';

export const SIDEBAR_W = 260;
/** Chỉ trang chủ (bảng tin) có cột bạn bè bên phải; các trang khác dùng không gian đó cho nội dung. */
export const hasRightSidebar = (path: string) => path === '/' || path.startsWith('/social');
/** Bề rộng tối đa của cột nội dung: hẹp ở bảng tin, rộng hơn ở các trang chức năng. */
export const contentMaxWidth = (path: string) => (hasRightSidebar(path) ? 720 : 960);
const useItems = () => {
  const { role } = useAuth();
  return MENU_ITEMS.filter((i) => i.href !== '/profile' && (!i.roles || i.roles.includes(role)));
};
const roleLabel = (r: string) => (r === 'student' ? 'Sinh viên' : r === 'lecturer' ? 'Giảng viên' : 'Quản trị viên');

export function UserAvatar({ size = 36 }: { size?: number }) {
  const { user } = useAuth();
  const initials = user.name.trim().split(/\s+/).slice(-2).map((w) => w[0]).join('').toUpperCase() || '?';
  return user.avatarUrl ? (
    <Image source={{ uri: user.avatarUrl }} style={{ width: size, height: size, borderRadius: size / 2 }} />
  ) : (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: colors.primary, fontWeight: '700', fontSize: size * 0.38 }}>{initials}</Text>
    </View>
  );
}

function Item({ onPress, active, children }: { onPress: () => void; active?: boolean; children: React.ReactNode }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({
      flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 8, borderRadius: 999,
      backgroundColor: active ? '#E7F3FF' : pressed ? '#E4E6EB' : 'transparent',
    })}>
      {children}
    </Pressable>
  );
}

/** Sidebar trái cố định kiểu Facebook: hồ sơ ở đầu, các lối tắt bên dưới, đăng xuất ở cuối. */
export function Sidebar({ top }: { top: number }) {
  const { user, role } = useAuth();
  const items = useItems();
  const path = usePathname();
  const go = (href: string) => router.navigate(href as never);
  return (
    <View style={{ width: SIDEBAR_W, paddingTop: top + 8, paddingHorizontal: 8, paddingBottom: 8 }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 4 }}>
        <Item onPress={() => go('/profile')} active={path.startsWith('/profile')}>
          <UserAvatar size={36} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: '600', fontSize: 15, color: colors.text }} numberOfLines={1}>{user.name}</Text>
            <Text style={{ fontSize: 12, color: colors.muted }}>{roleLabel(role)}</Text>
          </View>
        </Item>
        <Item onPress={() => router.push('/friends' as never)} active={path.startsWith('/friends')}>
          <View style={{ width: 32, height: 32, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="people" size={26} color="#1877F2" /></View>
          <Text style={{ fontWeight: '500', fontSize: 15, color: colors.text }}>Bạn bè & theo dõi</Text>
        </Item>
        {items.map((i) => {
          const active = path.startsWith(i.href);
          return (
            <Item key={i.href} onPress={() => go(i.href)} active={active}>
              <View style={{ width: 32, height: 32, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name={i.icon} size={25} color={colors.primary} />
              </View>
              <Text style={{ fontWeight: active ? '700' : '500', fontSize: 15, color: colors.text }}>{i.label}</Text>
            </Item>
          );
        })}
      </ScrollView>
    </View>
  );
}

/** Thanh điều hướng dưới cùng cho màn hình hẹp (thay sidebar). */
export function BottomNav({ bottomInset }: { bottomInset: number }) {
  const items = useItems();
  const path = usePathname();
  const all = [...items.map((i) => ({ href: i.href, icon: i.icon, label: i.label })), { href: '/profile', icon: 'person-outline' as const, label: 'Cá nhân' }];
  return (
    <View style={{ flexDirection: 'row', backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#E4E6EB', paddingBottom: bottomInset }}>
      {all.map((i) => {
        const active = path.startsWith(i.href);
        return (
          <Pressable key={i.href} accessibilityLabel={i.label} onPress={() => router.navigate(i.href as never)}
            style={{ flex: 1, alignItems: 'center', justifyContent: 'center', height: 52, borderTopWidth: 3, borderTopColor: active ? colors.primary : 'transparent' }}>
            <Ionicons name={i.icon} size={26} color={active ? colors.primary : colors.muted} />
          </Pressable>
        );
      })}
    </View>
  );
}

/** Cột phải: danh sách bạn bè, chấm xanh = đang trực tuyến (khi backend cung cấp trạng thái online). */
export function ContactsSidebar({ top }: { top: number }) {
  const { data, loading, error } = useLoad(listFriends);
  const friends = [...(data?.items ?? [])].sort((a, b) => Number(!!b.online) - Number(!!a.online));
  return (
    <View style={{ width: SIDEBAR_W, paddingTop: top + 16, paddingHorizontal: 8, paddingBottom: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8, marginBottom: 6 }}>
        <Text style={{ fontSize: 17, fontWeight: '600', color: colors.muted }}>Người liên hệ</Text>
        <Pressable onPress={() => router.push('/friends' as never)} accessibilityLabel="Quản lý bạn bè" hitSlop={8}>
          <Ionicons name="ellipsis-horizontal" size={20} color={colors.muted} />
        </Pressable>
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 2 }}>
        {loading && !data ? <Text style={{ color: colors.muted, padding: 8 }}>Đang tải...</Text> : null}
        {error ? <Text style={{ color: colors.muted, padding: 8 }}>Không tải được danh sách bạn bè.</Text> : null}
        {!loading && !error && friends.length === 0 ? <Text style={{ color: colors.muted, padding: 8 }}>Chưa có bạn bè nào.</Text> : null}
        {friends.map((f) => {
          const initials = f.name.trim().split(/\s+/).slice(-2).map((w) => w[0]).join('').toUpperCase() || '?';
          return (
            <Item key={f.id} onPress={() => router.push(`/users/${f.id}` as never)}>
              <View>
                {f.avatarUrl ? (
                  <Image source={{ uri: f.avatarUrl }} style={{ width: 36, height: 36, borderRadius: 18 }} />
                ) : (
                  <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 14 }}>{initials}</Text>
                  </View>
                )}
                {f.online ? <View style={{ position: 'absolute', right: -1, bottom: -1, width: 12, height: 12, borderRadius: 6, backgroundColor: '#31A24C', borderWidth: 2, borderColor: '#F0F2F5' }} /> : null}
              </View>
              <Text style={{ flex: 1, fontWeight: '500', fontSize: 15, color: colors.text }} numberOfLines={1}>{f.name}</Text>
            </Item>
          );
        })}
      </ScrollView>
    </View>
  );
}
