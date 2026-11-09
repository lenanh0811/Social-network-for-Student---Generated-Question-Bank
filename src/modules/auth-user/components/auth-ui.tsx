import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRef, useState, type ComponentProps, type ComponentRef, type ReactNode } from 'react';
import {
  KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type TextInputProps,
} from 'react-native';
import { BRAND } from '@/constants';
import { colors, radius, space } from '@/theme';
import { Field } from '@/components/field';
import { Glass } from '@/components/glass';
import { GlassBackdrop } from '@/components/glass-backdrop';
import { Muted } from '@/components/muted';

type IconName = ComponentProps<typeof Ionicons>['name'];

/** Khung chung của các màn đăng nhập / đăng ký / xác thực: logo + thẻ kính ở giữa màn hình. */
export function AuthShell({ title, subtitle, children, footer }: {
  title: string; subtitle?: string; children: ReactNode; footer?: ReactNode;
}) {
  return (
    <GlassBackdrop>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          <View style={s.col}>
            <View style={s.brand}>
              <LinearGradient colors={['#E0384F', colors.primaryDark]} style={s.logo}>
                <Text style={{ color: '#fff', fontWeight: '600', fontSize: 30 }}>{BRAND.initial}</Text>
              </LinearGradient>
              <Text style={s.brandText}>{BRAND.first}<Text style={{ color: colors.primary }}>{BRAND.second}</Text></Text>
              <Muted>Mạng xã hội học tập cho sinh viên</Muted>
            </View>
            <Glass strong style={s.card}>
              <Text style={s.title}>{title}</Text>
              {subtitle ? <Muted style={{ fontSize: 14, marginTop: -4 }}>{subtitle}</Muted> : null}
              {children}
            </Glass>
            {footer ? <View style={{ alignItems: 'center', gap: space.sm }}>{footer}</View> : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </GlassBackdrop>
  );
}

/** Ô mật khẩu có nút ẩn/hiện. */
export function PasswordField(p: TextInputProps & { label: string; error?: string }) {
  const [show, setShow] = useState(false);
  return (
    <View>
      <Field {...p} secureTextEntry={!show} autoCapitalize="none" autoCorrect={false} />
      <Pressable onPress={() => setShow(!show)} hitSlop={10} style={s.eye} accessibilityLabel={show ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}>
        <Ionicons name={show ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.muted} />
      </Pressable>
    </View>
  );
}

/** Thanh đo độ mạnh mật khẩu. */
export function PasswordStrength({ value }: { value: string }) {
  if (!value) return null;
  const score = [value.length >= 8, /[a-z]/.test(value) && /[A-Z]/.test(value), /\d/.test(value), /[^A-Za-z0-9]/.test(value), value.length >= 12]
    .filter(Boolean).length;
  const level = score <= 2 ? { label: 'Yếu', color: colors.danger } : score <= 3 ? { label: 'Trung bình', color: colors.accent } : { label: 'Mạnh', color: colors.success };
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: -4 }}>
      {[0, 1, 2, 3, 4].map((i) => (
        <View key={i} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: i < score ? level.color : 'rgba(0,0,0,0.08)' }} />
      ))}
      <Text style={{ fontSize: 12, fontWeight: '600', color: level.color, width: 72, textAlign: 'right' }}>{level.label}</Text>
    </View>
  );
}

/** Hộp thông báo trong form (lỗi / thành công / gợi ý). */
export function Notice({ tone = 'danger', icon, children, action }: {
  tone?: 'danger' | 'success' | 'info'; icon?: IconName; children: ReactNode; action?: ReactNode;
}) {
  const c = {
    danger: { fg: colors.danger, bg: colors.dangerSoft, icon: 'alert-circle' as IconName },
    success: { fg: colors.success, bg: colors.successSoft, icon: 'checkmark-circle' as IconName },
    info: { fg: colors.blue, bg: colors.blueSoft, icon: 'information-circle' as IconName },
  }[tone];
  return (
    <View style={[s.notice, { backgroundColor: c.bg }]} accessibilityRole="alert">
      <Ionicons name={icon ?? c.icon} size={20} color={c.fg} />
      <View style={{ flex: 1, gap: 6 }}>
        <Text style={{ color: c.fg, fontWeight: '600', fontSize: 13 }}>{children}</Text>
        {action}
      </View>
    </View>
  );
}

export const TextLink = ({ title, onPress }: { title: string; onPress: () => void }) => (
  <Pressable onPress={onPress} hitSlop={6}><Text style={{ color: colors.primary, fontWeight: '600' }}>{title}</Text></Pressable>
);

/** Ô nhập mã 6 số: một TextInput ẩn phủ lên 6 ô hiển thị (dán mã/OTP tự động vẫn hoạt động). */
export function CodeInput({ value, onChange, error, length = 6 }: {
  value: string; onChange: (v: string) => void; error?: string; length?: number;
}) {
  const ref = useRef<ComponentRef<typeof TextInput>>(null);
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ gap: 6 }}>
      <Pressable onPress={() => ref.current?.focus()} style={s.codeRow}>
        {Array.from({ length }, (_, i) => {
          const active = focused && (i === value.length || (i === length - 1 && value.length === length));
          return (
            <View key={i} style={[s.codeBox, active && { borderColor: colors.primary, borderWidth: 2 }, !!error && { borderColor: colors.danger }]}>
              <Text style={s.codeText}>{value[i] ?? ''}</Text>
            </View>
          );
        })}
        <TextInput
          ref={ref} value={value} maxLength={length} autoFocus
          onChangeText={(t) => onChange(t.replace(/\D/g, '').slice(0, length))}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          keyboardType="number-pad" textContentType="oneTimeCode" autoComplete="one-time-code"
          accessibilityLabel="Mã xác thực"
          style={[StyleSheet.absoluteFill, { opacity: 0.01, color: 'transparent' }]}
        />
      </Pressable>
      {error ? <Text style={{ color: colors.danger, fontSize: 12, textAlign: 'center' }}>{error}</Text> : null}
    </View>
  );
}

/** Ảnh đại diện: ảnh nếu có, không thì chữ cái đầu tên. */
export function Avatar({ name, size = 72 }: { name: string; size?: number }) {
  const initials = name.trim().split(/\s+/).slice(-2).map((w) => w[0]).join('').toUpperCase() || '?';
  return (
    <LinearGradient colors={['#E0384F', colors.primaryDark]} style={{ width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.85)' }}>
      <Text style={{ color: '#fff', fontWeight: '600', fontSize: size * 0.36 }}>{initials}</Text>
    </LinearGradient>
  );
}

/** Dòng thông tin trong hồ sơ. */
export function InfoRow({ icon, label, value }: { icon: IconName; label: string; value?: string }) {
  return (
    <View style={s.info}>
      <Ionicons name={icon} size={18} color={colors.muted} />
      <Text style={{ width: 110, color: colors.muted, fontSize: 13 }}>{label}</Text>
      <Text style={{ flex: 1, color: value ? colors.text : colors.muted, fontWeight: '600' }}>{value || 'Chưa cập nhật'}</Text>
    </View>
  );
}

/** Dòng menu có mũi tên (trang Cá nhân). */
export function ActionRow({ icon, label, onPress, danger, last }: {
  icon: IconName; label: string; onPress: () => void; danger?: boolean; last?: boolean;
}) {
  const fg = danger ? colors.danger : colors.text;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.action, !last && s.divider, pressed && { opacity: 0.6 }]} accessibilityRole="button">
      <Ionicons name={icon} size={22} color={danger ? colors.danger : colors.primary} />
      <Text style={{ flex: 1, fontWeight: '600', fontSize: 15, color: fg }}>{label}</Text>
      {danger ? null : <Ionicons name="chevron-forward" size={18} color={colors.muted} />}
    </Pressable>
  );
}

const s = StyleSheet.create({
  scroll: { flexGrow: 1, justifyContent: 'center', padding: space.lg, paddingVertical: 48 },
  col: { width: '100%', maxWidth: 440, alignSelf: 'center', gap: space.lg },
  brand: { alignItems: 'center', gap: 6 },
  logo: { width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.6)' },
  brandText: { fontSize: 28, fontWeight: '600', color: colors.text, letterSpacing: -0.5 },
  card: { borderRadius: 28, padding: space.xl, gap: space.md },
  title: { fontSize: 24, fontWeight: '600', color: colors.text, letterSpacing: -0.4 },
  eye: { position: 'absolute', right: 14, top: 37 },
  notice: { flexDirection: 'row', gap: 10, padding: 12, borderRadius: radius.lg, alignItems: 'flex-start' },
  codeRow: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  codeBox: { width: 46, height: 56, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(0,0,0,0.12)', backgroundColor: 'rgba(255,255,255,0.8)', alignItems: 'center', justifyContent: 'center' },
  codeText: { fontSize: 24, fontWeight: '600', color: colors.text },
  info: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  action: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(0,0,0,0.12)' },
});
