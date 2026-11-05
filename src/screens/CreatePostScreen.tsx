import { useState } from 'react';
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
import { socialApi } from '../api/socialApi';
import type { MediaAsset, Post, PostType } from '../types/social';
import { MediaUpload } from '../components/MediaUpload';
import { wordCount } from '../utils/text';

const MAX_POST_WORDS = 500;
const POST_TYPES: { type: PostType; label: string }[] = [
  { type: 'SOCIAL_POST', label: 'Bài viết' },
  { type: 'LEARNING_VIDEO', label: 'Video học tập' },
];

export function CreatePostScreen({
  onCancel,
  onCreated,
}: {
  onCancel: () => void;
  onCreated: (post: Post) => void;
}) {
  const [content, setContent] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [postType, setPostType] = useState<PostType>('SOCIAL_POST');
  const [media, setMedia] = useState<MediaAsset[]>([]);
  const [saving, setSaving] = useState(false);

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
    if (!subjectId.trim()) {
      Alert.alert('Thiếu môn học', 'Nhập ID môn học theo yêu cầu của API.');
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
        mediaUrls: media.flatMap((asset) => (asset.url ? [asset.url] : [])),
        subjectId: subjectId.trim(),
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
        <Pressable disabled={saving} onPress={submit}>
          <Text style={[styles.publish, saving && styles.disabled]}>{saving ? 'Đang đăng…' : 'Đăng'}</Text>
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
        <Text style={styles.fieldLabel}>Môn học</Text>
        <TextInput
          autoCapitalize="none"
          placeholder="Nhập subject_id"
          placeholderTextColor="#73777d"
          value={subjectId}
          onChangeText={setSubjectId}
          style={styles.subjectInput}
        />
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
  subjectInput: { minHeight: 44, borderWidth: 1, borderColor: '#d8dce2', borderRadius: 9, paddingHorizontal: 12, color: '#1c1e21' },
  typeRow: { flexDirection: 'row', gap: 8 },
  typeOption: { flex: 1, paddingVertical: 11, borderRadius: 9, backgroundColor: '#f0f2f5', alignItems: 'center' },
  selectedType: { backgroundColor: '#e7f3ff' },
  typeText: { color: '#606770', fontSize: 13, fontWeight: '600' },
  selectedTypeText: { color: '#1877f2' },
  helper: { color: '#73777d', fontSize: 12, marginTop: 10, lineHeight: 18 },
});
