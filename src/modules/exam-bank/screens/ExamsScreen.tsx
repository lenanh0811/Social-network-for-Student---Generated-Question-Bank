import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Text, useWindowDimensions, View } from 'react-native';
import { exportQuestions, listMyExams } from '@/modules/exam-bank/api/client';
import type { ExportFormat } from '@/modules/exam-bank/api/types';
import { Button, Card, Chip, Empty, ErrorBox, fmtDate, go, H1, H2, Loading, Muted, Row, Screen } from '@/shared/ui';
import { useLoad } from '@/shared/hooks';
import { saveFile } from '@/shared/share';
import { colors } from '@/shared/theme';

/** API 36: đề thi của tôi · API 33: xuất ngân hàng câu hỏi · nút “Tạo đề” → chat AI (API 34). */
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
            <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text, flexShrink: 1 }}>{e.title}</Text>
            <Muted>{fmtDate(e.createdAt)}</Muted>
          </Row>
          <Row style={{ justifyContent: 'space-between' }}>
            <Muted>{e.questions.length} câu · {e.durationMin} phút</Muted>
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

/** API 33: xuất ngân hàng câu hỏi (chỉ câu đã duyệt). */
function ExportBank() {
  const [fmt, setFmt] = useState<ExportFormat>('csv');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string>();
  const doExport = async () => {
    setBusy(true); setMsg(undefined);
    try { await saveFile(await exportQuestions(fmt)); } catch (e) { setMsg((e as Error).message); } finally { setBusy(false); }
  };
  return (
    <Card>
      <Row><Ionicons name="download-outline" size={22} color={colors.primary} /><H2>Xuất ngân hàng câu hỏi</H2></Row>
      <Muted>Chỉ gồm các câu hỏi đã được duyệt.</Muted>
      <Muted>Định dạng</Muted>
      <Row>{(['csv', 'json', 'txt'] as ExportFormat[]).map((f) => <Chip key={f} label={f.toUpperCase()} active={fmt === f} onPress={() => setFmt(f)} />)}</Row>
      {msg ? <Text style={{ color: colors.danger }}>{msg}</Text> : null}
      <Button title="Xuất file" icon="download" loading={busy} onPress={doExport} />
    </Card>
  );
}
