import { useState } from 'react';
import { Text, View } from 'react-native';
import { listMyPredictions, submitPrediction } from '@/modules/exam-bank/api/client';
import { colors } from '@/shared/theme';
import { Button, Field, fmtDate, Row } from '@/shared/ui';
import { useLoad } from '@/shared/hooks';
import { GameShell } from './GameShell';

const digits = (t: string) => t.replace(/\D/g, '');

function useSubmit() {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string }>();
  const run = async (fn: () => Promise<{ value: number; targetDate: string }>) => {
    setBusy(true); setMsg(undefined);
    try { const p = await fn(); setMsg({ ok: true, text: `Đã ghi nhận dự đoán ${p.value}. Kết quả chốt ngày ${fmtDate(p.targetDate)}.` }); }
    catch (e) { setMsg({ ok: false, text: (e as Error).message }); } finally { setBusy(false); }
  };
  return { busy, msg, run, clear: () => setMsg(undefined) };
}
const Msg = ({ m }: { m?: { ok: boolean; text: string } }) => m ? <Text style={{ color: m.ok ? colors.success : colors.danger, fontWeight: '600' }}>{m.text}</Text> : null;

/** Minigame 1 – Đoán số lượng người tham gia đề xuất (sai số ±5%). API 28. */
export function Mg1({ onClose }: { onClose?: () => void }) {
  const [v, setV] = useState('');
  const { busy, msg, run, clear } = useSubmit();
  return (
    <GameShell onClose={onClose} color="#4472C4" no={1} title="Đoán số lượng" icon="people" reward="Đúng (±5%) → nhận điểm thưởng"
      rule="Dự đoán số sinh viên tham gia đề xuất câu hỏi trong khung thời gian của đợt. Nếu sai số trong ±5% bạn nhận điểm thưởng.">
      <Field label="Số người tham gia dự đoán" value={v} onChangeText={(t) => { setV(digits(t)); clear(); }} keyboardType="number-pad" placeholder="VD: 120" />
      <Msg m={msg} />
      <Button title="Gửi dự đoán" icon="flash" disabled={!v} loading={busy} onPress={() => run(() => submitPrediction('participants', +v))} />
    </GameShell>
  );
}

/** Minigame 2 – Đoán số câu hỏi của mình được GV chọn, chia theo nhóm Tự làm / AI. API 29. */
export function Mg2({ onClose }: { onClose?: () => void }) {
  const [self, setSelf] = useState('');
  const [ai, setAi] = useState('');
  const { busy, msg, run, clear } = useSubmit();
  return (
    <GameShell onClose={onClose} color="#1E8E4E" no={2} title="Đoán tỷ lệ duyệt" icon="checkmark-done" reward="Đoán chính xác → cộng điểm"
      rule="Dự đoán chính xác số câu hỏi của chính bạn được giảng viên chọn, tách theo hai nhóm: Tự làm và AI tạo.">
      <Row style={{ flexWrap: 'nowrap' }}>
        <View style={{ flex: 1 }}><Field label="✍️ Nhóm Tự làm" value={self} onChangeText={(t) => { setSelf(digits(t)); clear(); }} keyboardType="number-pad" placeholder="0" /></View>
        <View style={{ flex: 1 }}><Field label="🤖 Nhóm AI tạo" value={ai} onChangeText={(t) => { setAi(digits(t)); clear(); }} keyboardType="number-pad" placeholder="0" /></View>
      </Row>
      <Msg m={msg} />
      <Button title="Gửi dự đoán" icon="flash" disabled={!self || !ai} loading={busy} onPress={() => run(() => submitPrediction('approved-questions', +self + +ai, { self: +self, ai: +ai }))} />
    </GameShell>
  );
}

/** Minigame 4 – Đoán số câu hỏi trong ngân hàng đề; chỉ 3 người chính xác & sớm nhất, mỗi người đoán một lần. API 30. */
export function Mg4({ onClose }: { onClose?: () => void }) {
  const [v, setV] = useState('');
  const { busy, msg, run, clear } = useSubmit();
  const { data, reload } = useLoad(listMyPredictions);
  const done = !!data?.some((p) => p.type === 'bank-size');
  return (
    <GameShell onClose={onClose} color="#B26A00" no={4} title="Đoán quy mô ngân hàng đề" icon="library" reward="Top 3 chính xác & sớm nhất được cộng"
      rule="Dự đoán số câu hỏi có trong ngân hàng đề của môn học. Chỉ 3 người chính xác nhất và sớm nhất được cộng điểm. Mỗi người chỉ được đoán MỘT lần.">
      <Field label="Số câu trong ngân hàng" value={v} onChangeText={(t) => { setV(digits(t)); clear(); }} keyboardType="number-pad" placeholder="VD: 500" editable={!done} />
      <Msg m={done && !msg ? { ok: false, text: 'Bạn đã dùng lượt dự đoán của mình.' } : msg} />
      <Button title="Gửi dự đoán (một lần)" icon="flash" disabled={!v || done} loading={busy} onPress={async () => { await run(() => submitPrediction('bank-size', +v)); reload(); }} />
    </GameShell>
  );
}
