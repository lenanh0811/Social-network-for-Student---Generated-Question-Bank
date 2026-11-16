import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { generateExam, listLecturerClasses } from '@/modules/exam-bank/api/client';
import type { DifficultyMix } from '@/modules/exam-bank/api/types';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Chip } from '@/components/chip';
import { ErrorBox } from '@/components/error-box';
import { Field } from '@/components/field';
import { H2 } from '@/components/heading';
import { Header } from '@/components/header';
import { Loading } from '@/components/loading';
import { Muted } from '@/components/muted';
import { Row } from '@/components/row';
import { Screen } from '@/components/screen';
import { Segmented } from '@/components/segmented';
import { useLoad } from '@/hooks/use-load';
import { colors } from '@/theme';

/** Tỉ lệ độ khó (0–1) gửi lên backend. */
const PRESETS: Record<string, DifficultyMix> = {
  'Cân bằng': { easy: 0.4, medium: 0.4, hard: 0.2 },
  'Cơ bản': { easy: 0.7, medium: 0.25, hard: 0.05 },
  'Nâng cao': { easy: 0.15, medium: 0.45, hard: 0.4 },
};
const pct = (n: number) => Math.round(n * 100);

/** API 34: sinh đề thi từ ngân hàng câu hỏi đã duyệt theo môn, số câu, tỉ lệ độ khó và các lớp học phần áp dụng. */
export default function GenerateExam() {
  const classes = useLoad(listLecturerClasses);
  const [title, setTitle] = useState('');
  const [subjectId, setSubjectId] = useState<string>();
  const [classIds, setClassIds] = useState<string[]>();
  const [count, setCount] = useState('10');
  const [byDifficulty, setByDifficulty] = useState(false);
  const [preset, setPreset] = useState('Cân bằng');
  const [shuffle, setShuffle] = useState(true);
  const [withKey, setWithKey] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string>();

  // Môn học = các môn mà tôi có lớp phụ trách (backend bắt buộc chọn lớp áp dụng đề).
  const mine = classes.data ?? [];
  const subjects = mine.filter((c, i) => mine.findIndex((x) => x.subjectId === c.subjectId) === i);
  const sid = subjectId ?? subjects[0]?.subjectId;
  const ofSubject = mine.filter((c) => c.subjectId === sid);
  const selected = classIds ?? ofSubject.map((c) => c.id); // chưa chọn gì = tất cả lớp của môn
  const toggle = (id: string) => setClassIds(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  const mix = PRESETS[preset];
  const ok = !!sid && selected.length > 0 && +count > 0;

  const submit = async () => {
    setBusy(true); setErr(undefined);
    try {
      const exam = await generateExam({
        title, subjectId: sid!, classIds: selected, count: +count, difficulty: byDifficulty ? mix : undefined, shuffleOptions: shuffle, includeAnswerKey: withKey,
      });
      router.replace(`/exam-bank/exam/${exam.id}` as never);
    } catch (x) { setErr((x as Error).message); } finally { setBusy(false); }
  };

  return (
    <Screen footer={<Button title="Sinh đề thi" icon="sparkles" disabled={!ok} loading={busy} onPress={submit} />}>
      <Header title="Tạo đề thi" />
      {err ? <ErrorBox message={err} /> : null}
      {classes.loading && !classes.data ? <Loading /> : classes.error ? <ErrorBox message={classes.error} onRetry={classes.reload} /> : !mine.length ? (
        <ErrorBox message="Bạn chưa được phân công lớp học phần nào trong học kỳ hiện tại nên chưa thể tạo đề." />
      ) : (
        <>
          <Card>
            <Field label="Tên đề thi (không bắt buộc)" value={title} onChangeText={setTitle} placeholder="VD: Kiểm tra giữa kỳ" />
            <Muted>Môn học</Muted>
            <Row>{subjects.map((s) => <Chip key={s.subjectId} label={s.subjectName} active={sid === s.subjectId} onPress={() => { setSubjectId(s.subjectId); setClassIds(undefined); }} />)}</Row>
            <Muted>Lớp học phần áp dụng đề</Muted>
            <Row>{ofSubject.map((c) => <Chip key={c.id} label={c.classCode} active={selected.includes(c.id)} onPress={() => toggle(c.id)} />)}</Row>
            <Field label="Số câu" value={count} onChangeText={(t) => setCount(t.replace(/\D/g, ''))} keyboardType="number-pad" />
          </Card>
          <Segmented value={byDifficulty ? 'mix' : 'random'} onChange={(v) => setByDifficulty(v === 'mix')} options={[{ value: 'random', label: '🎲 Ngẫu nhiên' }, { value: 'mix', label: '🎯 Theo độ khó' }]} />
          {byDifficulty ? (
            <Card>
              <H2>Phân bố độ khó</H2>
              <Row>{Object.keys(PRESETS).map((k) => <Chip key={k} label={k} active={preset === k} onPress={() => setPreset(k)} />)}</Row>
              <View style={{ flexDirection: 'row', height: 14, borderRadius: 7, overflow: 'hidden' }}>
                <View style={{ flex: mix.easy, backgroundColor: colors.success }} /><View style={{ flex: mix.medium, backgroundColor: colors.accent }} /><View style={{ flex: mix.hard, backgroundColor: colors.danger }} />
              </View>
              <Text style={{ color: colors.muted, fontSize: 13 }}>Dễ {pct(mix.easy)}% · Trung bình {pct(mix.medium)}% · Khó {pct(mix.hard)}%</Text>
            </Card>
          ) : <Muted>Bốc ngẫu nhiên từ các câu đã duyệt của môn, không theo độ khó.</Muted>}
          <Card>
            <Row>
              <Chip label="Đảo thứ tự đáp án" active={shuffle} onPress={() => setShuffle(!shuffle)} />
              <Chip label="Kèm bảng đáp án" active={withKey} onPress={() => setWithKey(!withKey)} />
            </Row>
            <Row style={{ gap: 6, flexWrap: 'nowrap' }}><Ionicons name="information-circle-outline" size={16} color={colors.muted} /><Muted style={{ flex: 1 }}>Nếu ngân hàng không đủ câu, đề có thể ít câu hơn số bạn yêu cầu.</Muted></Row>
          </Card>
        </>
      )}
    </Screen>
  );
}
