import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Platform } from 'react-native';
import { getMySubmission, proposeSession, updateMySubmission } from '@/modules/exam-bank/api/client';
import type { QuestionDraft } from '@/modules/exam-bank/api/types';
import { emptyDraft, QuestionEditor, validateDraft } from '@/modules/exam-bank/components/QuestionEditor';
import { Button, Card, Chip, ErrorBox, Field, H2, Header, Loading, Muted, Row, Screen } from '@/shared/ui';
import { SUBJECTS } from '@/modules/exam-bank/constants';
import { colors } from '@/shared/theme';

const notify = (m: string) => (Platform.OS === 'web' ? window.alert(m) : Alert.alert('Thông báo', m));

/** Dùng chung cho đề xuất mới (API 11) và chỉnh sửa phiên (API 14, khi `id` có giá trị). */
export default function SubmissionForm() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState(SUBJECTS[0]);
  const [qs, setQs] = useState<QuestionDraft[]>([emptyDraft()]);
  const [loading, setLoading] = useState(!!id);
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [honest, setHonest] = useState(false);
  const [showErrors, setShowErrors] = useState(false);

  useEffect(() => {
    if (!id) return;
    getMySubmission(id).then((s) => {
      setTitle(s.title); setSubject(s.subject);
      setQs(s.questions.map(({ source, content, options, correctIndex, explanation, topic, difficulty }) => ({ source: source ?? 'self', content, options, correctIndex, explanation, topic, difficulty })));
    }).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, [id]);

  const submit = async () => {
    setShowErrors(true);
    if (!honest) return notify('Vui lòng xác nhận cam kết khai báo trung thực nguồn gốc câu hỏi.');
    if (!title.trim() || qs.some((q) => validateDraft(q))) return notify('Vui lòng điền đầy đủ thông tin các câu hỏi.');
    setBusy(true);
    try {
      const body = { title: title.trim(), subject, questions: qs };
      if (id) await updateMySubmission(id, body); else await proposeSession(body);
      notify(id ? 'Đã cập nhật và gửi lại để duyệt.' : 'Đã gửi đề xuất, vui lòng chờ giảng viên duyệt.');
      router.back();
    } catch (e) { notify((e as Error).message); } finally { setBusy(false); }
  };

  if (loading) return <><Header title="Chỉnh sửa" /><Loading /></>;
  return (
    <Screen footer={<Button title={id ? 'Lưu & gửi lại' : 'Gửi đề xuất'} icon="send" loading={busy} onPress={submit} />}>
      <Header title={id ? 'Chỉnh sửa phiên gửi' : 'Đề xuất câu hỏi'} />
      {error ? <ErrorBox message={error} /> : null}
      <Card>
        <Field label="Tiêu đề phiên" value={title} onChangeText={setTitle} placeholder="VD: Ôn tập chương 3" error={showErrors && !title.trim() ? 'Bắt buộc' : undefined} />
        <Muted>Môn học</Muted>
        <Row>{SUBJECTS.map((s) => <Chip key={s} label={s} active={subject === s} onPress={() => setSubject(s)} />)}</Row>
      </Card>
      {qs.map((q, i) => (
        <Card key={i}>
          <Row style={{ justifyContent: 'space-between' }}>
            <H2>Câu hỏi {i + 1}</H2>
            {qs.length > 1 ? <Ionicons name="trash-outline" size={22} color={colors.danger} onPress={() => setQs(qs.filter((_, k) => k !== i))} /> : null}
          </Row>
          <QuestionEditor showSource value={q} showErrors={showErrors} onChange={(d) => setQs(qs.map((x, k) => (k === i ? d : x)))} />
        </Card>
      ))}
      <Card onPress={() => setHonest(!honest)}>
        <Row style={{ flexWrap: 'nowrap' }}>
          <Ionicons name={honest ? 'checkbox' : 'square-outline'} size={26} color={honest ? colors.primary : colors.muted} />
          <Muted>Tôi cam kết đã khai báo trung thực nguồn gốc (tự làm hoặc AI tạo) của từng câu hỏi.</Muted>
        </Row>
      </Card>
      <Button title="Thêm câu hỏi" icon="add-circle-outline" variant="outline" onPress={() => setQs([...qs, emptyDraft()])} />
    </Screen>
  );
}
