import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Screen } from '@/components/screen';
import { socialApi } from '@/modules/social-score/api/social-api';
import type { media_asset, post } from '@/modules/social-score/api/types';
import { CommentSection } from '@/modules/social-score/components/comment-section';
import { MediaUpload } from '@/modules/social-score/components/media-upload';
import { PostCard } from '@/modules/social-score/components/post-card';
import { notify } from '@/modules/social-score/utils/dialog';
import { wordCount } from '@/modules/social-score/utils/text';
import { colors } from '@/theme';

const MAX_POST_WORDS = 500;
const isVideoUrl = (url: string) => /\.(mp4|mov|m4v|webm)(?:$|[?#])/i.test(url);

/** Chi tiết bài viết: nội dung, (chủ bài) sửa/xóa, bình luận. Tiêu đề và nút quay lại do thanh tiêu đề của Stack lo. */
export function PostScreen({ post, canManage, onDelete, onUpdate }: {
  post: post;
  canManage: boolean;
  onDelete: () => void;
  onUpdate: (post: post) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState(post.content);
  const [media, setMedia] = useState<media_asset[]>(
    post.mediaUrls.map((url) => ({
      uri: url,
      url,
      name: url.split('/').pop() ?? 'media',
      mimeType: isVideoUrl(url) ? 'video/mp4' : 'image/jpeg',
      mediaType: isVideoUrl(url) ? 'video' : 'image',
    })),
  );
  const [saving, setSaving] = useState(false);

  const saveEdit = async () => {
    const trimmed = content.trim();
    if (!trimmed || wordCount(trimmed) > MAX_POST_WORDS) {
      notify('Nội dung không hợp lệ', `Nhập nội dung từ 1 đến ${MAX_POST_WORDS} từ.`);
      return;
    }
    setSaving(true);
    try {
      onUpdate(await socialApi.updatePost(post.id, { content: trimmed, media: media.filter((asset) => asset.url) }));
      setEditing(false);
    } catch (error) {
      notify('Không thể sửa bài viết', error instanceof Error ? error.message : 'Vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen>
      {canManage ? (
        <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'flex-end' }}>
          <Button small variant="outline" icon={editing ? 'close' : 'create-outline'} title={editing ? 'Hủy sửa' : 'Sửa bài'} onPress={() => setEditing((current) => !current)} />
          <Button small variant="danger" icon="trash-outline" title="Xóa" onPress={onDelete} />
        </View>
      ) : null}
      {editing ? (
        <Card>
          <TextInput
            multiline
            value={content}
            onChangeText={setContent}
            placeholderTextColor={colors.muted}
            style={{ minHeight: 130, fontSize: 15, color: colors.text, textAlignVertical: 'top' }}
          />
          <Text style={{ textAlign: 'right', color: colors.muted, fontSize: 12 }}>{wordCount(content)}/{MAX_POST_WORDS} từ</Text>
          <MediaUpload value={media} onChange={setMedia} />
          <Button title="Lưu thay đổi" onPress={saveEdit} loading={saving} />
        </Card>
      ) : (
        <PostCard post={post} onOpen={() => undefined} onUpdate={onUpdate} />
      )}
      <Card style={{ padding: 0, gap: 0 }}>
        <CommentSection
          postId={post.id}
          onCountChange={(change) => onUpdate({ ...post, commentCount: Math.max(0, post.commentCount + change) })}
        />
      </Card>
    </Screen>
  );
}
