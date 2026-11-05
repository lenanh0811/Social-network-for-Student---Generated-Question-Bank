import { Ionicons } from '@expo/vector-icons';
import { useState, type ComponentProps, type ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { colors } from '@/shared/theme';
import { Badge, Card, Muted, Row } from '@/shared/ui';

/** Thẻ minigame có thể thu gọn: tiêu đề, luật chơi, nội dung chơi. */
export function GameShell({ no, title, icon, rule, reward, children }: {
  no: number; title: string; icon: ComponentProps<typeof Ionicons>['name']; rule: string; reward: string; children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Card>
      <Pressable onPress={() => setOpen(!open)}>
        <Row style={{ flexWrap: 'nowrap' }}>
          <View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name={icon} size={22} color={colors.primary} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{ fontWeight: '800', fontSize: 16, color: colors.text }}>Minigame {no}: {title}</Text>
            <Badge label={reward} fg={colors.warning} bg={colors.warningSoft} />
          </View>
          <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={22} color={colors.muted} />
        </Row>
      </Pressable>
      {open ? (
        <View style={{ gap: 12, marginTop: 6 }}>
          <Muted>{rule}</Muted>
          {children}
        </View>
      ) : null}
    </Card>
  );
}
