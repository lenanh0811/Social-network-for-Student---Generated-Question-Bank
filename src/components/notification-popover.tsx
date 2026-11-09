import { Ionicons } from '@expo/vector-icons';
import { Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNotifications } from '@/context/notifications';
import { colors, glass } from '@/theme';
import { Glass } from '@/components/glass';

const KIND = { success: colors.success, accent: colors.accent, primary: colors.primary };

/** Hộp thông báo nhỏ thả xuống từ chuông (kiểu Facebook). */
export function NotificationPopover() {
  const { items, open, setOpen, unread, markRead, markAllRead } = useNotifications();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  if (!open) return null;
  const top = (Platform.OS === 'web' ? 0 : insets.top) + 64 + 6;
  return (
    <View style={StyleSheet.absoluteFill}>
      <Pressable style={StyleSheet.absoluteFill} onPress={() => setOpen(false)} accessibilityLabel="Đóng thông báo" />
      <View style={{ position: 'absolute', top, right: 10, width: Math.min(380, width - 20), maxHeight: height - top - 20 }}>
        <Glass strong intensity={80} style={{ borderRadius: 24, padding: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 10 }}>
            <Text style={{ fontSize: 18, fontWeight: '600', color: colors.text }}>Thông báo</Text>
            {unread > 0 ? <Text onPress={markAllRead} style={{ color: colors.primary, fontWeight: '600', fontSize: 13 }}>Đánh dấu đã đọc</Text> : null}
          </View>
          <ScrollView style={{ flexGrow: 0 }}>
            {items.length === 0 ? <Text style={{ textAlign: 'center', color: colors.muted, padding: 24 }}>Chưa có thông báo.</Text> : null}
            {items.map((n) => (
              <Pressable key={n.id} onPress={() => markRead(n.id)} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 16, backgroundColor: pressed ? 'rgba(0,0,0,0.05)' : n.read ? 'transparent' : 'rgba(194,31,54,0.07)' })}>
                <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.9)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: glass.edge }}>
                  <Ionicons name={n.icon} size={20} color={KIND[n.kind]} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontSize: 14, fontWeight: n.read ? '400' : '600' }} numberOfLines={3}>{n.text}</Text>
                  <Text style={{ color: n.read ? colors.muted : colors.primary, fontSize: 12, marginTop: 2 }}>{n.time}</Text>
                </View>
                {!n.read ? <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary }} /> : null}
              </Pressable>
            ))}
          </ScrollView>
        </Glass>
      </View>
    </View>
  );
}
