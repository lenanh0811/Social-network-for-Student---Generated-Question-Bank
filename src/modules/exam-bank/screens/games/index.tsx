import { Ionicons } from '@expo/vector-icons';
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
import { Card } from '@/components/card';
import { Chip } from '@/components/chip';
import { Empty } from '@/components/empty';
import { ErrorBox } from '@/components/error-box';
import { fmtDate } from '@/utils/format-date';
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
  const narrowTabs: { value: Tab; label: string }[] = [{ value: 'play', label: 'Chơi' }, { value: 'mine', label: 'Lịch sử' }, { value: 'board', label: 'Xếp hạng' }];
  if (wide) {
    return (
      <Screen wide>
        <View style={{ flexDirection: 'row', gap: 16, alignItems: 'flex-start' }}>
          <View style={{ flex: 1, gap: 12, minWidth: 0 }}>
            <Hero /><Play wide />
            <H2>Lịch sử chơi gần đây</H2>
            <HistoryList limit={6} />
          </View>
          <View style={{ width: 340, gap: 12 }}><Board compact /></View>
        </View>
      </Screen>
    );
  }
  return (
    <Screen wide>
      <Hero />
      <View style={{ maxWidth: 520, width: '100%' }}><Segmented value={tab} onChange={setTab} options={narrowTabs} /></View>
      {tab === 'play' ? <><Play wide={false} /><TopPreview onMore={() => setTab('board')} /></> : tab === 'mine' ? <Mine /> : <Board />}
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
  const stat = (label: string, value: string) => (
    <View style={{ flex: 1, minWidth: 80, gap: 2 }}>
      <Text style={{ fontSize: 22, fontWeight: '600', color: '#fff' }}>{value}</Text>
      <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)' }}>{label}</Text>
    </View>
  );
  return (
    <View style={{ gap: 14, padding: 20, borderRadius: 24, backgroundColor: colors.primary }}>
      <View style={{ gap: 2 }}>
        <Text style={{ fontSize: 26, fontWeight: '700', color: '#fff', letterSpacing: -0.5 }}>Thử tài dự đoán</Text>
        <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)' }}>Đoán đúng để nhận điểm thưởng và leo bảng xếp hạng.</Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        {stat('Điểm', me ? String(me.points) : '–')}
        {stat('Hạng', me ? `#${me.rank}` : '–')}
        {stat('Chờ kết quả', String(pending ?? 0))}
        {ci ? stat('Chuỗi ngày', String(ci.streak)) : null}
      </View>
      {ci ? (
        <Pressable onPress={doIt} disabled={ci.checkedInToday || busy} style={({ pressed }) => ({ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 9, paddingHorizontal: 16, borderRadius: 999, backgroundColor: ci.checkedInToday ? 'rgba(255,255,255,0.22)' : '#fff', opacity: pressed ? 0.85 : 1 })}>
          <Ionicons name={ci.checkedInToday ? 'checkmark' : 'calendar-outline'} size={16} color={ci.checkedInToday ? '#fff' : colors.primary} />
          <Text style={{ fontWeight: '600', fontSize: 13, color: ci.checkedInToday ? '#fff' : colors.primary }}>
            {ci.checkedInToday ? 'Đã điểm danh hôm nay' : busy ? 'Đang điểm danh…' : 'Điểm danh +1 xu'}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/** Top 3 xếp hạng học kỳ (màn hẹp) để trang không trống phần dưới. */
function TopPreview({ onMore }: { onMore: () => void }) {
  const { data } = useLoad(() => getLeaderboard('SEMESTER'));
  const top = data?.entries.slice(0, 3) ?? [];
  if (!top.length) return null;
  return (
    <>
      <Row style={{ justifyContent: 'space-between' }}>
        <H2>Đang dẫn đầu</H2>
        <Pressable onPress={onMore}><Text style={{ color: colors.primary, fontWeight: '600', fontSize: 13 }}>Xem tất cả</Text></Pressable>
      </Row>
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        {top.map((e) => (
          <Row key={e.userId} style={{ padding: 14, borderBottomWidth: 1, borderBottomColor: glass.edge, flexWrap: 'nowrap', backgroundColor: e.isMe ? colors.primarySoft : 'transparent' }}>
            <Text style={{ width: 34, fontSize: 16, textAlign: 'center', fontWeight: '600', color: [colors.accent, '#9AA0AB', '#C4824B'][e.rank - 1] ?? colors.muted }}>{e.rank}</Text>
            <Text style={{ flex: 1, fontWeight: '600', color: colors.text }} numberOfLines={1}>{e.name}{e.isMe ? ' (bạn)' : ''}</Text>
            <Text style={{ fontWeight: '600', color: colors.primary }}>{e.points} đ</Text>
          </Row>
        ))}
      </Card>
    </>
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
            <Pressable key={x.game} onPress={() => setSel(x.game)} style={({ pressed }) => ({ width: wide ? '32%' : '48%', flexGrow: 1, minWidth: 240, opacity: pressed ? 0.8 : 1 })}>
              <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft }}>
                  <Ionicons name={m.icon} size={24} color={colors.primary} />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ fontWeight: '600', fontSize: 15, color: colors.text }} numberOfLines={1}>{m.title}</Text>
                  <Muted>{m.short}</Muted>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: colors.primary, marginTop: 2 }}>{x.reward}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.primary} />
              </Card>
            </Pressable>
          );
        })}
      </View>
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

function HistoryList({ limit }: { limit?: number }) {
  const { data, loading, error, reload } = useLoad(listMyPredictions);
  const [open, setOpen] = useState<string>();
  if (loading && !data) return <Loading />;
  if (error) return <ErrorBox message={error} onRetry={reload} />;
  if (!data?.length) return <Empty icon="game-controller-outline" text="Bạn chưa chơi trò nào." />;
  return (
    <Card style={{ padding: 0, overflow: 'hidden' }}>
      {(limit ? data.slice(0, limit) : data).map((p) => {
        const m = GAME_META[p.game]; const b = resultBadge(p); const on = open === p.id;
        return (
          <Pressable key={p.id} onPress={() => setOpen(on ? undefined : p.id)} style={{ padding: 14, gap: 8, borderBottomWidth: 1, borderBottomColor: glass.edge, backgroundColor: on ? 'rgba(255,255,255,0.5)' : 'transparent' }}>
            <Row style={{ flexWrap: 'nowrap', justifyContent: 'space-between' }}>
              <Row style={{ gap: 8, flexShrink: 1, flexWrap: 'nowrap' }}>
                <Ionicons name={m.icon} size={18} color={m.color} />
                <Text numberOfLines={1} style={{ fontWeight: '600', color: colors.text, flexShrink: 1 }}>{m.title}</Text>
              </Row>
              <Row style={{ gap: 6, flexWrap: 'nowrap' }}>
                <Badge label={b.label} fg={b.fg} bg={b.bg} />
                <Ionicons name={on ? 'chevron-up' : 'chevron-down'} size={16} color={colors.muted} />
              </Row>
            </Row>
            {on ? (
              <View style={{ gap: 4 }}>
                <Text style={{ color: colors.text }}>Dự đoán của bạn: <Text style={{ fontWeight: '600' }}>{describeData(p.prediction) || '—'}</Text></Text>
                {p.actual ? <Text style={{ color: colors.text }}>Kết quả thực tế: <Text style={{ fontWeight: '600', color: colors.blue }}>{describeData(p.actual)}</Text></Text> : null}
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
  const medalColor = [colors.accent, '#9AA0AB', '#C4824B'];
  const list = data?.entries ?? [];
  return (
    <>
      <Row style={{ gap: 6 }}><Ionicons name="trophy" size={22} color={colors.accent} /><H1>Xếp hạng</H1></Row>
      <Segmented value={period} onChange={setPeriod} options={[{ value: 'SEMESTER', label: 'Học kỳ' }, { value: 'SUBJECT', label: 'Môn học' }]} />
      {period === 'SUBJECT' ? <Row>{subjects.data?.map((s) => <Chip key={s.id} label={s.name} active={sid === s.id} onPress={() => setSubject(s.id)} />)}</Row> : null}
      {loading && !data ? <Loading /> : error ? <ErrorBox message={error} onRetry={reload} /> : (
        <>
          <Card style={{ padding: 0, overflow: 'hidden' }}>
            {!list.length ? <Empty icon="trophy-outline" text="Chưa có ai trên bảng xếp hạng." /> : list.map((e) => (
              <Row key={e.userId} style={{ padding: 14, borderBottomWidth: 1, borderBottomColor: glass.edge, backgroundColor: e.isMe ? colors.primarySoft : 'transparent', flexWrap: 'nowrap' }}>
                <Text style={{ width: 34, fontSize: 16, textAlign: 'center', fontWeight: '600', color: medalColor[e.rank - 1] ?? colors.muted }}>{e.rank}</Text>
                <View style={{ flex: 1 }}><Text style={{ fontWeight: '600', color: colors.text }}>{e.name}{e.isMe ? ' (bạn)' : ''}</Text>{e.userCode ? <Muted>{e.userCode}</Muted> : null}</View>
                <Text style={{ fontWeight: '600', color: colors.primary, fontSize: 16 }}>{e.points} đ</Text>
              </Row>
            ))}
          </Card>
          {data?.myRank && !list.some((e) => e.isMe) ? <Muted>Bạn đang hạng #{data.myRank.rank} · {data.myRank.points} điểm</Muted> : null}
        </>
      )}
    </>
  );
}
