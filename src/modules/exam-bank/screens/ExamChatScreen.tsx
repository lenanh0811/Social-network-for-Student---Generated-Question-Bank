import { Ionicons } from '@expo/vector-icons';
import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View, type ScrollViewInstance } from 'react-native';
import { generateExam, listBankTopics } from '@/modules/exam-bank/api/client';
import type { Exam, ExamParams } from '@/modules/exam-bank/api/types';
import { SUBJECTS } from '@/modules/exam-bank/constants';
import { colors, glass } from '@/shared/theme';
import { Button, Chip, Glass, GlassBackdrop, go, Header, Muted, Row } from '@/shared/ui';

interface Msg { id: string; from: 'lecturer' | 'ai'; text: string; exam?: Exam }
const QUICK = ['Tạo đề 10 câu môn Công nghệ Web, mức trung bình', 'Đề 15 câu Cơ sở dữ liệu, nâng cao, 45 phút', 'Đề cơ bản 8 câu Mạng máy tính', 'Đổi thành 12 câu'];
const MIX = { dễ: [70, 25, 5], khó: [15, 45, 40], cân: [40, 40, 20] } as const;
let n = 0;

/** Phần "AI" tạm thời: tự diễn giải yêu cầu tiếng Việt thành tham số. TODO backend: gửi `prompt` lên API 34 để LLM diễn giải. */
async function interpret(prompt: string, prev: ExamParams | undefined): Promise<ExamParams> {
  const low = prompt.toLowerCase();
  const subject = SUBJECTS.find((s) => low.includes(s.toLowerCase())) ?? prev?.subject ?? SUBJECTS[0];
  const count = +(low.match(/(\d+)\s*câu/)?.[1] ?? prev?.count ?? 10);
  const durationMin = +(low.match(/(\d+)\s*phút/)?.[1] ?? prev?.durationMin ?? 30);
  const mixKey = /cơ bản|\bdễ\b/.test(low) ? 'dễ' : /nâng cao|\bkhó\b/.test(low) ? 'khó' : /trung bình|cân bằng/.test(low) ? 'cân' : undefined;
  const [easy, medium, hard] = mixKey ? MIX[mixKey] : prev ? [prev.mix.easy, prev.mix.medium, prev.mix.hard] : MIX.cân;
  const bank = await listBankTopics(subject);
  const topics = bank.filter((t) => low.includes(t.toLowerCase()));
  const targeted = !!mixKey || topics.length > 0 || prev?.mode === 'targeted';
  return {
    mode: targeted ? 'targeted' : 'random', topics: topics.length ? topics : prev?.topics, prompt,
    title: `Đề AI – ${subject}`, subject, count, durationMin, mix: { easy, medium, hard },
  };
}

/** Giảng viên tạo đề thi bằng cách chat với AI. Mỗi tin nhắn có thể điều chỉnh đề (API 34). */
export default function ExamChat() {
  const [msgs, setMsgs] = useState<Msg[]>([{ id: 'hi', from: 'ai', text: 'Xin chào! Hãy mô tả đề thi bạn cần: môn học, số câu, độ khó, chủ đề, thời gian. VD: “Tạo đề 10 câu Công nghệ Web về REST, mức khó, 30 phút”. Sau đó bạn có thể nhắn tiếp để chỉnh, ví dụ “đổi thành 15 câu”.' }]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const last = useRef<ExamParams>(undefined);
  const scroll = useRef<ScrollViewInstance>(null);
  const end = () => setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 60);

  const send = async (t = text) => {
    const msg = t.trim();
    if (!msg || busy) return;
    setText(''); setBusy(true);
    setMsgs((m) => [...m, { id: `u${++n}`, from: 'lecturer', text: msg }]); end();
    try {
      const params = await interpret(msg, last.current);
      const exam = await generateExam(params);
      last.current = params;
      const how = params.mode === 'random' ? 'bốc ngẫu nhiên' : `có chủ đích${params.topics?.length ? ` (chủ đề: ${params.topics.join(', ')})` : ''}, dễ ${params.mix.easy}% · TB ${params.mix.medium}% · khó ${params.mix.hard}%`;
      const short = exam.questions.length < params.count ? ` Ngân hàng hiện chỉ có ${exam.questions.length}/${params.count} câu phù hợp.` : '';
      setMsgs((m) => [...m, { id: `a${++n}`, from: 'ai', exam, text: `Đã tạo đề gồm ${exam.questions.length} câu môn ${params.subject}, ${params.durationMin} phút, ${how}.${short}` }]);
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
                    <Row style={{ gap: 6 }}><Ionicons name="sparkles" size={16} color={colors.accent} /><Text style={{ fontWeight: '700', color: colors.text }}>AI</Text></Row>
                    <Text style={{ color: colors.text }}>{m.text}</Text>
                    {m.exam ? (
                      <View style={{ backgroundColor: 'rgba(255,255,255,0.8)', borderRadius: 14, padding: 10, gap: 6, borderWidth: 1, borderColor: glass.edge }}>
                        <Text style={{ fontWeight: '700', color: colors.text }}>{m.exam.title}</Text>
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
