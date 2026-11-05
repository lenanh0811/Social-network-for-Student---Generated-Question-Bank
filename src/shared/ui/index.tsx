import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { router, Stack } from 'expo-router';
import type { ComponentProps, ReactNode } from 'react';
import {
  ActivityIndicator, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View,
  type StyleProp, type TextInputProps, type ViewStyle,
} from 'react-native';
import { bgGradient, colors, glass, radius, space } from '@/shared/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

/** Tấm kính mờ: làm mờ nền phía sau + lớp phủ sáng + viền highlight. */
export function Glass({ children, style, strong, intensity = glass.blur }: {
  children?: ReactNode; style?: StyleProp<ViewStyle>; strong?: boolean; intensity?: number;
}) {
  const { backgroundColor, ...rest } = StyleSheet.flatten(style) ?? {};
  return (
    <View style={[s.glass, rest]}>
      <BlurView intensity={intensity} tint="light" style={StyleSheet.absoluteFill} />
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: backgroundColor ?? (strong ? glass.tintStrong : glass.tint) }]} />
      <LinearGradient pointerEvents="none" colors={['rgba(255,255,255,0.55)', 'rgba(255,255,255,0)']} start={{ x: 0, y: 0 }} end={{ x: 0.6, y: 0.5 }} style={StyleSheet.absoluteFill} />
      {children}
    </View>
  );
}

export const GlassBackdrop = ({ children }: { children: ReactNode }) => (
  <View style={{ flex: 1 }}>
    <LinearGradient colors={bgGradient} style={StyleSheet.absoluteFill} />
    <View pointerEvents="none" style={[s.blob, { top: -80, right: -60, backgroundColor: 'rgba(194,31,54,0.28)' }]} />
    <View pointerEvents="none" style={[s.blob, { top: 260, left: -120, width: 320, height: 320, backgroundColor: 'rgba(232,163,23,0.30)' }]} />
    <View pointerEvents="none" style={[s.blob, { bottom: -100, right: -40, backgroundColor: 'rgba(68,114,196,0.30)' }]} />
    {children}
  </View>
);

export const screenOptions = (title: string) => ({
  title,
  headerTransparent: true,
  headerTintColor: colors.primary,
  headerTitleStyle: { fontWeight: '700' as const, color: colors.text },
  headerShadowVisible: false,
  headerBackground: () => <BlurView intensity={60} tint="light" style={[StyleSheet.absoluteFill, { borderBottomWidth: 1, borderBottomColor: glass.border, backgroundColor: 'rgba(255,255,255,0.45)' }]} />,
});
export const Header = ({ title }: { title: string }) => <Stack.Screen options={screenOptions(title)} />;

const HEADER_H = Platform.OS === 'web' ? 72 : 108;

export function Screen({ children, onRefresh, refreshing, footer, noHeader }: {
  children: ReactNode; onRefresh?: () => void; refreshing?: boolean; footer?: ReactNode; noHeader?: boolean;
}) {
  return (
    <GlassBackdrop>
      <ScrollView
        contentContainerStyle={[s.screen, { paddingTop: (noHeader ? (Platform.OS === 'web' ? 14 : 54) + 56 : HEADER_H) + space.md }]} keyboardShouldPersistTaps="handled"
        refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={colors.primary} progressViewOffset={HEADER_H} /> : undefined}
      >
        <View style={s.col}>{children}</View>
      </ScrollView>
      {footer ? (
        <Glass strong style={s.footer}><View style={s.col}>{footer}</View></Glass>
      ) : null}
    </GlassBackdrop>
  );
}

export const Card = ({ children, style, onPress }: { children: ReactNode; style?: ViewStyle; onPress?: () => void }) => {
  const inner = <Glass style={[s.card, style]}>{children}</Glass>;
  return onPress ? <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1, transform: [{ scale: pressed ? 0.99 : 1 }] })}>{inner}</Pressable> : inner;
};

export const H1 = ({ children }: { children: ReactNode }) => <Text style={s.h1}>{children}</Text>;
export const H2 = ({ children }: { children: ReactNode }) => <Text style={s.h2}>{children}</Text>;
export const Muted = ({ children, style }: { children: ReactNode; style?: object }) => <Text style={[s.muted, style]}>{children}</Text>;
export const Row = ({ children, style }: { children: ReactNode; style?: ViewStyle }) => <View style={[s.row, style]}>{children}</View>;

export function Button({ title, onPress, icon, variant = 'primary', loading, disabled, small }: {
  title: string; onPress: () => void; icon?: IconName; loading?: boolean; disabled?: boolean; small?: boolean;
  variant?: 'primary' | 'outline' | 'danger' | 'soft' | 'success';
}) {
  const solid = { primary: colors.primary, danger: colors.danger, success: colors.success } as Record<string, string>;
  const isSolid = variant in solid;
  const fg = isSolid ? '#fff' : colors.primary;
  const pad = small ? { paddingVertical: 8, paddingHorizontal: 14 } : null;
  const body = loading ? <ActivityIndicator color={fg} /> : (
    <>
      {icon ? <Ionicons name={icon} size={small ? 16 : 18} color={fg} /> : null}
      <Text style={[s.btnText, { color: fg }, small && { fontSize: 13 }]}>{title}</Text>
    </>
  );
  return (
    <Pressable onPress={onPress} disabled={disabled || loading} style={({ pressed }) => ({ opacity: disabled ? 0.45 : pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] })}>
      {isSolid ? (
        <View style={[s.btn, pad, { backgroundColor: solid[variant], borderColor: 'rgba(255,255,255,0.55)', borderWidth: 1, shadowColor: solid[variant], shadowOpacity: 0.35, shadowRadius: 14, shadowOffset: { width: 0, height: 6 } }]}>
          <LinearGradient pointerEvents="none" colors={['rgba(255,255,255,0.45)', 'rgba(255,255,255,0)']} style={[StyleSheet.absoluteFill, { borderRadius: radius.pill }]} />
          {body}
        </View>
      ) : (
        <Glass style={[s.btn, pad, { borderRadius: radius.pill }]}><View style={s.btnInner}>{body}</View></Glass>
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
        style={[s.input, p.multiline && { minHeight: 80, textAlignVertical: 'top' }, !!error && { borderColor: colors.danger }, Platform.OS === 'web' && ({ outlineStyle: 'none' } as object)]}
      />
      {error ? <Text style={{ color: colors.danger, fontSize: 12 }}>{error}</Text> : null}
    </View>
  );
}

export function Chip({ label, active, onPress }: { label: string; active?: boolean; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress}>
      {active ? (
        <View style={[s.chip, { backgroundColor: colors.primary, borderColor: 'rgba(255,255,255,0.6)' }]}>
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>{label}</Text>
        </View>
      ) : (
        <Glass style={[s.chip, { borderRadius: radius.pill }]}><Text style={{ color: colors.text, fontWeight: '600', fontSize: 13 }}>{label}</Text></Glass>
      )}
    </Pressable>
  );
}

export function Segmented<T extends string>({ value, options, onChange }: {
  value: T; options: { value: T; label: string }[]; onChange: (v: T) => void;
}) {
  return (
    <Glass style={{ borderRadius: radius.pill, padding: 4, flexDirection: 'row' }}>
      {options.map((o) => {
        const on = value === o.value;
        return (
          <Pressable key={o.value} onPress={() => onChange(o.value)} style={[s.segItem, on && s.segActive]}>
            <Text style={{ fontWeight: '700', fontSize: 13, color: on ? colors.primary : colors.muted }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </Glass>
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
      <Ionicons name={icon} size={44} color="rgba(0,0,0,0.18)" />
      <Text style={{ color: colors.muted, textAlign: 'center' }}>{text}</Text>
      {action}
    </View>
  );
}
export const Loading = () => <View style={s.empty}><ActivityIndicator size="large" color={colors.primary} /></View>;
export const ErrorBox = ({ message, onRetry }: { message: string; onRetry?: () => void }) => (
  <Card style={{ backgroundColor: 'rgba(253,232,232,0.8)' }}>
    <Text style={{ color: colors.danger, fontWeight: '600' }}>{message}</Text>
    {onRetry ? <Button title="Thử lại" variant="outline" small onPress={onRetry} /> : null}
  </Card>
);

/** Thanh phần trăm ngang (dùng cho thống kê đáp án). */
export function Bar({ ratio, color = colors.blue }: { ratio: number; color?: string }) {
  return (
    <View style={{ height: 10, borderRadius: 5, backgroundColor: 'rgba(0,0,0,0.08)', overflow: 'hidden', flex: 1 }}>
      <View style={{ width: `${Math.round(ratio * 100)}%`, height: '100%', backgroundColor: color, borderRadius: 5 }} />
    </View>
  );
}

export const FAB = ({ label, icon, onPress }: { label: string; icon: IconName; onPress: () => void }) => (
  <Pressable onPress={onPress} style={({ pressed }) => [s.fab, { transform: [{ scale: pressed ? 0.96 : 1 }] }]}>
    <LinearGradient pointerEvents="none" colors={['rgba(255,255,255,0.4)', 'rgba(255,255,255,0)']} style={[StyleSheet.absoluteFill, { borderRadius: radius.pill }]} />
    <Ionicons name={icon} size={20} color="#fff" /><Text style={{ color: '#fff', fontWeight: '700' }}>{label}</Text>
  </Pressable>
);

export const go = (path: string) => router.push(path as never);
export const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });

const s = StyleSheet.create({
  screen: { padding: space.lg, paddingBottom: 120, alignItems: 'center' },
  col: { width: '100%', maxWidth: 720, gap: space.md },
  footer: { position: 'absolute', left: 12, right: 12, bottom: 12, padding: space.md, borderRadius: 28, alignItems: 'center' },
  glass: { overflow: 'hidden', borderWidth: 1, borderColor: glass.border, ...glass.shadow },
  blob: { position: 'absolute', width: 280, height: 280, borderRadius: 999 },
  card: { borderRadius: 24, padding: space.lg, gap: space.sm },
  h1: { fontSize: 26, fontWeight: '800', color: colors.text, letterSpacing: -0.5 },
  h2: { fontSize: 16, fontWeight: '700', color: colors.text },
  muted: { fontSize: 13, color: colors.muted },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm, flexWrap: 'wrap' },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 13, paddingHorizontal: 20, borderRadius: radius.pill, overflow: 'hidden' },
  btnInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  btnText: { fontWeight: '700', fontSize: 15 },
  label: { fontSize: 13, fontWeight: '600', color: colors.text },
  input: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.9)', borderRadius: 16, padding: 12, fontSize: 15, backgroundColor: 'rgba(255,255,255,0.65)', color: colors.text },
  chip: { paddingVertical: 8, paddingHorizontal: 15, borderRadius: radius.pill, borderWidth: 1, overflow: 'hidden' },
  segItem: { flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: radius.pill },
  segActive: { backgroundColor: 'rgba(255,255,255,0.95)', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
  badge: { paddingVertical: 3, paddingHorizontal: 10, borderRadius: radius.pill, alignSelf: 'flex-start' },
  empty: { alignItems: 'center', gap: space.md, paddingVertical: 48 },
  fab: { position: 'absolute', right: 20, bottom: 20, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.primary, paddingVertical: 14, paddingHorizontal: 22, borderRadius: radius.pill, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.6)', shadowColor: colors.primary, shadowOpacity: 0.4, shadowRadius: 16, shadowOffset: { width: 0, height: 8 } },
});
