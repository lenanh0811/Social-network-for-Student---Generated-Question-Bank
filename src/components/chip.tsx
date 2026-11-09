import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Glass } from '@/components/glass';
import { colors, radius } from '@/theme';

export function Chip({ label, active, onPress }: { label: string; active?: boolean; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress}>
      {active ? (
        <View style={[styles.chip, { backgroundColor: colors.primary, borderColor: 'rgba(255,255,255,0.6)' }]}>
          <Text style={{ color: '#fff', fontWeight: '600', fontSize: 13 }}>{label}</Text>
        </View>
      ) : (
        <Glass style={[styles.chip, { borderRadius: radius.pill }]}><Text style={{ color: colors.text, fontWeight: '600', fontSize: 13 }}>{label}</Text></Glass>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: { paddingVertical: 8, paddingHorizontal: 15, borderRadius: radius.pill, borderWidth: 1, overflow: 'hidden' },
});
