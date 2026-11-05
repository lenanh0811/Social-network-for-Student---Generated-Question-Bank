import { useLocalSearchParams } from 'expo-router';
import { listUserQuestions } from '@/modules/exam-bank/api/client';
import { QuestionCard } from '@/modules/exam-bank/components/QuestionCard';
import { Empty, ErrorBox, H1, Header, Loading, Muted, Screen } from '@/shared/ui';
import { useLoad } from '@/shared/hooks';

/** API 16: các câu hỏi (đã duyệt) do một người dùng đóng góp. */
export default function UserQuestions() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const { data, loading, error, reload } = useLoad(() => listUserQuestions(userId), [userId]);
  return (
    <Screen onRefresh={reload} refreshing={loading && !!data}>
      <Header title="Câu hỏi đóng góp" />
      <H1>Câu hỏi đã đóng góp</H1>
      <Muted>{data ? `${data.length} câu hỏi đã được duyệt` : ' '}</Muted>
      {error ? <ErrorBox message={error} onRetry={reload} /> : null}
      {loading && !data ? <Loading /> : null}
      {data && !data.length ? <Empty text="Chưa có câu hỏi nào được duyệt." /> : null}
      {data?.map((q) => <QuestionCard key={q.id} q={q} />)}
    </Screen>
  );
}
