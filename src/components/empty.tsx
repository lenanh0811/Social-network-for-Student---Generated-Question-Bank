import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, space } from '@/theme';
import type { IconName } from '@/types';

export function Empty({ icon = 'file-tray-outline', text, action }: { icon?: IconName; text: string; action?: ReactNode }) {
  return (
    <View style={styles.empty}>
      <Ionicons name={icon} size={44} color="rgba(0,0,0,0.18)" />
      <Text style={{ color: colors.muted, textAlign: 'center' }}>{text}</Text>
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { alignItems: 'center', gap: space.md, paddingVertical: 48 },
});
