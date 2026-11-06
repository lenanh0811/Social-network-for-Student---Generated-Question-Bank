import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { doCheckIn, getCheckIn, getLeaderboard, listMyPredictions, listSubjects } from '@/modules/exam-bank/api/client';
import type { GameType, Prediction } from '@/modules/exam-bank/api/types';
import { Mg1, Mg2, Mg4 } from './number-games';
import { Mg3, Mg5, Mg6 } from './other-games';
import { GAME_META, describeData } from './meta';
import { useLoad } from '@/hooks/use-load';
import { colors, glass } from '@/theme';
import { Badge } from '@/components/badge';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Chip } from '@/components/chip';
import { Empty } from '@/components/empty';
import { ErrorBox } from '@/components/error-box';
import { fmtDate } from '@/utils/format-date';
import { Glass } from '@/components/glass';
import { H1, H2 } from '@/components/heading';
import { Loading } from '@/components/loading';
import { Muted } from '@/components/muted';
import { Row } from '@/components/row';
import { Screen } from '@/components/screen';
import { Segmented } from '@/components/segmented';

const GAMES: { game: GameType; reward: string; Comp: (p: { onClose?: () => void }) => React.JSX.Element }[] = [
  { game: 'GAME_1_PARTICIPANTS', reward: 'Đoán đúng → điểm', Comp: Mg1 },
  { game: 'GAME_2_APPROVED_QUESTIONS', reward: 'Cộng điểm', Comp: Mg2 },
  { game: 'GAME_3_AUTHOR_CONFIDENCE', reward: 'Tự động', Comp: Mg3 },
  { game: 'GAME_4_SUBJECT_BANK_SIZE', reward: 'Top 3 chính xác', Comp: Mg4 },
  { game: 'GAME_5_REPORT_ERROR', reward: 'Lỗi thật → điểm', Comp: Mg5 },
  { game: 'GAME_6_LLM_IDENTIFICATION', reward: 'Thứ 7 hàng tuần', Comp: Mg6 },
];
type Tab = 'play' | 'mine' | 'board';

/** Minigame: Game 1/2/4/6 đặt dự đoán · Game 3 dùng mức tự tin khi đề xuất · Game 5 báo lỗi qua đánh giá. Lịch sử + xếp hạng + điểm danh. */
export default function Games() {
  const [tab, setTab] = useState<Tab>('play');
  const wide = useWindowDimensions().width >= 1100;
  const narrowTabs: { value: Tab; label: string }[] = [{ value: 'play', label: '🎮 Chơi' }, { value: 'mine', label: '🧾 Lịch sử' }, { value: 'board', label: '🏆 Xếp hạng' }];
  if (wide) {
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

/** Banner: điểm, hạng, dự đoán đang chờ, điểm danh. */
function Hero() {
  const board = useLoad(() => getLeaderboard('SEMESTER'));
  const mine = useLoad(listMyPredictions);
  const checkin = useLoad(getCheckIn);
  const [busy, setBusy] = useState(false);
  const me = board.data?.myRank;
  const pending = mine.data?.filter((p) => p.status === 'pending').length;
  const ci = checkin.data;
  const doIt = async () => { setBusy(true); try { checkin.setData(await doCheckIn()); } finally { setBusy(false); } };
  return (
    <View style={{ borderRadius: 28, overflow: 'hidden', borderWidth: 1, borderColor: glass.border, ...glass.shadow }}>
      <LinearGradient colors={['#E0384F', '#9E1628', '#5B3AA8']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: 20, gap: 14 }}>
        <View style={{ gap: 4 }}>
          <Text style={{ color: '#fff', fontSize: 26, fontWeight: '800', letterSpacing: -0.5 }}>Thử tài dự đoán 🎯</Text>
          <Text style={{ color: 'rgba(255,255,255,0.9)' }}>Đoán đúng để nhận điểm thưởng và leo bảng xếp hạng cùng bạn học.</Text>
        </View>
        <Text style={{ color: '#fff', fontWeight: '600' }}>
          {me ? `⭐ ${me.points} điểm   ·   🏆 Hạng ${me.rank}${me.topPercent !== undefined ? ` (top ${Math.round(me.topPercent)}%)` : ''}` : ' '}{pending ? `   ·   ⚡ ${pending} dự đoán chờ kết quả` : ''}
        </Text>
        {ci ? (
          <Row style={{ gap: 10 }}>
            <Pressable onPress={doIt} disabled={ci.checkedInToday || busy} style={{ opacity: ci.checkedInToday ? 0.7 : 1 }}>
              <View style={{ backgroundColor: 'rgba(255,255,255,0.22)', borderRadius: 999, paddingVertical: 8, paddingHorizontal: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)' }}>
                <Text style={{ color: '#fff', fontWeight: '700' }}>{ci.checkedInToday ? '✓ Đã điểm danh hôm nay' : busy ? 'Đang điểm danh…' : '📅 Điểm danh +1 xu'}</Text>
              </View>
            </Pressable>
            <Text style={{ color: 'rgba(255,255,255,0.9)' }}>🔥 Chuỗi {ci.streak} ngày</Text>
          </Row>
        ) : null}
      </LinearGradient>
    </View>
  );
}

function Play({ wide }: { wide: boolean }) {
  const [sel, setSel] = useState<GameType>();
  const g = GAMES.find((x) => x.game === sel);
  return (
    <>
      <H2>Chọn trò chơi</H2>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        {GAMES.map((x) => {
          const m = GAME_META[x.game];
          return (
            <Pressable key={x.game} onPress={() => setSel(x.game)} style={({ pressed }) => ({ width: wide ? '32%' : '48%', flexGrow: 1, transform: [{ scale: pressed ? 0.97 : 1 }] })}>
              <Card style={{ gap: 10, minHeight: 168 }}>
                <View style={{ width: 52, height: 52, borderRadius: 18, overflow: 'hidden' }}>
                  <LinearGradient colors={[m.color, m.color + 'AA']} style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name={m.icon} size={28} color="#fff" />
                  </LinearGradient>
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ fontWeight: '800', fontSize: 15, color: colors.text }}>{m.no}. {m.title}</Text>
                  <Muted>{m.short}</Muted>
                </View>
                <Row style={{ justifyContent: 'space-between' }}>
                  <Badge label={x.reward} fg={colors.warning} bg={colors.warningSoft} />
                  <Ionicons name="play-circle" size={26} color={m.color} />
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

const resultBadge = (p: Prediction) =>
  p.status === 'pending' ? { label: 'Chờ kết quả', fg: colors.warning, bg: colors.warningSoft }
    : p.isCorrect ? { label: 'Trúng', fg: colors.success, bg: colors.successSoft } : { label: 'Trượt', fg: colors.danger, bg: colors.dangerSoft };

/** Lịch sử đầy đủ (màn hẹp). */
function Mine() {
  const { data, loading, error, reload } = useLoad(listMyPredictions);
  if (loading && !data) return <Loading />;
  if (error) return <ErrorBox message={error} onRetry={reload} />;
  if (!data?.length) return <Card><Empty icon="game-controller-outline" text="Bạn chưa có dự đoán nào. Hãy chọn một trò chơi và thử vận may!" /></Card>;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
      {data.map((p) => {
        const m = GAME_META[p.game]; const b = resultBadge(p);
        return (
          <View key={p.id} style={{ width: '48%', flexGrow: 1, minWidth: 280 }}>
            <Card>
              <Row style={{ justifyContent: 'space-between' }}>
                <Row style={{ gap: 6 }}><Ionicons name={m.icon} size={20} color={m.color} /><H2>{m.title}</H2></Row>
                <Badge label={b.label} fg={b.fg} bg={b.bg} />
              </Row>
              <Text style={{ color: colors.text }}>{describeData(p.prediction) || '—'}</Text>
              {p.actual ? <Text style={{ color: colors.blue }}>Kết quả: {describeData(p.actual)}</Text> : null}
              <Muted>Đặt ngày {fmtDate(p.createdAt)}{p.resolvedAt ? ` · chốt ${fmtDate(p.resolvedAt)}` : ''}</Muted>
            </Card>
          </View>
        );
      })}
    </View>
  );
}

/** Nút nhỏ “Lịch sử chơi” bên trái; bấm mới mở bảng, chạm một dòng để xem chi tiết. */
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
            <ScrollView style={{ maxHeight: 480 }}><HistoryList /></ScrollView>
          </Glass>
        </View>
      ) : null}
    </View>
  );
}

function HistoryList() {
  const { data, loading, error, reload } = useLoad(listMyPredictions);
  const [open, setOpen] = useState<string>();
  if (loading && !data) return <Loading />;
  if (error) return <ErrorBox message={error} onRetry={reload} />;
  if (!data?.length) return <Empty icon="game-controller-outline" text="Bạn chưa chơi trò nào." />;
  return (
    <Card style={{ padding: 0, overflow: 'hidden' }}>
      {data.map((p) => {
        const m = GAME_META[p.game]; const b = resultBadge(p); const on = open === p.id;
        return (
          <Pressable key={p.id} onPress={() => setOpen(on ? undefined : p.id)} style={{ padding: 14, gap: 8, borderBottomWidth: 1, borderBottomColor: glass.edge, backgroundColor: on ? 'rgba(255,255,255,0.5)' : 'transparent' }}>
            <Row style={{ flexWrap: 'nowrap', justifyContent: 'space-between' }}>
              <Row style={{ gap: 8, flexShrink: 1, flexWrap: 'nowrap' }}>
                <Ionicons name={m.icon} size={18} color={m.color} />
                <Text numberOfLines={1} style={{ fontWeight: '700', color: colors.text, flexShrink: 1 }}>{m.title}</Text>
              </Row>
              <Row style={{ gap: 6, flexWrap: 'nowrap' }}>
                <Badge label={b.label} fg={b.fg} bg={b.bg} />
                <Ionicons name={on ? 'chevron-up' : 'chevron-down'} size={16} color={colors.muted} />
              </Row>
            </Row>
            {on ? (
              <View style={{ gap: 4 }}>
                <Text style={{ color: colors.text }}>Dự đoán của bạn: <Text style={{ fontWeight: '800' }}>{describeData(p.prediction) || '—'}</Text></Text>
                {p.actual ? <Text style={{ color: colors.text }}>Kết quả thực tế: <Text style={{ fontWeight: '800', color: colors.blue }}>{describeData(p.actual)}</Text></Text> : null}
                <Muted>Đặt ngày {fmtDate(p.createdAt)}{p.resolvedAt ? ` · chốt ${fmtDate(p.resolvedAt)}` : ''}</Muted>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </Card>
  );
}

/** Bảng xếp hạng theo học kỳ hoặc theo môn. `compact` = cột bên phải trên màn rộng. */
function Board({ compact }: { compact?: boolean }) {
  const [period, setPeriod] = useState<'SEMESTER' | 'SUBJECT'>('SEMESTER');
  const [subject, setSubject] = useState<string>();
  const subjects = useLoad(listSubjects);
  const sid = period === 'SUBJECT' ? subject ?? subjects.data?.[0]?.id : undefined;
  const { data, loading, error, reload } = useLoad(() => (period === 'SUBJECT' && !sid ? Promise.resolve(undefined) : getLeaderboard(period, sid)), [period, sid]);
  const medal = ['🥇', '🥈', '🥉'];
  const list = data?.entries ?? [];
  const podium = [list[1], list[0], list[2]].filter(Boolean);
  const height = (rank: number) => (rank === 1 ? 120 : rank === 2 ? 92 : 72);
  return (
    <>
      <Row style={{ gap: 6 }}><Ionicons name="trophy" size={22} color={colors.accent} /><H1>Xếp hạng</H1></Row>
      <Segmented value={period} onChange={setPeriod} options={[{ value: 'SEMESTER', label: 'Học kỳ' }, { value: 'SUBJECT', label: 'Môn học' }]} />
      {period === 'SUBJECT' ? <Row>{subjects.data?.map((s) => <Chip key={s.id} label={s.name} active={sid === s.id} onPress={() => setSubject(s.id)} />)}</Row> : null}
      {loading && !data ? <Loading /> : error ? <ErrorBox message={error} onRetry={reload} /> : (
        <>
          {!compact && podium.length ? (
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 10 }}>
              {podium.map((e) => (
                <View key={e.userId} style={{ flex: 1, maxWidth: 200, alignItems: 'center', gap: 6 }}>
                  <Text style={{ fontSize: 30 }}>{medal[e.rank - 1]}</Text>
                  <Text numberOfLines={1} style={{ fontWeight: '700', color: colors.text }}>{e.name}{e.isMe ? ' (bạn)' : ''}</Text>
                  <View style={{ width: '100%', height: height(e.rank), borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: glass.border }}>
                    <LinearGradient colors={e.rank === 1 ? ['#F7C948', '#E8A317'] : e.rank === 2 ? ['#D5D8DE', '#A9AEB8'] : ['#E5B58A', '#C4824B']} style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ color: '#fff', fontWeight: '800', fontSize: 20 }}>{e.points}</Text>
                      <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 12 }}>điểm</Text>
                    </LinearGradient>
                  </View>
                </View>
              ))}
            </View>
          ) : null}
          <Card style={{ padding: 0, overflow: 'hidden' }}>
            {!list.length ? <Empty icon="trophy-outline" text="Chưa có ai trên bảng xếp hạng." /> : list.map((e) => (
              <Row key={e.userId} style={{ padding: 14, borderBottomWidth: 1, borderBottomColor: glass.edge, backgroundColor: e.isMe ? 'rgba(232,163,23,0.18)' : 'transparent', flexWrap: 'nowrap' }}>
                <Text style={{ width: 34, fontSize: 18, textAlign: 'center', fontWeight: '800', color: colors.text }}>{medal[e.rank - 1] ?? e.rank}</Text>
                <View style={{ flex: 1 }}><Text style={{ fontWeight: '700', color: colors.text }}>{e.name}{e.isMe ? ' (bạn)' : ''}</Text>{e.userCode ? <Muted>{e.userCode}</Muted> : null}</View>
                <Text style={{ fontWeight: '800', color: colors.primary, fontSize: 16 }}>{e.points} đ</Text>
              </Row>
            ))}
          </Card>
          {data?.myRank && !list.some((e) => e.isMe) ? <Muted>Bạn đang hạng #{data.myRank.rank} · {data.myRank.points} điểm</Muted> : null}
        </>
      )}
    </>
  );
}
