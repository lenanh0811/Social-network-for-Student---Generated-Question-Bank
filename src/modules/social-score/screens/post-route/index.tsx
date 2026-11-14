import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ErrorBox } from '@/components/error-box';
import { Loading } from '@/components/loading';
import { Screen } from '@/components/screen';
import { useAuth } from '@/context/auth';
import { socialApi } from '@/modules/social-score/api/social-api';
import type { post } from '@/modules/social-score/api/types';
import { PostScreen } from '@/modules/social-score/screens/post';
import { confirmAction, notify } from '@/modules/social-score/utils/dialog';

export default function PostRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [post, setPost] = useState<post | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    socialApi
      .getPost(id)
      .then((result) => { if (active) setPost(result); })
      .catch((cause: unknown) => { if (active) setError(cause instanceof Error ? cause.message : 'Không thể tải bài viết.'); });
    return () => { active = false; };
  }, [id]);

  const deletePost = () => {
    confirmAction('Xóa bài viết?', 'Bài viết sẽ bị xóa vĩnh viễn.', 'Xóa', async () => {
      try {
        await socialApi.deletePost(id);
        router.back();
      } catch (cause) {
        notify('Không thể xóa bài viết', cause instanceof Error ? cause.message : 'Vui lòng thử lại.');
      }
    });
  };

  if (error) return <Screen><ErrorBox message={error} onRetry={() => router.back()} /></Screen>;
  if (!post) return <Screen><Loading /></Screen>;

  return <PostScreen post={post} canManage={post.isOwner ?? post.author.id === user.id} onDelete={deletePost} onUpdate={setPost} />;
}
