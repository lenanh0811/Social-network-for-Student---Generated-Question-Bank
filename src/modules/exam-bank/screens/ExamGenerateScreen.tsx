import { router } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { generateExam, listBankTopics } from '@/modules/exam-bank/api/client';
import { SUBJECTS } from '@/modules/exam-bank/constants';
import { Button, Card, Chip, ErrorBox, Field, H2, Header, Muted, Row, Screen, Segmented } from '@/shared/ui';
import { useLoad } from '@/shared/hooks';
import { colors } from '@/shared/theme';

const PRESETS = { 'Cân bằng': [40, 40, 20], 'Cơ bản': [70, 25, 5], 'Nâng cao': [15, 45, 40] } as const;

/** API 34: sinh đề thi từ ngân hàng — bốc ngẫu nhiên hoặc có chủ đích (chủ đề + tỉ lệ độ khó). Ưu tiên câu single-choice. */
export default function GenerateExam() {
  const [mode, setMode] = useState<'random' | 'targeted'>('random');
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState(SUBJECTS[0]);
  const [count, setCount] = useState('10');
  const [duration, setDuration] = useState('30');
  const [preset, setPreset] = useState<keyof typeof PRESETS>('Cân bằng');
  const [topics, setTopics] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string>();
  const { data: bankTopics } = useLoad(() => listBankTopics(subject), [subject]);
  const [e, m, h] = PRESETS[preset];
  const ok = title.trim() && +count > 0 && +duration > 0;
  const toggle = (t: string) => setTopics((p) => (p.includes(t) ? p.filter((x) => x !== t) : [...p, t]));

  const submit = async () => {
    setBusy(true); setErr(undefined);
    try {
      const exam = await generateExam({ mode, topics: mode === 'targeted' ? topics : undefined, title: title.trim(), subject, count: +count, durationMin: +duration, mix: { easy: e, medium: m, hard: h } });
      router.replace(`/exam-bank/exam/${exam.id}` as never);
    } catch (x) { setErr((x as Error).message); } finally { setBusy(false); }
  };

  return (
    <Screen footer={<Button title="Sinh đề thi" icon="sparkles" disabled={!ok} loading={busy} onPress={submit} />}>
      <Header title="Tạo đề thi" />
      {err ? <ErrorBox message={err} /> : null}
      <Segmented value={mode} onChange={setMode} options={[{ value: 'random', label: '🎲 Ngẫu nhiên' }, { value: 'targeted', label: '🎯 Có chủ đích' }]} />
      <Muted>{mode === 'random' ? 'Bốc ngẫu nhiên các câu single-choice từ ngân hàng của môn.' : 'Chọn chủ đề và tỉ lệ độ khó để đề thi bám sát mục tiêu của bạn.'}</Muted>
      <Card>
        <Field label="Tên đề thi" value={title} onChangeText={setTitle} placeholder="VD: Kiểm tra giữa kỳ" />
        <Muted>Môn học</Muted>
        <Row>{SUBJECTS.map((s) => <Chip key={s} label={s} active={subject === s} onPress={() => { setSubject(s); setTopics([]); }} />)}</Row>
        <Row style={{ flexWrap: 'nowrap' }}>
          <View style={{ flex: 1 }}><Field label="Số câu" value={count} onChangeText={(t) => setCount(t.replace(/\D/g, ''))} keyboardType="number-pad" /></View>
          <View style={{ flex: 1 }}><Field label="Thời gian (phút)" value={duration} onChangeText={(t) => setDuration(t.replace(/\D/g, ''))} keyboardType="number-pad" /></View>
        </Row>
      </Card>
      {mode === 'targeted' ? (
        <>
          <Card>
            <H2>Chủ đề</H2>
            <Muted>Không chọn = tất cả chủ đề.</Muted>
            <Row>{bankTopics?.length ? bankTopics.map((t) => <Chip key={t} label={t} active={topics.includes(t)} onPress={() => toggle(t)} />) : <Muted>Chưa có chủ đề nào trong ngân hàng của môn này.</Muted>}</Row>
          </Card>
          <Card>
            <H2>Phân bố độ khó</H2>
            <Row>{(Object.keys(PRESETS) as (keyof typeof PRESETS)[]).map((k) => <Chip key={k} label={k} active={preset === k} onPress={() => setPreset(k)} />)}</Row>
            <View style={{ flexDirection: 'row', height: 14, borderRadius: 7, overflow: 'hidden' }}>
              <View style={{ flex: e, backgroundColor: colors.success }} /><View style={{ flex: m, backgroundColor: colors.accent }} /><View style={{ flex: h, backgroundColor: colors.danger }} />
            </View>
            <Text style={{ color: colors.muted, fontSize: 13 }}>Dễ {e}% · Trung bình {m}% · Khó {h}%</Text>
          </Card>
        </>
      ) : null}
    </Screen>
  );
}
