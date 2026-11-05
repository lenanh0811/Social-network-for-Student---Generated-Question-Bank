import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { approveSessions, getSession, rejectSessions } from '@/modules/exam-bank/api/client';
import { QuestionCard } from '@/modules/exam-bank/components/QuestionCard';
import { Button, Card, ErrorBox, Field, fmtDate, H1, Header, Loading, Muted, Row, Screen } from '@/shared/ui';
import { StatusBadge } from '@/modules/exam-bank/components/badges';
import { useLoad } from '@/shared/hooks';

/** API 22 chi tiết phiên · 23 duyệt · 24 từ chối. Chạm câu hỏi để sửa / AI (25–27). */
export default function ReviewSession() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: s, loading, error, reload } = useLoad(() => getSession(id), [id]);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const act = async (fn: () => Promise<void>) => { setBusy(true); try { await fn(); router.back(); } finally { setBusy(false); } };

  if (loading && !s) return <><Header title="Duyệt phiên" /><Loading /></>;
  if (!s) return <Screen><Header title="Duyệt phiên" /><ErrorBox message={error ?? 'Lỗi'} onRetry={reload} /></Screen>;
  return (
    <Screen footer={s.status !== 'pending' ? undefined : rejecting ? (
      <>
        <Field label="Lý do từ chối" value={reason} onChangeText={setReason} multiline placeholder="Góp ý để sinh viên chỉnh sửa..." />
        <Row><Button title="Huỷ" variant="outline" onPress={() => setRejecting(false)} />
          <Button title="Xác nhận từ chối" variant="danger" disabled={!reason.trim()} loading={busy} onPress={() => act(() => rejectSessions([id], reason.trim()))} /></Row>
      </>
    ) : (
      <Row style={{ justifyContent: 'space-between' }}>
        <Button title="Từ chối" icon="close" variant="outline" onPress={() => setRejecting(true)} />
        <Button title="Duyệt phiên" icon="checkmark" variant="success" loading={busy} onPress={() => act(() => approveSessions([id]))} />
      </Row>
    )}>
      <Header title="Duyệt phiên" />
      <Card>
        <Row style={{ justifyContent: 'space-between' }}><StatusBadge status={s.status} /><Muted>{fmtDate(s.createdAt)}</Muted></Row>
        <H1>{s.title}</H1>
        <Muted>{s.authorName} · {s.subject} · {s.questions.length} câu hỏi</Muted>
      </Card>
      <Muted>Chạm vào một câu hỏi để chỉnh sửa hoặc nhờ AI tinh chỉnh trước khi duyệt.</Muted>
      {s.questions.map((q, i) => <QuestionCard key={q.id} q={q} index={i} showAnswer />)}
    </Screen>
  );
}
