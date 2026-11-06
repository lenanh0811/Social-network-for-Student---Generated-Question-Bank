import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { bgGradient } from '@/theme';

/** Nền gradient pastel + vài đốm màu để lớp kính mờ có thứ để làm mờ. */
export function GlassBackdrop({ children }: { children: ReactNode }) {
  return (
    <View style={{ flex: 1 }}>
      <LinearGradient colors={bgGradient} style={StyleSheet.absoluteFill} />
      <View pointerEvents="none" style={[styles.blob, { top: -80, right: -60, backgroundColor: 'rgba(194,31,54,0.28)' }]} />
      <View pointerEvents="none" style={[styles.blob, { top: 260, left: -120, width: 320, height: 320, backgroundColor: 'rgba(232,163,23,0.30)' }]} />
      <View pointerEvents="none" style={[styles.blob, { bottom: -100, right: -40, backgroundColor: 'rgba(68,114,196,0.30)' }]} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  blob: { position: 'absolute', width: 280, height: 280, borderRadius: 999 },
});
