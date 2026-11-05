import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Text } from 'react-native';
import { exportExam, getExam } from '@/modules/exam-bank/api/client';
import type { ExportFormat } from '@/modules/exam-bank/api/types';
import { QuestionCard } from '@/modules/exam-bank/components/QuestionCard';
import { Button, Card, Chip, ErrorBox, fmtDate, H1, Header, Loading, Muted, Row, Screen } from '@/shared/ui';
import { useLoad } from '@/shared/hooks';
import { saveFile } from '@/shared/share';
import { colors } from '@/shared/theme';

/** API 35: chi tiết đề thi · API 37: xuất đề thi ra file. */
export default function ExamDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: e, loading, error, reload } = useLoad(() => getExam(id), [id]);
  const [fmt, setFmt] = useState<ExportFormat>('txt');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string>();
  const doExport = async () => { setBusy(true); setMsg(undefined); try { await saveFile(await exportExam(id, fmt)); } catch (x) { setMsg((x as Error).message); } finally { setBusy(false); } };

  if (loading && !e) return <><Header title="Đề thi" /><Loading /></>;
  if (!e) return <Screen><Header title="Đề thi" /><ErrorBox message={error ?? 'Lỗi'} onRetry={reload} /></Screen>;
  return (
    <Screen footer={<>
      <Row>{(['txt', 'csv', 'json'] as ExportFormat[]).map((f) => <Chip key={f} label={f.toUpperCase()} active={fmt === f} onPress={() => setFmt(f)} />)}</Row>
      {msg ? <Text style={{ color: colors.danger }}>{msg}</Text> : null}
      <Button title="Xuất đề thi" icon="download" loading={busy} onPress={doExport} />
    </>}>
      <Header title="Đề thi" />
      <Card>
        <H1>{e.title}</H1>
        <Muted>{e.subject} · {e.questions.length} câu · {e.durationMin} phút · tạo {fmtDate(e.createdAt)}</Muted>
      </Card>
      {e.questions.map((q, i) => <QuestionCard key={q.id} q={q} index={i} showAnswer />)}
    </Screen>
  );
}
