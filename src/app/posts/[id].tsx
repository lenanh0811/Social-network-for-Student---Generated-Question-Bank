import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { socialApi } from '../../api/socialApi';
import type { Post } from '../../types/social';
import { PostScreen } from '../../screens/PostScreen';

export default function PostRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [post, setPost] = useState<Post | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    socialApi
      .getPost(id)
      .then((result) => {
        if (active) setPost(result);
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : 'Không thể tải bài viết.');
      });
    return () => {
      active = false;
    };
  }, [id]);

  const deletePost = () => {
    Alert.alert('Xóa bài viết?', 'Bài viết sẽ bị xóa vĩnh viễn.', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: async () => {
          try {
            await socialApi.deletePost(id);
            router.back();
          } catch (cause) {
            Alert.alert('Không thể xóa bài viết', cause instanceof Error ? cause.message : 'Vui lòng thử lại.');
          }
        },
      },
    ]);
  };

  if (error) {
    return (
      <View style={styles.state}>
        <Text style={styles.error}>{error}</Text>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>Quay lại</Text>
        </Pressable>
      </View>
    );
  }
  if (!post) return <ActivityIndicator color="#1877f2" style={styles.loader} />;

  return (
    <PostScreen
      post={post}
      canManage={post.isOwner ?? post.author.id === process.env.EXPO_PUBLIC_CURRENT_USER_ID}
      onBack={() => router.back()}
      onDelete={deletePost}
      onUpdate={setPost}
    />
  );
}

const styles = StyleSheet.create({
  state: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  error: { color: '#b3261e', textAlign: 'center', marginBottom: 14 },
  back: { color: '#1877f2', fontWeight: '700' },
  loader: { flex: 1 },
});
