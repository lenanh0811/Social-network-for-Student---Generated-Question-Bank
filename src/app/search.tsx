import { router } from 'expo-router';
import { SearchScreen } from '@/modules/social-score/screens/SearchScreen';

export default function SocialSearchRoute() {
  return (
    <SearchScreen
      onOpenPost={(post) => router.push({ pathname: '/posts/[id]', params: { id: post.id } })}
    />
  );
}
