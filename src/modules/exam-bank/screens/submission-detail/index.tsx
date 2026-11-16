import { router, useLocalSearchParams } from 'expo-router';
import { Alert, Platform, View } from 'react-native';
import { deleteMySubmission, getMySubmission } from '@/modules/exam-bank/api/client';
import { QuestionCard } from '@/modules/exam-bank/components/question-card';
import { StatusBadge } from '@/modules/exam-bank/components/badges';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { ErrorBox } from '@/components/error-box';
import { fmtDate } from '@/utils/format-date';
import { go } from '@/utils/navigation';
import { H1 } from '@/components/heading';
import { Header } from '@/components/header';
import { Loading } from '@/components/loading';
import { Muted } from '@/components/muted';
import { Row } from '@/components/row';
import { Screen } from '@/components/screen';
import { useLoad } from '@/hooks/use-load';

/** API 13 chi tiết · API 14 sửa · API 15 xoá. Chỉ sửa/xoá được khi phiên còn “Chờ duyệt”. */
export default function SubmissionDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: s, error, loading, reload } = useLoad(() => getMySubmission(id), [id]);

  const doDelete = async () => {
    try { await deleteMySubmission(id); router.back(); }
    catch (e) {
      if (Platform.OS === 'web') window.alert((e as Error).message);
      else Alert.alert('Không xoá được', (e as Error).message);
    }
  };
  const confirmDelete = () => {
    if (Platform.OS === 'web') { if (window.confirm('Xoá phiên gửi này?')) doDelete(); return; }
    Alert.alert('Xoá phiên gửi', 'Bạn chắc chắn muốn xoá? Thao tác không thể hoàn tác.', [
      { text: 'Huỷ', style: 'cancel' }, { text: 'Xoá', style: 'destructive', onPress: doDelete },
    ]);
  };

  if (loading && !s) return <><Header title="Chi tiết phiên" /><Loading /></>;
  if (!s) return <Screen><Header title="Chi tiết phiên" /><ErrorBox message={error ?? 'Không tải được'} onRetry={reload} /></Screen>;
  const editable = s.status === 'pending';
  const approved = s.questions.filter((q) => q.status === 'approved').length;
  const rejected = s.questions.filter((q) => q.status === 'rejected').length;
  return (
    <Screen footer={editable ? (
      <Row style={{ justifyContent: 'space-between' }}>
        <Button title="Xoá" icon="trash-outline" variant="outline" onPress={confirmDelete} />
        <Button title="Chỉnh sửa" icon="create-outline" onPress={() => go(`/exam-bank/submission/form?id=${id}`)} />
      </Row>
    ) : undefined}>
      <Header title="Chi tiết phiên" />
      <Card>
        <Row style={{ justifyContent: 'space-between' }}><StatusBadge status={s.status} /><Muted>{fmtDate(s.createdAt)}</Muted></Row>
        <H1>{s.title}</H1>
        {s.content ? <Muted>{s.content}</Muted> : null}
        <Muted>{[s.subject, s.className, s.semesterName].filter(Boolean).join(' · ')}</Muted>
        <Muted>{s.questions.length} câu hỏi{s.status === 'resolved' ? ` · ${approved} được chọn · ${rejected} bị từ chối` : ''}</Muted>
      </Card>
      {!editable ? <Muted>{s.status === 'reviewing' ? 'Giảng viên đang duyệt phiên này nên không thể sửa hoặc xoá.' : 'Phiên đã được xử lý nên không thể sửa hoặc xoá.'} Chạm câu hỏi để xem thống kê & đánh giá.</Muted> : null}
      {s.questions.map((q, i) => (
        <View key={q.id} style={{ gap: 6 }}>
          <QuestionCard q={q} index={i} showAnswer showSource showStatus />
        </View>
      ))}
    </Screen>
  );
}
