import { router } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { generateExam } from '@/modules/exam-bank/api/client';
import { Button, Card, Chip, ErrorBox, Field, H2, Header, Muted, Row, Screen } from '@/shared/ui';
import { SUBJECTS } from '@/modules/exam-bank/constants';
import { colors } from '@/shared/theme';

const PRESETS = { 'Cân bằng': [40, 40, 20], 'Cơ bản': [70, 25, 5], 'Nâng cao': [15, 45, 40] } as const;

/** API 34: sinh đề thi tự động từ ngân hàng câu hỏi theo môn, số câu và tỉ lệ độ khó. */
export default function GenerateExam() {
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState(SUBJECTS[0]);
  const [count, setCount] = useState('10');
  const [duration, setDuration] = useState('30');
  const [preset, setPreset] = useState<keyof typeof PRESETS>('Cân bằng');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string>();
  const [e, m, h] = PRESETS[preset];
  const ok = title.trim() && +count > 0 && +duration > 0;

  const submit = async () => {
    setBusy(true); setErr(undefined);
    try {
      const exam = await generateExam({ title: title.trim(), subject, count: +count, durationMin: +duration, mix: { easy: e, medium: m, hard: h } });
      router.replace(`/exam-bank/exam/${exam.id}` as never);
    } catch (x) { setErr((x as Error).message); } finally { setBusy(false); }
  };

  return (
    <Screen footer={<Button title="Sinh đề thi" icon="sparkles" disabled={!ok} loading={busy} onPress={submit} />}>
      <Header title="Tạo đề thi" />
      {err ? <ErrorBox message={err} /> : null}
      <Card>
        <Field label="Tên đề thi" value={title} onChangeText={setTitle} placeholder="VD: Kiểm tra giữa kỳ" />
        <Muted>Môn học</Muted>
        <Row>{SUBJECTS.map((s) => <Chip key={s} label={s} active={subject === s} onPress={() => setSubject(s)} />)}</Row>
        <Row style={{ flexWrap: 'nowrap' }}>
          <View style={{ flex: 1 }}><Field label="Số câu" value={count} onChangeText={(t) => setCount(t.replace(/\D/g, ''))} keyboardType="number-pad" /></View>
          <View style={{ flex: 1 }}><Field label="Thời gian (phút)" value={duration} onChangeText={(t) => setDuration(t.replace(/\D/g, ''))} keyboardType="number-pad" /></View>
        </Row>
      </Card>
      <Card>
        <H2>Phân bố độ khó</H2>
        <Row>{(Object.keys(PRESETS) as (keyof typeof PRESETS)[]).map((k) => <Chip key={k} label={k} active={preset === k} onPress={() => setPreset(k)} />)}</Row>
        <View style={{ flexDirection: 'row', height: 14, borderRadius: 7, overflow: 'hidden' }}>
          <View style={{ flex: e, backgroundColor: colors.success }} /><View style={{ flex: m, backgroundColor: colors.accent }} /><View style={{ flex: h, backgroundColor: colors.danger }} />
        </View>
        <Text style={{ color: colors.muted, fontSize: 13 }}>Dễ {e}% · Trung bình {m}% · Khó {h}%</Text>
      </Card>
    </Screen>
  );
}
