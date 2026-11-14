import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Badge } from '@/components/badge';
import { Card } from '@/components/card';
import { socialApi } from '@/modules/social-score/api/social-api';
import type { post } from '@/modules/social-score/api/types';
import { Avatar } from '@/modules/social-score/components/avatar';
import { notify } from '@/modules/social-score/utils/dialog';
import { go } from '@/utils/navigation';
import { colors } from '@/theme';

export function PostCard({ post, onOpen, onUpdate }: {
  post: post;
  onOpen: () => void;
  onUpdate: (post: post) => void;
}) {
  const [reacting, setReacting] = useState(false);
  const [width, setWidth] = useState(0);
  const isLiked = post.myReaction === 'LIKE';

  const toggleReaction = async () => {
    if (reacting) return;
    setReacting(true);
    try {
      const result = await socialApi.react(post.id);
      onUpdate({ ...post, myReaction: result.myReaction, reactionCount: result.totalCount });
    } catch (error) {
      notify('Không thể bày tỏ cảm xúc', error instanceof Error ? error.message : 'Vui lòng thử lại.');
    } finally {
      setReacting(false);
    }
  };

  const tag = post.postType === 'LEARNING_VIDEO' ? 'Video học tập'
    : post.postType === 'QUESTION_APPROVED_NOTIFICATION' ? 'Câu hỏi được duyệt' : undefined;

  return (
    <Card style={{ padding: 0, gap: 0 }}>
      <View style={styles.authorRow}>
        <Pressable onPress={() => go(`/users/${post.author.id}`)} style={styles.authorLink} accessibilityRole="button">
          <Avatar user={post.author} />
          <View style={{ flex: 1 }}>
            <Text style={styles.authorName} numberOfLines={1}>{post.author.name}</Text>
            <Text style={styles.timestamp}>{formatDate(post.createdAt)}{post.isEdited ? ' · Đã chỉnh sửa' : ''}</Text>
          </View>
        </Pressable>
        {tag ? <Badge label={tag} fg={colors.primary} bg={colors.primarySoft} /> : null}
      </View>

      <Pressable onPress={onOpen}><Text style={styles.content}>{post.content}</Text></Pressable>

      {post.mediaUrls.length > 0 ? (
        <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
          {width > 0 ? (
            <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
              {post.mediaUrls.map((url) =>
                isVideo(url) ? (
                  <View key={url} style={[styles.video, { width }]}>
                    <Ionicons name="play-circle" size={56} color="#fff" />
                    <Text style={{ color: '#fff', marginTop: 4 }}>Video</Text>
                  </View>
                ) : (
                  <Image key={url} source={{ uri: url }} style={{ width, height: 300, backgroundColor: colors.border }} resizeMode="cover" />
                ),
              )}
            </ScrollView>
          ) : null}
          {post.mediaUrls.length > 1 ? <View style={styles.counter}><Text style={styles.counterText}>{post.mediaUrls.length} ảnh · vuốt để xem</Text></View> : null}
        </View>
      ) : null}

      <View style={styles.actionRow}>
        <Pressable accessibilityRole="button" disabled={reacting} onPress={toggleReaction} style={({ pressed }) => [styles.action, pressed && { opacity: 0.6 }]}>
          <Ionicons name={isLiked ? 'heart' : 'heart-outline'} size={22} color={isLiked ? colors.primary : colors.muted} />
          <Text style={[styles.actionText, isLiked && { color: colors.primary }]}>{post.reactionCount} Thích</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={onOpen} style={({ pressed }) => [styles.action, pressed && { opacity: 0.6 }]}>
          <Ionicons name="chatbubble-outline" size={20} color={colors.muted} />
          <Text style={styles.actionText}>{post.commentCount} Bình luận</Text>
        </Pressable>
      </View>
    </Card>
  );
}

function isVideo(url: string) {
  return /\.(mp4|mov|m4v|webm)(?:$|[?#])/i.test(url);
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Vừa xong' : date.toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });
}

const styles = StyleSheet.create({
  authorRow: { padding: 16, paddingBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 8 },
  authorLink: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  authorName: { color: colors.text, fontSize: 15, fontWeight: '600' },
  timestamp: { marginTop: 2, color: colors.muted, fontSize: 12 },
  content: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 14, color: colors.text, fontSize: 15, lineHeight: 22 },
  video: { height: 220, backgroundColor: '#111827', alignItems: 'center', justifyContent: 'center' },
  counter: { position: 'absolute', right: 10, bottom: 10, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  counterText: { color: '#fff', fontSize: 12 },
  actionRow: { marginHorizontal: 16, marginTop: 4, borderTopWidth: 1, borderTopColor: colors.border, minHeight: 48, flexDirection: 'row' },
  action: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  actionText: { color: colors.muted, fontSize: 13, fontWeight: '600' },
});
