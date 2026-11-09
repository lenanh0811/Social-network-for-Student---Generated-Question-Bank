import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Avatar } from '@/modules/auth-user/components/auth-ui';
import type { Person } from '@/modules/relationship-privacy/api/types';
import { colors } from '@/theme';
import { go } from '@/utils/navigation';

export const ago = (iso?: string) => {
  if (!iso) return '';
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (m < 1) return 'vừa xong';
  if (m < 60) return `${m} phút trước`;
  if (m < 1440) return `${Math.round(m / 60)} giờ trước`;
  if (m < 43_200) return `${Math.round(m / 1440)} ngày trước`;
  return new Date(iso).toLocaleDateString('vi-VN');
};

/** Một dòng người dùng: avatar + tên + dòng phụ, bấm để mở hồ sơ; `children` là nút thao tác bên phải. */
export function PersonRow({ person, subtitle, children, last }: {
  person: Person; subtitle?: string; children?: ReactNode; last?: boolean;
}) {
  return (
    <View style={[s.row, !last && s.divider]}>
      <Pressable
        onPress={() => go(`/users/${person.id}`)}
        style={({ pressed }) => [s.main, pressed && { opacity: 0.6 }]}
        accessibilityRole="button"
        accessibilityLabel={`Xem hồ sơ ${person.name}`}
      >
        <Avatar name={person.name} size={44} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={s.name} numberOfLines={1}>{person.name}</Text>
          {subtitle ? <Text style={s.sub} numberOfLines={1}>{subtitle}</Text> : null}
        </View>
        {children ? null : <Ionicons name="chevron-forward" size={18} color={colors.muted} />}
      </Pressable>
      {children ? <View style={s.actions}>{children}</View> : null}
    </View>
  );
}

/** "3 bạn chung · 2 ngày trước" */
export const describe = (p: Person, verb?: string) =>
  [p.role === 'lecturer' ? 'Giảng viên' : null, p.mutualFriends ? `${p.mutualFriends} bạn chung` : null, p.since ? `${verb ? `${verb} ` : ''}${ago(p.since)}` : null]
    .filter(Boolean).join(' · ');

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, flexWrap: 'wrap' },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  main: { flex: 1, minWidth: 180, flexDirection: 'row', alignItems: 'center', gap: 12 },
  name: { fontSize: 15, fontWeight: '600', color: colors.text },
  sub: { fontSize: 12, color: colors.muted },
  actions: { flexDirection: 'row', gap: 8, marginLeft: 'auto' },
});
