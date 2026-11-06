import { Ionicons } from '@expo/vector-icons';
import { router, usePathname } from 'expo-router';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { Animated, Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useAuth } from '@/context/auth';
import { MENU_ITEMS } from '@/constants';
import { colors, glass } from '@/theme';
import { Glass } from '@/components/glass';
import { Muted } from '@/components/muted';

const Ctx = createContext({ open: false, visible: false, setOpen: (_: boolean) => {}, onClosed: () => {} });
export const useMenu = () => useContext(Ctx);
export const MenuProvider = ({ children }: { children: ReactNode }) => {
  const [open, setOpenState] = useState(false);
  // `visible` giữ menu trên màn hình trong lúc chạy hiệu ứng đóng.
  const [visible, setVisible] = useState(false);
  const setOpen = (o: boolean) => { if (o) setVisible(true); setOpenState(o); };
  return <Ctx.Provider value={{ open, visible, setOpen, onClosed: () => setVisible(false) }}>{children}</Ctx.Provider>;
};

/** Nút 3 gạch. `floating` = nổi góc trái trên cùng (dùng cho trang chủ toàn màn hình). */
export function MenuButton({ floating }: { floating?: boolean }) {
  const { setOpen } = useMenu();
  const btn = (
    <Pressable onPress={() => setOpen(true)} hitSlop={8} accessibilityLabel="Mở menu"
      style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
      {floating ? (
        <Glass style={{ width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="menu" size={26} color={colors.text} />
        </Glass>
      ) : <Ionicons name="menu" size={28} color={colors.primary} style={{ marginHorizontal: 14 }} />}
    </Pressable>
  );
  return floating ? <View style={{ position: 'absolute', top: Platform.OS === 'web' ? 14 : 54, left: 14, zIndex: 20 }}>{btn}</View> : btn;
}

const W = 292;
/** Thanh bên trượt ra từ trái khi bấm 3 gạch. */
export function SideMenu() {
  const { open, visible, setOpen, onClosed } = useMenu();
  const { user, role } = useAuth();
  const path = usePathname();
  const { width } = useWindowDimensions();
  const panelW = Math.min(W, width - 56);
  const [anim] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.timing(anim, { toValue: open ? 1 : 0, duration: 260, useNativeDriver: Platform.OS !== 'web' })
      .start(({ finished }) => { if (finished && !open) onClosed(); });
  }, [open, anim, onClosed]);
  if (!visible) return null;

  const go = (href: string) => { setOpen(false); router.navigate(href as never); };
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: anim, backgroundColor: 'rgba(20,10,30,0.35)' }]}>
        <Pressable style={{ flex: 1 }} onPress={() => setOpen(false)} accessibilityLabel="Đóng menu" />
      </Animated.View>
      <Animated.View style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: panelW, padding: 12, transform: [{ translateX: anim.interpolate({ inputRange: [0, 1], outputRange: [-panelW - 20, 0] }) }] }}>
        <Glass strong intensity={80} style={{ flex: 1, borderRadius: 32, padding: 16, gap: 6, paddingTop: Platform.OS === 'web' ? 16 : 44 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingBottom: 12 }}>
            <Ionicons name="person-circle" size={48} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '800', fontSize: 16, color: colors.text }} numberOfLines={1}>{user.name}</Text>
              <Muted>{role === 'student' ? 'Sinh viên' : 'Giảng viên'}</Muted>
            </View>
            <Pressable onPress={() => setOpen(false)} hitSlop={8}><Ionicons name="close" size={24} color={colors.muted} /></Pressable>
          </View>
          <View style={{ height: 1, backgroundColor: glass.edge, marginBottom: 6 }} />
          {MENU_ITEMS.filter((i) => !i.roles || i.roles.includes(role)).map((i) => {
            const active = i.href === '/' ? path === '/' : path.startsWith(i.href);
            return (
              <Pressable key={i.href} onPress={() => go(i.href)} style={({ pressed }) => ({
                flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, paddingHorizontal: 14, borderRadius: 18,
                backgroundColor: active ? colors.primary : pressed ? 'rgba(0,0,0,0.05)' : 'transparent',
              })}>
                <Ionicons name={i.icon} size={22} color={active ? '#fff' : colors.text} />
                <Text style={{ fontWeight: '700', fontSize: 15, color: active ? '#fff' : colors.text }}>{i.label}</Text>
              </Pressable>
            );
          })}
        </Glass>
      </Animated.View>
    </View>
  );
}
