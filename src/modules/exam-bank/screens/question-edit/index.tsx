import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { editQuestion, getCachedQuestion } from '@/modules/exam-bank/api/client';
import type { QuestionDraft } from '@/modules/exam-bank/api/types';
import { QuestionEditor, validateDraft } from '@/modules/exam-bank/components/question-editor';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { ErrorBox } from '@/components/error-box';
import { Header } from '@/components/header';
import { Muted } from '@/components/muted';
import { Row } from '@/components/row';
import { Screen } from '@/components/screen';
import { colors } from '@/theme';

/** API 25: giảng viên chỉnh sửa trực tiếp câu hỏi, có thể duyệt luôn vào ngân hàng sau khi lưu. */
export default function EditQuestion() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const q = getCachedQuestion(id);
  const [d, setD] = useState<QuestionDraft | undefined>(q && {
    source: 'self', confidence: q.confidence ?? 2, content: q.content, options: q.options,
    correctIndex: Math.max(0, q.correctIndex), explanation: q.explanation,
  });
  const [autoApprove, setAutoApprove] = useState(false);
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(false);
  const [err, setErr] = useState<string>();
  if (!d || !q) return <Screen><Header title="Sửa câu hỏi" /><ErrorBox message="Không có dữ liệu câu hỏi. Hãy mở từ màn duyệt phiên." /></Screen>;
  const save = async () => {
    setShow(true);
    if (validateDraft(d)) return;
    setBusy(true); setErr(undefined);
    try { await editQuestion(id, d, autoApprove); router.back(); } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };
  return (
    <Screen footer={<Button title={autoApprove ? 'Lưu và duyệt' : 'Lưu thay đổi'} icon="save-outline" loading={busy} onPress={save} />}>
      <Header title="Sửa câu hỏi" />
      {err ? <ErrorBox message={err} /> : null}
      <Card><QuestionEditor value={d} onChange={setD} showErrors={show} /></Card>
      {q.status === 'pending' ? (
        <Card onPress={() => setAutoApprove(!autoApprove)}>
          <Row style={{ flexWrap: 'nowrap' }}>
            <Ionicons name={autoApprove ? 'checkbox' : 'square-outline'} size={26} color={autoApprove ? colors.primary : colors.muted} />
            <Muted style={{ flex: 1 }}>Duyệt luôn câu hỏi này vào ngân hàng sau khi lưu.</Muted>
          </Row>
        </Card>
      ) : null}
    </Screen>
  );
}
