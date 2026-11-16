import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Text, useWindowDimensions, View } from 'react-native';
import { exportQuestionBank, listMyExams, listSubjects } from '@/modules/exam-bank/api/client';
import type { ExportFormat } from '@/modules/exam-bank/api/types';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Chip } from '@/components/chip';
import { Empty } from '@/components/empty';
import { ErrorBox } from '@/components/error-box';
import { fmtDate } from '@/utils/format-date';
import { go } from '@/utils/navigation';
import { H1, H2 } from '@/components/heading';
import { Loading } from '@/components/loading';
import { Muted } from '@/components/muted';
import { Row } from '@/components/row';
import { Screen } from '@/components/screen';
import { useLoad } from '@/hooks/use-load';
import { openDownload } from '@/utils/share';
import { colors } from '@/theme';

const FORMATS: { value: ExportFormat; label: string }[] = [{ value: 'pdf', label: 'PDF' }, { value: 'excel', label: 'Excel' }];

/** API 36: đề thi của tôi · API 33: xuất ngân hàng câu hỏi · nút “Tạo đề” → chat AI hoặc form (API 34). */
export default function Exams() {
  const { data, loading, error, reload } = useLoad(listMyExams);
  const wide = useWindowDimensions().width >= 900;
  const main = (
    <View style={{ flex: 1, gap: 12, minWidth: 0 }}>
      <H2>Đề thi đã tạo</H2>
      {error ? <ErrorBox message={error} onRetry={reload} /> : null}
      {loading && !data ? <Loading /> : null}
      {data && !data.length ? (
        <Card><Empty icon="document-text-outline" text="Chưa có đề thi nào. Hãy tạo đề đầu tiên từ ngân hàng câu hỏi." /></Card>
      ) : null}
      {data?.map((e) => (
        <Card key={e.id} onPress={() => go(`/exam-bank/exam/${e.id}`)}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 17, fontWeight: '600', color: colors.text, flexShrink: 1 }}>{e.title}</Text>
            <Muted>{fmtDate(e.createdAt)}</Muted>
          </Row>
          <Row style={{ justifyContent: 'space-between' }}>
            <Muted>{[e.subject, `${e.questionCount} câu`, e.statistic ? `Dễ ${e.statistic.easy} · TB ${e.statistic.medium} · Khó ${e.statistic.hard}` : ''].filter(Boolean).join(' · ')}</Muted>
            <Ionicons name="chevron-forward" size={18} color={colors.muted} />
          </Row>
        </Card>
      ))}
    </View>
  );

  return (
    <Screen wide onRefresh={reload} refreshing={loading && !!data}>
      <Row style={{ justifyContent: 'space-between' }}>
        <View style={{ flex: 1, minWidth: 220, gap: 2 }}>
          <H1>Đề thi</H1>
          <Muted>Tạo đề từ ngân hàng câu hỏi bằng chat với AI, xem lại và xuất file.</Muted>
        </View>
        <Row>
          <Button title="Tạo bằng form" icon="create-outline" variant="outline" onPress={() => go('/exam-bank/exam/generate')} />
          <Button title="Tạo đề với AI" icon="sparkles" onPress={() => go('/exam-bank/exam/chat')} />
        </Row>
      </Row>
      <View style={{ flexDirection: wide ? 'row' : 'column', gap: 16, alignItems: 'flex-start' }}>
        {main}
        <View style={{ width: wide ? 340 : '100%' }}><ExportBank /></View>
      </View>
    </Screen>
  );
}

/** API 33: xuất toàn bộ câu hỏi của một môn (chỉ câu đã duyệt) ra PDF / Excel. */
function ExportBank() {
  const subjects = useLoad(listSubjects);
  const [subjectId, setSubjectId] = useState<string>();
  const [fmt, setFmt] = useState<ExportFormat>('pdf');
  const [withAnswer, setWithAnswer] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; t: string }>();
  const sid = subjectId ?? subjects.data?.[0]?.id;
  const doExport = async () => {
    setBusy(true); setMsg(undefined);
    try {
      const f = await exportQuestionBank(sid!, fmt, withAnswer);
      await openDownload(f.downloadUrl);
      setMsg({ ok: true, t: `Đã mở file${f.questionsCount !== undefined ? ` (${f.questionsCount} câu)` : ''}. Nếu trình duyệt chặn cửa sổ mới, hãy cho phép rồi thử lại.` });
    } catch (e) { setMsg({ ok: false, t: (e as Error).message }); } finally { setBusy(false); }
  };
  return (
    <Card>
      <Row><Ionicons name="download-outline" size={22} color={colors.primary} /><H2>Xuất ngân hàng câu hỏi</H2></Row>
      <Muted>Chỉ gồm các câu hỏi đã được duyệt của môn bạn chọn.</Muted>
      {subjects.loading && !subjects.data ? <Loading /> : subjects.error ? <ErrorBox message={subjects.error} onRetry={subjects.reload} /> : (
        <>
          <Muted>Môn học</Muted>
          <Row>{subjects.data?.map((s) => <Chip key={s.id} label={s.name} active={sid === s.id} onPress={() => setSubjectId(s.id)} />)}</Row>
        </>
      )}
      <Muted>Định dạng</Muted>
      <Row>
        {FORMATS.map((f) => <Chip key={f.value} label={f.label} active={fmt === f.value} onPress={() => setFmt(f.value)} />)}
        <Chip label="Kèm đáp án và lời giải" active={withAnswer} onPress={() => setWithAnswer(!withAnswer)} />
      </Row>
      {msg ? <Text style={{ color: msg.ok ? colors.success : colors.danger }}>{msg.t}</Text> : null}
      <Button title="Xuất file" icon="download" disabled={!sid} loading={busy} onPress={doExport} />
    </Card>
  );
}
