import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAuth } from '@/context/auth';
import { confirmAction, notify } from '@/modules/social-score/utils/dialog';
import { colors } from '@/theme';
import { socialApi } from '@/modules/social-score/api/social-api';
import type { comment } from '@/modules/social-score/api/types';
import { Avatar } from '@/modules/social-score/components/avatar';
import { wordCount } from '@/modules/social-score/utils/text';

const MAX_COMMENT_WORDS = 500;

export function CommentSection({
  postId,
  onCountChange,
}: {
  postId: string;
  onCountChange?: (change: number) => void;
}) {
  const { user } = useAuth();
  const [comments, setComments] = useState<comment[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [editing, setEditing] = useState<comment | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    let active = true;
    socialApi
      .getComments(postId)
      .then((items) => {
        if (active) setComments(items);
      })
      .catch((error: unknown) => {
        if (active) {
          notify('Không thể tải bình luận', error instanceof Error ? error.message : 'Vui lòng thử lại.');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [postId]);

  const addComment = async () => {
    const content = draft.trim();
    if (!content || wordCount(content) > MAX_COMMENT_WORDS) {
      notify('Bình luận không hợp lệ', `Nhập nội dung từ 1 đến ${MAX_COMMENT_WORDS} từ.`);
      return;
    }
    setSending(true);
    try {
      const created = await socialApi.createComment(postId, content);
      setComments((current) => [...current, created]);
      onCountChange?.(1);
      setDraft('');
    } catch (error) {
      notify('Không thể bình luận', error instanceof Error ? error.message : 'Vui lòng thử lại.');
    } finally {
      setSending(false);
    }
  };

  const editComment = (comment: comment) => {
    setEditing(comment);
    setEditDraft(comment.content);
  };

  const saveCommentEdit = async () => {
    const content = editDraft.trim();
    if (!content || wordCount(content) > MAX_COMMENT_WORDS) {
      notify('Bình luận không hợp lệ', `Nhập nội dung từ 1 đến ${MAX_COMMENT_WORDS} từ.`);
      return;
    }
    if (!editing) return;
    setSavingEdit(true);
    try {
      const updated = await socialApi.updateComment(editing.id, postId, content);
      setComments((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      setEditing(null);
    } catch (error) {
      notify('Không thể sửa bình luận', error instanceof Error ? error.message : 'Vui lòng thử lại.');
    } finally {
      setSavingEdit(false);
    }
  };

  const deleteComment = (comment: comment) => {
    confirmAction('Xóa bình luận?', 'Bình luận sẽ bị xóa vĩnh viễn.', 'Xóa', async () => {
      try {
        await socialApi.deleteComment(comment.id);
        setComments((current) => current.filter((item) => item.id !== comment.id));
        onCountChange?.(-1);
      } catch (error) {
        notify('Không thể xóa bình luận', error instanceof Error ? error.message : 'Vui lòng thử lại.');
      }
    });
  };

  return (
    <View style={styles.section}>
      <Text style={styles.title}>Bình luận {comments.length ? `(${comments.length})` : ''}</Text>
      {loading ? (
        <Text style={styles.helper}>Đang tải bình luận…</Text>
      ) : comments.length === 0 ? (
        <Text style={styles.helper}>Chưa có bình luận. Hãy bắt đầu cuộc trò chuyện!</Text>
      ) : (
        comments.map((comment) => (
          <View key={comment.id} style={styles.commentRow}>
            <Avatar user={comment.author} size={34} />
            <View style={styles.bubble}>
              <Text style={styles.author}>{comment.isHidden ? 'Bình luận đã ẩn' : comment.author.name}</Text>
              <Text style={styles.commentText}>{comment.isHidden ? 'Nội dung này không còn hiển thị.' : comment.content}</Text>
              {!comment.isHidden && (comment.isOwner ?? comment.author.id === user.id) && (
                <View style={styles.actions}>
                  <Pressable onPress={() => editComment(comment)}>
                    <Text style={styles.action}>Sửa</Text>
                  </Pressable>
                  <Pressable onPress={() => deleteComment(comment)}>
                    <Text style={styles.action}>Xóa</Text>
                  </Pressable>
                </View>
              )}
            </View>
          </View>
        ))
      )}
      <View style={styles.composer}>
        <TextInput
          accessibilityLabel="Viết bình luận"
          multiline
          placeholder="Viết bình luận..."
          placeholderTextColor="#73777d"
          value={draft}
          onChangeText={setDraft}
          style={styles.input}
        />
        <Pressable disabled={sending} onPress={addComment} style={styles.sendButton}>
          <Ionicons name="send" size={20} color={colors.primary} />
        </Pressable>
      </View>
      <Modal visible={editing !== null} transparent animationType="fade" onRequestClose={() => setEditing(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.editDialog}>
            <Text style={styles.dialogTitle}>Sửa bình luận</Text>
            <TextInput
              autoFocus
              multiline
              value={editDraft}
              onChangeText={setEditDraft}
              style={styles.editInput}
              textAlignVertical="top"
            />
            <View style={styles.dialogActions}>
              <Pressable onPress={() => setEditing(null)}>
                <Text style={styles.action}>Hủy</Text>
              </Pressable>
              <Pressable disabled={savingEdit} onPress={saveCommentEdit}>
                <Text style={styles.sendText}>{savingEdit ? 'Đang lưu…' : 'Lưu'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { padding: 16 },
  title: { color: colors.text, fontSize: 16, fontWeight: '600', marginBottom: 14 },
  helper: { color: colors.muted, fontSize: 13, marginBottom: 14, lineHeight: 19 },
  commentRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  bubble: { flex: 1, marginLeft: 9, backgroundColor: colors.bg, borderRadius: 16, padding: 12 },
  author: { color: colors.text, fontSize: 13, fontWeight: '600', marginBottom: 4 },
  commentText: { color: colors.text, fontSize: 14, lineHeight: 20 },
  actions: { flexDirection: 'row', gap: 16, marginTop: 7 },
  action: { color: colors.muted, fontSize: 12, fontWeight: '600' },
  composer: { flexDirection: 'row', alignItems: 'center', marginTop: 5 },
  input: { flex: 1, minHeight: 42, maxHeight: 100, backgroundColor: colors.bg, borderRadius: 22, paddingHorizontal: 14, paddingVertical: 10, color: colors.text },
  sendButton: { paddingHorizontal: 12, paddingVertical: 10 },
  sendText: { color: colors.primary, fontWeight: '600' },
  modalBackdrop: { flex: 1, backgroundColor: '#0006', justifyContent: 'center', padding: 22 },
  editDialog: { backgroundColor: '#fff', borderRadius: 14, padding: 18 },
  dialogTitle: { color: colors.text, fontSize: 17, fontWeight: '600', marginBottom: 12 },
  editInput: { minHeight: 100, maxHeight: 180, color: colors.text, fontSize: 15 },
  dialogActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 22, marginTop: 16 },
});
