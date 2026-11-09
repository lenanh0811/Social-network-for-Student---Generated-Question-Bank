import { useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { socialApi } from '../api/client';
import type { Post } from '../api/types';
import { Avatar } from './Avatar';

export function PostCard({
  post,
  onOpen,
  onUpdate,
}: {
  post: Post;
  onOpen: () => void;
  onUpdate: (post: Post) => void;
}) {
  const [reacting, setReacting] = useState(false);
  const { width } = useWindowDimensions();
  const isLiked = post.myReaction === 'LIKE';

  const toggleReaction = async () => {
    if (reacting) return;
    setReacting(true);
    try {
      const result = await socialApi.react(post.id, 'LIKE');
      onUpdate({
        ...post,
        myReaction: result.myReaction,
        reactionCount: result.likeCount,
      });
    } catch (error) {
      Alert.alert('Không thể bày tỏ cảm xúc', error instanceof Error ? error.message : 'Vui lòng thử lại.');
    } finally {
      setReacting(false);
    }
  };

  return (
    <View style={styles.card}>
      <Pressable accessibilityRole="button" onPress={onOpen} style={styles.authorRow}>
        <Avatar user={post.author} />
        <View style={styles.authorDetails}>
          <Text style={styles.authorName}>{post.author.name}</Text>
          <Text style={styles.timestamp}>
            {formatDate(post.createdAt)} · {post.subjectName ? `${post.subjectName} · ` : ''}Công khai{post.isEdited ? ' · Đã chỉnh sửa' : ''}
          </Text>
        </View>
        <Text style={styles.more}>•••</Text>
      </Pressable>
      <Text style={styles.content}>{post.content}</Text>
      {post.mediaUrls.length > 0 && (
        <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
          {post.mediaUrls.map((url) =>
            isVideo(url) ? (
              <View key={url} style={[styles.videoPlaceholder, { width }]}>
                <Text style={styles.playIcon}>▶</Text>
                <Text style={styles.videoLabel}>Video</Text>
              </View>
            ) : (
              <Image key={url} source={{ uri: url }} style={[styles.postImage, { width }]} resizeMode="cover" />
            ),
          )}
        </ScrollView>
      )}
      <Pressable onPress={onOpen} style={styles.engagement}>
        <Text style={styles.reactionSummary}>{post.reactionCount ? `👍 ${post.reactionCount}` : ' '}</Text>
        <Text style={styles.commentSummary}>{post.commentCount} bình luận</Text>
      </Pressable>
      <View style={styles.actionRow}>
        <Pressable accessibilityRole="button" disabled={reacting} onPress={toggleReaction} style={styles.action}>
          <Text style={[styles.actionText, isLiked && styles.liked]}>{isLiked ? '👍 Đã thích' : '♡ Thích'}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={onOpen} style={styles.action}>
          <Text style={styles.actionText}>▢ Bình luận</Text>
        </Pressable>
      </View>
    </View>
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
  card: { backgroundColor: '#fff', marginBottom: 9, paddingTop: 14 },
  authorRow: { paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center' },
  authorDetails: { flex: 1, marginLeft: 10 },
  authorName: { color: '#1c1e21', fontSize: 15, fontWeight: '700' },
  timestamp: { marginTop: 3, color: '#73777d', fontSize: 12 },
  more: { color: '#606770', fontWeight: '700', fontSize: 17, paddingHorizontal: 5 },
  content: { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 14, color: '#1c1e21', fontSize: 15, lineHeight: 22 },
  postImage: { height: 280, backgroundColor: '#f0f2f5' },
  videoPlaceholder: { height: 220, backgroundColor: '#111827', alignItems: 'center', justifyContent: 'center' },
  playIcon: { color: '#fff', fontSize: 38 },
  videoLabel: { color: '#fff', marginTop: 5 },
  engagement: { paddingHorizontal: 14, paddingVertical: 10, flexDirection: 'row', justifyContent: 'space-between' },
  reactionSummary: { color: '#606770', fontSize: 13 },
  commentSummary: { color: '#73777d', fontSize: 13 },
  actionRow: { marginHorizontal: 14, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#d8dce2', minHeight: 42, flexDirection: 'row' },
  action: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  actionText: { color: '#606770', fontSize: 13, fontWeight: '600' },
  liked: { color: '#1877f2' },
});
