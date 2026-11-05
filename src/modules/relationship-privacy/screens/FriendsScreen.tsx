import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Notice } from '@/modules/auth-user/components/AuthUi';
import {
  acceptFriendRequest, declineFriendRequest, follow, listFollowers, listFollowing, listFriends, listReceivedRequests,
  listSentRequests, unfollow,
} from '@/modules/relationship-privacy/api/client';
import type { Person } from '@/modules/relationship-privacy/api/types';
import { describe, PersonRow } from '@/modules/relationship-privacy/components/PersonRow';
import { useLoad } from '@/shared/hooks';
import { colors } from '@/shared/theme';
import { Badge, Button, Card, Empty, ErrorBox, H2, Header, Loading, Muted, Screen, Segmented } from '@/shared/ui';

type Tab = 'friends' | 'requests' | 'followers' | 'following';
const TABS: { value: Tab; label: string }[] = [
  { value: 'friends', label: 'Bạn bè' },
  { value: 'requests', label: 'Lời mời' },
  { value: 'followers', label: 'Theo dõi tôi' },
  { value: 'following', label: 'Đang theo dõi' },
];
type Data = { main: Person[]; total: number; sent?: Person[] };

async function load(tab: Tab): Promise<Data> {
  if (tab === 'requests') {
    const [received, sent] = await Promise.all([listReceivedRequests(), listSentRequests()]);
    return { main: received.items, total: received.total, sent: sent.items };
  }
  const res = await (tab === 'friends' ? listFriends : tab === 'followers' ? listFollowers : listFollowing)();
  return { main: res.items, total: res.total };
}

/**
 * GET /friendships · /friendships/requests/received · /friendships/requests/sent · /follows/followers · /follows/following
 * + chấp nhận / từ chối lời mời, theo dõi lại, bỏ theo dõi ngay trong danh sách.
 */
export default function FriendsScreen() {
  const params = useLocalSearchParams<{ tab?: Tab }>();
  const [tab, setTab] = useState<Tab>(TABS.some((t) => t.value === params.tab) ? params.tab! : 'friends');
  const { data, error, loading, reload, setData } = useLoad(() => load(tab), [tab]);
  const [busy, setBusy] = useState<string>();
  const [notice, setNotice] = useState<{ tone: 'success' | 'danger'; text: string }>();

  const change = (t: Tab) => {
    setTab(t);
    setNotice(undefined);
    setData(undefined);
    router.setParams({ tab: t });
  };

  const act = async (key: string, fn: () => Promise<unknown>, update: (d: Data) => Data, ok?: string) => {
    setBusy(key);
    setNotice(undefined);
    try {
      await fn();
      setData((d) => (d ? update(d) : d));
      if (ok) setNotice({ tone: 'success', text: ok });
    } catch (e) {
      setNotice({ tone: 'danger', text: (e as Error).message });
    } finally {
      setBusy(undefined);
    }
  };
  const drop = (id: string) => (d: Data): Data => ({ ...d, main: d.main.filter((p) => p.id !== id), total: Math.max(0, d.total - 1) });
  const mark = (id: string, p: Partial<Person>) => (d: Data): Data => ({ ...d, main: d.main.map((x) => (x.id === id ? { ...x, ...p } : x)) });

  const row = (p: Person, i: number, list: Person[]) => {
    const last = i === list.length - 1;
    switch (tab) {
      case 'friends':
        return <PersonRow key={p.id} person={p} last={last} subtitle={describe(p, 'kết bạn')} />;
      case 'requests':
        return (
          <PersonRow key={p.id} person={p} last={last} subtitle={describe(p, 'gửi')}>
            <Button
              title="Chấp nhận" small variant="success" loading={busy === `accept:${p.id}`}
              onPress={() => act(`accept:${p.id}`, () => acceptFriendRequest(p.id), drop(p.id), `Bạn và ${p.name} đã là bạn bè.`)}
            />
            <Button
              title="Từ chối" small variant="outline" loading={busy === `decline:${p.id}`}
              onPress={() => act(`decline:${p.id}`, () => declineFriendRequest(p.id), drop(p.id))}
            />
          </PersonRow>
        );
      case 'followers':
        return (
          <PersonRow key={p.id} person={p} last={last} subtitle={describe(p, 'theo dõi')}>
            {p.iFollow
              ? <Badge label={p.friend ? 'Bạn bè' : 'Đã theo dõi lại'} fg={colors.success} bg={colors.successSoft} />
              : <Button title="Theo dõi lại" small loading={busy === `follow:${p.id}`} onPress={() => act(`follow:${p.id}`, () => follow(p.id), mark(p.id, { iFollow: true }))} />}
          </PersonRow>
        );
      case 'following':
        return (
          <PersonRow key={p.id} person={p} last={last} subtitle={[p.followsMe ? 'Theo dõi bạn' : null, describe(p, 'từ')].filter(Boolean).join(' · ')}>
            <Button title="Bỏ theo dõi" small variant="outline" loading={busy === `unfollow:${p.id}`} onPress={() => act(`unfollow:${p.id}`, () => unfollow(p.id), drop(p.id))} />
          </PersonRow>
        );
    }
  };

  const empty = {
    friends: 'Bạn chưa có bạn bè nào. Mở hồ sơ một bạn cùng lớp và bấm “Kết bạn”.',
    requests: 'Không có lời mời kết bạn nào đang chờ.',
    followers: 'Chưa có ai theo dõi bạn.',
    following: 'Bạn chưa theo dõi ai.',
  }[tab];

  return (
    <Screen onRefresh={reload} refreshing={loading && !!data}>
      <Header title="Bạn bè & theo dõi" />
      <Segmented value={tab} options={TABS} onChange={change} />
      {notice ? <Notice tone={notice.tone}>{notice.text}</Notice> : null}
      {error ? <ErrorBox message={error} onRetry={reload} /> : null}
      {!data && !error ? <Loading /> : null}
      {data ? (
        <>
          {tab === 'requests' ? <H2>Lời mời đã nhận{data.total ? ` (${data.total})` : ''}</H2> : <Muted>{data.total} người</Muted>}
          {data.main.length ? <Card style={{ paddingVertical: 4 }}>{data.main.map(row)}</Card> : <Empty icon="people-outline" text={empty} />}
          {tab === 'requests' && data.sent ? (
            <>
              <H2>Lời mời đã gửi{data.sent.length ? ` (${data.sent.length})` : ''}</H2>
              {data.sent.length ? (
                <Card style={{ paddingVertical: 4 }}>
                  {data.sent.map((p, i, l) => (
                    <PersonRow key={p.id} person={p} last={i === l.length - 1} subtitle={describe(p, 'gửi')}>
                      <Badge label="Đang chờ" fg={colors.warning} bg={colors.warningSoft} />
                    </PersonRow>
                  ))}
                </Card>
              ) : <Muted>Bạn chưa gửi lời mời nào.</Muted>}
            </>
          ) : null}
        </>
      ) : null}
    </Screen>
  );
}
