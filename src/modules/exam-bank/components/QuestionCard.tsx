import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import type { Question } from '@/modules/exam-bank/api/types';
import { colors } from '@/shared/theme';
import { Card, Muted, Row, Stars, go } from '@/shared/ui';
import { DifficultyBadge, StatusBadge } from '@/modules/exam-bank/components/badges';

export const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

/** Thẻ tóm tắt câu hỏi, bấm để mở chi tiết (trả lời / thống kê / đánh giá). */
export function QuestionCard({ q, index, showStatus, showAnswer, showSource }: { q: Question; index?: number; showStatus?: boolean; showAnswer?: boolean; showSource?: boolean }) {
  return (
    <Card onPress={() => go(`/exam-bank/question/${q.id}`)}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Row>
          <DifficultyBadge d={q.difficulty} />
          <Muted>{q.topic}</Muted>
          {showSource && q.source ? <Muted>· {q.source === 'ai' ? '🤖 AI tạo' : '✍️ Tự làm'}</Muted> : null}
        </Row>
        {showStatus ? <StatusBadge status={q.status} /> : null}
      </Row>
      <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text }}>{index !== undefined ? `Câu ${index + 1}. ` : ''}{q.content}</Text>
      {showAnswer ? (
        <View style={{ gap: 4 }}>
          {q.options.map((o, i) => (
            <Row key={i} style={{ gap: 6 }}>
              <Ionicons name={i === q.correctIndex ? 'checkmark-circle' : 'ellipse-outline'} size={16} color={i === q.correctIndex ? colors.success : colors.muted} />
              <Text style={{ color: colors.text, flexShrink: 1 }}>{LETTERS[i]}. {o}</Text>
            </Row>
          ))}
        </View>
      ) : null}
      <Row style={{ justifyContent: 'space-between' }}>
        <Row style={{ gap: 6 }}><Stars value={q.avgRating} size={14} /><Muted>({q.ratingCount})</Muted></Row>
        <Muted>{q.answerCount} lượt trả lời</Muted>
      </Row>
    </Card>
  );
}
