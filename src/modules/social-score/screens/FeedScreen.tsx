import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { socialApi } from '../api/social-api';
import type { post } from '../api/types';
import { Avatar } from '../components/avatar';
import { PostCard } from '../components/PostCard';

export function FeedScreen({
  onOpenPost,
  onCreatePost,
  onOpenSearch,
}: {
  onOpenPost: (post: post) => void;
  onCreatePost: () => void;
  onOpenSearch: () => void;
}) {
  const [posts, setPosts] = useState<post[]>([]);
  const [after, setAfter] = useState<string>();
  const [hasNext, setHasNext] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadFirstPage = async () => {
    setLoading(true);
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
    }
  };

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
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không thể tải thêm bài viết.');
    } finally {
      setLoadingMore(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      let active = true;
      socialApi
        .getFeed()
        .then((page) => {
          if (!active) return;
          setPosts(page.posts);
          setAfter(page.after);
          setHasNext(page.hasNext);
          setError(null);
        })
        .catch((cause: unknown) => {
          if (active) setError(cause instanceof Error ? cause.message : 'Không thể tải bảng tin.');
        })
        .finally(() => {
          if (active) setLoading(false);
        });
      return () => {
        active = false;
      };
    }, []),
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.brandHeader}>
        <Text style={styles.brand}>campus</Text>
        <Pressable onPress={onOpenSearch} style={styles.searchButton}>
          <Text style={styles.searchButtonText}>⌕</Text>
        </Pressable>
      </View>
      <View style={styles.searchBar}>
        <Text style={styles.searchIcon}>⌕</Text>
        <TextInput
          editable={false}
          onPressIn={onOpenSearch}
          placeholder="Tìm kiếm trên Campus"
          placeholderTextColor="#65676b"
          style={styles.searchInput}
        />
      </View>
      <View style={styles.composer}>
        <Avatar user={{ id: 'me', name: 'Bạn' }} />
        <Pressable onPress={onCreatePost} style={styles.composerButton}>
          <Text style={styles.composerText}>Bạn đang nghĩ gì?</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Đăng ảnh hoặc video" onPress={onCreatePost}>
          <Text style={styles.photoIcon}>▧</Text>
        </Pressable>
      </View>
      <View style={styles.stories}>
        <Text style={styles.storiesLabel}>KHOẢNH KHẮC</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.storyList}>
          {['Chia sẻ của bạn', 'Bạn bè', 'Cộng đồng', 'Sự kiện'].map((label, index) => (
            <Pressable key={label} onPress={index === 0 ? onCreatePost : undefined} style={styles.story}>
              <View style={[styles.storyCircle, index === 0 && styles.addStory]}>
                <Text style={styles.storyIcon}>{index === 0 ? '+' : ['🌱', '🎓', '💬'][index - 1]}</Text>
              </View>
              <Text numberOfLines={1} style={styles.storyText}>{label}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>
      {loading && <ActivityIndicator color="#1877f2" style={styles.loader} />}
      {error && (
        <View style={styles.messageCard}>
          <Text style={styles.messageTitle}>Không tải được bảng tin</Text>
          <Text style={styles.messageText}>{error}</Text>
          <Pressable onPress={loadFirstPage}>
            <Text style={styles.retry}>Thử lại</Text>
          </Pressable>
        </View>
      )}
      {!loading && !error && posts.length === 0 && (
        <View style={styles.messageCard}>
          <Text style={styles.messageTitle}>Bảng tin đang yên ắng</Text>
          <Text style={styles.messageText}>Hãy chia sẻ bài viết đầu tiên với cộng đồng.</Text>
          <Pressable onPress={onCreatePost}>
            <Text style={styles.retry}>Tạo bài viết</Text>
          </Pressable>
        </View>
      )}
      {posts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          onOpen={() => onOpenPost(post)}
          onUpdate={(updated) => setPosts((current) => current.map((item) => (item.id === updated.id ? updated : item)))}
        />
      ))}
      {hasNext && !error && (
        <Pressable disabled={loadingMore} onPress={loadMore} style={styles.loadMore}>
          <Text style={styles.retry}>{loadingMore ? 'Đang tải…' : 'Tải thêm bài viết'}</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingBottom: 12 },
  brandHeader: { height: 56, paddingHorizontal: 18, backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#d8dce2' },
  brand: { color: '#1877f2', fontSize: 27, fontWeight: '800', letterSpacing: -1 },
  searchButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#f0f2f5', alignItems: 'center', justifyContent: 'center' },
  searchButtonText: { color: '#1c1e21', fontSize: 28, lineHeight: 32 },
  searchBar: { backgroundColor: '#fff', paddingHorizontal: 14, paddingVertical: 12, flexDirection: 'row', alignItems: 'center' },
  searchIcon: { color: '#606770', fontSize: 24, marginRight: 8 },
  searchInput: { flex: 1, height: 38, borderRadius: 20, backgroundColor: '#f0f2f5', paddingHorizontal: 14, color: '#1c1e21' },
  composer: { backgroundColor: '#fff', paddingHorizontal: 14, paddingBottom: 12, flexDirection: 'row', alignItems: 'center' },
  composerButton: { flex: 1, marginHorizontal: 10, minHeight: 40, justifyContent: 'center' },
  composerText: { color: '#65676b', fontSize: 15 },
  photoIcon: { color: '#45bd62', fontSize: 23 },
  stories: { backgroundColor: '#fff', marginTop: 9, paddingTop: 13, paddingBottom: 12 },
  storiesLabel: { color: '#73777d', fontSize: 11, fontWeight: '700', marginHorizontal: 14, marginBottom: 10, letterSpacing: 0.4 },
  storyList: { paddingHorizontal: 9 },
  story: { width: 77, alignItems: 'center', marginHorizontal: 5 },
  storyCircle: { height: 54, width: 54, borderRadius: 27, backgroundColor: '#e7f3ff', borderWidth: 2, borderColor: '#d6e8ff', alignItems: 'center', justifyContent: 'center' },
  addStory: { backgroundColor: '#f0f2f5', borderColor: '#f0f2f5' },
  storyIcon: { fontSize: 23, color: '#1877f2' },
  storyText: { color: '#4b4f56', fontSize: 11, marginTop: 5 },
  loader: { marginTop: 30 },
  messageCard: { backgroundColor: '#fff', marginTop: 9, padding: 20 },
  messageTitle: { color: '#1c1e21', fontSize: 16, fontWeight: '700' },
  messageText: { color: '#65676b', marginTop: 6, lineHeight: 20 },
  retry: { color: '#1877f2', fontWeight: '700', marginTop: 12, textAlign: 'center' },
  loadMore: { backgroundColor: '#fff', marginTop: 1, padding: 10 },
});
