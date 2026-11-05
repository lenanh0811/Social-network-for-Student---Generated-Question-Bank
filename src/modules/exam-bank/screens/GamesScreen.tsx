import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { getLeaderboard, listMyPredictions, submitPrediction } from '@/modules/exam-bank/api/client';
import type { PredictionType } from '@/modules/exam-bank/api/types';
import { Badge, Button, Card, Empty, ErrorBox, Field, fmtDate, H1, H2, Loading, Muted, Row, Screen, Segmented } from '@/shared/ui';
import { useAuth } from '@/shared/context/Auth';
import { useLoad } from '@/shared/hooks';
import { colors } from '@/shared/theme';

const GAMES: { type: PredictionType; title: string; desc: string; icon: keyof typeof Ionicons.glyphMap; hint: string }[] = [
  { type: 'participants', title: 'Số người tham gia', desc: 'Dự đoán số sinh viên đóng góp câu hỏi trong kỳ.', icon: 'people', hint: 'VD: 120' },
  { type: 'approved-questions', title: 'Số câu hỏi được duyệt', desc: 'Dự đoán tổng số câu hỏi được giảng viên duyệt.', icon: 'checkmark-done', hint: 'VD: 350' },
  { type: 'bank-size', title: 'Quy mô ngân hàng câu hỏi', desc: 'Dự đoán tổng số câu hỏi của ngân hàng.', icon: 'library', hint: 'VD: 500' },
];
type Tab = 'play' | 'mine' | 'board';

/** Minigame dự đoán: gửi dự đoán (28–30) · lịch sử (31) · bảng xếp hạng (32). */
export default function Games() {
  const [tab, setTab] = useState<Tab>('play');
  return (
    <Screen>
      <H1>Trò chơi dự đoán</H1>
      <Segmented value={tab} onChange={setTab} options={[{ value: 'play', label: 'Chơi' }, { value: 'mine', label: 'Của tôi' }, { value: 'board', label: 'Xếp hạng' }]} />
      {tab === 'play' ? GAMES.map((g) => <PredictCard key={g.type} g={g} />) : tab === 'mine' ? <Mine /> : <Board />}
    </Screen>
  );
}

function PredictCard({ g }: { g: (typeof GAMES)[number] }) {
  const [v, setV] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string>();
  const [err, setErr] = useState<string>();
  const n = Number(v);
  const valid = v.trim() !== '' && Number.isInteger(n) && n >= 0;
  const send = async () => {
    setBusy(true); setErr(undefined);
    try { const p = await submitPrediction(g.type, n); setDone(`Đã ghi nhận dự đoán ${p.value}. Kết quả chốt ngày ${fmtDate(p.targetDate)}.`); setV(''); }
    catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };
  return (
    <Card>
      <Row><Ionicons name={g.icon} size={22} color={colors.primary} /><H2>{g.title}</H2></Row>
      <Muted>{g.desc}</Muted>
      <Field label="Dự đoán của bạn" value={v} onChangeText={(t) => { setV(t.replace(/\D/g, '')); setDone(undefined); }} keyboardType="number-pad" placeholder={g.hint} error={err} />
      {done ? <Text style={{ color: colors.success, fontWeight: '600' }}>{done}</Text> : null}
      <Button title="Gửi dự đoán" icon="flash" disabled={!valid} loading={busy} onPress={send} />
    </Card>
  );
}

function Mine() {
  const { data, loading, error, reload } = useLoad(listMyPredictions);
  if (loading && !data) return <Loading />;
  if (error) return <ErrorBox message={error} onRetry={reload} />;
  if (!data?.length) return <Empty icon="game-controller-outline" text="Bạn chưa có dự đoán nào." />;
  return <>{data.map((p) => {
    const g = GAMES.find((x) => x.type === p.type)!;
    return (
      <Card key={p.id}>
        <Row style={{ justifyContent: 'space-between' }}>
          <H2>{g.title}</H2>
          <Badge label={p.status === 'open' ? 'Đang mở' : 'Đã chốt'} fg={p.status === 'open' ? colors.warning : colors.success} bg={p.status === 'open' ? colors.warningSoft : colors.successSoft} />
        </Row>
        <Row style={{ justifyContent: 'space-between' }}>
          <View><Muted>Dự đoán</Muted><Text style={{ fontSize: 22, fontWeight: '800' }}>{p.value}</Text></View>
          {p.actual !== undefined ? <View><Muted>Thực tế</Muted><Text style={{ fontSize: 22, fontWeight: '800', color: colors.blue }}>{p.actual}</Text></View> : null}
          {p.points !== undefined ? <View><Muted>Điểm</Muted><Text style={{ fontSize: 22, fontWeight: '800', color: colors.success }}>+{p.points}</Text></View> : null}
        </Row>
        <Muted>Chốt ngày {fmtDate(p.targetDate)}</Muted>
      </Card>
    );
  })}</>;
}

function Board() {
  const { user } = useAuth();
  const { data, loading, error, reload } = useLoad(getLeaderboard);
  if (loading && !data) return <Loading />;
  if (error) return <ErrorBox message={error} onRetry={reload} />;
  const medal = ['🥇', '🥈', '🥉'];
  return <Card style={{ padding: 0, overflow: 'hidden' }}>
    {data?.map((e) => (
      <Row key={e.userId} style={{ padding: 14, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: e.userId === user.id ? colors.accentSoft : '#fff', flexWrap: 'nowrap' }}>
        <Text style={{ width: 32, fontSize: 20, textAlign: 'center', fontWeight: '800' }}>{medal[e.rank - 1] ?? e.rank}</Text>
        <View style={{ flex: 1 }}><Text style={{ fontWeight: '700' }}>{e.name}{e.userId === user.id ? ' (bạn)' : ''}</Text><Muted>{e.hits} lần dự đoán chốt</Muted></View>
        <Text style={{ fontWeight: '800', color: colors.primary, fontSize: 16 }}>{e.points} đ</Text>
      </Row>
    ))}
  </Card>;
}
