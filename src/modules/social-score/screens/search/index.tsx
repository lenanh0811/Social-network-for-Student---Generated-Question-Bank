import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Screen } from '@/components/screen';
import { useAuth } from '@/context/auth';
import { sendFriendRequest } from '@/modules/relationship-privacy/api/client';
import type { FriendState } from '@/modules/relationship-privacy/api/types';
import { socialApi } from '@/modules/social-score/api/social-api';
import type { post, social_user } from '@/modules/social-score/api/types';
import { Avatar } from '@/modules/social-score/components/avatar';
import { PostCard } from '@/modules/social-score/components/post-card';
import { colors } from '@/theme';
import { go } from '@/utils/navigation';

const ROLE = { student: 'Sinh viên', lecturer: 'Giảng viên', admin: 'Quản trị viên' } as const;

/** Một người trong kết quả tìm kiếm: bấm vào để xem hồ sơ, có nút Kết bạn (chỉ với người cùng vai trò). */
function PersonResult({ person }: { person: social_user }) {
  const { user } = useAuth();
  const [state, setState] = useState<FriendState>('none');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const canFriend = person.id !== user.id && (!person.role || person.role === user.role);

  const add = async () => {
    setBusy(true); setError(undefined);
    try { setState(await sendFriendRequest(person.id)); }
    catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  };
  const sub = [person.role ? ROLE[person.role] : undefined, person.faculty, person.major].filter(Boolean).join(' · ');

  return (
    <View style={{ gap: 4 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Pressable onPress={() => go(`/users/${person.id}`)} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, minWidth: 0 }}>
          <Avatar user={person} size={56} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }} numberOfLines={1}>{person.name}</Text>
            {sub ? <Text style={{ fontSize: 13, color: colors.muted }} numberOfLines={1}>{sub}</Text> : null}
            {person.code ? <Text style={{ fontSize: 12, color: colors.muted }}>{person.code}</Text> : null}
          </View>
        </Pressable>
        {canFriend ? (
          state === 'none'
            ? <Button small icon="person-add" title="Kết bạn" onPress={add} loading={busy} />
            : <Button small variant="outline" title={state === 'friends' ? 'Bạn bè' : 'Đã gửi lời mời'} onPress={() => go(`/users/${person.id}`)} />
        ) : null}
      </View>
      {error ? <Text style={{ color: colors.danger, fontSize: 12 }}>{error}</Text> : null}
    </View>
  );
}

/** Kết quả tìm kiếm cho từ khoá `query` (nhập ở thanh tìm kiếm trên navbar): mọi người + bài viết. */
export function SearchScreen({ query, onOpenPost }: { query: string; onOpenPost: (post: post) => void }) {
  const [posts, setPosts] = useState<post[]>([]);
  const [users, setUsers] = useState<social_user[]>([]);
  const [loading, setLoading] = useState(!!query);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!query) return;
    let cancelled = false;
    Promise.all([socialApi.search(query, 'USER'), socialApi.search(query, 'POST')])
      .then(([u, p]) => { if (!cancelled) { setUsers(u.users); setPosts(p.posts); setError(null); } })
      .catch((cause) => { if (!cancelled) setError(cause instanceof Error ? cause.message : 'Không thể tìm kiếm.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [query]);

  const empty = !loading && !error && query && users.length === 0 && posts.length === 0;
  return (
    <Screen>
      <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>
        {query ? `Kết quả cho "${query}"` : 'Nhập từ khoá vào thanh tìm kiếm phía trên'}
      </Text>
      {loading ? <ActivityIndicator color={colors.primary} /> : null}
      {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}
      {empty ? <Text style={{ color: colors.muted }}>Không tìm thấy kết quả nào.</Text> : null}
      {users.length > 0 ? (
        <Card style={{ gap: 14 }}>
          <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text }}>Mọi người</Text>
          {users.map((u) => <PersonResult key={u.id} person={u} />)}
        </Card>
      ) : null}
      {posts.length > 0 ? <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text }}>Bài viết</Text> : null}
      {posts.map((post) => (
        <PostCard key={post.id} post={post} onOpen={() => onOpenPost(post)}
          onUpdate={(next) => setPosts((list) => list.map((p) => (p.id === next.id ? next : p)))} />
      ))}
    </Screen>
  );
}
