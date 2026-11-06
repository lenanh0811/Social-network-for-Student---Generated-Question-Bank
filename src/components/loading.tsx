import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { colors, space } from '@/theme';

export function Loading() {
  return <View style={styles.empty}><ActivityIndicator size="large" color={colors.primary} /></View>;
}

const styles = StyleSheet.create({
  empty: { alignItems: 'center', gap: space.md, paddingVertical: 48 },
});
