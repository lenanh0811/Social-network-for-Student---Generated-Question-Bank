import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import type { Question } from '@/modules/exam-bank/api/types';
import { colors } from '@/theme';
import { Card } from '@/components/card';
import { Muted } from '@/components/muted';
import { Row } from '@/components/row';
import { Stars } from '@/components/stars';
import { go } from '@/utils/navigation';
import { DifficultyBadge, StatusBadge } from './badges';

export const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

/** Mã lý do từ chối (rejection_code) → nhãn tiếng Việt. */
export const REJECTION: Record<string, string> = {
  DUPLICATE: 'Trùng câu hỏi', INCORRECT_ANSWER: 'Đáp án sai', AMBIGUOUS_OR_INCOMPLETE: 'Mơ hồ / chưa đầy đủ',
  OUT_OF_SCOPE: 'Ngoài phạm vi', LOW_QUALITY: 'Chất lượng thấp', OTHER: 'Lý do khác', AUTO_REJECTED_ON_COMPLETION: 'Tự động từ chối khi chốt phiên',
};

/** Thẻ tóm tắt câu hỏi, bấm để mở chi tiết (trả lời / thống kê / đánh giá). */
export function QuestionCard({ q, index, showStatus, showAnswer, showSource }: { q: Question; index?: number; showStatus?: boolean; showAnswer?: boolean; showSource?: boolean }) {
  return (
    <Card onPress={() => go(`/exam-bank/question/${q.id}`)}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Row>
          {q.difficulty ? <DifficultyBadge d={q.difficulty} /> : null}
          {q.topic ? <Muted>{q.topic}</Muted> : null}
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
      {q.status === 'rejected' && q.rejectionReason ? <Text style={{ color: colors.danger, fontSize: 13 }}>Lý do từ chối: {REJECTION[q.rejectionCode ?? ''] ? `${REJECTION[q.rejectionCode!]} — ` : ''}{q.rejectionReason}</Text> : null}
      <Row style={{ justifyContent: 'space-between' }}>
        <Row style={{ gap: 6 }}><Stars value={q.avgRating} size={14} /><Muted>({q.ratingCount})</Muted></Row>
        <Muted>{q.answerCount} lượt trả lời</Muted>
      </Row>
    </Card>
  );
}
