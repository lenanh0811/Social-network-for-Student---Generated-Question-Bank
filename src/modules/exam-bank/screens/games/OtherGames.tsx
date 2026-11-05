import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { getLlmRound, hasLikeGuess, listMySubmissions, listReportableQuestions, reportQuestion, submitLikeGuess, submitLlmGuess } from '@/modules/exam-bank/api/client';
import { colors } from '@/shared/theme';
import { Button, Card, Chip, Empty, ErrorBox, Field, Loading, Muted, Row, Stars } from '@/shared/ui';
import { useLoad } from '@/shared/hooks';
import { GameShell } from './GameShell';

const Note = ({ children }: { children: string }) => <Text style={{ color: colors.success, fontWeight: '600' }}>{children}</Text>;
const Err = ({ children }: { children: string }) => <Text style={{ color: colors.danger, fontWeight: '600' }}>{children}</Text>;

/** Minigame 3 – Đoán mức độ ưa thích của bạn học cho từng câu trong phiên đề xuất (đúng ≥50% → +0.25 điểm). */
export function Mg3() {
  const { data, loading, error, reload } = useLoad(() => listMySubmissions());
  const [sid, setSid] = useState<string>();
  const [guess, setGuess] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; t: string }>();
  const s = data?.find((x) => x.id === sid);
  const ready = !!s && s.questions.every((q) => guess[q.id]);
  const send = async () => {
    setBusy(true); setMsg(undefined);
    try { await submitLikeGuess(s!.id, s!.questions.map((q) => guess[q.id])); setMsg({ ok: true, t: 'Đã ghi nhận! Kết quả sẽ được chốt khi đủ đánh giá từ bạn học.' }); }
    catch (e) { setMsg({ ok: false, t: (e as Error).message }); } finally { setBusy(false); }
  };
  return (
    <GameShell no={3} title="Đoán mức độ yêu thích" icon="heart" reward="Đúng từ 50% → +0.25 điểm"
      rule="Trong đúng 10 câu hỏi của phiên đề xuất, hãy dự đoán mức độ ưa thích (1–5★) của bạn học với từng câu. Nếu đúng từ 50% trở lên bạn được +0.25 điểm.">
      {loading && !data ? <Loading /> : error ? <ErrorBox message={error} onRetry={reload} /> : !data?.length ? <Empty text="Bạn chưa có phiên đề xuất nào." /> : (
        <>
          <Muted>Chọn phiên của bạn</Muted>
          <Row>{data.map((x) => <Chip key={x.id} label={x.title} active={sid === x.id} onPress={() => { setSid(x.id); setMsg(undefined); }} />)}</Row>
          {s ? (
            <>
              {s.questions.length !== 10 ? <Muted>⚠️ Phiên này có {s.questions.length} câu (luật chơi yêu cầu đúng 10 câu).</Muted> : null}
              {s.questions.map((q, i) => (
                <View key={q.id} style={{ gap: 6 }}>
                  <Text style={{ color: colors.text, fontWeight: '600' }}>Câu {i + 1}. {q.content}</Text>
                  <Stars value={guess[q.id] ?? 0} size={28} onChange={(n) => setGuess({ ...guess, [q.id]: n })} />
                </View>
              ))}
              {msg ? (msg.ok ? <Note>{msg.t}</Note> : <Err>{msg.t}</Err>) : null}
              <Button title="Gửi dự đoán" icon="flash" disabled={!ready || hasLikeGuess(s.id)} loading={busy} onPress={send} />
            </>
          ) : null}
        </>
      )}
    </GameShell>
  );
}

/** Minigame 5 – Báo câu lỗi: rate 0★ (API 19). Nếu câu được chọn vào ngân hàng, chủ câu bị bớt điểm, người báo được cộng (thông báo cuối kỳ). */
export function Mg5() {
  const { data, loading, error, reload } = useLoad(listReportableQuestions);
  const [qid, setQid] = useState<string>();
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; t: string }>();
  const send = async () => {
    setBusy(true); setMsg(undefined);
    try { await reportQuestion(qid!, reason.trim()); setMsg({ ok: true, t: 'Đã gửi báo cáo (đánh giá 0★). Kết quả cộng điểm sẽ được thông báo gần cuối kỳ.' }); setQid(undefined); setReason(''); }
    catch (e) { setMsg({ ok: false, t: (e as Error).message }); } finally { setBusy(false); }
  };
  return (
    <GameShell no={5} title="Báo câu lỗi" icon="bug" reward="Báo đúng → cộng điểm (cuối kỳ)"
      rule="Phát hiện câu hỏi bị lỗi: đánh giá 0★. Nếu câu đó được chọn vào ngân hàng đề thì chủ câu bị bớt điểm và bạn được cộng điểm (bạn chỉ được thông báo gần cuối kỳ).">
      {loading && !data ? <Loading /> : error ? <ErrorBox message={error} onRetry={reload} /> : (
        <>
          {data?.map((q) => (
            <Pressable key={q.id} onPress={() => setQid(q.id)}>
              <Row style={{ flexWrap: 'nowrap' }}>
                <Ionicons name={qid === q.id ? 'radio-button-on' : 'radio-button-off'} size={22} color={qid === q.id ? colors.primary : colors.muted} />
                <Text style={{ flex: 1, color: colors.text }}>{q.content}</Text>
              </Row>
            </Pressable>
          ))}
          {qid ? <Field label="Lỗi bạn phát hiện" value={reason} onChangeText={setReason} multiline placeholder="VD: Đáp án đúng bị sai, đề bài mơ hồ..." /> : null}
          {msg ? (msg.ok ? <Note>{msg.t}</Note> : <Err>{msg.t}</Err>) : null}
          <Button title="Báo lỗi (0★)" icon="flag" variant="danger" disabled={!qid || !reason.trim()} loading={busy} onPress={send} />
        </>
      )}
    </GameShell>
  );
}

/** Minigame 6 – Dự đoán câu do LLM tạo (≥7 câu, mỗi người một lần mỗi phiên chơi). */
export function Mg6() {
  const { data, loading, error, reload } = useLoad(getLlmRound);
  const [pick, setPick] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; t: string }>();
  const toggle = (id: string) => setPick((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const send = async () => {
    setBusy(true); setMsg(undefined);
    try { await submitLlmGuess(data!.roundId, pick); setMsg({ ok: true, t: 'Đã nộp! Đúng hết và sớm nhất sẽ được cộng điểm.' }); reload(); }
    catch (e) { setMsg({ ok: false, t: (e as Error).message }); } finally { setBusy(false); }
  };
  const done = data?.submitted;
  return (
    <GameShell no={6} title="Đâu là câu của LLM?" icon="hardware-chip" reward="Đúng hết & sớm nhất → cộng điểm"
      rule="Bạn thấy tối thiểu 7 câu hỏi và đoán câu nào do LLM tạo ra. Trả lời đúng hết và sớm nhất sẽ được cộng điểm. Mỗi bạn chỉ được trả lời một lần cho một phiên chơi.">
      {loading && !data ? <Loading /> : error ? <ErrorBox message={error} onRetry={reload} /> : (
        <>
          <Muted>Chạm để đánh dấu những câu bạn cho là do LLM tạo ({pick.length} đã chọn)</Muted>
          {data?.questions.map((q, i) => {
            const on = pick.includes(q.id);
            return (
              <Pressable key={q.id} disabled={done} onPress={() => toggle(q.id)}>
                <Row style={{ flexWrap: 'nowrap', padding: 10, borderRadius: 14, backgroundColor: on ? colors.primarySoft : 'rgba(255,255,255,0.5)', borderWidth: 1, borderColor: on ? colors.primary : 'rgba(255,255,255,0.9)' }}>
                  <Ionicons name={on ? 'hardware-chip' : 'hardware-chip-outline'} size={22} color={on ? colors.primary : colors.muted} />
                  <Text style={{ flex: 1, color: colors.text }}>{i + 1}. {q.content}</Text>
                </Row>
              </Pressable>
            );
          })}
          {done ? <Note>Bạn đã nộp bài cho phiên chơi này.</Note> : null}
          {msg && !msg.ok ? <Err>{msg.t}</Err> : null}
          <Button title="Nộp đáp án (một lần)" icon="send" disabled={done || !pick.length} loading={busy} onPress={send} />
        </>
      )}
    </GameShell>
  );
}
