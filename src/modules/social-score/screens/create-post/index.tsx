import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { useAuth } from '@/context/auth';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Chip } from '@/components/chip';
import { Field } from '@/components/field';
import { Screen } from '@/components/screen';
import { Segmented } from '@/components/segmented';
import { useLoad } from '@/hooks/use-load';
import { socialApi } from '@/modules/social-score/api/social-api';
import type { media_asset, post, post_type } from '@/modules/social-score/api/types';
import { MediaUpload } from '@/modules/social-score/components/media-upload';
import { notify } from '@/modules/social-score/utils/dialog';
import { wordCount } from '@/modules/social-score/utils/text';
import { colors } from '@/theme';

const MAX_POST_WORDS = 500;
const POST_TYPES: { value: post_type; label: string }[] = [
  { value: 'SOCIAL_POST', label: 'Bài viết' },
  { value: 'LEARNING_VIDEO', label: 'Video học tập' },
];

/** Tạo bài viết (POST /posts). Môn học chọn từ danh sách; nếu không tải được danh sách thì nhập ID tay. */
export function CreatePostScreen({ onCreated }: { onCreated: (post: post) => void }) {
  const { role } = useAuth();
  const canPostLearningVideo = role === 'lecturer' || role === 'admin';
  const subjects = useLoad(socialApi.getSubjects);
  const [content, setContent] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [postType, setPostType] = useState<post_type>('SOCIAL_POST');
  const [media, setMedia] = useState<media_asset[]>([]);
  const [saving, setSaving] = useState(false);
  const words = wordCount(content);

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
      }));
    } catch (error) {
      notify('Không thể đăng bài', error instanceof Error ? error.message : 'Vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen footer={<View style={{ width: '100%' }}><Button title="Đăng bài" icon="paper-plane-outline" onPress={submit} loading={saving} /></View>}>
      <Card>
        <TextInput
          autoFocus
          multiline
          placeholder="Bạn muốn chia sẻ điều gì với mọi người?"
          placeholderTextColor={colors.muted}
          value={content}
          onChangeText={setContent}
          style={{ minHeight: 150, fontSize: 16, color: colors.text, textAlignVertical: 'top', position: 'relative', zIndex: 1 }}
        />
        <Text style={{ textAlign: 'right', fontSize: 12, color: words > MAX_POST_WORDS ? colors.danger : colors.muted, position: 'relative', zIndex: 1 }}>{words}/{MAX_POST_WORDS} từ</Text>
      </Card>

      <Card>
        {postType === 'LEARNING_VIDEO' ? (
          <>
            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>Môn học (bắt buộc)</Text>
            {subjects.data?.length ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {subjects.data.map((s) => <Chip key={s.id} label={s.name} active={subjectId === String(s.id)} onPress={() => setSubjectId(String(s.id))} />)}
              </View>
            ) : subjects.loading ? <Text style={{ color: colors.muted }}>Đang tải môn học…</Text> : (
              <Field label="Nhập subject_id (bắt buộc)" value={subjectId} onChangeText={setSubjectId} autoCapitalize="none" />
            )}
          </>
        ) : null}
        <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text, marginTop: 6 }}>Loại bài viết</Text>
        <Segmented value={postType} onChange={setPostType} options={canPostLearningVideo ? POST_TYPES : [POST_TYPES[0]]} />
      </Card>

      <Card>
        <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>Ảnh / video</Text>
        <MediaUpload value={media} onChange={setMedia} />
        <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 18 }}>Tối đa 4 ảnh (4 MB/ảnh) hoặc 1 video. Không hỗ trợ ảnh động.</Text>
      </Card>
    </Screen>
  );
}
