import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Text, useWindowDimensions, View } from 'react-native';
import { listMySubmissions } from '@/modules/exam-bank/api/client';
import type { SessionStatus } from '@/modules/exam-bank/api/types';
import { questionCountOf } from '@/modules/exam-bank/api/types';
import { StatusBadge } from '@/modules/exam-bank/components/badges';
import { Button, Card, Chip, Empty, ErrorBox, fmtDate, go, H1, H2, Loading, Muted, Row, Screen } from '@/shared/ui';
import { useLoad } from '@/shared/hooks';
import { colors } from '@/shared/theme';

type Filter = SessionStatus | 'all';
const TILES: { v: Filter; l: string }[] = [
  { v: 'all', l: 'Tất cả' }, { v: 'pending', l: 'Chờ duyệt' }, { v: 'reviewing', l: 'Đang duyệt' }, { v: 'resolved', l: 'Đã xử lý' },
];
const STEPS = [
  ['create', 'Soạn câu hỏi', 'Viết câu trắc nghiệm, chọn đáp án đúng và khai báo nguồn gốc.'],
  ['paper-plane', 'Gửi duyệt', 'Mỗi lần gửi là một phiên gồm nhiều câu hỏi.'],
  ['shield-checkmark', 'Giảng viên duyệt', 'Câu được chọn sẽ vào ngân hàng đề và tính điểm cho bạn.'],
] as const;
const TIPS = ['Viết đề rõ ràng, chỉ có một đáp án đúng.', 'Các đáp án gây nhiễu nên hợp lý, độ dài tương đương.', 'Thêm giải thích để bạn học hiểu vì sao đúng.', 'Khai báo trung thực câu tự làm hay do AI tạo.'];

/** API 12: danh sách phiên gửi câu hỏi của tôi. Nút “Đề xuất” → API 11. */
export default function MySubmissions() {
  const { data, loading, error, reload } = useLoad(() => listMySubmissions());
  const [filter, setFilter] = useState<Filter>('all');
  const wide = useWindowDimensions().width >= 900;
  const count = (v: Filter) => (v === 'all' ? data?.length : data?.filter((s) => s.status === v).length) ?? 0;
  const list = data?.filter((s) => filter === 'all' || s.status === filter);

  const main = (
    <View style={{ flex: 1, gap: 12, minWidth: 0 }}>
      <H2>{filter === 'all' ? 'Tất cả phiên gửi' : TILES.find((x) => x.v === filter)!.l}</H2>
      {error ? <ErrorBox message={error} onRetry={reload} /> : null}
      {loading && !data ? <Loading /> : null}
      {list && !list.length ? (
        <Card><Empty icon="document-text-outline" text={filter === 'all' ? 'Bạn chưa gửi phiên câu hỏi nào. Hãy bắt đầu đóng góp cho ngân hàng đề!' : 'Không có phiên nào ở trạng thái này.'}
          action={filter === 'all' ? <Button title="Đề xuất câu hỏi đầu tiên" icon="add" onPress={() => go('/exam-bank/submission/form')} /> : undefined} /></Card>
      ) : null}
      {list?.map((s) => (
        <Card key={s.id} onPress={() => go(`/exam-bank/submission/${s.id}`)}>
          <Row style={{ justifyContent: 'space-between' }}>
            <StatusBadge status={s.status} />
            <Muted>{fmtDate(s.createdAt)}</Muted>
          </Row>
          <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text }}>{s.title}</Text>
          <Row style={{ justifyContent: 'space-between' }}>
            <Muted>{[s.subject, s.className].filter(Boolean).join(' · ')} · {questionCountOf(s)} câu hỏi</Muted>
            <Ionicons name="chevron-forward" size={18} color={colors.muted} />
          </Row>
        </Card>
      ))}
    </View>
  );

  const aside = (
    <View style={{ width: wide ? 340 : '100%', gap: 12 }}>
      <Card>
        <H2>Quy trình đóng góp</H2>
        {STEPS.map(([icon, title, desc], i) => (
          <Row key={title} style={{ flexWrap: 'nowrap', alignItems: 'flex-start', gap: 12 }}>
            <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name={icon} size={18} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}><Text style={{ fontWeight: '700', color: colors.text }}>{i + 1}. {title}</Text><Muted>{desc}</Muted></View>
          </Row>
        ))}
      </Card>
      <Card style={{ backgroundColor: 'rgba(253,243,220,0.75)' }}>
        <Row><Ionicons name="bulb" size={20} color={colors.accent} /><H2>Mẹo để câu hỏi được chọn</H2></Row>
        {TIPS.map((t) => <Text key={t} style={{ color: colors.text, fontSize: 14 }}>•  {t}</Text>)}
      </Card>
    </View>
  );

  return (
    <Screen wide onRefresh={reload} refreshing={loading && !!data}>
      <Row style={{ justifyContent: 'space-between' }}>
        <View style={{ flex: 1, minWidth: 220, gap: 2 }}>
          <H1>Đóng góp câu hỏi</H1>
          <Muted>Mỗi lần gửi là một “phiên” gồm nhiều câu hỏi, giảng viên sẽ duyệt cả phiên.</Muted>
        </View>
        <Button title="Đề xuất câu hỏi" icon="add" onPress={() => go('/exam-bank/submission/form')} />
      </Row>
      <Row>
        {TILES.map((x) => <Chip key={x.v} label={`${x.l}${data ? ` · ${count(x.v)}` : ''}`} active={filter === x.v} onPress={() => setFilter(x.v)} />)}
      </Row>
      <View style={{ flexDirection: wide ? 'row' : 'column', gap: 16, alignItems: 'flex-start' }}>
        {main}
        {aside}
      </View>
    </Screen>
  );
}
