import { router } from 'expo-router';
<<<<<<< HEAD
import { CreatePostScreen } from '@/modules/social-score/screens/CreatePostScreen';

export default function CreatePostRoute() {
  return (
    <CreatePostScreen
      onCancel={() => router.back()}
      onCreated={() => router.back()}
    />
  );
=======
import { CreatePostScreen } from '@/modules/social-score/screens/create-post';

export default function CreatePostRoute() {
  return <CreatePostScreen onCreated={() => router.back()} />;
>>>>>>> fed398ac514d13c30ab4eca5ecc037814267bb1f
}
