import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Notice } from '@/modules/auth-user/components/auth-ui';
import {
  acceptFriendRequest, block, cancelFriendRequest, declineFriendRequest, follow, getRelationship, sendFriendRequest, unblock, unfollow, unfriend,
} from '@/modules/relationship-privacy/api/client';
import type { Relationship } from '@/modules/relationship-privacy/api/types';
import { useAuth } from '@/context/auth';
import { useLoad } from '@/hooks/use-load';
import { colors } from '@/theme';
import type { Role } from '@/types';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { go } from '@/utils/navigation';
import { Loading } from '@/components/loading';
import { Muted } from '@/components/muted';
import { Row } from '@/components/row';

type Confirm = 'unfriend' | 'block' | null;

/**
 * Thống kê + nút kết bạn / theo dõi / chặn / báo cáo trên hồ sơ người khác.
 * Kết bạn chỉ hiện với người cùng vai trò (luật của server).
 */
export function RelationshipPanel({ userId, name, role }: { userId: string; name: string; role: Role }) {
  const { user } = useAuth();
  const { data: rel, error, reload, setData } = useLoad(() => getRelationship(userId), [userId]);
  const [busy, setBusy] = useState<string>();
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [message, setMessage] = useState<{ tone: 'success' | 'danger'; text: string }>();

  if (userId === user.id) return null;
  const sameRole = role === user.role;
  const patch = (p: Partial<Relationship> | ((r: Relationship) => Partial<Relationship>)) =>
    setData((r) => (r ? { ...r, ...(typeof p === 'function' ? p(r) : p) } : r));
  const counts = (r: Relationship, k: keyof Relationship['counts'], d: number) => ({ ...r.counts, [k]: Math.max(0, r.counts[k] + d) });

  const run = async (key: string, fn: () => Promise<void>, ok?: string) => {
    setBusy(key);
    setMessage(undefined);
    try {
      await fn();
      setConfirm(null);
      if (ok) setMessage({ tone: 'success', text: ok });
    } catch (e) {
      setMessage({ tone: 'danger', text: (e as Error).message });
      reload(); // đồng bộ lại trạng thái thật nếu thao tác lỗi (vd đã là bạn bè từ trước)
    } finally {
      setBusy(undefined);
    }
  };

  const actions = {
    request: () => run('friend', async () => {
      const next = await sendFriendRequest(userId);
      patch((r) => ({ friend: next, counts: next === 'friends' ? counts(r, 'friends', 1) : r.counts }));
    }),
    accept: () => run('friend', async () => {
      await acceptFriendRequest(userId);
      patch((r) => ({ friend: 'friends', counts: counts(r, 'friends', 1) }));
    }, `Bạn và ${name} đã là bạn bè.`),
    decline: () => run('decline', async () => {
      await declineFriendRequest(userId);
      patch({ friend: 'none' });
    }),
    cancel: () => run('friend', async () => {
      await cancelFriendRequest(userId);
      patch({ friend: 'none' });
    }),
    unfriend: () => run('friend', async () => {
      await unfriend(userId);
      patch((r) => ({ friend: 'none', counts: counts(r, 'friends', -1) }));
    }),
    follow: () => run('follow', async () => {
      const followers = rel?.following ? await unfollow(userId) : await follow(userId);
      patch((r) => ({ following: !r.following, counts: { ...r.counts, followers } }));
    }),
    block: () => run('block', async () => {
      await block(userId);
      // Server tự huỷ kết bạn + theo dõi 2 chiều => tải lại số liệu.
      setData(await getRelationship(userId));
    }, `Đã chặn ${name}.`),
    unblock: () => run('block', async () => {
      await unblock(userId);
      patch({ blocked: false });
    }, `Đã bỏ chặn ${name}.`),
  };

  if (!rel) return error ? <Notice action={<Button small variant="outline" title="Thử lại" onPress={reload} />}>{error}</Notice> : <Loading />;

  return (
    <>
      <Card style={{ paddingVertical: 14 }}>
        <View style={s.stats}>
          <Stat value={rel.counts.friends} label="Bạn bè" />
          <Stat value={rel.counts.followers} label="Người theo dõi" />
          <Stat value={rel.counts.following} label="Đang theo dõi" />
        </View>
        {rel.followedBy && !rel.blocked ? <Muted style={{ textAlign: 'center', fontSize: 13 }}>{name} đang theo dõi bạn</Muted> : null}
      </Card>

      {message ? <Notice tone={message.tone}>{message.text}</Notice> : null}

      {rel.blocked ? (
        <Card>
          <Text style={s.title}>Bạn đã chặn {name}</Text>
          <Muted>Hai người không thể kết bạn hay theo dõi nhau cho tới khi bạn bỏ chặn.</Muted>
          <Button title="Bỏ chặn" variant="outline" icon="lock-open-outline" loading={busy === 'block'} onPress={actions.unblock} />
        </Card>
      ) : confirm ? (
        <Card>
          <Text style={s.title}>{confirm === 'block' ? `Chặn ${name}?` : `Huỷ kết bạn với ${name}?`}</Text>
          <Muted>
            {confirm === 'block'
              ? 'Hệ thống sẽ huỷ kết bạn và theo dõi giữa hai người. Người này không thể tìm thấy hay tương tác với bạn. Bạn có thể bỏ chặn sau.'
              : 'Hai người sẽ không còn là bạn bè. Việc theo dõi vẫn giữ nguyên.'}
          </Muted>
          <Row style={{ flexWrap: 'wrap' }}>
            <Button
              title={confirm === 'block' ? 'Chặn' : 'Huỷ kết bạn'} variant="danger" small
              loading={busy === 'block' || busy === 'friend'} onPress={confirm === 'block' ? actions.block : actions.unfriend}
            />
            <Button title="Thôi" variant="outline" small onPress={() => setConfirm(null)} />
          </Row>
        </Card>
      ) : (
        <Card>
          <Row style={{ flexWrap: 'wrap' }}>
            {!sameRole ? null : rel.friend === 'none' ? (
              <Button title="Kết bạn" icon="person-add-outline" small loading={busy === 'friend'} onPress={actions.request} />
            ) : rel.friend === 'outgoing' ? (
              <Button title="Rút lời mời" icon="close-outline" small variant="soft" loading={busy === 'friend'} onPress={actions.cancel} />
            ) : rel.friend === 'incoming' ? (
              <>
                <Button title="Chấp nhận" icon="checkmark" small variant="success" loading={busy === 'friend'} onPress={actions.accept} />
                <Button title="Từ chối" small variant="outline" loading={busy === 'decline'} onPress={actions.decline} />
              </>
            ) : (
              <Button title="Bạn bè" icon="people" small variant="soft" onPress={() => setConfirm('unfriend')} />
            )}
            <Button
              title={rel.following ? 'Đang theo dõi' : rel.followedBy ? 'Theo dõi lại' : 'Theo dõi'}
              icon={rel.following ? 'checkmark-circle' : 'add-circle-outline'}
              small variant={rel.following ? 'outline' : sameRole && rel.friend === 'none' ? 'outline' : 'primary'}
              loading={busy === 'follow'} onPress={actions.follow}
            />
          </Row>
          {rel.friend === 'incoming' ? <Muted style={{ fontSize: 13 }}>{name} đã gửi cho bạn lời mời kết bạn.</Muted> : null}
          {rel.friend === 'outgoing' ? <Muted style={{ fontSize: 13 }}>Đang chờ {name} chấp nhận.</Muted> : null}
          {!sameRole ? <Muted style={{ fontSize: 13 }}>Chỉ kết bạn được với người cùng vai trò (sinh viên – sinh viên, giảng viên – giảng viên). Bạn vẫn có thể theo dõi.</Muted> : null}
          <View style={s.divider} />
          <Row style={{ flexWrap: 'wrap' }}>
            <Button title="Chặn" icon="ban-outline" small variant="outline" onPress={() => setConfirm('block')} />
            <Button
              title="Báo cáo" icon="flag-outline" small variant="outline"
              onPress={() => go(`/report?targetType=USER&targetId=${encodeURIComponent(userId)}&name=${encodeURIComponent(name)}`)}
            />
          </Row>
        </Card>
      )}
    </>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <View style={s.stat} accessible accessibilityLabel={`${value} ${label}`}>
      <Text style={s.statValue}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  stats: { flexDirection: 'row', justifyContent: 'space-around' },
  stat: { alignItems: 'center', gap: 2, flex: 1 },
  statValue: { fontSize: 20, fontWeight: '600', color: colors.text },
  statLabel: { fontSize: 12, color: colors.muted },
  title: { fontSize: 16, fontWeight: '600', color: colors.text },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
});
