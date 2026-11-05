import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps, ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { colors } from '@/shared/theme';
import { Badge, Card, Muted, Row } from '@/shared/ui';

export type IconName = ComponentProps<typeof Ionicons>['name'];

/** Khung một minigame đang mở: tiêu đề, phần thưởng, luật chơi, nội dung chơi. */
export function GameShell({ no, title, icon, rule, reward, color = colors.primary, onClose, children }: {
  no: number; title: string; icon: IconName; rule: string; reward: string; color?: string; onClose?: () => void; children: ReactNode;
}) {
  return (
    <Card style={{ gap: 14 }}>
      <Row style={{ flexWrap: 'nowrap' }}>
        <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: color, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name={icon} size={26} color="#fff" />
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={{ fontWeight: '800', fontSize: 18, color: colors.text }}>Minigame {no}: {title}</Text>
          <Badge label={reward} fg={colors.warning} bg={colors.warningSoft} />
        </View>
        {onClose ? <Pressable onPress={onClose} hitSlop={8}><Ionicons name="close-circle" size={28} color={colors.muted} /></Pressable> : null}
      </Row>
      <View style={{ backgroundColor: 'rgba(255,255,255,0.55)', borderRadius: 14, padding: 12 }}>
        <Row style={{ flexWrap: 'nowrap', alignItems: 'flex-start' }}>
          <Ionicons name="information-circle" size={18} color={colors.blue} />
          <Muted style={{ flex: 1 }}>{rule}</Muted>
        </Row>
      </View>
      {children}
    </Card>
  );
}
