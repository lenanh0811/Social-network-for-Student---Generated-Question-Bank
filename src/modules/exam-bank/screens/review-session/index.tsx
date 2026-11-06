import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { approveSessions, getSession, markNeedsEdit, rejectSessions } from '@/modules/exam-bank/api/client';
import { QuestionCard } from '@/modules/exam-bank/components/question-card';
import { StatusBadge } from '@/modules/exam-bank/components/badges';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { ErrorBox } from '@/components/error-box';
import { Field } from '@/components/field';
import { fmtDate } from '@/utils/format-date';
import { H1 } from '@/components/heading';
import { Header } from '@/components/header';
import { Loading } from '@/components/loading';
import { Muted } from '@/components/muted';
import { Row } from '@/components/row';
import { Screen } from '@/components/screen';
import { useLoad } from '@/hooks/use-load';
import { colors } from '@/theme';

/**
 * API 22 chi tiết phiên · 23 duyệt · 24 từ chối.
 * Quy trình (slide 3.1/9): tích chọn câu tiềm năng → “Cần edit” (điểm SV được bảo lưu) → chỉnh với AI → giữ/loại.
 */
export default function ReviewSession() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: s, loading, error, reload } = useLoad(() => getSession(id), [id]);
  const [sel, setSel] = useState<string[]>([]);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const act = async (fn: () => Promise<unknown>, back = true) => { setBusy(true); try { await fn(); if (back) router.back(); else { setSel([]); await reload(); } } finally { setBusy(false); } };
  const toggle = (qid: string) => setSel((p) => (p.includes(qid) ? p.filter((x) => x !== qid) : [...p, qid]));

  if (loading && !s) return <><Header title="Duyệt phiên" /><Loading /></>;
  if (!s) return <Screen><Header title="Duyệt phiên" /><ErrorBox message={error ?? 'Lỗi'} onRetry={reload} /></Screen>;
  const footer = s.status === 'resolved' ? undefined : sel.length ? (
    <Row style={{ justifyContent: 'space-between' }}>
      <Button title="Bỏ chọn" variant="outline" onPress={() => setSel([])} />
      <Button title={`Đưa ${sel.length} câu vào “Cần edit”`} icon="create" loading={busy} onPress={() => act(() => markNeedsEdit(sel), false)} />
    </Row>
  ) : rejecting ? (
    <>
      <Field label="Lý do từ chối" value={reason} onChangeText={setReason} multiline placeholder="Góp ý để sinh viên chỉnh sửa..." />
      <Row><Button title="Huỷ" variant="outline" onPress={() => setRejecting(false)} />
        <Button title="Xác nhận từ chối" variant="danger" disabled={!reason.trim()} loading={busy} onPress={() => act(() => rejectSessions([id], reason.trim()))} /></Row>
    </>
  ) : (
    <Row style={{ justifyContent: 'space-between' }}>
      <Button title="Từ chối phiên" icon="close" variant="outline" onPress={() => setRejecting(true)} />
      <Button title="Duyệt phiên" icon="checkmark" variant="success" loading={busy} onPress={() => act(() => approveSessions([id]))} />
    </Row>
  );
  return (
    <Screen footer={footer}>
      <Header title="Duyệt phiên" />
      <Card>
        <Row style={{ justifyContent: 'space-between' }}><StatusBadge status={s.status} /><Muted>{fmtDate(s.createdAt)}</Muted></Row>
        <H1>{s.title}</H1>
        <Muted>{s.authorName} · {s.subject} · {s.questions.length} câu hỏi</Muted>
      </Card>
      <Card style={{ backgroundColor: 'rgba(230,236,248,0.75)' }}>
        <Muted>💡 Tích chọn các câu tiềm năng rồi đưa vào “Cần edit”: điểm cộng của sinh viên được bảo lưu, bạn có thể chỉnh sửa (hoặc chat với AI) rồi quyết định giữ/loại ở tab “Cần edit”. Chạm vào câu hỏi để xem chi tiết.</Muted>
      </Card>
      {s.questions.map((q, i) => {
        const locked = s.status === 'resolved' || q.status === 'needs-edit';
        return (
          <Row key={q.id} style={{ flexWrap: 'nowrap', alignItems: 'flex-start' }}>
            <Pressable disabled={locked} onPress={() => toggle(q.id)} hitSlop={8} style={{ paddingTop: 16, opacity: locked ? 0.35 : 1 }}>
              <Ionicons name={sel.includes(q.id) ? 'checkbox' : 'square-outline'} size={26} color={sel.includes(q.id) ? colors.primary : colors.muted} />
            </Pressable>
            <View style={{ flex: 1 }}><QuestionCard q={q} index={i} showAnswer showStatus /></View>
          </Row>
        );
      })}
    </Screen>
  );
}
