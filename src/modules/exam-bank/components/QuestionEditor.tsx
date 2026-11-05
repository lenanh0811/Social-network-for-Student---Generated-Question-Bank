import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, TextInput, View } from 'react-native';
import type { Difficulty, QuestionDraft } from '@/modules/exam-bank/api/types';
import { colors, radius } from '@/shared/theme';
import { LETTERS } from '@/modules/exam-bank/components/QuestionCard';
import { Chip, Field, Row } from '@/shared/ui';

export const emptyDraft = (): QuestionDraft => ({ content: '', options: ['', '', '', ''], correctIndex: 0, explanation: '', topic: '', difficulty: 'easy' });

export const validateDraft = (d: QuestionDraft) =>
  !d.content.trim() ? 'Nhập nội dung câu hỏi'
    : d.options.some((o) => !o.trim()) ? 'Điền đủ các đáp án'
    : !d.topic.trim() ? 'Nhập chủ đề' : null;

/** Form soạn một câu hỏi trắc nghiệm: nội dung, các đáp án (chọn đáp án đúng), giải thích, chủ đề, độ khó. */
export function QuestionEditor({ value, onChange, showErrors }: { value: QuestionDraft; onChange: (d: QuestionDraft) => void; showErrors?: boolean }) {
  const set = <K extends keyof QuestionDraft>(k: K, v: QuestionDraft[K]) => onChange({ ...value, [k]: v });
  const setOpt = (i: number, t: string) => set('options', value.options.map((o, k) => (k === i ? t : o)));
  return (
    <View style={{ gap: 12 }}>
      <Field label="Nội dung câu hỏi" multiline value={value.content} onChangeText={(t) => set('content', t)} placeholder="Nhập câu hỏi..."
        error={showErrors && !value.content.trim() ? 'Bắt buộc' : undefined} />
      <View style={{ gap: 6 }}>
        <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>Các đáp án (chạm vòng tròn để chọn đáp án đúng)</Text>
        {value.options.map((o, i) => (
          <Row key={i} style={{ flexWrap: 'nowrap' }}>
            <Pressable onPress={() => set('correctIndex', i)} hitSlop={8}>
              <Ionicons name={value.correctIndex === i ? 'checkmark-circle' : 'ellipse-outline'} size={26} color={value.correctIndex === i ? colors.success : colors.muted} />
            </Pressable>
            <Text style={{ fontWeight: '700', width: 18 }}>{LETTERS[i]}</Text>
            <TextInput
              value={o} onChangeText={(t) => setOpt(i, t)} placeholder={`Đáp án ${LETTERS[i]}`} placeholderTextColor={colors.muted}
              style={{ flex: 1, borderWidth: 1, borderColor: showErrors && !o.trim() ? colors.danger : colors.border, borderRadius: radius.md, padding: 10, backgroundColor: '#fff', color: colors.text }}
            />
          </Row>
        ))}
      </View>
      <Field label="Giải thích (không bắt buộc)" multiline value={value.explanation} onChangeText={(t) => set('explanation', t)} placeholder="Vì sao đáp án này đúng?" />
      <Field label="Chủ đề" value={value.topic} onChangeText={(t) => set('topic', t)} placeholder="VD: REST, SQL, CSS..." error={showErrors && !value.topic.trim() ? 'Bắt buộc' : undefined} />
      <View style={{ gap: 6 }}>
        <Text style={{ fontSize: 13, fontWeight: '600' }}>Độ khó</Text>
        <Row>
          {([['easy', 'Dễ'], ['medium', 'Trung bình'], ['hard', 'Khó']] as [Difficulty, string][]).map(([d, l]) => (
            <Chip key={d} label={l} active={value.difficulty === d} onPress={() => set('difficulty', d)} />
          ))}
        </Row>
      </View>
    </View>
  );
}
