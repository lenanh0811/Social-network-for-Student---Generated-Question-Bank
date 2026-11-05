import { Ionicons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import type { ComponentProps, ReactNode } from 'react';
import {
  ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View,
  type TextInputProps, type ViewStyle,
} from 'react-native';
import { colors, radius, space } from '@/shared/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

export const screenOptions = (title: string) => ({
  title, headerStyle: { backgroundColor: colors.primary }, headerTintColor: '#fff',
  headerTitleStyle: { fontWeight: '700' as const },
});
export const Header = ({ title }: { title: string }) => <Stack.Screen options={screenOptions(title)} />;

export function Screen({ children, onRefresh, refreshing, footer }: {
  children: ReactNode; onRefresh?: () => void; refreshing?: boolean; footer?: ReactNode;
}) {
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        contentContainerStyle={s.screen} keyboardShouldPersistTaps="handled"
        refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={colors.primary} /> : undefined}
      >
        <View style={s.col}>{children}</View>
      </ScrollView>
      {footer ? <View style={s.footer}><View style={s.col}>{footer}</View></View> : null}
    </View>
  );
}

export const Card = ({ children, style, onPress }: { children: ReactNode; style?: ViewStyle; onPress?: () => void }) =>
  onPress ? (
    <Pressable onPress={onPress} style={({ pressed }) => [s.card, style, pressed && { opacity: 0.85 }]}>{children}</Pressable>
  ) : <View style={[s.card, style]}>{children}</View>;

export const H1 = ({ children }: { children: ReactNode }) => <Text style={s.h1}>{children}</Text>;
export const H2 = ({ children }: { children: ReactNode }) => <Text style={s.h2}>{children}</Text>;
export const Muted = ({ children, style }: { children: ReactNode; style?: object }) => <Text style={[s.muted, style]}>{children}</Text>;
export const Row = ({ children, style }: { children: ReactNode; style?: ViewStyle }) => <View style={[s.row, style]}>{children}</View>;

export function Button({ title, onPress, icon, variant = 'primary', loading, disabled, small }: {
  title: string; onPress: () => void; icon?: IconName; loading?: boolean; disabled?: boolean; small?: boolean;
  variant?: 'primary' | 'outline' | 'danger' | 'soft' | 'success';
}) {
  const bg = { primary: colors.primary, outline: 'transparent', danger: colors.danger, soft: colors.primarySoft, success: colors.success }[variant];
  const fg = variant === 'outline' || variant === 'soft' ? colors.primary : '#fff';
  return (
    <Pressable
      onPress={onPress} disabled={disabled || loading}
      style={({ pressed }) => [s.btn, small && { paddingVertical: 8, paddingHorizontal: 12 }, { backgroundColor: bg, opacity: disabled ? 0.45 : pressed ? 0.85 : 1 },
        variant === 'outline' && { borderWidth: 1.5, borderColor: colors.primary }]}
    >
      {loading ? <ActivityIndicator color={fg} /> : (
        <>
          {icon ? <Ionicons name={icon} size={small ? 16 : 18} color={fg} /> : null}
          <Text style={[s.btnText, { color: fg }, small && { fontSize: 13 }]}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

export function Field({ label, error, ...p }: TextInputProps & { label: string; error?: string }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.muted}
        {...p}
        style={[s.input, p.multiline && { minHeight: 80, textAlignVertical: 'top' }, !!error && { borderColor: colors.danger }]}
      />
      {error ? <Text style={{ color: colors.danger, fontSize: 12 }}>{error}</Text> : null}
    </View>
  );
}

export function Chip({ label, active, onPress }: { label: string; active?: boolean; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} style={[s.chip, active && { backgroundColor: colors.primary, borderColor: colors.primary }]}>
      <Text style={{ color: active ? '#fff' : colors.text, fontWeight: '600', fontSize: 13 }}>{label}</Text>
    </Pressable>
  );
}

export function Segmented<T extends string>({ value, options, onChange }: {
  value: T; options: { value: T; label: string }[]; onChange: (v: T) => void;
}) {
  return (
    <View style={s.seg}>
      {options.map((o) => (
        <Pressable key={o.value} onPress={() => onChange(o.value)} style={[s.segItem, value === o.value && s.segActive]}>
          <Text style={{ fontWeight: '700', fontSize: 13, color: value === o.value ? colors.primary : colors.muted }}>{o.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export const Badge = ({ label, fg, bg }: { label: string; fg: string; bg: string }) => (
  <View style={[s.badge, { backgroundColor: bg }]}><Text style={{ color: fg, fontSize: 12, fontWeight: '700' }}>{label}</Text></View>
);

export function Stars({ value, onChange, size = 22 }: { value: number; onChange?: (n: number) => void; size?: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Pressable key={n} disabled={!onChange} onPress={() => onChange?.(n)} hitSlop={6}>
          <Ionicons name={value >= n - 0.25 ? 'star' : value >= n - 0.75 ? 'star-half' : 'star-outline'} size={size} color={colors.accent} />
        </Pressable>
      ))}
    </View>
  );
}

export function Empty({ icon = 'file-tray-outline', text, action }: { icon?: IconName; text: string; action?: ReactNode }) {
  return (
    <View style={s.empty}>
      <Ionicons name={icon} size={44} color={colors.border} />
      <Text style={{ color: colors.muted, textAlign: 'center' }}>{text}</Text>
      {action}
    </View>
  );
}
export const Loading = () => <View style={s.empty}><ActivityIndicator size="large" color={colors.primary} /></View>;
export const ErrorBox = ({ message, onRetry }: { message: string; onRetry?: () => void }) => (
  <Card style={{ backgroundColor: colors.dangerSoft, borderColor: colors.danger }}>
    <Text style={{ color: colors.danger, fontWeight: '600' }}>{message}</Text>
    {onRetry ? <Button title="Thử lại" variant="outline" small onPress={onRetry} /> : null}
  </Card>
);

/** Thanh phần trăm ngang (dùng cho thống kê đáp án). */
export function Bar({ ratio, color = colors.blue }: { ratio: number; color?: string }) {
  return (
    <View style={{ height: 10, borderRadius: 5, backgroundColor: colors.border, overflow: 'hidden', flex: 1 }}>
      <View style={{ width: `${Math.round(ratio * 100)}%`, height: '100%', backgroundColor: color }} />
    </View>
  );
}

export const FAB = ({ label, icon, onPress }: { label: string; icon: IconName; onPress: () => void }) => (
  <Pressable onPress={onPress} style={s.fab}>
    <Ionicons name={icon} size={20} color="#fff" /><Text style={{ color: '#fff', fontWeight: '700' }}>{label}</Text>
  </Pressable>
);

export const go = (path: string) => router.push(path as never);
export const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });

const s = StyleSheet.create({
  screen: { padding: space.lg, paddingBottom: 100, alignItems: 'center' },
  col: { width: '100%', maxWidth: 720, gap: space.md },
  footer: { padding: space.md, backgroundColor: colors.card, borderTopWidth: 1, borderTopColor: colors.border, alignItems: 'center' },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: space.lg, gap: space.sm, borderWidth: 1, borderColor: colors.border },
  h1: { fontSize: 22, fontWeight: '800', color: colors.text },
  h2: { fontSize: 16, fontWeight: '700', color: colors.text },
  muted: { fontSize: 13, color: colors.muted },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm, flexWrap: 'wrap' },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 13, paddingHorizontal: 18, borderRadius: radius.md },
  btnText: { fontWeight: '700', fontSize: 15 },
  label: { fontSize: 13, fontWeight: '600', color: colors.text },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 12, fontSize: 15, backgroundColor: '#fff', color: colors.text },
  chip: { paddingVertical: 7, paddingHorizontal: 14, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: '#fff' },
  seg: { flexDirection: 'row', backgroundColor: '#E9E9ED', borderRadius: radius.md, padding: 3 },
  segItem: { flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: radius.sm },
  segActive: { backgroundColor: '#fff' },
  badge: { paddingVertical: 3, paddingHorizontal: 9, borderRadius: radius.pill, alignSelf: 'flex-start' },
  empty: { alignItems: 'center', gap: space.md, paddingVertical: 48 },
  fab: { position: 'absolute', right: 20, bottom: 20, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.primary, paddingVertical: 14, paddingHorizontal: 20, borderRadius: radius.pill, elevation: 4, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 6, shadowOffset: { width: 0, height: 3 } },
});
