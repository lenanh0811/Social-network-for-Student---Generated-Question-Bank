import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { glass } from '@/theme';

/** Tấm kính mờ: làm mờ nền phía sau + lớp phủ sáng + viền highlight. */
export function Glass({ children, style, strong, intensity = glass.blur }: {
  children?: ReactNode; style?: StyleProp<ViewStyle>; strong?: boolean; intensity?: number;
}) {
  const { backgroundColor, ...rest } = StyleSheet.flatten(style) ?? {};
  return (
    <View style={[styles.glass, rest]}>
      <BlurView intensity={intensity} tint="light" style={StyleSheet.absoluteFill} />
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: backgroundColor ?? (strong ? glass.tintStrong : glass.tint) }]} />
      <LinearGradient pointerEvents="none" colors={['rgba(255,255,255,0.55)', 'rgba(255,255,255,0)']} start={{ x: 0, y: 0 }} end={{ x: 0.6, y: 0.5 }} style={StyleSheet.absoluteFill} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  glass: { overflow: 'hidden', borderWidth: 1, borderColor: glass.border, ...glass.shadow },
});
