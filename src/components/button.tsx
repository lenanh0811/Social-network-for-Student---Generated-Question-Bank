import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '@/theme';
import type { IconName } from '@/types';

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
      <Text style={[styles.btnText, { color: fg }, small && { fontSize: 13 }]}>{title}</Text>
    </>
  );
  return (
    <Pressable onPress={onPress} disabled={disabled || loading} style={({ pressed }) => ({ opacity: disabled ? 0.45 : pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] })}>
      {isSolid ? (
        <View style={[styles.btn, pad, { backgroundColor: solid[variant] }]}>{body}</View>
      ) : (
        <View style={[styles.btn, pad, variant === 'soft'
          ? { backgroundColor: colors.primarySoft }
          : { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.primary }]}>{body}</View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 13, paddingHorizontal: 20, borderRadius: radius.pill, overflow: 'hidden' },
  btnInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  btnText: { fontWeight: '600', fontSize: 15 },
});
