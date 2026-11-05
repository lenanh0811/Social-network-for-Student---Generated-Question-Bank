import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { socialApi } from '../api/socialApi';
import type { MediaAsset, Post } from '../types/social';
import { CommentSection } from '../components/CommentSection';
import { MediaUpload } from '../components/MediaUpload';
import { PostCard } from '../components/PostCard';
import { wordCount } from '../utils/text';

const MAX_POST_WORDS = 500;

export function PostScreen({
  post,
  canManage,
  onBack,
  onDelete,
  onUpdate,
}: {
  post: Post;
  canManage: boolean;
  onBack: () => void;
  onDelete: () => void;
  onUpdate: (post: Post) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState(post.content);
  const [media, setMedia] = useState<MediaAsset[]>(
    post.mediaUrls.map((url) => ({
      uri: url,
      url,
      name: url.split('/').pop() ?? 'media',
      mimeType: /\.(mp4|mov|m4v|webm)(?:$|[?#])/i.test(url) ? 'video/mp4' : 'image/jpeg',
      mediaType: /\.(mp4|mov|m4v|webm)(?:$|[?#])/i.test(url) ? 'video' : 'image',
    })),
  );
  const [saving, setSaving] = useState(false);

  const saveEdit = async () => {
    const trimmed = content.trim();
    if (!trimmed || wordCount(trimmed) > MAX_POST_WORDS) {
      Alert.alert('Nội dung không hợp lệ', `Nhập nội dung từ 1 đến ${MAX_POST_WORDS} từ.`);
      return;
    }
    setSaving(true);
    try {
      onUpdate(
        await socialApi.updatePost(post.id, {
          content: trimmed,
          mediaUrls: media.flatMap((asset) => (asset.url ? [asset.url] : [])),
        }),
      );
      setEditing(false);
    } catch (error) {
      Alert.alert('Không thể sửa bài viết', error instanceof Error ? error.message : 'Vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" onPress={onBack} style={styles.backButton}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <Text style={styles.title}>Bài viết</Text>
        {canManage && (
          <View style={styles.ownerActions}>
            <Pressable onPress={() => setEditing((current) => !current)}>
              <Text style={styles.actionText}>{editing ? 'Hủy' : 'Sửa'}</Text>
            </Pressable>
            <Pressable onPress={onDelete}>
              <Text style={[styles.actionText, styles.deleteText]}>Xóa</Text>
            </Pressable>
          </View>
        )}
      </View>
      {editing ? (
        <View style={styles.editCard}>
          <TextInput
            multiline
            value={content}
            onChangeText={setContent}
            style={styles.editInput}
            textAlignVertical="top"
          />
          <Text style={styles.counter}>{wordCount(content)}/{MAX_POST_WORDS} từ</Text>
          <MediaUpload value={media} onChange={setMedia} />
          <Pressable disabled={saving} onPress={saveEdit} style={styles.saveButton}>
            <Text style={styles.saveText}>{saving ? 'Đang lưu…' : 'Lưu thay đổi'}</Text>
          </Pressable>
        </View>
      ) : (
        <PostCard post={post} onOpen={() => undefined} onUpdate={onUpdate} />
      )}
      <View style={styles.commentsCard}>
        <CommentSection
          postId={post.id}
          onCountChange={(change) => onUpdate({ ...post, commentCount: Math.max(0, post.commentCount + change) })}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingBottom: 24 },
  header: { height: 52, paddingHorizontal: 14, backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  backButton: { width: 38 },
  backText: { color: '#1877f2', fontSize: 34, lineHeight: 38 },
  title: { flex: 1, color: '#1c1e21', fontWeight: '700', fontSize: 17 },
  ownerActions: { flexDirection: 'row', gap: 16 },
  actionText: { color: '#1877f2', fontSize: 14, fontWeight: '600' },
  deleteText: { color: '#d93025' },
  editCard: { backgroundColor: '#fff', padding: 14 },
  editInput: { minHeight: 130, fontSize: 15, color: '#1c1e21' },
  counter: { textAlign: 'right', color: '#73777d', fontSize: 12, marginVertical: 8 },
  saveButton: { backgroundColor: '#1877f2', borderRadius: 8, alignItems: 'center', padding: 12 },
  saveText: { color: '#fff', fontWeight: '700' },
  commentsCard: { backgroundColor: '#fff', marginTop: 8 },
});
