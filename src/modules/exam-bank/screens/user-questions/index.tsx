import { useLocalSearchParams } from 'expo-router';
import { listUserQuestions } from '@/modules/exam-bank/api/client';
import { QuestionCard } from '@/modules/exam-bank/components/question-card';
import { Empty } from '@/components/empty';
import { ErrorBox } from '@/components/error-box';
import { H1 } from '@/components/heading';
import { Header } from '@/components/header';
import { Loading } from '@/components/loading';
import { Muted } from '@/components/muted';
import { Screen } from '@/components/screen';
import { useLoad } from '@/hooks/use-load';

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
