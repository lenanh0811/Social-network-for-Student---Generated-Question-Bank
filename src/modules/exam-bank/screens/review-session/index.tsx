import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { approveQuestions, completeReview, getCachedSession, getReviewDetail, rejectQuestions } from '@/modules/exam-bank/api/client';
import type { RejectionCode } from '@/modules/exam-bank/api/types';
import { QuestionCard, REJECTION } from '@/modules/exam-bank/components/question-card';
import { StatusBadge } from '@/modules/exam-bank/components/badges';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Chip } from '@/components/chip';
import { ErrorBox } from '@/components/error-box';
import { Field } from '@/components/field';
import { fmtDate } from '@/utils/format-date';
import { H1 } from '@/components/heading';
import { Header } from '@/components/header';
import { Loading } from '@/components/loading';
import { Muted } from '@/components/muted';
import { Row } from '@/components/row';
import { Screen } from '@/components/screen';
import { useLoad } from '@/hooks/use-load';
import { colors } from '@/theme';

const CODES: RejectionCode[] = ['DUPLICATE', 'INCORRECT_ANSWER', 'AMBIGUOUS_OR_INCOMPLETE', 'OUT_OF_SCOPE', 'LOW_QUALITY', 'OTHER'];
type Mode = 'idle' | 'reject' | 'finish';

/**
 * API 22 chi tiết phiên · 23 duyệt · 24 từ chối · chốt phiên (complete-review).
 * Backend duyệt TỪNG CÂU HỎI: chọn câu rồi duyệt / từ chối (kèm mã lý do). Chốt phiên thì các câu còn chờ sẽ tự động bị từ chối.
 */
export default function ReviewSession() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const meta = getCachedSession(id);
  const { data, loading, error, reload } = useLoad(() => getReviewDetail(id), [id]);
  const [sel, setSel] = useState<string[]>([]);
  const [mode, setMode] = useState<Mode>('idle');
  const [code, setCode] = useState<RejectionCode>('LOW_QUALITY');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; t: string }>();
  const toggle = (qid: string) => setSel((p) => (p.includes(qid) ? p.filter((x) => x !== qid) : [...p, qid]));

  /** Chạy một thao tác duyệt, rồi tải lại danh sách câu hỏi. */
  const run = async (fn: () => Promise<string>) => {
    setBusy(true); setMsg(undefined);
    try { const t = await fn(); setSel([]); setMode('idle'); setReason(''); await reload(); setMsg({ ok: true, t }); }
    catch (e) { setMsg({ ok: false, t: (e as Error).message }); } finally { setBusy(false); }
  };
  const finish = async () => {
    setBusy(true); setMsg(undefined);
    try { await completeReview(id); router.back(); } catch (e) { setMsg({ ok: false, t: (e as Error).message }); setBusy(false); }
  };

  if (loading && !data) return <><Header title="Duyệt phiên" /><Loading /></>;
  if (!data) return <Screen><Header title="Duyệt phiên" /><ErrorBox message={error ?? 'Không tải được phiên'} onRetry={reload} /></Screen>;

  const pending = data.questions.filter((q) => q.status === 'pending');
  const dupFor = (i: number) => data.duplicates.filter((w) => w.questionIndex === i);
  const footer = mode === 'reject' ? (
    <>
      <Muted>Lý do từ chối {sel.length} câu</Muted>
      <Row>{CODES.map((c) => <Chip key={c} label={REJECTION[c]} active={code === c} onPress={() => setCode(c)} />)}</Row>
      <Field label="Ghi chú cho sinh viên (không bắt buộc)" value={reason} onChangeText={setReason} multiline placeholder="Góp ý để sinh viên chỉnh sửa..." />
      <Row><Button title="Huỷ" variant="outline" onPress={() => setMode('idle')} />
        <Button title="Xác nhận từ chối" variant="danger" loading={busy} onPress={() => run(async () => { await rejectQuestions(sel, code, reason); return `Đã từ chối ${sel.length} câu.`; })} /></Row>
    </>
  ) : mode === 'finish' ? (
    <>
      <Text style={{ color: colors.text }}>Chốt phiên? {pending.length ? `${pending.length} câu còn chờ duyệt sẽ tự động bị từ chối.` : 'Tất cả câu hỏi đã được xử lý.'} Tác giả sẽ nhận thông báo.</Text>
      <Row><Button title="Huỷ" variant="outline" onPress={() => setMode('idle')} />
        <Button title="Chốt hoàn tất" icon="checkmark-done" variant="success" loading={busy} onPress={finish} /></Row>
    </>
  ) : sel.length ? (
    <Row style={{ justifyContent: 'space-between' }}>
      <Text style={{ fontWeight: '600', color: colors.text }}>Đã chọn {sel.length}</Text>
      <Row>
        <Button title="Từ chối" icon="close" variant="outline" onPress={() => setMode('reject')} />
        <Button title={`Duyệt ${sel.length} câu`} icon="checkmark" variant="success" loading={busy}
          onPress={() => run(async () => { const pts = await approveQuestions(sel); return `Đã duyệt ${sel.length} câu${pts ? `, tác giả được cộng ${pts} điểm` : ''}.`; })} />
      </Row>
    </Row>
  ) : (
    <Row style={{ justifyContent: 'space-between' }}>
      <Muted>{pending.length ? `Còn ${pending.length} câu chờ duyệt` : 'Đã xử lý hết các câu hỏi'}</Muted>
      <Button title="Chốt hoàn tất duyệt" icon="checkmark-done" variant={pending.length ? 'outline' : 'success'} onPress={() => setMode('finish')} />
    </Row>
  );

  return (
    <Screen footer={footer}>
      <Header title="Duyệt phiên" />
      <Card>
        <Row style={{ justifyContent: 'space-between' }}>{meta ? <StatusBadge status={meta.status} /> : <Muted>Phiên #{id}</Muted>}{meta ? <Muted>{fmtDate(meta.createdAt)}</Muted> : null}</Row>
        <H1>{meta?.title ?? `Phiên #${id}`}</H1>
        <Muted>{[meta?.authorName, meta?.subject, meta?.className].filter(Boolean).join(' · ')}{meta ? ' · ' : ''}{data.questions.length} câu hỏi</Muted>
      </Card>
      <Card style={{ backgroundColor: 'rgba(230,236,248,0.75)' }}>
        <Muted>💡 Tích chọn các câu chưa duyệt rồi bấm Duyệt hoặc Từ chối. Chạm vào câu hỏi để xem, sửa hoặc nhờ AI tinh chỉnh. Xong thì bấm “Chốt hoàn tất duyệt”.</Muted>
      </Card>
      {msg ? <Text style={{ color: msg.ok ? colors.success : colors.danger, fontWeight: '600' }}>{msg.t}</Text> : null}
      {data.questions.map((q, i) => {
        const locked = q.status !== 'pending';
        const dups = dupFor(i);
        return (
          <View key={q.id} style={{ gap: 6 }}>
            <Row style={{ flexWrap: 'nowrap', alignItems: 'flex-start' }}>
              <Pressable disabled={locked} onPress={() => toggle(q.id)} hitSlop={8} style={{ paddingTop: 16, opacity: locked ? 0.35 : 1 }}>
                <Ionicons name={sel.includes(q.id) ? 'checkbox' : 'square-outline'} size={26} color={sel.includes(q.id) ? colors.primary : colors.muted} />
              </Pressable>
              <View style={{ flex: 1 }}><QuestionCard q={q} index={i} showAnswer showStatus /></View>
            </Row>
            {dups.map((w) => (
              <Text key={w.similarQuestionId} style={{ color: colors.warning, marginLeft: 36 }}>
                ⚠️ Có thể trùng câu #{w.similarQuestionId} trong ngân hàng ({Math.round(w.score * 100)}%){w.snippet ? `: “${w.snippet}”` : ''}
              </Text>
            ))}
          </View>
        );
      })}
    </Screen>
  );
}
