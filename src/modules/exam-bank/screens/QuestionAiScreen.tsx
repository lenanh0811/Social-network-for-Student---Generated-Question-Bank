import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { aiApply, aiRefine, getCachedQuestion } from '@/modules/exam-bank/api/client';
import type { AiSuggestion } from '@/modules/exam-bank/api/types';
import { LETTERS } from '@/modules/exam-bank/components/QuestionCard';
import { Button, Card, Chip, ErrorBox, Field, H2, Header, Muted, Row, Screen } from '@/shared/ui';
import { colors } from '@/shared/theme';

const PRESETS = ['Diễn đạt rõ ràng hơn', 'Làm khó hơn', 'Sửa lỗi chính tả', 'Thêm giải thích'];

/** API 26: AI gợi ý chỉnh sửa (xem trước) · API 27: áp dụng gợi ý vào câu hỏi. */
export default function AiRefine() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const q = getCachedQuestion(id);
  const [instr, setInstr] = useState('');
  const [sug, setSug] = useState<AiSuggestion>();
  const [busy, setBusy] = useState<'refine' | 'apply'>();
  const [err, setErr] = useState<string>();
  if (!q) return <Screen><Header title="AI tinh chỉnh" /><ErrorBox message="Không có dữ liệu câu hỏi." /></Screen>;

  const run = async (kind: 'refine' | 'apply') => {
    setBusy(kind); setErr(undefined);
    try {
      if (kind === 'refine') setSug(await aiRefine(id, instr.trim()));
      else { await aiApply(id, sug!); router.back(); }
    } catch (e) { setErr((e as Error).message); } finally { setBusy(undefined); }
  };

  return (
    <Screen footer={sug ? <Row style={{ justifyContent: 'space-between' }}>
      <Button title="Thử lại" variant="outline" icon="refresh" loading={busy === 'refine'} onPress={() => run('refine')} />
      <Button title="Áp dụng gợi ý" icon="checkmark" variant="success" loading={busy === 'apply'} onPress={() => run('apply')} />
    </Row> : undefined}>
      <Header title="AI tinh chỉnh câu hỏi" />
      {err ? <ErrorBox message={err} /> : null}
      <Card>
        <Muted>Câu hỏi hiện tại</Muted>
        <Text style={{ fontWeight: '700', fontSize: 15 }}>{q.content}</Text>
        {q.options.map((o, i) => <Text key={i} style={{ color: i === q.correctIndex ? colors.success : colors.text }}>{LETTERS[i]}. {o}</Text>)}
      </Card>
      {!sug ? (
        <Card>
          <H2>Bạn muốn AI chỉnh gì?</H2>
          <Row>{PRESETS.map((p) => <Chip key={p} label={p} active={instr === p} onPress={() => setInstr(p)} />)}</Row>
          <Field label="Hoặc nhập yêu cầu riêng" value={instr} onChangeText={setInstr} multiline placeholder="VD: Thêm đáp án gây nhiễu hợp lý hơn" />
          <Button title="Nhờ AI gợi ý" icon="sparkles" loading={busy === 'refine'} onPress={() => run('refine')} />
        </Card>
      ) : (
        <Card style={{ borderColor: colors.accent, backgroundColor: colors.accentSoft }}>
          <Row><Ionicons name="sparkles" size={18} color={colors.accent} /><H2>Gợi ý của AI</H2></Row>
          <Muted>{sug.notes}</Muted>
          <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 12, gap: 6 }}>
            <Text style={{ fontWeight: '700', fontSize: 15 }}>{sug.content}</Text>
            {sug.options.map((o, i) => <Text key={i} style={{ color: i === sug.correctIndex ? colors.success : colors.text, fontWeight: i === sug.correctIndex ? '700' : '400' }}>{LETTERS[i]}. {o}</Text>)}
            {sug.explanation ? <Muted>Giải thích: {sug.explanation}</Muted> : null}
          </View>
          <Muted>Gợi ý chưa được lưu cho tới khi bạn bấm “Áp dụng”.</Muted>
        </Card>
      )}
    </Screen>
  );
}
