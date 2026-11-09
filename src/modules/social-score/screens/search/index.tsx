import { useEffect, useState } from 'react';
import { ActivityIndicator, Text } from 'react-native';
import { Screen } from '@/components/screen';
import { socialApi } from '@/modules/social-score/api/social-api';
import type { Post } from '@/modules/social-score/api/types';
import { PostCard } from '@/modules/social-score/components/post-card';
import { colors } from '@/theme';

/** Kết quả tìm bài viết cho từ khoá `query` (nhập ở thanh tìm kiếm trên navbar). */
export function SearchScreen({ query, onOpenPost }: { query: string; onOpenPost: (post: Post) => void }) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(!!query);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!query) return;
    let cancelled = false;
    socialApi.searchPosts(query)
      .then((page) => { if (!cancelled) { setPosts(page.posts); setError(null); } })
      .catch((cause) => { if (!cancelled) setError(cause instanceof Error ? cause.message : 'Không thể tìm kiếm.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [query]);

  return (
    <Screen>
      <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>
        {query ? `Kết quả cho "${query}"` : 'Nhập từ khoá vào thanh tìm kiếm phía trên'}
      </Text>
      {loading ? <ActivityIndicator color={colors.primary} /> : null}
      {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}
      {!loading && !error && query && posts.length === 0 ? <Text style={{ color: colors.muted }}>Không tìm thấy bài viết nào.</Text> : null}
      {posts.map((post) => (
        <PostCard key={post.id} post={post} onOpen={() => onOpenPost(post)}
          onUpdate={(next) => setPosts((list) => list.map((p) => (p.id === next.id ? next : p)))} />
      ))}
    </Screen>
  );
}
