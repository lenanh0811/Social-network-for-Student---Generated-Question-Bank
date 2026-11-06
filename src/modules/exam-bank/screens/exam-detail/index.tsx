import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Text } from 'react-native';
import { exportExam, getExam } from '@/modules/exam-bank/api/client';
import type { ExportFormat } from '@/modules/exam-bank/api/types';
import { QuestionCard } from '@/modules/exam-bank/components/question-card';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Chip } from '@/components/chip';
import { ErrorBox } from '@/components/error-box';
import { fmtDate } from '@/utils/format-date';
import { H1 } from '@/components/heading';
import { Header } from '@/components/header';
import { Loading } from '@/components/loading';
import { Muted } from '@/components/muted';
import { Row } from '@/components/row';
import { Screen } from '@/components/screen';
import { useLoad } from '@/hooks/use-load';
import { saveFile } from '@/utils/share';
import { colors } from '@/theme';

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
