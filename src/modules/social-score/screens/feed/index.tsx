import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Empty } from '@/components/empty';
import { ErrorBox } from '@/components/error-box';
import { Loading } from '@/components/loading';
import { Screen } from '@/components/screen';
import { useAuth } from '@/context/auth';
import { socialApi } from '@/modules/social-score/api/social-api';
import type { post } from '@/modules/social-score/api/types';
import { Avatar } from '@/modules/social-score/components/avatar';
import { PostCard } from '@/modules/social-score/components/post-card';
import { colors } from '@/theme';

/** Bảng tin: khung đăng bài, danh sách bài viết (GET /activity-feeds), kéo để làm mới, tải thêm theo con trỏ. */
export function FeedScreen({ onOpenPost, onCreatePost }: { onOpenPost: (post: post) => void; onCreatePost: () => void }) {
  const { user } = useAuth();
  const [posts, setPosts] = useState<post[]>([]);
  const [after, setAfter] = useState<string>();
  const [hasNext, setHasNext] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadFirstPage = useCallback(async () => {
    try {
      const page = await socialApi.getFeed();
      setPosts(page.posts);
      setAfter(page.after);
      setHasNext(page.hasNext);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không thể tải bảng tin.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Mỗi lần quay lại màn hình (vd. vừa đăng bài xong) thì tải lại.
  useFocusEffect(useCallback(() => { void loadFirstPage(); }, [loadFirstPage]));

  const loadMore = async () => {
    if (!hasNext || !after || loadingMore) return;
    setLoadingMore(true);
    try {
      const page = await socialApi.getFeed(after);
      setPosts((current) => {
        const merged = new Map(current.map((post) => [post.id, post]));
        page.posts.forEach((post) => merged.set(post.id, post));
        return [...merged.values()];
      });
      setAfter(page.after);
      setHasNext(page.hasNext);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không thể tải thêm bài viết.');
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <Screen onRefresh={() => { setRefreshing(true); void loadFirstPage(); }} refreshing={refreshing}>
      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Avatar user={{ id: user.id, name: user.name, avatarUrl: user.avatarUrl }} size={44} />
        <Pressable onPress={onCreatePost} style={({ pressed }) => ({ flex: 1, minHeight: 44, justifyContent: 'center', paddingHorizontal: 16, borderRadius: 22, backgroundColor: colors.bg, opacity: pressed ? 0.7 : 1 })}>
          <Text style={{ color: colors.muted, fontSize: 15 }}>Bạn muốn chia sẻ điều gì?</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Đăng ảnh hoặc video" onPress={onCreatePost} hitSlop={8}>
          <Ionicons name="image-outline" size={26} color={colors.primary} />
        </Pressable>
      </Card>

      {loading ? <Loading /> : error && posts.length === 0 ? (
        <ErrorBox message={error} onRetry={() => { setLoading(true); void loadFirstPage(); }} />
      ) : posts.length === 0 ? (
        <Card><Empty icon="newspaper-outline" text="Bảng tin đang yên ắng. Hãy chia sẻ bài viết đầu tiên với cộng đồng." action={<Button small title="Tạo bài viết" icon="add" onPress={onCreatePost} />} /></Card>
      ) : (
        <>
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onOpen={() => onOpenPost(post)}
              onUpdate={(updated) => setPosts((current) => current.map((item) => (item.id === updated.id ? updated : item)))}
            />
          ))}
          {error ? <ErrorBox message={error} onRetry={loadMore} /> : null}
          {hasNext && !error ? (
            <View style={{ alignItems: 'center' }}>
              <Button small variant="outline" title={loadingMore ? 'Đang tải…' : 'Tải thêm bài viết'} onPress={loadMore} loading={loadingMore} />
            </View>
          ) : (
            <Text style={{ textAlign: 'center', color: colors.muted, fontSize: 13 }}>Bạn đã xem hết bài viết.</Text>
          )}
        </>
      )}
    </Screen>
  );
}
