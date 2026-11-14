import { Image, StyleSheet, Text, View } from 'react-native';
import type { social_user } from '@/modules/social-score/api/types';
import { colors } from '@/theme';

export function Avatar({ user, size = 42 }: { user: social_user; size?: number }) {
  const initials = user.name
    .split(/\s+/)
    .slice(-2)
    .map((part) => part[0] ?? '')
    .join('')
    .toUpperCase();

  return user.avatarUrl ? (
    <Image source={{ uri: user.avatarUrl }} style={{ width: size, height: size, borderRadius: size / 2 }} />
  ) : (
    <View style={[styles.fallback, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[styles.initials, { fontSize: size * 0.36 }]}>{initials || '?'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: { backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  initials: { color: colors.primary, fontWeight: '600' },
});
