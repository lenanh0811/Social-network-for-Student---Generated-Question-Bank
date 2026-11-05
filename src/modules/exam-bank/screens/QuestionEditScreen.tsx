import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { getCachedQuestion, updateQuestion } from '@/modules/exam-bank/api/client';
import type { QuestionDraft } from '@/modules/exam-bank/api/types';
import { QuestionEditor, validateDraft } from '@/modules/exam-bank/components/QuestionEditor';
import { Button, Card, ErrorBox, Header, Screen } from '@/shared/ui';

/** API 25: giảng viên chỉnh sửa trực tiếp câu hỏi. */
export default function EditQuestion() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const q = getCachedQuestion(id);
  const [d, setD] = useState<QuestionDraft | undefined>(q && { source: 'self', confidence: q.confidence ?? 2, content: q.content, options: q.options, correctIndex: q.correctIndex, explanation: q.explanation, topic: q.topic, difficulty: q.difficulty });
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(false);
  const [err, setErr] = useState<string>();
  if (!d) return <Screen><Header title="Sửa câu hỏi" /><ErrorBox message="Không có dữ liệu câu hỏi." /></Screen>;
  const save = async () => {
    setShow(true);
    if (validateDraft(d)) return;
    setBusy(true);
    try { const { source: _hidden, ...patch } = d; // nguồn gốc ẩn với giảng viên, không gửi lên
      await updateQuestion(id, patch); router.back(); } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };
  return (
    <Screen footer={<Button title="Lưu thay đổi" icon="save-outline" loading={busy} onPress={save} />}>
      <Header title="Sửa câu hỏi" />
      {err ? <ErrorBox message={err} /> : null}
      <Card><QuestionEditor value={d} onChange={setD} showErrors={show} /></Card>
    </Screen>
  );
}
