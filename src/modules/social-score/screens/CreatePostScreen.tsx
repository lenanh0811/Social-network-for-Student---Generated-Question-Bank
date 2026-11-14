import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { socialApi } from '../api/social-api';
import type { media_asset, post, post_type, subject } from '../api/types';
import { MediaUpload } from '../components/MediaUpload';
import { wordCount } from '../utils/text';

const MAX_POST_WORDS = 500;
const POST_TYPES: { type: post_type; label: string }[] = [
  { type: 'SOCIAL_POST', label: 'Bài viết' },
  { type: 'LEARNING_VIDEO', label: 'Video học tập' },
];

export function CreatePostScreen({
  onCancel,
  onCreated,
}: {
  onCancel: () => void;
  onCreated: (post: post) => void;
}) {
  const [content, setContent] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [postType, setPostType] = useState<post_type>('SOCIAL_POST');
  const [media, setMedia] = useState<media_asset[]>([]);
  const [subjects, setSubjects] = useState<subject[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const [subjectError, setSubjectError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchSubjects = useCallback(() => {
    void socialApi.getSubjects()
      .then((availableSubjects) => {
        setSubjects(availableSubjects);
        setSubjectId((current) => availableSubjects.some((subject) => subject.id === current) ? current : '');
        setSubjectError(availableSubjects.length ? null : 'Chưa có môn học để chọn.');
      })
      .catch((error: unknown) => {
        setSubjectError(error instanceof Error ? error.message : 'Không tải được danh sách môn học.');
      })
      .finally(() => setLoadingSubjects(false));
  }, []);

  useEffect(() => {
    fetchSubjects();
  }, [fetchSubjects]);

  const retryLoadSubjects = () => {
    setLoadingSubjects(true);
    fetchSubjects();
  };

  const submit = async () => {
    const trimmed = content.trim();
    if (!trimmed) {
      Alert.alert('Bài viết trống', 'Hãy nhập nội dung trước khi đăng.');
      return;
    }
    if (wordCount(trimmed) > MAX_POST_WORDS) {
      Alert.alert('Nội dung quá dài', `Bài viết tối đa ${MAX_POST_WORDS} từ.`);
      return;
    }
    const selectedSubject = subjects.find((subject) => subject.id === subjectId);
    if (!selectedSubject || !Number.isSafeInteger(Number(selectedSubject.id)) || Number(selectedSubject.id) <= 0) {
      Alert.alert('Thiếu môn học', 'Hãy chọn môn học trước khi đăng bài.');
      return;
    }
    if (media.some((asset) => asset.mediaType === 'video') && postType !== 'LEARNING_VIDEO') {
      Alert.alert('Loại bài viết chưa đúng', 'Hãy chọn “Video học tập” để đăng video.');
      return;
    }

    setSaving(true);
    try {
      const post = await socialApi.createPost({
        content: trimmed,
        media,
        subjectId: selectedSubject.id,
        postType,
      });
      onCreated(post);
    } catch (error) {
      Alert.alert('Không thể đăng bài', error instanceof Error ? error.message : 'Vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <Pressable onPress={onCancel}>
          <Text style={styles.cancel}>Hủy</Text>
        </Pressable>
        <Text style={styles.title}>Tạo bài viết</Text>
        <Pressable disabled={saving || loadingSubjects || !subjects.length || !subjectId} onPress={submit}>
          <Text style={[styles.publish, (saving || loadingSubjects || !subjects.length || !subjectId) && styles.disabled]}>{saving ? 'Đang đăng…' : 'Đăng'}</Text>
        </Pressable>
      </View>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.body}>
        <Text style={styles.prompt}>Bạn đang nghĩ gì?</Text>
        <TextInput
          autoFocus
          multiline
          placeholder="Chia sẻ điều gì đó với mọi người..."
          placeholderTextColor="#8a8d91"
          value={content}
          onChangeText={setContent}
          style={styles.input}
          textAlignVertical="top"
        />
        <Text style={styles.counter}>{wordCount(content)}/{MAX_POST_WORDS} từ</Text>
        <Text style={styles.fieldLabel}>Môn học (bắt buộc cho mọi bài viết)</Text>
        {loadingSubjects ? (
          <Text style={styles.helper}>Đang tải danh sách môn học…</Text>
        ) : subjectError ? (
          <View>
            <Text accessibilityRole="alert" style={styles.subjectError}>{subjectError}</Text>
            <Pressable onPress={retryLoadSubjects} disabled={loadingSubjects}>
              <Text style={styles.retry}>Thử tải lại</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.subjectList}>
            {subjects.map((subject) => (
              <Pressable
                key={subject.id}
                accessibilityRole="button"
                accessibilityState={{ selected: subjectId === subject.id }}
                onPress={() => setSubjectId(subject.id)}
                style={[styles.subjectOption, subjectId === subject.id && styles.selectedSubject]}
              >
                <Text style={[styles.subjectName, subjectId === subject.id && styles.selectedSubjectName]}>
                  {subject.name} · {subject.code}
                </Text>
              </Pressable>
            ))}
          </View>
        )}
        <Text style={styles.fieldLabel}>Loại bài viết</Text>
        <View style={styles.typeRow}>
          {POST_TYPES.map((option) => (
            <Pressable
              key={option.type}
              onPress={() => setPostType(option.type)}
              style={[styles.typeOption, postType === option.type && styles.selectedType]}
            >
              <Text style={[styles.typeText, postType === option.type && styles.selectedTypeText]}>{option.label}</Text>
            </Pressable>
          ))}
        </View>
        <MediaUpload value={media} onChange={setMedia} />
        <Text style={styles.helper}>Tối đa 4 ảnh (4 MB/ảnh) hoặc 1 video. Không hỗ trợ ảnh động.</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { height: 54, paddingHorizontal: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#ddd' },
  cancel: { color: '#606770', fontSize: 16 },
  title: { color: '#1c1e21', fontSize: 17, fontWeight: '700' },
  publish: { color: '#1877f2', fontSize: 16, fontWeight: '700' },
  disabled: { color: '#9abef0' },
  body: { padding: 18, paddingBottom: 36 },
  prompt: { color: '#1c1e21', fontSize: 17, fontWeight: '700' },
  input: { minHeight: 140, marginTop: 12, fontSize: 17, color: '#1c1e21' },
  counter: { color: '#73777d', textAlign: 'right', fontSize: 12, marginBottom: 12 },
  fieldLabel: { color: '#4b4f56', fontSize: 13, fontWeight: '700', marginTop: 12, marginBottom: 7 },
  subjectList: { gap: 8 },
  subjectOption: { minHeight: 42, borderRadius: 9, paddingHorizontal: 12, justifyContent: 'center', backgroundColor: '#f0f2f5' },
  selectedSubject: { backgroundColor: '#e7f3ff', borderWidth: 1, borderColor: '#1877f2' },
  subjectName: { color: '#4b4f56', fontSize: 14 },
  selectedSubjectName: { color: '#1877f2', fontWeight: '700' },
  subjectError: { color: '#b3261e', fontSize: 13 },
  retry: { color: '#1877f2', fontWeight: '700', marginTop: 8 },
  typeRow: { flexDirection: 'row', gap: 8 },
  typeOption: { flex: 1, paddingVertical: 11, borderRadius: 9, backgroundColor: '#f0f2f5', alignItems: 'center' },
  selectedType: { backgroundColor: '#e7f3ff' },
  typeText: { color: '#606770', fontSize: 13, fontWeight: '600' },
  selectedTypeText: { color: '#1877f2' },
  helper: { color: '#73777d', fontSize: 12, marginTop: 10, lineHeight: 18 },
});
