import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View, type ScrollViewInstance } from 'react-native';
import { aiApply, aiRefine, getCachedQuestion } from '@/modules/exam-bank/api/client';
import type { AiSuggestion, ChatMessage } from '@/modules/exam-bank/api/types';
import { LETTERS } from '@/modules/exam-bank/components/question-card';
import { colors, glass } from '@/theme';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Chip } from '@/components/chip';
import { ErrorBox } from '@/components/error-box';
import { GlassBackdrop } from '@/components/glass-backdrop';
import { Glass } from '@/components/glass';
import { Header } from '@/components/header';
import { Muted } from '@/components/muted';
import { Row } from '@/components/row';

const QUICK = ['Diễn đạt rõ ràng, súc tích hơn', 'Làm câu hỏi khó hơn', 'Sửa lỗi chính tả & ngữ pháp', 'Viết lại các đáp án gây nhiễu', 'Thêm giải thích đáp án'];
let mid = 0;

/** GV chat trực tiếp với AI (LLM) để chỉnh sửa / cải thiện văn phong câu hỏi. API 26 (refine) · API 27 (apply). */
export default function QuestionAi() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [, bump] = useState(0);
  useFocusEffect(useCallback(() => bump((n) => n + 1), []));
  const q = getCachedQuestion(id);
  const [msgs, setMsgs] = useState<ChatMessage[]>([{ id: 'hello', from: 'ai', text: 'Xin chào! Hãy cho tôi biết bạn muốn chỉnh câu hỏi này thế nào — tôi sẽ đề xuất một phiên bản mới để bạn xem trước.' }]);
  const [text, setText] = useState('');
  const [thinking, setThinking] = useState(false);
  const [applying, setApplying] = useState<string>();
  const scroll = useRef<ScrollViewInstance>(null);
  if (!q) return <GlassBackdrop><Header title="Chat với AI" /><View style={{ padding: 90 }}><ErrorBox message="Không có dữ liệu câu hỏi." /></View></GlassBackdrop>;

  const send = async (t = text) => {
    const msg = t.trim();
    if (!msg || thinking) return;
    setText(''); setThinking(true);
    setMsgs((m) => [...m, { id: `m${++mid}`, from: 'lecturer', text: msg }]);
    try {
      const s = await aiRefine(id, msg);
      setMsgs((m) => [...m, { id: `m${++mid}`, from: 'ai', text: s.notes, suggestion: s }]);
    } catch (e) {
      setMsgs((m) => [...m, { id: `m${++mid}`, from: 'ai', text: `Xin lỗi, có lỗi: ${(e as Error).message}` }]);
    } finally { setThinking(false); setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 50); }
  };
  const apply = async (mId: string, s: AiSuggestion) => {
    setApplying(mId);
    try { await aiApply(id, s); setMsgs((m) => m.map((x) => (x.id === mId ? { ...x, applied: true } : x))); bump((n) => n + 1); } finally { setApplying(undefined); }
  };

  return (
    <GlassBackdrop>
      <Header title="Chat với AI" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView ref={scroll} contentContainerStyle={{ padding: 16, paddingTop: (Platform.OS === 'web' ? 72 : 108) + 8, gap: 12, alignItems: 'center' }} onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: true })}>
          <View style={{ width: '100%', maxWidth: 720, gap: 12 }}>
            <Card>
              <Muted>Câu hỏi hiện tại</Muted>
              <Text style={{ fontWeight: '600', fontSize: 15, color: colors.text }}>{q.content}</Text>
              {q.options.map((o, i) => <Text key={i} style={{ color: i === q.correctIndex ? colors.success : colors.text }}>{LETTERS[i]}. {o}{i === q.correctIndex ? '  ✓' : ''}</Text>)}
              {q.explanation ? <Muted>Giải thích: {q.explanation}</Muted> : null}
            </Card>
            {msgs.map((m) => (
              <View key={m.id} style={{ alignItems: m.from === 'lecturer' ? 'flex-end' : 'flex-start' }}>
                <View style={{ maxWidth: '88%', gap: 8 }}>
                  {m.from === 'lecturer' ? (
                    <View style={{ backgroundColor: colors.primary, borderRadius: 20, borderBottomRightRadius: 6, paddingVertical: 10, paddingHorizontal: 14 }}><Text style={{ color: '#fff' }}>{m.text}</Text></View>
                  ) : (
                    <Glass strong style={{ borderRadius: 20, borderBottomLeftRadius: 6, padding: 12, gap: 8 }}>
                      <Row style={{ gap: 6 }}><Ionicons name="sparkles" size={16} color={colors.accent} /><Text style={{ fontWeight: '600', color: colors.text }}>AI</Text></Row>
                      <Text style={{ color: colors.text }}>{m.text}</Text>
                      {m.suggestion ? (
                        <View style={{ backgroundColor: 'rgba(255,255,255,0.8)', borderRadius: 14, padding: 10, gap: 4, borderWidth: 1, borderColor: glass.edge }}>
                          <Text style={{ fontWeight: '600', color: colors.text }}>{m.suggestion.content}</Text>
                          {m.suggestion.options.map((o, i) => <Text key={i} style={{ color: i === m.suggestion!.correctIndex ? colors.success : colors.text }}>{LETTERS[i]}. {o}</Text>)}
                          {m.suggestion.explanation ? <Muted>Giải thích: {m.suggestion.explanation}</Muted> : null}
                          {m.applied ? <Text style={{ color: colors.success, fontWeight: '600' }}>✓ Đã áp dụng vào câu hỏi</Text>
                            : <Button small title="Áp dụng phiên bản này" icon="checkmark" variant="success" loading={applying === m.id} onPress={() => apply(m.id, m.suggestion!)} />}
                        </View>
                      ) : null}
                    </Glass>
                  )}
                </View>
              </View>
            ))}
            {thinking ? <Muted>AI đang soạn câu trả lời…</Muted> : null}
          </View>
        </ScrollView>
        <Glass strong style={{ margin: 10, borderRadius: 28, padding: 8, gap: 8, alignSelf: 'center', width: '100%', maxWidth: 720 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 4 }}>
            {QUICK.map((qk) => <Chip key={qk} label={qk} onPress={() => send(qk)} />)}
          </ScrollView>
          <Row style={{ flexWrap: 'nowrap' }}>
            <TextInput value={text} onChangeText={setText} onSubmitEditing={() => send()} placeholder="Nhắn cho AI: “Viết lại cho dễ hiểu hơn...”" placeholderTextColor={colors.muted}
              style={[{ flex: 1, height: 44, paddingHorizontal: 16, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.8)', color: colors.text }, Platform.OS === 'web' && ({ outlineStyle: 'none' } as object)]} />
            <Pressable onPress={() => send()} disabled={!text.trim() || thinking} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', opacity: !text.trim() || thinking ? 0.45 : 1 }}>
              <Ionicons name="arrow-up" size={22} color="#fff" />
            </Pressable>
          </Row>
        </Glass>
      </KeyboardAvoidingView>
    </GlassBackdrop>
  );
}
