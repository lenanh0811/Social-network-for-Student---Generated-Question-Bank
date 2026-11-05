import { router, useLocalSearchParams } from 'expo-router';
import { Alert, Platform, Text, View } from 'react-native';
import { deleteMySubmission, getMySubmission } from '@/modules/exam-bank/api/client';
import { QuestionCard } from '@/modules/exam-bank/components/QuestionCard';
import { Button, Card, ErrorBox, fmtDate, go, H1, Header, Loading, Muted, Row, Screen } from '@/shared/ui';
import { StatusBadge } from '@/modules/exam-bank/components/badges';
import { useLoad } from '@/shared/hooks';
import { colors } from '@/shared/theme';

/** API 13 chi tiết · API 14 sửa · API 15 xoá. */
export default function SubmissionDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: s, error, loading, reload } = useLoad(() => getMySubmission(id), [id]);

  const doDelete = async () => { await deleteMySubmission(id); router.back(); };
  const confirmDelete = () => {
    if (Platform.OS === 'web') { if (window.confirm('Xoá phiên gửi này?')) doDelete(); return; }
    Alert.alert('Xoá phiên gửi', 'Bạn chắc chắn muốn xoá? Thao tác không thể hoàn tác.', [
      { text: 'Huỷ', style: 'cancel' }, { text: 'Xoá', style: 'destructive', onPress: doDelete },
    ]);
  };

  if (loading && !s) return <><Header title="Chi tiết phiên" /><Loading /></>;
  if (!s) return <Screen><Header title="Chi tiết phiên" /><ErrorBox message={error ?? 'Không tải được'} onRetry={reload} /></Screen>;
  const editable = s.status !== 'approved';
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
        <Muted>{s.subject} · {s.questions.length} câu hỏi</Muted>
      </Card>
      {s.status === 'rejected' ? (
        <Card style={{ backgroundColor: colors.dangerSoft, borderColor: colors.danger }}>
          <Text style={{ fontWeight: '700', color: colors.danger }}>Giảng viên đã từ chối</Text>
          <Text style={{ color: colors.text }}>{s.rejectReason}</Text>
          <Muted>Hãy chỉnh sửa theo góp ý rồi gửi lại.</Muted>
        </Card>
      ) : null}
      {s.status === 'approved' ? <Muted>Phiên đã được duyệt nên không thể sửa hoặc xoá. Chạm câu hỏi để xem thống kê & đánh giá.</Muted> : null}
      {s.questions.map((q, i) => <View key={q.id} style={{ gap: 6 }}>
          <QuestionCard q={q} index={i} showAnswer showSource showStatus />
          {q.status === 'needs-edit' ? <Muted>🔒 Giảng viên đang xem xét câu này — điểm cộng của bạn được bảo lưu cho tới khi có quyết định giữ/loại.</Muted> : null}
        </View>)}
    </Screen>
  );
}
