import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { answerQuestion, getCachedQuestion, getQuestionStatistics, listRatings, rateQuestion } from '@/modules/exam-bank/api/client';
import type { AnswerResult } from '@/modules/exam-bank/api/types';
import { LETTERS } from '@/modules/exam-bank/components/QuestionCard';
import { Bar, Button, Card, ErrorBox, Field, fmtDate, go, H2, Header, Loading, Muted, Row, Screen, Segmented, Stars } from '@/shared/ui';
import { DifficultyBadge } from '@/modules/exam-bank/components/badges';
import { useAuth } from '@/shared/context/Auth';
import { useLoad } from '@/shared/hooks';
import { colors, radius } from '@/shared/theme';

type Tab = 'answer' | 'stats' | 'ratings';

/** Chi tiết câu hỏi: Trả lời (17) · Thống kê (18) · Đánh giá (19, 20). Giảng viên có thêm Sửa (25) & AI (26, 27). */
export default function QuestionDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { role } = useAuth();
  const [, bump] = useState(0);
  useFocusEffect(useCallback(() => bump((n) => n + 1), [])); // đọc lại cache sau khi sửa / áp dụng AI
  const q = getCachedQuestion(id);
  const [tab, setTab] = useState<Tab>('answer');
  if (!q) return <Screen><Header title="Câu hỏi" /><ErrorBox message="Không có dữ liệu câu hỏi. Hãy mở từ danh sách câu hỏi." /></Screen>;
  return (
    <Screen>
      <Header title="Câu hỏi" />
      <Card>
        <Row><DifficultyBadge d={q.difficulty} /><Muted>{q.topic} · {q.subject}</Muted></Row>
        <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text }}>{q.content}</Text>
        <Muted>Đóng góp bởi {q.authorName}</Muted>
        {role === 'lecturer' ? (
          <Row>
            <Button small variant="outline" icon="create-outline" title="Sửa" onPress={() => go(`/exam-bank/question/edit/${id}`)} />
            <Button small variant="soft" icon="sparkles" title="Tinh chỉnh bằng AI" onPress={() => go(`/exam-bank/question/ai/${id}`)} />
          </Row>
        ) : null}
      </Card>
      <Segmented value={tab} onChange={setTab} options={[{ value: 'answer', label: 'Trả lời' }, { value: 'stats', label: 'Thống kê' }, { value: 'ratings', label: 'Đánh giá' }]} />
      {tab === 'answer' ? <AnswerTab id={id} options={q.options} /> : tab === 'stats' ? <StatsTab id={id} options={q.options} correct={q.correctIndex} /> : <RatingsTab id={id} />}
    </Screen>
  );
}

function AnswerTab({ id, options }: { id: string; options: string[] }) {
  const [pick, setPick] = useState<number>();
  const [res, setRes] = useState<AnswerResult>();
  const [busy, setBusy] = useState(false);
  const submit = async () => { setBusy(true); try { setRes(await answerQuestion(id, pick!)); } finally { setBusy(false); } };
  return (
    <>
      {options.map((o, i) => {
        const isCorrect = res && i === res.correctIndex;
        const isWrong = res && pick === i && !res.correct;
        return (
          <Pressable key={i} disabled={!!res} onPress={() => setPick(i)} style={{
            flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: radius.md, borderWidth: 2, backgroundColor: '#fff',
            borderColor: isCorrect ? colors.success : isWrong ? colors.danger : pick === i ? colors.primary : colors.border,
          }}>
            <View style={{ width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: pick === i ? colors.primary : colors.bg }}>
              <Text style={{ fontWeight: '700', color: pick === i ? '#fff' : colors.text }}>{LETTERS[i]}</Text>
            </View>
            <Text style={{ flex: 1, fontSize: 15, color: colors.text }}>{o}</Text>
            {isCorrect ? <Ionicons name="checkmark-circle" size={22} color={colors.success} /> : isWrong ? <Ionicons name="close-circle" size={22} color={colors.danger} /> : null}
          </Pressable>
        );
      })}
      {res ? (
        <Card style={{ backgroundColor: res.correct ? colors.successSoft : colors.dangerSoft, borderColor: res.correct ? colors.success : colors.danger }}>
          <Text style={{ fontWeight: '800', fontSize: 16, color: res.correct ? colors.success : colors.danger }}>{res.correct ? 'Chính xác! 🎉' : `Chưa đúng — đáp án đúng là ${LETTERS[res.correctIndex]}`}</Text>
          {res.explanation ? <Text style={{ color: colors.text }}>{res.explanation}</Text> : null}
        </Card>
      ) : <Button title="Nộp đáp án" disabled={pick === undefined} loading={busy} onPress={submit} />}
    </>
  );
}

function StatsTab({ id, options, correct }: { id: string; options: string[]; correct: number }) {
  const { data, loading, error, reload } = useLoad(() => getQuestionStatistics(id), [id]);
  if (loading && !data) return <Loading />;
  if (!data) return <ErrorBox message={error ?? 'Lỗi'} onRetry={reload} />;
  const max = Math.max(1, ...data.distribution);
  return (
    <Card>
      <Row style={{ justifyContent: 'space-around' }}>
        <View style={{ alignItems: 'center' }}><Text style={{ fontSize: 28, fontWeight: '800', color: colors.primary }}>{data.totalAnswers}</Text><Muted>lượt trả lời</Muted></View>
        <View style={{ alignItems: 'center' }}><Text style={{ fontSize: 28, fontWeight: '800', color: colors.success }}>{Math.round(data.correctRate * 100)}%</Text><Muted>trả lời đúng</Muted></View>
      </Row>
      <H2>Phân bố lựa chọn</H2>
      {options.map((o, i) => (
        <View key={i} style={{ gap: 4 }}>
          <Text numberOfLines={1} style={{ fontSize: 13, color: colors.text }}>{LETTERS[i]}. {o}{i === correct ? '  ✓' : ''}</Text>
          <Row style={{ flexWrap: 'nowrap' }}>
            <Bar ratio={data.distribution[i] / max} color={i === correct ? colors.success : colors.blue} />
            <Text style={{ width: 28, textAlign: 'right', fontWeight: '700' }}>{data.distribution[i]}</Text>
          </Row>
        </View>
      ))}
    </Card>
  );
}

function RatingsTab({ id }: { id: string }) {
  const { data, loading, error, reload } = useLoad(() => listRatings(id), [id]);
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const send = async () => { setBusy(true); try { await rateQuestion(id, stars, comment.trim() || undefined); setStars(0); setComment(''); await reload(); } finally { setBusy(false); } };
  return (
    <>
      <Card>
        <H2>Đánh giá câu hỏi này</H2>
        <Stars value={stars} onChange={setStars} size={32} />
        <Field label="Nhận xét (không bắt buộc)" value={comment} onChangeText={setComment} multiline placeholder="Câu hỏi có rõ ràng, đáp án có chính xác không?" />
        <Button title="Gửi đánh giá" disabled={!stars} loading={busy} onPress={send} />
      </Card>
      {error ? <ErrorBox message={error} onRetry={reload} /> : null}
      {loading && !data ? <Loading /> : null}
      {data && !data.length ? <Muted style={{ textAlign: 'center' }}>Chưa có đánh giá nào.</Muted> : null}
      {data?.map((r) => (
        <Card key={r.id}>
          <Row style={{ justifyContent: 'space-between' }}><Text style={{ fontWeight: '700' }}>{r.userName}</Text><Muted>{fmtDate(r.createdAt)}</Muted></Row>
          <Stars value={r.stars} size={14} />
          {r.comment ? <Text style={{ color: colors.text }}>{r.comment}</Text> : null}
        </Card>
      ))}
    </>
  );
}
