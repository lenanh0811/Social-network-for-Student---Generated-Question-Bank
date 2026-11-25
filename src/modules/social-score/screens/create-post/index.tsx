import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Platform, Pressable, ScrollView, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/context/auth';
import { Chip } from '@/components/chip';
import { Field } from '@/components/field';
import { Segmented } from '@/components/segmented';
import { useLoad } from '@/hooks/use-load';
import { UserAvatar } from '@/components/side-menu';
import { socialApi } from '@/modules/social-score/api/social-api';
import type { media_asset, post, post_type, visibility_type } from '@/modules/social-score/api/types';
import { MediaUpload } from '@/modules/social-score/components/media-upload';
import { notify } from '@/modules/social-score/utils/dialog';
import { wordCount } from '@/modules/social-score/utils/text';
import { colors } from '@/theme';

const MAX_POST_WORDS = 500;
const POST_TYPES: { value: post_type; label: string }[] = [
  { value: 'SOCIAL_POST', label: 'Bài viết' },
  { value: 'LEARNING_VIDEO', label: 'Video học tập' },
];
const VISIBILITY: Record<visibility_type, { label: string; icon: keyof typeof Ionicons.glyphMap }> = {
  PUBLIC: { label: 'Công khai', icon: 'earth' },
  FRIENDS: { label: 'Bạn bè', icon: 'people' },
  ONLY_ME: { label: 'Chỉ mình tôi', icon: 'lock-closed' },
};
const NEXT: Record<visibility_type, visibility_type> = { PUBLIC: 'FRIENDS', FRIENDS: 'ONLY_ME', ONLY_ME: 'PUBLIC' };

/** Hộp thoại "Tạo bài viết" kiểu Facebook (POST /posts). Môn học chọn từ danh sách; nếu không tải được thì nhập ID tay. */
export function CreatePostScreen({ onCreated }: { onCreated: (post: post) => void }) {
  const { user, role } = useAuth();
  const { height } = useWindowDimensions();
  const canPostLearningVideo = role === 'lecturer' || role === 'admin';
  const subjects = useLoad(socialApi.getSubjects);
  const [content, setContent] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [postType, setPostType] = useState<post_type>('SOCIAL_POST');
  const [visibility, setVisibility] = useState<visibility_type>('PUBLIC');
  const [media, setMedia] = useState<media_asset[]>([]);
  const [saving, setSaving] = useState(false);
  const words = wordCount(content);
  const close = () => (router.canGoBack() ? router.back() : router.replace('/social' as never));
  const firstName = user.name.trim().split(/\s+/).slice(-1)[0] ?? '';
  const canPost = !!content.trim() && !saving;

  const submit = async () => {
    const trimmed = content.trim();
    if (!trimmed) return notify('Bài viết trống', 'Hãy nhập nội dung trước khi đăng.');
    if (words > MAX_POST_WORDS) return notify('Nội dung quá dài', `Bài viết tối đa ${MAX_POST_WORDS} từ.`);
    if (postType === 'LEARNING_VIDEO' && !canPostLearningVideo) {
      return notify('Không có quyền đăng video', 'Chỉ giảng viên hoặc quản trị viên được đăng video bài giảng.');
    }
    if (postType === 'LEARNING_VIDEO' && !subjectId.trim()) {
      return notify('Thiếu môn học', 'Hãy chọn môn học cho video bài giảng.');
    }
    const hasVideo = media.some((asset) => asset.mediaType === 'video');
    if (hasVideo && !canPostLearningVideo) {
      return notify('Không có quyền đăng video', 'Chỉ giảng viên hoặc quản trị viên được đăng video bài giảng.');
    }
    if (hasVideo && postType !== 'LEARNING_VIDEO') {
      return notify('Loại bài viết chưa đúng', 'Hãy chọn “Video học tập” để đăng video.');
    }
    setSaving(true);
    try {
      onCreated(await socialApi.createPost({
        content: trimmed,
        media: media.filter((asset) => asset.url),
        subjectId: postType === 'LEARNING_VIDEO' ? subjectId.trim() : undefined,
        postType,
        visibility,
      }));
    } catch (error) {
      notify('Không thể đăng bài', error instanceof Error ? error.message : 'Vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  };

  const pill = { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 4, paddingVertical: 4, paddingHorizontal: 10, borderRadius: 999, backgroundColor: '#E4E6EB' };
  const vis = VISIBILITY[visibility];

  return (
    <View style={{ flex: 1, backgroundColor: 'rgba(244,245,247,0.85)', alignItems: 'center', justifyContent: 'center', padding: 12 }}>
      <Pressable style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} onPress={close} accessibilityLabel="Đóng" />
      <View style={{ width: '100%', maxWidth: 560, maxHeight: height - 24, backgroundColor: '#fff', borderRadius: 12, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 12, overflow: 'hidden' }}>
        <View style={{ height: 60, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 1, borderBottomColor: '#E4E6EB' }}>
          <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text }}>Tạo bài viết</Text>
          <Pressable onPress={close} accessibilityLabel="Đóng" style={{ position: 'absolute', right: 12, top: 12, width: 36, height: 36, borderRadius: 18, backgroundColor: '#E4E6EB', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="close" size={22} color={colors.muted} />
          </Pressable>
        </View>

        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16, gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <UserAvatar size={44} />
            <View style={{ gap: 4 }}>
              <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text }}>{user.name}</Text>
              <Pressable onPress={() => setVisibility(NEXT[visibility])} style={({ pressed }) => [pill, pressed && { opacity: 0.7 }]} accessibilityLabel="Đổi đối tượng xem bài viết">
                <Ionicons name={vis.icon} size={13} color={colors.text} />
                <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>{vis.label}</Text>
                <Ionicons name="caret-down" size={11} color={colors.text} />
              </Pressable>
            </View>
          </View>

          <TextInput
            autoFocus multiline
            placeholder={`${firstName} ơi, bạn đang nghĩ gì thế?`}
            placeholderTextColor={colors.muted}
            value={content} onChangeText={setContent}
            style={[{ minHeight: 140, fontSize: content.length > 80 ? 16 : 24, color: colors.text, textAlignVertical: 'top', padding: 0 }, Platform.OS === 'web' && ({ outlineStyle: 'none' } as object)]}
          />
          {words > MAX_POST_WORDS * 0.8 ? (
            <Text style={{ textAlign: 'right', fontSize: 12, color: words > MAX_POST_WORDS ? colors.danger : colors.muted }}>{words}/{MAX_POST_WORDS} từ</Text>
          ) : null}

          {canPostLearningVideo ? (
            <View style={{ gap: 8 }}>
              <Segmented value={postType} onChange={setPostType} options={POST_TYPES} />
              {postType === 'LEARNING_VIDEO' ? (
                subjects.data?.length ? (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {subjects.data.map((s) => <Chip key={s.id} label={s.name} active={subjectId === String(s.id)} onPress={() => setSubjectId(String(s.id))} />)}
                  </View>
                ) : subjects.loading ? <Text style={{ color: colors.muted }}>Đang tải môn học…</Text> : (
                  <Field label="Nhập subject_id (bắt buộc)" value={subjectId} onChangeText={setSubjectId} autoCapitalize="none" />
                )
              ) : null}
            </View>
          ) : null}

          <MediaUpload
            value={media} onChange={setMedia}
            renderTrigger={(open, uploading, previews) => (
              <View style={{ gap: 12 }}>
                {previews}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#CED0D4', borderRadius: 999, paddingVertical: 8, paddingLeft: 16, paddingRight: 8 }}>
                  <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text }}>{uploading ? 'Đang tải lên…' : 'Thêm vào bài viết của bạn'}</Text>
                  <Pressable onPress={open} disabled={uploading} accessibilityLabel="Ảnh / video" style={({ pressed }) => ({ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? '#F0F2F5' : 'transparent' })}>
                    <Ionicons name="images" size={26} color="#45BD62" />
                  </Pressable>
                </View>
              </View>
            )}
          />

          <Pressable onPress={submit} disabled={!canPost} style={{ height: 44, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: canPost ? colors.primary : '#E4E6EB' }}>
            <Text style={{ fontSize: 15, fontWeight: '600', color: canPost ? '#fff' : '#BCC0C4' }}>{saving ? 'Đang đăng…' : 'Đăng'}</Text>
          </Pressable>
        </ScrollView>
      </View>
    </View>
  );
}
