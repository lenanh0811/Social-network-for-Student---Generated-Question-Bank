import { Pressable, StyleSheet, Text } from 'react-native';
import { Glass } from '@/components/glass';
import { colors, radius } from '@/theme';

/** Bộ chọn dạng viên thuốc, một lựa chọn tại một thời điểm. */
export function Segmented<T extends string>({ value, options, onChange }: {
  value: T; options: { value: T; label: string }[]; onChange: (v: T) => void;
}) {
  return (
    <Glass style={{ borderRadius: radius.pill, padding: 4, flexDirection: 'row' }}>
      {options.map((o) => {
        const on = value === o.value;
        return (
          <Pressable key={o.value} onPress={() => onChange(o.value)} style={[styles.segItem, on && styles.segActive]}>
            <Text style={{ fontWeight: '700', fontSize: 13, color: on ? colors.primary : colors.muted }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </Glass>
  );
}

const styles = StyleSheet.create({
  segItem: { flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: radius.pill },
  segActive: { backgroundColor: 'rgba(255,255,255,0.95)', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
});
