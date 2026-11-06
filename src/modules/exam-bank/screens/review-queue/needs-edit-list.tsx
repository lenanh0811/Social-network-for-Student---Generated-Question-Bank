import { View } from 'react-native';
import { decideQuestion, listNeedsEdit } from '@/modules/exam-bank/api/client';
import { QuestionCard } from '@/modules/exam-bank/components/question-card';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Empty } from '@/components/empty';
import { ErrorBox } from '@/components/error-box';
import { go } from '@/utils/navigation';
import { Loading } from '@/components/loading';
import { Muted } from '@/components/muted';
import { Row } from '@/components/row';
import { useLoad } from '@/hooks/use-load';

/** Tab “Cần edit”: câu GV đã chọn là tiềm năng. Chỉnh tay / chat AI rồi quyết định giữ (vào ngân hàng) hoặc loại. */
export default function NeedsEditList() {
  const { data, loading, error, reload } = useLoad(listNeedsEdit);
  const decide = async (id: string, keep: boolean) => { await decideQuestion(id, keep); await reload(); };
  if (loading && !data) return <Loading />;
  return (
    <>
      <Muted>Điểm cộng của sinh viên được bảo lưu cho tới khi bạn quyết định giữ hoặc loại câu hỏi.</Muted>
      {error ? <ErrorBox message={error} onRetry={reload} /> : null}
      {data && !data.length ? <Empty icon="create-outline" text="Chưa có câu nào ở trạng thái “Cần edit”." /> : null}
      {data?.map((q) => (
        <View key={q.id} style={{ gap: 8 }}>
          <QuestionCard q={q} showAnswer />
          <Card style={{ paddingVertical: 10 }}>
            <Muted>Tác giả: {q.authorName}</Muted>
            <Row>
              <Button small variant="soft" icon="sparkles" title="Chat với AI" onPress={() => go(`/exam-bank/question/ai/${q.id}`)} />
              <Button small variant="outline" icon="create-outline" title="Sửa" onPress={() => go(`/exam-bank/question/edit/${q.id}`)} />
              <Button small variant="success" icon="checkmark" title="Giữ" onPress={() => decide(q.id, true)} />
              <Button small variant="danger" icon="close" title="Loại" onPress={() => decide(q.id, false)} />
            </Row>
          </Card>
        </View>
      ))}
    </>
  );
}
