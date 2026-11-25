import type { ReactNode } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { Card } from '@/components/card';
import { Muted } from '@/components/muted';
import { colors } from '@/theme';

/** Đầu trang cá nhân kiểu Facebook: ảnh bìa, ảnh đại diện lớn, tên, giới thiệu, nút hành động và thanh tab. Dùng cho cả hồ sơ của tôi lẫn của người khác. */
export function ProfileHero<T extends string>({ name, avatarUrl, coverUrl, subtitle, bio, badge, action, tabs, tab, setTab }: {
  name: string; avatarUrl?: string; coverUrl?: string; subtitle?: string; bio?: string; badge?: ReactNode; action?: ReactNode;
  tabs: readonly (readonly [T, string])[]; tab: T; setTab: (t: T) => void;
}) {
  const initials = name.trim().split(/\s+/).slice(-2).map((w) => w[0]).join('').toUpperCase() || '?';
  return (
    <Card style={{ padding: 0, overflow: 'hidden', gap: 0 }}>
      <View style={{ height: 200, backgroundColor: '#C9D6EA' }}>
        {coverUrl ? <Image source={{ uri: coverUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" /> : (
          <View style={{ flex: 1, backgroundColor: colors.primary, opacity: 0.85 }} />
        )}
      </View>
      <View style={{ paddingHorizontal: 20, paddingBottom: 12, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end', gap: 14 }}>
        <View style={{ width: 128, height: 128, borderRadius: 64, borderWidth: 4, borderColor: '#fff', backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginTop: -48 }}>
          {avatarUrl
            ? <Image source={{ uri: avatarUrl }} style={{ width: '100%', height: '100%' }} />
            : <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 44 }}>{initials}</Text>}
        </View>
        <View style={{ flex: 1, minWidth: 200, gap: 4, paddingTop: 8 }}>
          <Text style={{ fontSize: 28, fontWeight: '800', color: colors.text }}>{name}</Text>
          {subtitle ? <Muted style={{ fontSize: 14 }}>{subtitle}</Muted> : null}
          {bio ? <Text style={{ color: colors.text, lineHeight: 20 }}>{bio}</Text> : null}
          {badge}
        </View>
        {action}
      </View>
      <View style={{ height: 1, backgroundColor: colors.border, marginHorizontal: 16 }} />
      <View style={{ flexDirection: 'row', paddingHorizontal: 8, flexWrap: 'wrap' }}>
        {tabs.map(([k, label]) => {
          const on = tab === k;
          return (
            <Pressable key={k} onPress={() => setTab(k)} style={({ pressed }) => ({ paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 3, borderBottomColor: on ? colors.primary : 'transparent', backgroundColor: pressed ? '#F0F2F5' : 'transparent', borderRadius: 999 })}>
              <Text style={{ fontWeight: '600', fontSize: 15, color: on ? colors.primary : colors.muted }}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
    </Card>
  );
}
