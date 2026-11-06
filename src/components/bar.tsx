import { View } from 'react-native';
import { colors } from '@/theme';

/** Thanh phần trăm ngang (dùng cho thống kê đáp án). */
export function Bar({ ratio, color = colors.blue }: { ratio: number; color?: string }) {
  return (
    <View style={{ height: 10, borderRadius: 5, backgroundColor: 'rgba(0,0,0,0.08)', overflow: 'hidden', flex: 1 }}>
      <View style={{ width: `${Math.round(ratio * 100)}%`, height: '100%', backgroundColor: color, borderRadius: 5 }} />
    </View>
  );
}
