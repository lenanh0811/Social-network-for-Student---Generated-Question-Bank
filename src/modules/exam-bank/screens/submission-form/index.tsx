import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Platform } from 'react-native';
import { getMySubmission, listMyClasses, proposeSession, updateMySubmission } from '@/modules/exam-bank/api/client';
import type { CourseClassOption, QuestionDraft } from '@/modules/exam-bank/api/types';
import { emptyDraft, QuestionEditor, validateDraft } from '@/modules/exam-bank/components/question-editor';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Chip } from '@/components/chip';
import { ErrorBox } from '@/components/error-box';
import { Field } from '@/components/field';
import { H2 } from '@/components/heading';
import { Header } from '@/components/header';
import { Loading } from '@/components/loading';
import { Muted } from '@/components/muted';
import { Row } from '@/components/row';
import { Screen } from '@/components/screen';
import { colors } from '@/theme';

const notify = (m: string) => (Platform.OS === 'web' ? window.alert(m) : Alert.alert('Thông báo', m));

/** Dùng chung cho đề xuất mới (API 11) và chỉnh sửa phiên (API 14, khi `id` có giá trị). */
export default function SubmissionForm() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [classes, setClasses] = useState<CourseClassOption[]>([]);
  const [classId, setClassId] = useState<string>();
  const [classLabel, setClassLabel] = useState('');
  const [qs, setQs] = useState<QuestionDraft[]>([emptyDraft()]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [honest, setHonest] = useState(false);
  const [showErrors, setShowErrors] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        if (id) {
          const s = await getMySubmission(id);
          setTitle(s.title); setContent(s.content ?? ''); setClassId(s.courseClassId);
          setClassLabel([s.subject, s.className].filter(Boolean).join(' · '));
          setQs(s.questions.map((q) => ({
            id: q.id, source: q.source, confidence: q.confidence ?? 2, content: q.content, options: q.options,
            correctIndex: q.correctIndex, explanation: q.explanation ?? '',
          })));
        } else {
          const list = (await listMyClasses()).filter((c) => c.canPropose);
          setClasses(list);
          setClassId((cur) => cur ?? list.find((c) => c.activeSemester)?.id ?? list[0]?.id);
        }
      } catch (e) { setError((e as Error).message); } finally { setLoading(false); }
    })();
  }, [id]);

  const submit = async () => {
    setShowErrors(true);
    if (!honest) return notify('Vui lòng xác nhận cam kết khai báo trung thực nguồn gốc câu hỏi.');
    if (!title.trim() || qs.some((q) => validateDraft(q))) return notify('Vui lòng điền đầy đủ thông tin các câu hỏi.');
    if (!id && !classId) return notify('Hãy chọn lớp học phần để đề xuất.');
    setBusy(true);
    try {
      if (id) await updateMySubmission(id, { title, content, sourceUrl, questions: qs });
      else await proposeSession({ title, content, sourceUrl, courseClassId: classId!, questions: qs });
      notify(id ? 'Đã cập nhật phiên đề xuất.' : 'Đã gửi đề xuất, vui lòng chờ giảng viên duyệt.');
      router.back();
    } catch (e) { notify((e as Error).message); } finally { setBusy(false); }
  };

  if (loading) return <><Header title="Đề xuất câu hỏi" /><Loading /></>;
  return (
    <Screen footer={<Button title={id ? 'Lưu thay đổi' : 'Gửi đề xuất'} icon="send" loading={busy} disabled={!!error && !id && !classes.length} onPress={submit} />}>
      <Header title={id ? 'Chỉnh sửa phiên gửi' : 'Đề xuất câu hỏi'} />
      {error ? <ErrorBox message={error} /> : null}
      <Card>
        <Field label="Tiêu đề phiên" value={title} onChangeText={setTitle} placeholder="VD: Ôn tập chương 3" error={showErrors && !title.trim() ? 'Bắt buộc' : undefined} />
        <Field label="Mô tả (không bắt buộc)" value={content} onChangeText={setContent} multiline placeholder="Phiên này gồm những nội dung gì?" />
        <Field label="Link nguồn tham khảo (không bắt buộc)" value={sourceUrl} onChangeText={setSourceUrl} autoCapitalize="none" keyboardType="url" placeholder="https://..." />
        <Muted>Lớp học phần</Muted>
        {id ? <Row><Chip label={classLabel || 'Lớp học phần của phiên'} active /></Row> : classes.length ? (
          <Row>{classes.map((c) => <Chip key={c.id} label={`${c.subjectName} · ${c.classCode}`} active={classId === c.id} onPress={() => setClassId(c.id)} />)}</Row>
        ) : <Muted>Bạn chưa có lớp học phần nào được phép đề xuất câu hỏi.</Muted>}
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
