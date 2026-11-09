import { useLocalSearchParams } from 'expo-router';
import { getPracticeSession } from '@/modules/exam-bank/api/client';
import { QuestionCard } from '@/modules/exam-bank/components/question-card';
import { Card } from '@/components/card';
import { Empty } from '@/components/empty';
import { ErrorBox } from '@/components/error-box';
import { H1 } from '@/components/heading';
import { Header } from '@/components/header';
import { Loading } from '@/components/loading';
import { Muted } from '@/components/muted';
import { Screen } from '@/components/screen';
import { useLoad } from '@/hooks/use-load';

/** GET /sessions/{id}/questions: câu hỏi của một phiên để luyện tập. Đáp án đúng chỉ hiện sau khi bạn trả lời. */
export default function SessionQuestions() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const { data: s, loading, error, reload } = useLoad(() => getPracticeSession(sessionId), [sessionId]);
  return (
    <Screen onRefresh={reload} refreshing={loading && !!s}>
      <Header title="Luyện tập" />
      {error ? <ErrorBox message={error} onRetry={reload} /> : null}
      {loading && !s ? <Loading /> : null}
      {s ? (
        <>
          <Card>
            <H1>{s.title}</H1>
            {s.content ? <Muted>{s.content}</Muted> : null}
            <Muted>{[s.subject, `${s.questionCount ?? s.questions.length} câu hỏi`].filter(Boolean).join(' · ')}</Muted>
          </Card>
          <Muted>Chạm vào một câu hỏi để trả lời, xem thống kê và đánh giá.</Muted>
          {!s.questions.length ? <Empty text="Phiên này chưa có câu hỏi nào." /> : null}
          {s.questions.map((q, i) => <QuestionCard key={q.id} q={q} index={i} />)}
        </>
      ) : null}
    </Screen>
  );
}
