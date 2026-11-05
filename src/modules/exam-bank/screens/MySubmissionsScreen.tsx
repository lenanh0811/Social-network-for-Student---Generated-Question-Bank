import { useState } from 'react';
import { Text } from 'react-native';
import { listMySubmissions } from '@/modules/exam-bank/api/client';
import type { SessionStatus } from '@/modules/exam-bank/api/types';
import { Card, Chip, Empty, ErrorBox, FAB, fmtDate, go, H1, Loading, Muted, Row, Screen } from '@/shared/ui';
import { StatusBadge } from '@/modules/exam-bank/components/badges';
import { useLoad } from '@/shared/hooks';
import { colors } from '@/shared/theme';
import { View } from 'react-native';

const FILTERS: { v: SessionStatus | undefined; l: string }[] = [
  { v: undefined, l: 'Tất cả' }, { v: 'pending', l: 'Chờ duyệt' }, { v: 'approved', l: 'Đã duyệt' }, { v: 'rejected', l: 'Bị từ chối' },
];

/** API 12: danh sách phiên gửi câu hỏi của tôi. Nút “Đề xuất” → API 11. */
export default function MySubmissions() {
  const [status, setStatus] = useState<SessionStatus>();
  const { data, loading, error, reload } = useLoad(() => listMySubmissions(status), [status]);
  return (
    <View style={{ flex: 1 }}>
      <Screen onRefresh={reload} refreshing={loading && !!data}>
        <H1>Câu hỏi đóng góp của tôi</H1>
        <Muted>Mỗi lần gửi là một “phiên” gồm nhiều câu hỏi, giảng viên sẽ duyệt cả phiên.</Muted>
        <Row>{FILTERS.map((f) => <Chip key={f.l} label={f.l} active={status === f.v} onPress={() => setStatus(f.v)} />)}</Row>
        {error ? <ErrorBox message={error} onRetry={reload} /> : null}
        {loading && !data ? <Loading /> : null}
        {data && !data.length ? <Empty text="Bạn chưa có phiên gửi câu hỏi nào." /> : null}
        {data?.map((s) => (
          <Card key={s.id} onPress={() => go(`/exam-bank/submission/${s.id}`)}>
            <Row style={{ justifyContent: 'space-between' }}>
              <StatusBadge status={s.status} />
              <Muted>{fmtDate(s.createdAt)}</Muted>
            </Row>
            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>{s.title}</Text>
            <Muted>{s.subject} · {s.questions.length} câu hỏi</Muted>
            {s.status === 'rejected' && s.rejectReason ? <Text style={{ color: colors.danger, fontSize: 13 }}>Lý do: {s.rejectReason}</Text> : null}
          </Card>
        ))}
      </Screen>
      <FAB label="Đề xuất câu hỏi" icon="add" onPress={() => go('/exam-bank/submission/form')} />
    </View>
  );
}
