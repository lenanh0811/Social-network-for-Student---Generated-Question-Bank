import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { listGame1Classes, listMySubmissions, listSubjects, placeGame1, placeGame2, placeGame4 } from '@/modules/exam-bank/api/client';
import { questionCountOf } from '@/modules/exam-bank/api/types';
import { GameShell } from './game-shell';
import { GAME_META } from './meta';
import { useLoad } from '@/hooks/use-load';
import { colors } from '@/theme';
import { Badge } from '@/components/badge';
import { Button } from '@/components/button';
import { Chip } from '@/components/chip';
import { ErrorBox } from '@/components/error-box';
import { Field } from '@/components/field';
import { Loading } from '@/components/loading';
import { Muted } from '@/components/muted';
import { Row } from '@/components/row';

const digits = (t: string) => t.replace(/\D/g, '');
type Msg = { ok: boolean; text: string } | undefined;
const MsgText = ({ m }: { m: Msg }) => (m ? <Text style={{ color: m.ok ? colors.success : colors.danger, fontWeight: '600' }}>{m.text}</Text> : null);

function useSubmit() {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<Msg>();
  const run = async (fn: () => Promise<unknown>, okText: string) => {
    setBusy(true); setMsg(undefined);
    try { await fn(); setMsg({ ok: true, text: okText }); return true; }
    catch (e) { setMsg({ ok: false, text: (e as Error).message }); return false; } finally { setBusy(false); }
  };
  return { busy, msg, run, clear: () => setMsg(undefined) };
}
const meta = (g: keyof typeof GAME_META) => GAME_META[g];

/** Game 1 – chọn lớp học phần, đoán số sinh viên sẽ đề xuất câu hỏi vào ngày mai (chốt cược trước 22:00). API 28. */
export function Mg1({ onClose }: { onClose?: () => void }) {
  const { data, loading, error, reload } = useLoad(listGame1Classes);
  const [cls, setCls] = useState<string>();
  const [v, setV] = useState('');
  const { busy, msg, run, clear } = useSubmit();
  const m = meta('GAME_1_PARTICIPANTS');
  return (
    <GameShell onClose={onClose} color={m.color} no={m.no} title={m.title} icon={m.icon} reward="Đoán đúng → nhận điểm"
      rule="Chọn một lớp học phần và dự đoán số sinh viên trong lớp sẽ đề xuất câu hỏi vào ngày mai. Chốt cược trước 22:00 mỗi ngày, mỗi lớp đặt một lần.">
      {loading && !data ? <Loading /> : error ? <ErrorBox message={error} onRetry={reload} /> : !data?.length ? <Muted>Bạn chưa có lớp học phần nào để đặt cược.</Muted> : (
        <>
          {data.map((c) => (
            <Pressable key={c.classId} disabled={c.alreadyPredicted} onPress={() => { setCls(c.classId); clear(); }} style={{ opacity: c.alreadyPredicted ? 0.6 : 1 }}>
              <Row style={{ flexWrap: 'nowrap', padding: 10, borderRadius: 14, backgroundColor: cls === c.classId ? colors.primarySoft : 'rgba(255,255,255,0.5)', borderWidth: 1, borderColor: cls === c.classId ? colors.primary : 'rgba(255,255,255,0.9)' }}>
                <Ionicons name={cls === c.classId ? 'radio-button-on' : 'radio-button-off'} size={22} color={cls === c.classId ? colors.primary : colors.muted} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: '600', color: colors.text }}>{c.subjectName} · {c.classCode}</Text>
                  <Muted>{c.lecturerName} · {c.semester}</Muted>
                </View>
                {c.alreadyPredicted ? <Badge label={`Đã đoán: ${c.predictedCount ?? '–'}`} fg={colors.success} bg={colors.successSoft} /> : null}
              </Row>
            </Pressable>
          ))}
          <Field label="Số sinh viên dự đoán" value={v} onChangeText={(t) => { setV(digits(t)); clear(); }} keyboardType="number-pad" placeholder="VD: 12" />
          <MsgText m={msg} />
          <Button title="Gửi dự đoán" icon="flash" disabled={!cls || !v} loading={busy} onPress={async () => { if (await run(() => placeGame1(cls!, +v), 'Đã ghi nhận dự đoán của bạn!')) { setV(''); reload(); } }} />
        </>
      )}
    </GameShell>
  );
}

/** Game 2 – chọn phiên của mình, đoán số câu do AI / do người viết sẽ được duyệt. API 29. */
export function Mg2({ onClose }: { onClose?: () => void }) {
  const { data, loading, error, reload } = useLoad(() => listMySubmissions());
  const [sid, setSid] = useState<string>();
  const [llm, setLlm] = useState('');
  const [human, setHuman] = useState('');
  const { busy, msg, run, clear } = useSubmit();
  const m = meta('GAME_2_APPROVED_QUESTIONS');
  const s = data?.find((x) => x.id === sid);
  return (
    <GameShell onClose={onClose} color={m.color} no={m.no} title={m.title} icon={m.icon} reward="Đoán chính xác → cộng điểm"
      rule="Chọn một phiên bạn đã đề xuất và dự đoán số câu hỏi do AI tạo và số câu do bạn tự làm sẽ được giảng viên duyệt vào ngân hàng đề.">
      {loading && !data ? <Loading /> : error ? <ErrorBox message={error} onRetry={reload} /> : !data?.length ? <Muted>Bạn chưa có phiên đề xuất nào.</Muted> : (
        <>
          <Row>{data.map((x) => <Chip key={x.id} label={`${x.title} (${questionCountOf(x)} câu)`} active={sid === x.id} onPress={() => { setSid(x.id); clear(); }} />)}</Row>
          {s ? (
            <>
              <Row style={{ flexWrap: 'nowrap' }}>
                <View style={{ flex: 1 }}><Field label="🤖 Câu do AI được duyệt" value={llm} onChangeText={(t) => { setLlm(digits(t)); clear(); }} keyboardType="number-pad" placeholder="0" /></View>
                <View style={{ flex: 1 }}><Field label="✍️ Câu tự làm được duyệt" value={human} onChangeText={(t) => { setHuman(digits(t)); clear(); }} keyboardType="number-pad" placeholder="0" /></View>
              </Row>
              <MsgText m={msg} />
              <Button title="Gửi dự đoán" icon="flash" disabled={!llm || !human} loading={busy} onPress={() => run(() => placeGame2(s.id, +llm, +human), 'Đã ghi nhận dự đoán của bạn!')} />
            </>
          ) : null}
        </>
      )}
    </GameShell>
  );
}

/** Game 4 – chọn môn học, đoán tổng quy mô ngân hàng câu hỏi cuối kỳ (top 3 chính xác nhất). API 30. */
export function Mg4({ onClose }: { onClose?: () => void }) {
  const { data, loading, error, reload } = useLoad(listSubjects);
  const [sub, setSub] = useState<string>();
  const [v, setV] = useState('');
  const { busy, msg, run, clear } = useSubmit();
  const m = meta('GAME_4_SUBJECT_BANK_SIZE');
  return (
    <GameShell onClose={onClose} color={m.color} no={m.no} title={m.title} icon={m.icon} reward="Top 3 chính xác nhất nhận giải lớn"
      rule="Dự đoán tổng số câu hỏi được phê duyệt vào ngân hàng câu hỏi của môn học khi kết thúc học kỳ. Top 3 người đoán chuẩn nhất nhận giải thưởng lớn.">
      {loading && !data ? <Loading /> : error ? <ErrorBox message={error} onRetry={reload} /> : (
        <>
          <Row>{data?.map((x) => <Chip key={x.id} label={`${x.name} (${x.code})`} active={sub === x.id} onPress={() => { setSub(x.id); clear(); }} />)}</Row>
          <Field label="Số câu trong ngân hàng" value={v} onChangeText={(t) => { setV(digits(t)); clear(); }} keyboardType="number-pad" placeholder="VD: 500" />
          <MsgText m={msg} />
          <Button title="Gửi dự đoán" icon="flash" disabled={!sub || !v} loading={busy} onPress={async () => { if (await run(() => placeGame4(sub!, +v), 'Đã ghi nhận dự đoán của bạn!')) setV(''); }} />
        </>
      )}
    </GameShell>
  );
}
