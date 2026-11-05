import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { exportQuestions, listMyExams } from '@/modules/exam-bank/api/client';
import type { ExportFormat } from '@/modules/exam-bank/api/types';
import { Button, Card, Chip, Empty, ErrorBox, FAB, fmtDate, go, H1, H2, Loading, Muted, Row, Screen } from '@/shared/ui';
import { SUBJECTS } from '@/modules/exam-bank/constants';
import { useLoad } from '@/shared/hooks';
import { saveFile } from '@/shared/share';
import { colors } from '@/shared/theme';

/** API 36: đề thi của tôi · API 33: xuất ngân hàng câu hỏi · nút “Tạo đề” → API 34. */
export default function Exams() {
  const { data, loading, error, reload } = useLoad(listMyExams);
  const [fmt, setFmt] = useState<ExportFormat>('csv');
  const [subject, setSubject] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string>();
  const doExport = async () => {
    setBusy(true); setMsg(undefined);
    try { await saveFile(await exportQuestions(fmt, subject)); } catch (e) { setMsg((e as Error).message); } finally { setBusy(false); }
  };
  return (
    <View style={{ flex: 1 }}>
      <Screen onRefresh={reload} refreshing={loading && !!data}>
        <H1>Đề thi</H1>
        <Card>
          <Row><Ionicons name="download-outline" size={22} color={colors.primary} /><H2>Xuất ngân hàng câu hỏi</H2></Row>
          <Muted>Chỉ gồm các câu hỏi đã được duyệt.</Muted>
          <Row><Chip label="Tất cả môn" active={!subject} onPress={() => setSubject(undefined)} />{SUBJECTS.map((s) => <Chip key={s} label={s} active={subject === s} onPress={() => setSubject(s)} />)}</Row>
          <Row>{(['csv', 'json', 'txt'] as ExportFormat[]).map((f) => <Chip key={f} label={f.toUpperCase()} active={fmt === f} onPress={() => setFmt(f)} />)}</Row>
          {msg ? <Text style={{ color: colors.danger }}>{msg}</Text> : null}
          <Button title="Xuất file" icon="download" loading={busy} onPress={doExport} />
        </Card>
        <H2>Đề thi đã tạo</H2>
        {error ? <ErrorBox message={error} onRetry={reload} /> : null}
        {loading && !data ? <Loading /> : null}
        {data && !data.length ? <Empty icon="document-text-outline" text="Chưa có đề thi nào. Hãy tạo đề đầu tiên từ ngân hàng câu hỏi." /> : null}
        {data?.map((e) => (
          <Card key={e.id} onPress={() => go(`/exam-bank/exam/${e.id}`)}>
            <Text style={{ fontSize: 16, fontWeight: '700' }}>{e.title}</Text>
            <Muted>{e.subject} · {e.questions.length} câu · {e.durationMin} phút · {fmtDate(e.createdAt)}</Muted>
          </Card>
        ))}
      </Screen>
      <FAB label="Tạo đề" icon="sparkles" onPress={() => go('/exam-bank/exam/generate')} />
    </View>
  );
}
