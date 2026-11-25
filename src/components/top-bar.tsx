import { Ionicons } from '@expo/vector-icons';
import { router, usePathname } from 'expo-router';
import { useState } from 'react';
import { Platform, Pressable, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BRAND, MENU_ITEMS } from '@/constants';
import { useAuth } from '@/context/auth';
import { useNotifications } from '@/context/notifications';
import { colors, glass } from '@/theme';
import { SIDEBAR_W, UserAvatar, contentMaxWidth, hasRightSidebar } from './side-menu';

export const WIDE_BREAKPOINT = 900;
export const useTopBarHeight = () => { const { top } = useSafeAreaInsets(); return (Platform.OS === 'web' ? 0 : top) + 56; };

export const Logo = () => (
  <Pressable onPress={() => router.navigate('/social' as never)} accessibilityLabel="Về bảng tin" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
    <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: '#fff', fontWeight: '700', fontSize: 24 }}>{BRAND.initial}</Text>
    </View>
  </Pressable>
);

const circle = (on?: boolean) => ({ width: 40, height: 40, borderRadius: 20, alignItems: 'center' as const, justifyContent: 'center' as const, backgroundColor: on ? colors.primarySoft : '#E4E6EB' });

/** Một tab ở giữa navbar: icon lớn, gạch chân xanh khi đang chọn. */
function CenterTab({ icon, activeIcon, label, href, active }: { icon: any; activeIcon: any; label: string; href: string; active: boolean }) {
  return (
    <Pressable onPress={() => router.navigate(href as never)} accessibilityLabel={label}
      style={({ pressed }) => ({ flex: 1, height: 56, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 3, borderBottomColor: active ? colors.primary : 'transparent', opacity: pressed ? 0.7 : 1 })}>
      <Ionicons name={active ? activeIcon : icon} size={27} color={active ? colors.primary : colors.muted} />
    </Pressable>
  );
}

/** Navbar kiểu Facebook: trái = logo + ô tìm kiếm · giữa = các tab chính · phải = thông báo + ảnh đại diện. */
export type MenuKind = 'account' | 'apps' | null;

export function TopBar({ menu, setMenu }: { menu: MenuKind; setMenu: (v: MenuKind) => void }) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const wide = width >= WIDE_BREAKPOINT;
  const path = usePathname();
  const [q, setQ] = useState('');
  const search = () => { if (q.trim()) router.push(`/search?q=${encodeURIComponent(q.trim())}` as never); };
  const { unread, open, setOpen } = useNotifications();
  const { role } = useAuth();
  const h = (Platform.OS === 'web' ? 0 : insets.top) + 56;
  // Cụm tab thẳng hàng với cột nội dung: cùng mép trái, cùng độ rộng (tối đa 720px như <Screen>), nhưng không đè lên nhóm nút bên phải.
  const areaW = width - SIDEBAR_W * (hasRightSidebar(path) ? 2 : 1); // trang chủ: hai sidebar bằng nhau; trang khác: chỉ sidebar trái
  const colW = Math.min(contentMaxWidth(path), areaW - 32);
  const colLeft = SIDEBAR_W + (areaW - colW) / 2;
  const tabsLeft = colLeft;
  const tabsWidth = Math.max(260, Math.min(colW, width - 232 - colLeft));
  const tabs = [
    { icon: 'home-outline', activeIcon: 'home', label: 'Bảng tin', href: '/social' },
    { icon: 'people-outline', activeIcon: 'people', label: 'Bạn bè', href: '/friends' },
    role === 'lecturer'
      ? { icon: 'shield-checkmark-outline', activeIcon: 'shield-checkmark', label: 'Duyệt câu hỏi', href: '/review' }
      : { icon: 'create-outline', activeIcon: 'create', label: 'Đóng góp câu hỏi', href: '/contribute' },
    role === 'lecturer'
      ? { icon: 'document-text-outline', activeIcon: 'document-text', label: 'Đề thi', href: '/exams' }
      : { icon: 'game-controller-outline', activeIcon: 'game-controller', label: 'Trò chơi dự đoán', href: '/games' },
    { icon: 'person-circle-outline', activeIcon: 'person-circle', label: 'Cá nhân', href: '/profile' },
  ];

  return (
    <View style={{ height: h, paddingTop: Platform.OS === 'web' ? 0 : insets.top, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: glass.border, ...glass.shadow }}>
      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, gap: 8 }}>
        <View style={wide ? { width: SIDEBAR_W - 12, flexGrow: 0, flexShrink: 0, flexDirection: 'row', alignItems: 'center', gap: 8 } : { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Logo />
          <View style={{ flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 8, height: 40, paddingHorizontal: 12, borderRadius: 20, backgroundColor: '#F0F2F5' }}>
            <Ionicons name="search" size={18} color={colors.muted} />
            <TextInput
              value={q} onChangeText={setQ} onSubmitEditing={search} returnKeyType="search"
              placeholder="Tìm kiếm trên QuizHub" placeholderTextColor={colors.muted}
              style={[{ flex: 1, fontSize: 14, color: colors.text, padding: 0, minWidth: 0 }, Platform.OS === 'web' && ({ outlineStyle: 'none' } as object)]}
            />
            {q ? <Ionicons name="close-circle" size={18} color={colors.muted} onPress={() => setQ('')} /> : null}
          </View>
        </View>

        {wide ? (
          <View style={{ flex: 1, minWidth: 0 }} />
        ) : null}

        <View style={[{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 8, flexShrink: 0 }, wide && { width: 220, flexGrow: 0 }]}>
          {wide ? (
            <Pressable onPress={() => { setOpen(false); setMenu(menu === 'apps' ? null : 'apps'); }} accessibilityLabel="Menu" style={circle(menu === 'apps')}>
              <Ionicons name="apps" size={22} color={menu === 'apps' ? colors.primary : colors.text} />
            </Pressable>
          ) : null}
          <Pressable onPress={() => { setMenu(null); router.navigate('/messages' as never); }} accessibilityLabel="Tin nhắn" style={circle(path.startsWith('/messages'))}>
            <Ionicons name="chatbubble-ellipses" size={20} color={path.startsWith('/messages') ? colors.primary : colors.text} />
          </Pressable>
          <Pressable onPress={() => { setMenu(null); setOpen(!open); }} accessibilityLabel="Thông báo" style={circle(open)}>
            <Ionicons name={open ? 'notifications' : 'notifications'} size={20} color={open ? colors.primary : colors.text} />
            {unread > 0 ? (
              <View style={{ position: 'absolute', top: -3, right: -3, minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4, backgroundColor: '#E41E3F', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>{unread > 9 ? '9+' : unread}</Text>
              </View>
            ) : null}
          </Pressable>
          <Pressable onPress={() => { setOpen(false); setMenu(menu === 'account' ? null : 'account'); }} accessibilityLabel="Tài khoản">
            <UserAvatar size={40} />
            <View style={{ position: 'absolute', right: -2, bottom: -2, width: 16, height: 16, borderRadius: 8, backgroundColor: '#E4E6EB', borderWidth: 1, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="chevron-down" size={11} color={colors.text} />
            </View>
          </Pressable>
        </View>
      </View>
      {wide ? (
        <View pointerEvents="box-none" style={{ position: 'absolute', top: Platform.OS === 'web' ? 0 : insets.top, bottom: 0, left: tabsLeft, width: tabsWidth, flexDirection: 'row' }}>
          {tabs.map((t) => <CenterTab key={t.href} {...t} active={path.startsWith(t.href)} />)}
        </View>
      ) : null}
    </View>
  );
}

function MenuRow({ icon, label, onPress }: { icon: any; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 8, borderRadius: 999, backgroundColor: pressed ? '#F0F2F5' : 'transparent' })}>
      <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#E4E6EB', alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name={icon} size={20} color={colors.text} />
      </View>
      <Text style={{ flex: 1, fontSize: 15, fontWeight: '500', color: colors.text }}>{label}</Text>
    </Pressable>
  );
}

/** Menu thả xuống khi bấm ảnh đại diện: hồ sơ, cài đặt tài khoản, báo cáo, đăng xuất. */
export function AccountMenu({ menu, onClose, top }: { menu: MenuKind; onClose: () => void; top: number }) {
  const { user, role, signOut } = useAuth();
  const [busy, setBusy] = useState(false);
  if (!menu) return null;
  const go = (href: string) => { onClose(); router.navigate(href as never); };
  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 30 }}>
      <Pressable style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} onPress={onClose} accessibilityLabel="Đóng menu" />
      <View style={{ position: 'absolute', top: top + 4, right: 10, width: 360, maxWidth: '96%', backgroundColor: '#fff', borderRadius: 8, padding: 8, gap: 2, ...glass.shadow, shadowOpacity: 0.25, shadowRadius: 12, elevation: 8 }}>
        {menu === 'apps' ? (
          <>
        <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text, padding: 8 }}>Menu</Text>
        <MenuRow icon="people" label="Bạn bè & theo dõi" onPress={() => go('/friends')} />
        {MENU_ITEMS.filter((i) => !i.roles || i.roles.includes(role)).map((i) => (
          <MenuRow key={i.href} icon={i.icon.replace('-outline', '')} label={i.label} onPress={() => go(i.href)} />
        ))}
          </>
        ) : (
          <>
        <Pressable onPress={() => go('/profile')} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderRadius: 999, backgroundColor: pressed ? '#F0F2F5' : 'transparent' })}>
          <UserAvatar size={40} />
          <Text style={{ flex: 1, fontSize: 17, fontWeight: '600', color: colors.text }} numberOfLines={1}>{user.name}</Text>
        </Pressable>
        <View style={{ height: 1, backgroundColor: '#E4E6EB', marginVertical: 4 }} />
        <MenuRow icon="person" label="Xem trang cá nhân" onPress={() => go('/profile')} />
        <MenuRow icon="create" label="Chỉnh sửa hồ sơ" onPress={() => go('/account/edit')} />
        <MenuRow icon="key" label="Đổi mật khẩu" onPress={() => go('/account/password')} />
        <MenuRow icon="ban" label="Người dùng đã chặn" onPress={() => go('/account/blocked')} />
        <MenuRow icon="phone-portrait" label="Thiết bị đăng nhập" onPress={() => go('/account/devices')} />
        <MenuRow icon="alert-circle" label="Báo cáo sự cố" onPress={() => go('/report')} />
        <MenuRow icon="log-out" label={busy ? 'Đang đăng xuất...' : 'Đăng xuất'} onPress={() => { setBusy(true); void signOut(); }} />
          </>
        )}
      </View>
    </View>
  );
}
