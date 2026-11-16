import { useLocalSearchParams } from 'expo-router';
import { Text } from 'react-native';
import { listUserSessions } from '@/modules/exam-bank/api/client';
import { questionCountOf } from '@/modules/exam-bank/api/types';
import { Card } from '@/components/card';
import { Empty } from '@/components/empty';
import { ErrorBox } from '@/components/error-box';
import { H1 } from '@/components/heading';
import { Header } from '@/components/header';
import { Loading } from '@/components/loading';
import { Muted } from '@/components/muted';
import { Row } from '@/components/row';
import { Screen } from '@/components/screen';
import { useLoad } from '@/hooks/use-load';
import { fmtDate } from '@/utils/format-date';
import { go } from '@/utils/navigation';
import { colors } from '@/theme';

/** API 16: các phiên đóng góp của một người dùng (người khác chỉ thấy phiên đã duyệt xong). Bấm một phiên để luyện tập. */
export default function UserQuestions() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const { data, loading, error, reload } = useLoad(() => listUserSessions(userId), [userId]);
  const approved = data?.reduce((t, s) => t + (s.approvedQuestionCount ?? 0), 0);
  return (
    <Screen onRefresh={reload} refreshing={loading && !!data}>
      <Header title="Câu hỏi đóng góp" />
      <H1>Câu hỏi đã đóng góp</H1>
      <Muted>{data ? `${data.length} phiên · ${approved} câu hỏi đã được duyệt` : ' '}</Muted>
      {error ? <ErrorBox message={error} onRetry={reload} /> : null}
      {loading && !data ? <Loading /> : null}
      {data && !data.length ? <Empty text="Chưa có phiên nào được duyệt." /> : null}
      {data?.map((s) => (
        <Card key={s.id} onPress={() => go(`/exam-bank/session/${s.id}`)}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text, flexShrink: 1 }}>{s.title}</Text>
            <Muted>{fmtDate(s.createdAt)}</Muted>
          </Row>
          <Muted>{[s.subject, s.className].filter(Boolean).join(' · ')}</Muted>
          <Muted>{s.approvedQuestionCount ?? 0}/{questionCountOf(s)} câu được duyệt</Muted>
        </Card>
      ))}
    </Screen>
  );
}
