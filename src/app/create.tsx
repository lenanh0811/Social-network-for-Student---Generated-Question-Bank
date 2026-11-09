import { router } from 'expo-router';
import { CreatePostScreen } from '@/modules/social-score/screens/create-post';

export default function CreatePostRoute() {
  return (
    <CreatePostScreen
      onCancel={() => router.back()}
      onCreated={() => router.back()}
    />
  );
}
