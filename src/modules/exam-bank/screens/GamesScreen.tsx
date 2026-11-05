import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { getLeaderboard, listMyPredictions } from '@/modules/exam-bank/api/client';
import type { PredictionType } from '@/modules/exam-bank/api/types';
import { Badge, Button, Card, Empty, ErrorBox, Field, fmtDate, H1, H2, Loading, Muted, Row, Screen, Segmented } from '@/shared/ui';
import { Mg1, Mg2, Mg4 } from '@/modules/exam-bank/screens/games/NumberGames';
import { Mg3, Mg5, Mg6 } from '@/modules/exam-bank/screens/games/OtherGames';
import { useAuth } from '@/shared/context/Auth';
import { useLoad } from '@/shared/hooks';
import { colors } from '@/shared/theme';

const GAMES: { type: PredictionType; title: string }[] = [
  { type: 'participants', title: 'MG1 · Số người tham gia' },
  { type: 'approved-questions', title: 'MG2 · Số câu được duyệt' },
  { type: 'bank-size', title: 'MG4 · Quy mô ngân hàng' },
];
type Tab = 'play' | 'mine' | 'board';

/** 6 minigame (slide 3.1): MG1/2/4 dùng API 28–30; MG3/5/6 chưa có trong đặc tả. Lịch sử (31) · xếp hạng (32). */
export default function Games() {
  const [tab, setTab] = useState<Tab>('play');
  return (
    <Screen>
      <H1>Trò chơi dự đoán</H1>
      <Segmented value={tab} onChange={setTab} options={[{ value: 'play', label: 'Chơi' }, { value: 'mine', label: 'Của tôi' }, { value: 'board', label: 'Xếp hạng' }]} />
      {tab === 'play' ? (
        <>
          <Mg1 /><Mg2 /><Mg3 /><Mg4 /><Mg5 /><Mg6 />
        </>
      ) : tab === 'mine' ? <Mine /> : <Board />}
    </Screen>
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
        {p.detail ? <Muted>{p.detail}</Muted> : null}
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
