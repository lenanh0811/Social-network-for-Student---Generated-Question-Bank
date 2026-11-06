import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { router } from 'expo-router';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BRAND } from '@/constants';
import { useNotifications } from '@/context/notifications';
import { colors, glass } from '@/theme';
import { MenuButton } from './side-menu';

export const Logo = ({ compact }: { compact?: boolean }) => (
  <Pressable onPress={() => router.navigate('/' as never)} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }} accessibilityLabel="Về trang chủ">
    <LinearGradient colors={['#E0384F', colors.primaryDark]} style={{ width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.6)' }}>
      <Text style={{ color: '#fff', fontWeight: '900', fontSize: 18 }}>{BRAND.initial}</Text>
    </LinearGradient>
    {compact ? null : (
      <Text style={{ fontSize: 20, fontWeight: '800', color: colors.text, letterSpacing: -0.5 }}>
        {BRAND.first}<Text style={{ color: colors.primary }}>{BRAND.second}</Text>
      </Text>
    )}
  </Pressable>
);

/** Navbar trên cùng: menu 3 gạch · logo · tìm kiếm · chuông thông báo. */
export function TopBar() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const narrow = width < 560;
  const [q, setQ] = useState('');
  const { unread, open, setOpen } = useNotifications();
  const search = () => { if (q.trim()) router.push(`/search?q=${encodeURIComponent(q.trim())}` as never); };

  return (
    <View style={{ paddingTop: Platform.OS === 'web' ? 0 : insets.top, height: (Platform.OS === 'web' ? 0 : insets.top) + 64, borderBottomWidth: 1, borderBottomColor: glass.border, overflow: 'hidden' }}>
      <BlurView intensity={60} tint="light" style={StyleSheet.absoluteFill} />
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255,255,255,0.55)' }]} />
      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 6 }}>
        <MenuButton />
        <Logo compact={narrow} />
        <View style={{ flex: 1, alignItems: 'center' }}>
          <View style={{ width: '100%', maxWidth: 460, flexDirection: 'row', alignItems: 'center', gap: 8, height: 42, paddingHorizontal: 14, borderRadius: 21, borderWidth: 1, borderColor: 'rgba(255,255,255,0.95)', backgroundColor: 'rgba(255,255,255,0.7)' }}>
            <Ionicons name="search" size={18} color={colors.muted} />
            <TextInput
              value={q} onChangeText={setQ} onSubmitEditing={search} returnKeyType="search"
              placeholder={narrow ? 'Tìm kiếm' : 'Tìm câu hỏi, môn học, người dùng...'} placeholderTextColor={colors.muted}
              style={[{ flex: 1, fontSize: 14, color: colors.text, padding: 0 }, Platform.OS === 'web' && ({ outlineStyle: 'none' } as object)]}
            />
            {q ? <Ionicons name="close-circle" size={18} color={colors.muted} onPress={() => setQ('')} /> : null}
          </View>
        </View>
        <Pressable onPress={() => setOpen(!open)} hitSlop={6} accessibilityLabel="Thông báo" style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, marginRight: 8 })}>
          <View style={{ width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: open ? colors.primarySoft : 'rgba(255,255,255,0.7)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.95)' }}>
            <Ionicons name={open ? 'notifications' : 'notifications-outline'} size={22} color={open ? colors.primary : colors.text} />
            {unread > 0 ? (
              <View style={{ position: 'absolute', top: -2, right: -2, minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#fff' }}>
                <Text style={{ color: '#fff', fontSize: 10, fontWeight: '800' }}>{unread > 9 ? '9+' : unread}</Text>
              </View>
            ) : null}
          </View>
        </Pressable>
      </View>
    </View>
  );
}
