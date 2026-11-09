import { Ionicons } from '@expo/vector-icons';
import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View, type ScrollViewInstance } from 'react-native';
import { generateExam, listLecturerClasses } from '@/modules/exam-bank/api/client';
import type { DifficultyMix, Exam, ExamParams, LecturerClass } from '@/modules/exam-bank/api/types';
import { colors, glass } from '@/theme';
import { Button } from '@/components/button';
import { Chip } from '@/components/chip';
import { Glass } from '@/components/glass';
import { GlassBackdrop } from '@/components/glass-backdrop';
import { go } from '@/utils/navigation';
import { Header } from '@/components/header';
import { Muted } from '@/components/muted';
import { Row } from '@/components/row';

interface Msg { id: string; from: 'lecturer' | 'ai'; text: string; exam?: Exam }
const QUICK = ['Tạo đề 10 câu, mức trung bình', 'Đề 15 câu, nâng cao', 'Đề cơ bản 8 câu', 'Đổi thành 12 câu'];
const MIX: Record<'dễ' | 'khó' | 'cân', DifficultyMix> = {
  dễ: { easy: 0.7, medium: 0.25, hard: 0.05 }, khó: { easy: 0.15, medium: 0.45, hard: 0.4 }, cân: { easy: 0.4, medium: 0.4, hard: 0.2 },
};
let n = 0;

/**
 * Phần "AI" tạm thời: tự đọc yêu cầu tiếng Việt (số câu, môn, độ khó) thành tham số cho API 34.
 * Môn học và lớp lấy từ các lớp giảng viên đang phụ trách (backend bắt buộc có môn và lớp áp dụng).
 */
function interpret(prompt: string, prev: ExamParams | undefined, classes: LecturerClass[]): { params: ExamParams; subjectName: string } {
  const low = prompt.toLowerCase();
  const subjects = classes.filter((c, i) => classes.findIndex((x) => x.subjectId === c.subjectId) === i);
  const named = subjects.find((s) => low.includes(s.subjectName.toLowerCase()));
  const subject = named ?? subjects.find((s) => s.subjectId === prev?.subjectId) ?? (subjects.length === 1 ? subjects[0] : undefined);
  if (!subject) throw new Error(`Bạn muốn tạo đề cho môn nào? Các môn bạn phụ trách: ${subjects.map((s) => s.subjectName).join(', ')}.`);
  const count = +(low.match(/(\d+)\s*câu/)?.[1] ?? prev?.count ?? 10);
  const mixKey = /cơ bản|\bdễ\b/.test(low) ? 'dễ' : /nâng cao|\bkhó\b/.test(low) ? 'khó' : /trung bình|cân bằng/.test(low) ? 'cân' : undefined;
  return {
    subjectName: subject.subjectName,
    params: {
      title: `Đề AI – ${subject.subjectName}`, subjectId: subject.subjectId, classIds: classes.filter((c) => c.subjectId === subject.subjectId).map((c) => c.id),
      count, difficulty: mixKey ? MIX[mixKey] : prev?.difficulty,
    },
  };
}

/** Giảng viên tạo đề thi bằng cách chat với AI. Mỗi tin nhắn có thể điều chỉnh đề (API 34). */
export default function ExamChat() {
  const [msgs, setMsgs] = useState<Msg[]>([{ id: 'hi', from: 'ai', text: 'Xin chào! Hãy mô tả đề thi bạn cần: môn học, số câu, độ khó. VD: “Tạo đề 10 câu môn Công nghệ Web, mức khó”. Sau đó bạn có thể nhắn tiếp để chỉnh, ví dụ “đổi thành 15 câu”. Đề được bốc từ các câu đã duyệt và áp dụng cho các lớp bạn phụ trách của môn đó.' }]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const last = useRef<ExamParams>(undefined);
  const myClasses = useRef<LecturerClass[]>(undefined);
  const scroll = useRef<ScrollViewInstance>(null);
  const end = () => setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 60);

  const send = async (t = text) => {
    const msg = t.trim();
    if (!msg || busy) return;
    setText(''); setBusy(true);
    setMsgs((m) => [...m, { id: `u${++n}`, from: 'lecturer', text: msg }]); end();
    try {
      myClasses.current ??= await listLecturerClasses();
      const { params, subjectName } = interpret(msg, last.current, myClasses.current);
      const exam = await generateExam(params);
      last.current = params;
      const d = params.difficulty;
      const how = d ? `dễ ${Math.round(d.easy * 100)}% · TB ${Math.round(d.medium * 100)}% · khó ${Math.round(d.hard * 100)}%` : 'bốc ngẫu nhiên';
      const short = exam.questionCount < params.count ? ` Ngân hàng hiện chỉ có ${exam.questionCount}/${params.count} câu phù hợp.` : '';
      setMsgs((m) => [...m, { id: `a${++n}`, from: 'ai', exam, text: `Đã tạo đề gồm ${exam.questionCount} câu môn ${subjectName}, áp dụng cho ${params.classIds.length} lớp, ${how}.${short}` }]);
    } catch (e) {
      setMsgs((m) => [...m, { id: `a${++n}`, from: 'ai', text: `Chưa tạo được đề: ${(e as Error).message}` }]);
    } finally { setBusy(false); end(); }
  };

  return (
    <GlassBackdrop>
      <Header title="Tạo đề với AI" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView ref={scroll} contentContainerStyle={{ padding: 16, paddingTop: (Platform.OS === 'web' ? 72 : 108) + 8, gap: 12, alignItems: 'center' }}>
          <View style={{ width: '100%', maxWidth: 720, gap: 12 }}>
            {msgs.map((m) => (
              <View key={m.id} style={{ alignItems: m.from === 'lecturer' ? 'flex-end' : 'flex-start' }}>
                {m.from === 'lecturer' ? (
                  <View style={{ maxWidth: '88%', backgroundColor: colors.primary, borderRadius: 20, borderBottomRightRadius: 6, paddingVertical: 10, paddingHorizontal: 14 }}><Text style={{ color: '#fff' }}>{m.text}</Text></View>
                ) : (
                  <Glass strong style={{ maxWidth: '92%', borderRadius: 20, borderBottomLeftRadius: 6, padding: 12, gap: 8 }}>
                    <Row style={{ gap: 6 }}><Ionicons name="sparkles" size={16} color={colors.accent} /><Text style={{ fontWeight: '600', color: colors.text }}>AI</Text></Row>
                    <Text style={{ color: colors.text }}>{m.text}</Text>
                    {m.exam ? (
                      <View style={{ backgroundColor: 'rgba(255,255,255,0.8)', borderRadius: 14, padding: 10, gap: 6, borderWidth: 1, borderColor: glass.edge }}>
                        <Text style={{ fontWeight: '600', color: colors.text }}>{m.exam.title}</Text>
                        {m.exam.questions.slice(0, 4).map((q, i) => <Text key={q.id} numberOfLines={1} style={{ color: colors.text }}>{i + 1}. {q.content}</Text>)}
                        {m.exam.questions.length > 4 ? <Muted>… và {m.exam.questions.length - 4} câu nữa</Muted> : null}
                        <Row>
                          <Button small icon="eye" title="Xem & xuất đề" onPress={() => go(`/exam-bank/exam/${m.exam!.id}`)} />
                        </Row>
                        <Muted>Đề đã được lưu. Nhắn tiếp để tạo bản điều chỉnh khác.</Muted>
                      </View>
                    ) : null}
                  </Glass>
                )}
              </View>
            ))}
            {busy ? <Muted>AI đang tạo đề…</Muted> : null}
          </View>
        </ScrollView>
        <Glass strong style={{ margin: 10, borderRadius: 28, padding: 8, gap: 8, alignSelf: 'center', width: '100%', maxWidth: 720 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 4 }}>
            {QUICK.map((q) => <Chip key={q} label={q} onPress={() => send(q)} />)}
            <Chip label="📝 Tạo bằng form" onPress={() => go('/exam-bank/exam/generate')} />
          </ScrollView>
          <Row style={{ flexWrap: 'nowrap' }}>
            <TextInput value={text} onChangeText={setText} onSubmitEditing={() => send()} placeholder="Mô tả đề thi bạn muốn tạo…" placeholderTextColor={colors.muted}
              style={[{ flex: 1, height: 44, paddingHorizontal: 16, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.8)', color: colors.text }, Platform.OS === 'web' && ({ outlineStyle: 'none' } as object)]} />
            <Pressable onPress={() => send()} disabled={!text.trim() || busy} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', opacity: !text.trim() || busy ? 0.45 : 1 }}>
              <Ionicons name="arrow-up" size={22} color="#fff" />
            </Pressable>
          </Row>
        </Glass>
      </KeyboardAvoidingView>
    </GlassBackdrop>
  );
}
