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
import { openDownload } from '@/utils/share';
import { colors } from '@/theme';

/** API 35: chi tiết đề thi · API 37: xuất đề thi ra PDF / Excel (backend trả đường dẫn tải về). */
export default function ExamDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: e, loading, error, reload } = useLoad(() => getExam(id), [id]);
  const [fmt, setFmt] = useState<ExportFormat>('pdf');
  const [withKey, setWithKey] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; t: string }>();
  const doExport = async () => {
    setBusy(true); setMsg(undefined);
    try {
      const f = await exportExam(id, fmt, withKey);
      await openDownload(f.downloadUrl);
      setMsg({ ok: true, t: 'Đã mở file đề thi. Nếu trình duyệt chặn cửa sổ mới, hãy cho phép rồi thử lại.' });
    } catch (x) { setMsg({ ok: false, t: (x as Error).message }); } finally { setBusy(false); }
  };

  if (loading && !e) return <><Header title="Đề thi" /><Loading /></>;
  if (!e) return <Screen><Header title="Đề thi" /><ErrorBox message={error ?? 'Lỗi'} onRetry={reload} /></Screen>;
  return (
    <Screen footer={<>
      <Row>
        {(['pdf', 'excel'] as ExportFormat[]).map((f) => <Chip key={f} label={f === 'pdf' ? 'PDF' : 'Excel'} active={fmt === f} onPress={() => setFmt(f)} />)}
        <Chip label="Kèm bảng đáp án" active={withKey} onPress={() => setWithKey(!withKey)} />
      </Row>
      {msg ? <Text style={{ color: msg.ok ? colors.success : colors.danger }}>{msg.t}</Text> : null}
      <Button title="Xuất đề thi" icon="download" loading={busy} onPress={doExport} />
    </>}>
      <Header title="Đề thi" />
      <Card>
        <H1>{e.title}</H1>
        <Muted>{[e.subject, `${e.questionCount} câu`, `tạo ${fmtDate(e.createdAt)}`].filter(Boolean).join(' · ')}</Muted>
        {e.statistic ? <Muted>Dễ {e.statistic.easy} · Trung bình {e.statistic.medium} · Khó {e.statistic.hard}{e.statistic.unclassified ? ` · Chưa phân loại ${e.statistic.unclassified}` : ''}</Muted> : null}
      </Card>
      {e.questions.map((q, i) => <QuestionCard key={q.id} q={q} index={i} showAnswer />)}
    </Screen>
  );
}
