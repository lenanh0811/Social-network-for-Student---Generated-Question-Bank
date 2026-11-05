import { router } from 'expo-router';
import { CreatePostScreen } from '../screens/CreatePostScreen';

export default function CreatePostRoute() {
  return (
    <CreatePostScreen
      onCancel={() => router.back()}
      onCreated={() => router.back()}
    />
  );
}
