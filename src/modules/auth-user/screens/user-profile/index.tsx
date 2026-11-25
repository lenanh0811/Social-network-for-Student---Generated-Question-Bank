import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, useWindowDimensions, View } from 'react-native';
import { getUser } from '@/modules/auth-user/api/client';
import { InfoRow } from '@/modules/auth-user/components/auth-ui';
import { ProfileHero } from '@/modules/auth-user/components/profile-hero';
import { RelationshipPanel } from '@/modules/relationship-privacy/components/relationship-panel';
import { socialApi } from '@/modules/social-score/api/social-api';
import type { post } from '@/modules/social-score/api/types';
import { PostCard } from '@/modules/social-score/components/post-card';
import { useLoad } from '@/hooks/use-load';
import { colors } from '@/theme';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { ErrorBox } from '@/components/error-box';
import { go } from '@/utils/navigation';
import { H2 } from '@/components/heading';
import { Header } from '@/components/header';
import { Loading } from '@/components/loading';
import { Muted } from '@/components/muted';
import { Screen } from '@/components/screen';

const ROLE = { student: 'Sinh viên', lecturer: 'Giảng viên', admin: 'Quản trị viên' } as const;

function UserPosts({ userId }: { userId: string }) {
  const [posts, setPosts] = useState<post[]>([]);
  const { loading, error } = useLoad(async () => { const p = await socialApi.getUserPosts(userId); setPosts(p.posts); return p; }, [userId]);
  return (
    <>
      {loading ? <ActivityIndicator color={colors.primary} style={{ margin: 20 }} /> : null}
      {error ? <Card><Muted>{error}</Muted></Card> : null}
      {!loading && !error && posts.length === 0 ? <Card style={{ alignItems: 'center', paddingVertical: 28 }}><Muted>Chưa có bài viết nào.</Muted></Card> : null}
      {posts.map((p) => (
        <PostCard key={p.id} post={p} onOpen={() => go(`/posts/${p.id}`)} onUpdate={(u) => setPosts((c) => c.map((x) => (x.id === u.id ? u : x)))} />
      ))}
    </>
  );
}

/** GET /users/{userId} — hồ sơ công khai của người khác, trình bày giống trang cá nhân của tôi. */
export default function UserProfileScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const { data: u, error, loading, reload } = useLoad(() => getUser(userId), [userId]);
  const [tab, setTab] = useState<'posts' | 'about'>('posts');
  const wide = useWindowDimensions().width >= 960;

  const about = u ? (
    <Card>
      <H2>Giới thiệu</H2>
      <InfoRow icon="person-outline" label="Vai trò" value={ROLE[u.role]} />
      <InfoRow icon="business-outline" label="Khoa / Trường" value={u.faculty} />
      {u.role === 'student' ? <InfoRow icon="school-outline" label="Chuyên ngành" value={u.major} /> : null}
      {u.role === 'student' ? <InfoRow icon="people-outline" label="Lớp" value={u.className} /> : null}
    </Card>
  ) : null;

  return (
    <Screen wide>
      <Header title={u?.name ?? 'Hồ sơ'} />
      {loading && !u ? <Loading /> : null}
      {error ? <ErrorBox message={error} onRetry={reload} /> : null}
      {u ? (
        <View style={{ width: '100%', maxWidth: 940, alignSelf: 'center', gap: 12 }}>
          <ProfileHero
            name={u.name} avatarUrl={u.avatarUrl}
            subtitle={[ROLE[u.role], u.faculty, u.role === 'student' ? u.major : undefined].filter(Boolean).join(' · ')}
            bio={u.bio}
            tabs={[['posts', 'Bài viết'], ['about', 'Giới thiệu']] as const}
            tab={tab} setTab={setTab}
          />
          <RelationshipPanel userId={u.id} name={u.name} role={u.role} />
          {wide && tab === 'posts' ? (
            <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
              <View style={{ flex: 4, gap: 12, minWidth: 0 }}>
                {about}
                <Button title="Xem câu hỏi đã đóng góp" variant="outline" icon="albums-outline" onPress={() => go(`/exam-bank/user/${u.id}`)} />
              </View>
              <View style={{ flex: 6, gap: 12, minWidth: 0 }}><UserPosts userId={u.id} /></View>
            </View>
          ) : tab === 'posts' ? <UserPosts userId={u.id} /> : (
            <>
              {about}
              <Button title="Xem câu hỏi đã đóng góp" variant="outline" icon="albums-outline" onPress={() => go(`/exam-bank/user/${u.id}`)} />
            </>
          )}
        </View>
      ) : null}
    </Screen>
  );
}
