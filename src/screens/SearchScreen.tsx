import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { socialApi } from '../api/socialApi';
import type { Post, SearchResults, SearchType } from '../types/social';
import { Avatar } from '../components/Avatar';
import { PostCard } from '../components/PostCard';

const SEARCH_TYPES: { type: SearchType; label: string }[] = [
  { type: 'ALL', label: 'Tất cả' },
  { type: 'POST', label: 'Bài viết' },
  { type: 'USER', label: 'Mọi người' },
  { type: 'QUESTION', label: 'Câu hỏi' },
];

export function SearchScreen({ onOpenPost }: { onOpenPost: (post: Post) => void }) {
  const [query, setQuery] = useState('');
  const [type, setType] = useState<SearchType>('ALL');
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) return;
    let active = true;
    const timer = setTimeout(() => {
      setLoading(true);
      socialApi
        .search(trimmed, type)
        .then((data) => {
          if (active) {
            setResults(data);
            setError(null);
          }
        })
        .catch((cause: unknown) => {
          if (active) setError(cause instanceof Error ? cause.message : 'Không thể tìm kiếm.');
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 350);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query, type]);

  const hasResults = Boolean(results && (results.posts.length || results.users.length || results.questions.length));

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Tìm kiếm</Text>
      <View style={styles.searchBox}>
        <Text style={styles.searchIcon}>⌕</Text>
        <TextInput
          accessibilityLabel="Tìm kiếm bài viết, mọi người và câu hỏi"
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="Bài viết, mọi người..."
          placeholderTextColor="#73777d"
          value={query}
          onChangeText={setQuery}
          style={styles.input}
        />
        {query.length > 0 && (
          <Pressable onPress={() => setQuery('')}>
            <Text style={styles.clear}>×</Text>
          </Pressable>
        )}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
        {SEARCH_TYPES.map((option) => (
          <Pressable
            key={option.type}
            accessibilityRole="button"
            accessibilityState={{ selected: type === option.type }}
            onPress={() => setType(option.type)}
            style={[styles.filter, type === option.type && styles.selectedFilter]}
          >
            <Text style={[styles.filterText, type === option.type && styles.selectedFilterText]}>{option.label}</Text>
          </Pressable>
        ))}
      </ScrollView>
      {loading && query.trim().length > 0 && <ActivityIndicator color="#1877f2" style={styles.loader} />}
      {error && query.trim().length > 0 && <Text style={styles.message}>{error}</Text>}
      {!loading && !error && query.trim().length > 0 && results && (
        <>
          {results.users.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Mọi người</Text>
              {results.users.map((user) => (
                <View key={user.id} style={styles.userRow}>
                  <Avatar user={user} />
                  <Text style={styles.userName}>{user.name}</Text>
                </View>
              ))}
            </View>
          )}
          {results.posts.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Bài viết</Text>
              {results.posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  onOpen={() => onOpenPost(post)}
                  onUpdate={(updated) =>
                    setResults((current) =>
                      current
                        ? { ...current, posts: current.posts.map((item) => (item.id === updated.id ? updated : item)) }
                        : current,
                    )
                  }
                />
              ))}
            </View>
          )}
          {results.questions.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Câu hỏi</Text>
              {results.questions.map((question) => (
                <View key={question.id} style={styles.questionCard}>
                  <Text style={styles.questionSubject}>{question.subjectName || 'Câu hỏi'}</Text>
                  <Text style={styles.questionContent}>{question.content}</Text>
                  {question.difficulty && <Text style={styles.questionDifficulty}>{question.difficulty}</Text>}
                </View>
              ))}
            </View>
          )}
          {!hasResults && (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>⌕</Text>
              <Text style={styles.emptyTitle}>Không tìm thấy kết quả</Text>
              <Text style={styles.message}>Thử từ khóa khác để khám phá bài viết, mọi người và câu hỏi.</Text>
            </View>
          )}
        </>
      )}
      {!query.trim() && <Text style={styles.helper}>Tìm bài viết, bạn bè, cộng đồng và câu hỏi.</Text>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingTop: 18, paddingBottom: 24 },
  heading: { color: '#1c1e21', fontSize: 23, fontWeight: '800', marginHorizontal: 16, marginBottom: 15 },
  searchBox: { minHeight: 46, marginHorizontal: 14, backgroundColor: '#fff', borderRadius: 24, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14 },
  searchIcon: { fontSize: 23, color: '#65676b', marginRight: 9 },
  input: { flex: 1, paddingVertical: 10, color: '#1c1e21' },
  clear: { color: '#65676b', fontSize: 23, paddingHorizontal: 5 },
  filters: { gap: 8, paddingHorizontal: 14, paddingTop: 14 },
  filter: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18, backgroundColor: '#fff' },
  selectedFilter: { backgroundColor: '#e7f3ff' },
  filterText: { color: '#606770', fontSize: 13, fontWeight: '600' },
  selectedFilterText: { color: '#1877f2' },
  loader: { marginTop: 28 },
  message: { color: '#65676b', lineHeight: 20, textAlign: 'center', paddingHorizontal: 24, marginTop: 9 },
  helper: { color: '#73777d', marginHorizontal: 18, marginTop: 20 },
  section: { marginTop: 18 },
  sectionTitle: { color: '#1c1e21', fontSize: 16, fontWeight: '700', paddingHorizontal: 15, marginBottom: 10 },
  userRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 12, marginBottom: 1 },
  userName: { color: '#1c1e21', fontWeight: '600', marginLeft: 11 },
  questionCard: { backgroundColor: '#fff', marginBottom: 4, padding: 14 },
  questionSubject: { color: '#1877f2', fontSize: 12, fontWeight: '700', marginBottom: 6 },
  questionContent: { color: '#1c1e21', fontSize: 15, lineHeight: 21 },
  questionDifficulty: { color: '#73777d', fontSize: 12, marginTop: 8 },
  empty: { alignItems: 'center', paddingTop: 54, paddingHorizontal: 20 },
  emptyIcon: { color: '#aeb4bd', fontSize: 42 },
  emptyTitle: { color: '#1c1e21', fontSize: 17, fontWeight: '700', marginTop: 12 },
});
