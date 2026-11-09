import { router, useLocalSearchParams } from 'expo-router';
import { SearchScreen } from '@/modules/social-score/screens/search';

export default function SocialSearchRoute() {
  const { q } = useLocalSearchParams<{ q?: string }>();
  return (
    <SearchScreen
      key={q ?? ""}
      query={(q ?? '').trim()}
      onOpenPost={(post) => router.push({ pathname: '/posts/[id]', params: { id: post.id } })}
    />
  );
}
