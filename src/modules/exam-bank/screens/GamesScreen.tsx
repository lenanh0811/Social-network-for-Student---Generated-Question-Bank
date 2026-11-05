import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { getLeaderboard, listMyPredictions } from '@/modules/exam-bank/api/client';
import type { Prediction, PredictionType } from '@/modules/exam-bank/api/types';
import { Mg1, Mg2, Mg4 } from '@/modules/exam-bank/screens/games/NumberGames';
import { Mg3, Mg5, Mg6 } from '@/modules/exam-bank/screens/games/OtherGames';
import type { IconName } from '@/modules/exam-bank/screens/games/GameShell';
import { useAuth } from '@/shared/context/Auth';
import { useLoad } from '@/shared/hooks';
import { colors, glass } from '@/shared/theme';
import { Badge, Button, Card, Glass, Empty, ErrorBox, fmtDate, H1, H2, Loading, Muted, Row, Screen, Segmented } from '@/shared/ui';

const GAMES: { no: number; title: string; short: string; icon: IconName; color: string; reward: string; Comp: (p: { onClose?: () => void }) => React.JSX.Element }[] = [
  { no: 1, title: 'Đoán số lượng', short: 'Bao nhiêu bạn sẽ đề xuất câu hỏi?', icon: 'people', color: '#4472C4', reward: 'Sai số ±5%', Comp: Mg1 },
  { no: 2, title: 'Đoán tỷ lệ duyệt', short: 'Bao nhiêu câu của bạn được chọn?', icon: 'checkmark-done', color: '#1E8E4E', reward: 'Cộng điểm', Comp: Mg2 },
  { no: 3, title: 'Đoán mức yêu thích', short: 'Bạn học sẽ chấm câu nào cao nhất?', icon: 'heart', color: '#E0384F', reward: '+0.25 điểm', Comp: Mg3 },
  { no: 4, title: 'Quy mô ngân hàng đề', short: 'Ngân hàng sẽ có bao nhiêu câu?', icon: 'library', color: '#B26A00', reward: 'Top 3 nhanh nhất', Comp: Mg4 },
  { no: 5, title: 'Báo câu lỗi', short: 'Săn lỗi, nhận điểm cuối kỳ.', icon: 'bug', color: '#D32F2F', reward: 'Cộng điểm', Comp: Mg5 },
  { no: 6, title: 'Đâu là câu của LLM?', short: 'Phân biệt câu của AI và người.', icon: 'hardware-chip', color: '#7B4DD6', reward: 'Đúng hết & nhanh', Comp: Mg6 },
];
const TYPE_LABEL: Record<PredictionType, string> = { participants: 'Số người tham gia', 'approved-questions': 'Số câu được duyệt', 'bank-size': 'Quy mô ngân hàng' };
const TYPE_ICON: Record<PredictionType, IconName> = { participants: 'people', 'approved-questions': 'checkmark-done', 'bank-size': 'library' };
type Tab = 'play' | 'mine' | 'board';

/** 6 minigame (slide 3.1): MG1/2/4 dùng API 28–30; MG3/5/6 chưa có trong đặc tả. Lịch sử (31) · xếp hạng (32). */
export default function Games() {
  const [tab, setTab] = useState<Tab>('play');
  const wide = useWindowDimensions().width >= 1100;
  const narrowTabs: { value: Tab; label: string }[] = [{ value: 'play', label: '🎮 Chơi' }, { value: 'mine', label: '🧾 Lịch sử' }, { value: 'board', label: '🏆 Xếp hạng' }];
  if (wide) {
    // 3 cột: lịch sử của tôi · chơi · xếp hạng
    return (
      <Screen wide>
        <View style={{ flexDirection: 'row', gap: 16, alignItems: 'flex-start' }}>
          <HistoryButton />
          <View style={{ flex: 1, gap: 12, minWidth: 0 }}><Hero /><Play wide /></View>
          <View style={{ width: 340, gap: 12 }}><Board compact /></View>
        </View>
      </Screen>
    );
  }
  return (
    <Screen wide>
      <Hero />
      <View style={{ maxWidth: 520, width: '100%' }}><Segmented value={tab} onChange={setTab} options={narrowTabs} /></View>
      {tab === 'play' ? <Play wide={false} /> : tab === 'mine' ? <Mine /> : <Board />}
    </Screen>
  );
}

/** Banner đầu trang: điểm, hạng, số dự đoán đang mở. */
function Hero() {
  const { user } = useAuth();
  const board = useLoad(getLeaderboard);
  const mine = useLoad(listMyPredictions);
  const me = board.data?.find((e) => e.userId === user.id);
  const open = mine.data?.filter((p) => p.status === 'open').length;
  return (
    <View style={{ borderRadius: 28, overflow: 'hidden', borderWidth: 1, borderColor: glass.border, ...glass.shadow }}>
      <LinearGradient colors={['#E0384F', '#9E1628', '#5B3AA8']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: 20, gap: 16 }}>
        <View style={{ gap: 4 }}>
          <Text style={{ color: '#fff', fontSize: 26, fontWeight: '800', letterSpacing: -0.5 }}>Thử tài dự đoán 🎯</Text>
          <Text style={{ color: 'rgba(255,255,255,0.9)' }}>Đoán đúng để nhận điểm thưởng và leo bảng xếp hạng cùng bạn học.</Text>
        </View>
        <Text style={{ color: '#fff', fontWeight: '600' }}>
          {me ? `⭐ ${me.points} điểm   ·   🏆 Hạng ${me.rank}` : ' '}{open ? `   ·   ⚡ ${open} dự đoán đang mở` : ''}
        </Text>
      </LinearGradient>
    </View>
  );
}

function Play({ wide }: { wide: boolean }) {
  const [sel, setSel] = useState<number>();
  const g = GAMES.find((x) => x.no === sel);
  return (
    <>
      <H2>Chọn trò chơi</H2>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        {GAMES.map((x) => {
          const on = sel === x.no;
          return (
            <Pressable key={x.no} onPress={() => setSel(x.no)} style={({ pressed }) => ({ width: wide ? '32%' : '48%', flexGrow: 1, transform: [{ scale: pressed ? 0.97 : 1 }] })}>
              <Card style={{ gap: 10, minHeight: 168, borderWidth: on ? 2 : 1, borderColor: on ? x.color : undefined }}>
                <View style={{ width: 52, height: 52, borderRadius: 18, overflow: 'hidden' }}>
                  <LinearGradient colors={[x.color, x.color + 'AA']} style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name={x.icon} size={28} color="#fff" />
                  </LinearGradient>
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ fontWeight: '800', fontSize: 15, color: colors.text }}>{x.no}. {x.title}</Text>
                  <Muted>{x.short}</Muted>
                </View>
                <Row style={{ justifyContent: 'space-between' }}>
                  <Badge label={x.reward} fg={colors.warning} bg={colors.warningSoft} />
                  <Ionicons name="play-circle" size={26} color={x.color} />
                </Row>
              </Card>
            </Pressable>
          );
        })}
      </View>
      <Muted style={{ textAlign: 'center' }}>Chạm vào một trò chơi để xem hướng dẫn và bắt đầu.</Muted>
      <Modal visible={!!g} transparent animationType="fade" onRequestClose={() => setSel(undefined)}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16, backgroundColor: 'rgba(20,10,30,0.45)' }}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setSel(undefined)} accessibilityLabel="Đóng" />
          <View style={{ width: '100%', maxWidth: 560, maxHeight: '92%' }}>
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              {g ? <g.Comp onClose={() => setSel(undefined)} /> : null}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

/** `compact` = cột bên trái trên màn rộng: danh sách gọn các lần chơi trước. */
function Mine({ compact }: { compact?: boolean }) {
  const { data, loading, error, reload } = useLoad(listMyPredictions);
  if (loading && !data) return <Loading />;
  if (error) return <ErrorBox message={error} onRetry={reload} />;
  if (compact) return <MineCompact data={data ?? []} />;
  if (!data?.length) return <Card><Empty icon="game-controller-outline" text="Bạn chưa có dự đoán nào. Hãy chọn một trò chơi và thử vận may!" /></Card>;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
      {data.map((p) => {
        const settled = p.status === 'settled';
        return (
          <View key={p.id} style={{ width: '48%', flexGrow: 1, minWidth: 280 }}>
            <Card>
              <Row style={{ justifyContent: 'space-between' }}>
                <Row style={{ gap: 6 }}><Ionicons name={TYPE_ICON[p.type]} size={20} color={colors.primary} /><H2>{TYPE_LABEL[p.type]}</H2></Row>
                <Badge label={settled ? 'Đã chốt' : 'Đang mở'} fg={settled ? colors.success : colors.warning} bg={settled ? colors.successSoft : colors.warningSoft} />
              </Row>
              <Row style={{ justifyContent: 'space-between' }}>
                <View><Muted>Dự đoán</Muted><Text style={{ fontSize: 26, fontWeight: '800', color: colors.text }}>{p.value}</Text></View>
                {p.actual !== undefined ? <View><Muted>Thực tế</Muted><Text style={{ fontSize: 26, fontWeight: '800', color: colors.blue }}>{p.actual}</Text></View> : null}
                {p.points !== undefined ? <View><Muted>Điểm</Muted><Text style={{ fontSize: 26, fontWeight: '800', color: colors.success }}>+{p.points}</Text></View> : null}
              </Row>
              {p.detail ? <Muted>{p.detail}</Muted> : null}
              <Muted>{settled ? 'Đã chốt' : 'Chốt'} ngày {fmtDate(p.targetDate)}</Muted>
            </Card>
          </View>
        );
      })}
    </View>
  );
}

/** `compact` = cột bên phải trên màn rộng (không có bục). */
function Board({ compact }: { compact?: boolean }) {
  const { user } = useAuth();
  const { data, loading, error, reload } = useLoad(getLeaderboard);
  if (loading && !data) return <Loading />;
  if (error || !data) return <ErrorBox message={error ?? 'Lỗi'} onRetry={reload} />;
  const medal = ['🥇', '🥈', '🥉'];
  const podium = [data[1], data[0], data[2]].filter(Boolean); // 2 – 1 – 3
  const height = (rank: number) => (rank === 1 ? 120 : rank === 2 ? 92 : 72);
  return (
    <>
      {compact ? <Row style={{ gap: 6 }}><Ionicons name="trophy" size={22} color={colors.accent} /><H1>Xếp hạng</H1></Row> : null}
      {compact ? null : <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 10 }}>
        {podium.map((e) => (
          <View key={e.userId} style={{ flex: 1, maxWidth: 200, alignItems: 'center', gap: 6 }}>
            <Text style={{ fontSize: 30 }}>{medal[e.rank - 1]}</Text>
            <Text numberOfLines={1} style={{ fontWeight: '700', color: colors.text }}>{e.name}{e.userId === user.id ? ' (bạn)' : ''}</Text>
            <View style={{ width: '100%', height: height(e.rank), borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: glass.border }}>
              <LinearGradient colors={e.rank === 1 ? ['#F7C948', '#E8A317'] : e.rank === 2 ? ['#D5D8DE', '#A9AEB8'] : ['#E5B58A', '#C4824B']} style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: '#fff', fontWeight: '800', fontSize: 20 }}>{e.points}</Text>
                <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 12 }}>điểm</Text>
              </LinearGradient>
            </View>
          </View>
        ))}
      </View>}
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        {data.map((e) => (
          <Row key={e.userId} style={{ padding: 14, borderBottomWidth: 1, borderBottomColor: glass.edge, backgroundColor: e.userId === user.id ? 'rgba(232,163,23,0.18)' : 'transparent', flexWrap: 'nowrap' }}>
            <Text style={{ width: 34, fontSize: 18, textAlign: 'center', fontWeight: '800', color: colors.text }}>{medal[e.rank - 1] ?? e.rank}</Text>
            <View style={{ flex: 1 }}><Text style={{ fontWeight: '700', color: colors.text }}>{e.name}{e.userId === user.id ? ' (bạn)' : ''}</Text><Muted>{e.hits} lần dự đoán chốt</Muted></View>
            <Text style={{ fontWeight: '800', color: colors.primary, fontSize: 16 }}>{e.points} đ</Text>
          </Row>
        ))}
      </Card>
    </>
  );
}

function MineCompact({ data }: { data: Prediction[] }) {
  const [open, setOpen] = useState<string>();
  return (
    <>
      <Muted>Chạm vào một dòng để xem chi tiết.</Muted>
      {!data.length ? <Card><Empty icon="game-controller-outline" text="Bạn chưa chơi trò nào." /></Card> : (
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          {data.map((p) => {
            const settled = p.status === 'settled';
            const on = open === p.id;
            return (
              <Pressable key={p.id} onPress={() => setOpen(on ? undefined : p.id)} style={{ padding: 14, gap: 8, borderBottomWidth: 1, borderBottomColor: glass.edge, backgroundColor: on ? 'rgba(255,255,255,0.5)' : 'transparent' }}>
                <Row style={{ flexWrap: 'nowrap', justifyContent: 'space-between' }}>
                  <Row style={{ gap: 8, flexShrink: 1, flexWrap: 'nowrap' }}>
                    <Ionicons name={TYPE_ICON[p.type]} size={18} color={colors.primary} />
                    <Text numberOfLines={1} style={{ fontWeight: '700', color: colors.text, flexShrink: 1 }}>{TYPE_LABEL[p.type]}</Text>
                  </Row>
                  <Row style={{ gap: 6, flexWrap: 'nowrap' }}>
                    {p.points !== undefined ? <Text style={{ fontWeight: '800', color: colors.success }}>+{p.points}</Text> : <Badge label={settled ? 'Đã chốt' : 'Đang mở'} fg={settled ? colors.success : colors.warning} bg={settled ? colors.successSoft : colors.warningSoft} />}
                    <Ionicons name={on ? 'chevron-up' : 'chevron-down'} size={16} color={colors.muted} />
                  </Row>
                </Row>
                {on ? (
                  <View style={{ gap: 4 }}>
                    <Text style={{ color: colors.text }}>Dự đoán của bạn: <Text style={{ fontWeight: '800' }}>{p.value}</Text></Text>
                    {p.actual !== undefined ? <Text style={{ color: colors.text }}>Kết quả thực tế: <Text style={{ fontWeight: '800', color: colors.blue }}>{p.actual}</Text></Text> : null}
                    {p.detail ? <Muted>{p.detail}</Muted> : null}
                    <Muted>Chơi ngày {fmtDate(p.createdAt)} · {settled ? 'đã chốt' : 'chốt'} ngày {fmtDate(p.targetDate)}</Muted>
                    <Row><Badge label={settled ? 'Đã chốt' : 'Đang mở'} fg={settled ? colors.success : colors.warning} bg={settled ? colors.successSoft : colors.warningSoft} /></Row>
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </Card>
      )}
    </>
  );
}

/** Nút nhỏ “Lịch sử chơi” ở bên trái; bấm mới mở bảng chi tiết các lần chơi trước. */
function HistoryButton() {
  const [open, setOpen] = useState(false);
  return (
    <View style={{ width: 150, zIndex: 50 }}>
      <Button small variant={open ? 'primary' : 'soft'} icon="time" title="Lịch sử chơi" onPress={() => setOpen(!open)} />
      {open ? (
        <View style={{ position: 'absolute', top: 48, left: 0, width: 340, maxHeight: 560, zIndex: 60 }}>
          <Glass strong intensity={80} style={{ borderRadius: 24, padding: 12, gap: 10 }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <H2>Lịch sử chơi</H2>
              <Ionicons name="close-circle" size={24} color={colors.muted} onPress={() => setOpen(false)} />
            </Row>
            <ScrollView style={{ maxHeight: 480 }}><Mine compact /></ScrollView>
          </Glass>
        </View>
      ) : null}
    </View>
  );
}
