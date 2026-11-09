import { router } from 'expo-router';
<<<<<<< HEAD
import { FeedScreen } from '@/modules/social-score/screens/FeedScreen';
=======
import { FeedScreen } from '@/modules/social-score/screens/feed';
>>>>>>> fed398ac514d13c30ab4eca5ecc037814267bb1f

export default function SocialFeedRoute() {
  return (
    <FeedScreen
      onOpenPost={(post) => router.push({ pathname: '/posts/[id]', params: { id: post.id } })}
      onCreatePost={() => router.push('/create')}
<<<<<<< HEAD
      onOpenSearch={() => router.push('/search')}
=======
>>>>>>> fed398ac514d13c30ab4eca5ecc037814267bb1f
    />
  );
}
