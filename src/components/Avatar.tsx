import { Image, StyleSheet, Text, View } from 'react-native';
import type { SocialUser } from '../types/social';

export function Avatar({ user, size = 42 }: { user: SocialUser; size?: number }) {
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
      <Text style={[styles.initials, { fontSize: size * 0.34 }]}>{initials || '?'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: { backgroundColor: '#dbeafe', alignItems: 'center', justifyContent: 'center' },
  initials: { color: '#1877f2', fontWeight: '700' },
});
