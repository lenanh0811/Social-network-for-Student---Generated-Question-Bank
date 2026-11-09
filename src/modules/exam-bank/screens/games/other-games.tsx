import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { getGame6Round, listReportableQuestions, reportQuestion, submitGame6 } from '@/modules/exam-bank/api/client';
import { LETTERS } from '@/modules/exam-bank/components/question-card';
import { GameShell } from './game-shell';
import { GAME_META } from './meta';
import { isMock } from '@/api/http';
import { useLoad } from '@/hooks/use-load';
import { colors } from '@/theme';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { ErrorBox } from '@/components/error-box';
import { Field } from '@/components/field';
import { Loading } from '@/components/loading';
import { Muted } from '@/components/muted';
import { Row } from '@/components/row';
import { fmtDate } from '@/utils/format-date';

const Note = ({ children }: { children: string }) => <Text style={{ color: colors.success, fontWeight: '600' }}>{children}</Text>;
const Err = ({ children }: { children: string }) => <Text style={{ color: colors.danger, fontWeight: '600' }}>{children}</Text>;

/** Game 3 – không cần thao tác riêng: dùng mức tự tin (0–4) bạn chọn khi đề xuất từng câu hỏi. */
export function Mg3({ onClose }: { onClose?: () => void }) {
  const m = GAME_META.GAME_3_AUTHOR_CONFIDENCE;
  return (
    <GameShell onClose={onClose} color={m.color} no={m.no} title={m.title} icon={m.icon} reward="Tự động tính điểm"
      rule="Khi đề xuất câu hỏi, bạn chọn mức độ tự tin của mình về từng câu (0–4). Trò chơi này dùng chính mức tự tin đó để tính điểm — bạn không cần thao tác thêm ở đây.">
      <Muted>Hãy trung thực khi chọn mức tự tin trong form “Đề xuất câu hỏi”.</Muted>
    </GameShell>
  );
}

/** Game 5 – báo câu lỗi. Backend: báo lỗi = đánh giá câu hỏi với is_error (điểm 0); giảng viên sẽ xác nhận. */
export function Mg5({ onClose }: { onClose?: () => void }) {
  const m = GAME_META.GAME_5_REPORT_ERROR;
  const rule = 'Phát hiện câu hỏi sai đề hoặc sai đáp án? Báo lỗi cho giảng viên thẩm định. Nếu giảng viên xác nhận là lỗi thật, bạn được cộng điểm còn tác giả bị trừ điểm.';
  return (
    <GameShell onClose={onClose} color={m.color} no={m.no} title={m.title} icon={m.icon} reward="Lỗi được xác nhận → cộng điểm" rule={rule}>
      {isMock ? <MockReport /> : (
        <Card style={{ backgroundColor: 'rgba(255,255,255,0.5)' }}>
          <Text style={{ color: colors.text }}>Mở một câu hỏi bất kỳ, vào tab <Text style={{ fontWeight: '600' }}>Đánh giá</Text> rồi bấm <Text style={{ fontWeight: '600' }}>“Báo câu này bị lỗi”</Text> kèm mô tả lỗi.</Text>
        </Card>
      )}
    </GameShell>
  );
}

/** Chỉ ở chế độ demo: danh sách câu để thử báo lỗi ngay trong trò chơi. */
function MockReport() {
  const { data, loading, error, reload } = useLoad(listReportableQuestions);
  const [qid, setQid] = useState<string>();
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; t: string }>();
  const send = async () => {
    setBusy(true); setMsg(undefined);
    try { await reportQuestion(qid!, reason.trim()); setMsg({ ok: true, t: 'Đã gửi báo cáo. Giảng viên sẽ thẩm định.' }); setQid(undefined); setReason(''); }
    catch (e) { setMsg({ ok: false, t: (e as Error).message }); } finally { setBusy(false); }
  };
  if (loading && !data) return <Loading />;
  if (error) return <ErrorBox message={error} onRetry={reload} />;
  return (
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
      <Button title="Báo lỗi" icon="flag" variant="danger" disabled={!qid || !reason.trim()} loading={busy} onPress={send} />
    </>
  );
}

/** Game 6 – phiên mở Thứ 7 hàng tuần: đoán câu nào do LLM tạo (mỗi phiên nộp một lần). */
export function Mg6({ onClose }: { onClose?: () => void }) {
  const m = GAME_META.GAME_6_LLM_IDENTIFICATION;
  const { data, loading, error, reload } = useLoad(getGame6Round);
  const [pick, setPick] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; t: string }>();
  const [done, setDone] = useState(false);
  const toggle = (id: string) => setPick((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const send = async () => {
    setBusy(true); setMsg(undefined);
    try { await submitGame6(data!.sessionId, pick); setDone(true); setMsg({ ok: true, t: 'Đã nộp! Kết quả sẽ được tổng kết sau khi phiên kết thúc.' }); }
    catch (e) { setMsg({ ok: false, t: (e as Error).message }); } finally { setBusy(false); }
  };
  return (
    <GameShell onClose={onClose} color={m.color} no={m.no} title={m.title} icon={m.icon} reward="Đúng hết & nhanh nhất → cộng điểm"
      rule="Phiên chơi mở vào Thứ 7 hàng tuần với 7 câu hỏi. Bạn đoán câu nào do AI (LLM) tạo ra. Mỗi bạn chỉ được nộp một lần cho một phiên.">
      {loading && !data ? <Loading /> : error ? <ErrorBox message={error} onRetry={reload} /> : !data ? (
        <Muted>Hiện chưa có phiên Game 6 nào đang mở. Phiên mở vào Thứ 7 hàng tuần — hãy quay lại sau nhé!</Muted>
      ) : (
        <>
          <Muted>Tuần {data.weekNumber}/{data.year} · kết thúc {fmtDate(data.endTime)}. Chạm để đánh dấu câu bạn cho là do LLM tạo ({pick.length} đã chọn).</Muted>
          {data.questions.map((q, i) => {
            const on = pick.includes(q.id);
            return (
              <Pressable key={q.id} disabled={done} onPress={() => toggle(q.id)}>
                <View style={{ gap: 4, padding: 10, borderRadius: 14, backgroundColor: on ? colors.primarySoft : 'rgba(255,255,255,0.5)', borderWidth: 1, borderColor: on ? colors.primary : 'rgba(255,255,255,0.9)' }}>
                  <Row style={{ flexWrap: 'nowrap' }}>
                    <Ionicons name={on ? 'hardware-chip' : 'hardware-chip-outline'} size={22} color={on ? colors.primary : colors.muted} />
                    <Text style={{ flex: 1, color: colors.text, fontWeight: '600' }}>{i + 1}. {q.content}</Text>
                  </Row>
                  {q.options.map((o, k) => <Text key={k} style={{ color: colors.muted, marginLeft: 30 }}>{LETTERS[k]}. {o}</Text>)}
                </View>
              </Pressable>
            );
          })}
          {msg ? (msg.ok ? <Note>{msg.t}</Note> : <Err>{msg.t}</Err>) : null}
          <Button title="Nộp đáp án (một lần)" icon="send" disabled={done || !pick.length} loading={busy} onPress={send} />
        </>
      )}
    </GameShell>
  );
}
