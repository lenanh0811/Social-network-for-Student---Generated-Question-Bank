import { StyleSheet, Text, View } from 'react-native';
import { radius } from '@/theme';

export function Badge({ label, fg, bg }: { label: string; fg: string; bg: string }) {
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}><Text style={{ color: fg, fontSize: 12, fontWeight: '700' }}>{label}</Text></View>
  );
}

const styles = StyleSheet.create({
  badge: { paddingVertical: 3, paddingHorizontal: 10, borderRadius: radius.pill, alignSelf: 'flex-start' },
});
