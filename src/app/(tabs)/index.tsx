import { router } from 'expo-router';
import { FeedScreen } from '../../screens/FeedScreen';

export default function FeedRoute() {
  return (
    <FeedScreen
      onOpenPost={(post) => router.push({ pathname: '/posts/[id]', params: { id: post.id } })}
      onCreatePost={() => router.push('/create')}
      onOpenSearch={() => router.push('/search')}
    />
  );
}
