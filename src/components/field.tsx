import { Platform, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { colors } from '@/theme';

/** Ô nhập có nhãn và dòng báo lỗi. */
export function Field({ label, error, ...p }: TextInputProps & { label: string; error?: string }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.muted}
        {...p}
        style={[styles.input, p.multiline && { minHeight: 80, textAlignVertical: 'top' }, !!error && { borderColor: colors.danger }, Platform.OS === 'web' && ({ outlineStyle: 'none' } as object)]}
      />
      {error ? <Text style={{ color: colors.danger, fontSize: 12 }}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 13, fontWeight: '600', color: colors.text },
  input: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.9)', borderRadius: 16, padding: 12, fontSize: 15, backgroundColor: 'rgba(255,255,255,0.65)', color: colors.text },
});
