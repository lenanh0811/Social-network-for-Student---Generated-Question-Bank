import { router } from 'expo-router';
import { SearchScreen } from '../../screens/SearchScreen';

export default function SearchRoute() {
  return (
    <SearchScreen
      onOpenPost={(post) => router.push({ pathname: '/posts/[id]', params: { id: post.id } })}
    />
  );
}
