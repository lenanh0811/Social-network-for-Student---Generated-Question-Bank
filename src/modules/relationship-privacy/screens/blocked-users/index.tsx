import { useState } from 'react';
import { Notice } from '@/modules/auth-user/components/auth-ui';
import { listBlocked, unblock } from '@/modules/relationship-privacy/api/client';
import { describe, PersonRow } from '@/modules/relationship-privacy/components/person-row';
import { useLoad } from '@/hooks/use-load';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Empty } from '@/components/empty';
import { ErrorBox } from '@/components/error-box';
import { Header } from '@/components/header';
import { Loading } from '@/components/loading';
import { Muted } from '@/components/muted';
import { Screen } from '@/components/screen';

/** GET /blocks · DELETE /blocks/{targetUserId} */
export default function BlockedUsersScreen() {
  const { data, error, loading, reload, setData } = useLoad(listBlocked);
  const [busy, setBusy] = useState<string>();
  const [notice, setNotice] = useState<{ tone: 'success' | 'danger'; text: string }>();

  const onUnblock = async (id: string, name: string) => {
    setBusy(id);
    setNotice(undefined);
    try {
      await unblock(id);
      setData((d) => d && { items: d.items.filter((p) => p.id !== id), total: Math.max(0, d.total - 1) });
      setNotice({ tone: 'success', text: `Đã bỏ chặn ${name}. Quan hệ bạn bè/theo dõi trước đây không tự khôi phục.` });
    } catch (e) {
      setNotice({ tone: 'danger', text: (e as Error).message });
    } finally {
      setBusy(undefined);
    }
  };

  return (
    <Screen onRefresh={reload} refreshing={loading && !!data}>
      <Header title="Người dùng đã chặn" />
      <Muted>Người bị chặn không thể kết bạn, theo dõi hay tương tác với bạn. Họ không nhận được thông báo khi bị chặn.</Muted>
      {notice ? <Notice tone={notice.tone}>{notice.text}</Notice> : null}
      {error ? <ErrorBox message={error} onRetry={reload} /> : null}
      {loading && !data ? <Loading /> : null}
      {data && !data.items.length ? <Empty icon="shield-checkmark-outline" text="Bạn chưa chặn ai." /> : null}
      {data?.items.length ? (
        <Card style={{ paddingVertical: 4 }}>
          {data.items.map((p, i, l) => (
            <PersonRow key={p.id} person={p} last={i === l.length - 1} subtitle={describe({ ...p, mutualFriends: undefined }, 'chặn')}>
              <Button title="Bỏ chặn" small variant="outline" loading={busy === p.id} onPress={() => onUnblock(p.id, p.name)} />
            </PersonRow>
          ))}
        </Card>
      ) : null}
    </Screen>
  );
}
