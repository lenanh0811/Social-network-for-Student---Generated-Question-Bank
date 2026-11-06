import type { ReactNode } from 'react';
import { Platform, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { Glass } from '@/components/glass';
import { GlassBackdrop } from '@/components/glass-backdrop';
import { colors, space } from '@/theme';

const HEADER_H = Platform.OS === 'web' ? 72 : 108;

/** Khung một màn hình: nền kính, cuộn, kéo để làm mới, thanh hành động cố định ở đáy (`footer`). */
export function Screen({ children, onRefresh, refreshing, footer, noHeader, wide }: {
  children: ReactNode; onRefresh?: () => void; refreshing?: boolean; footer?: ReactNode; noHeader?: boolean; wide?: boolean;
}) {
  return (
    <GlassBackdrop>
      <ScrollView
        contentContainerStyle={[styles.screen, wide && { paddingHorizontal: 24 }, { paddingTop: (noHeader ? (Platform.OS === 'web' ? 14 : 54) + 56 : HEADER_H) + space.md }]} keyboardShouldPersistTaps="handled"
        refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={colors.primary} progressViewOffset={HEADER_H} /> : undefined}
      >
        <View style={[styles.col, wide && { maxWidth: '100%' }]}>{children}</View>
      </ScrollView>
      {footer ? (
        <Glass strong style={styles.footer}><View style={styles.col}>{footer}</View></Glass>
      ) : null}
    </GlassBackdrop>
  );
}

const styles = StyleSheet.create({
  screen: { padding: space.lg, paddingBottom: 120, alignItems: 'center' },
  col: { width: '100%', maxWidth: 720, gap: space.md },
  footer: { position: 'absolute', left: 12, right: 12, bottom: 12, padding: space.md, borderRadius: 28, alignItems: 'center' },
});
