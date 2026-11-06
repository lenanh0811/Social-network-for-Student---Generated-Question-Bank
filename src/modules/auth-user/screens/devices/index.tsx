import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { listDevices, logoutDevice, removeDevice } from '@/modules/auth-user/api/client';
import type { Device } from '@/modules/auth-user/api/types';
import { Notice } from '@/modules/auth-user/components/auth-ui';
import { useLoad } from '@/hooks/use-load';
import { colors } from '@/theme';
import { Badge } from '@/components/badge';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Empty } from '@/components/empty';
import { ErrorBox } from '@/components/error-box';
import { Header } from '@/components/header';
import { Loading } from '@/components/loading';
import { Muted } from '@/components/muted';
import { Row } from '@/components/row';
import { Screen } from '@/components/screen';

const ago = (iso?: string) => {
  if (!iso) return 'không rõ';
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  return m < 1 ? 'vừa xong' : m < 60 ? `${m} phút trước` : m < 1440 ? `${Math.round(m / 60)} giờ trước` : `${Math.round(m / 1440)} ngày trước`;
};
const icon = (p: string) => (p === 'WEB' || p === 'DESKTOP' ? 'desktop-outline' : 'phone-portrait-outline');

/** GET /devices · POST /devices/{deviceId}/logout · DELETE /devices/{deviceId} */
export default function DevicesScreen() {
  const { data, error, loading, reload, setData } = useLoad(listDevices);
  const [busy, setBusy] = useState<string>();
  const [actionError, setActionError] = useState('');

  const act = async (d: Device, kind: 'logout' | 'remove') => {
    setBusy(`${kind}:${d.id}`);
    setActionError('');
    try {
      if (kind === 'logout') {
        await logoutDevice(d.id);
        setData((list) => list?.map((x) => (x.id === d.id ? { ...x, active: false } : x)));
      } else {
        await removeDevice(d.id);
        setData((list) => list?.filter((x) => x.id !== d.id));
      }
    } catch (e) {
      setActionError((e as Error).message);
    } finally {
      setBusy(undefined);
    }
  };

  return (
    <Screen onRefresh={reload} refreshing={loading && !!data}>
      <Header title="Thiết bị đăng nhập" />
      <Muted>Các thiết bị đã đăng nhập tài khoản của bạn. Đăng xuất ngay thiết bị lạ nếu bạn không nhận ra.</Muted>
      {actionError ? <Notice>{actionError}</Notice> : null}
      {error ? <ErrorBox message={error} onRetry={reload} /> : null}
      {loading && !data ? <Loading /> : null}
      {data && !data.length ? <Empty icon="phone-portrait-outline" text="Không có thiết bị nào." /> : null}
      {[...(data ?? [])].sort((a, b) => Number(b.current) - Number(a.current) || Number(b.active) - Number(a.active)).map((d) => (
        <Card key={d.id}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: d.active ? colors.primarySoft : 'rgba(0,0,0,0.06)', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name={icon(d.platform)} size={22} color={d.active ? colors.primary : colors.muted} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ fontWeight: '700', fontSize: 15, color: colors.text }}>{d.name}</Text>
              <Muted>{[d.platform, d.osVersion].filter(Boolean).join(' · ')}</Muted>
              <Muted>Hoạt động {ago(d.lastActiveAt)}</Muted>
            </View>
            {d.current
              ? <Badge label="Thiết bị này" fg={colors.success} bg={colors.successSoft} />
              : !d.active ? <Badge label="Đã đăng xuất" fg={colors.muted} bg="rgba(0,0,0,0.06)" /> : null}
          </View>
          {d.current ? null : (
            <Row style={{ justifyContent: 'flex-end' }}>
              {d.active ? <Button small variant="outline" icon="log-out-outline" title="Đăng xuất" onPress={() => act(d, 'logout')} loading={busy === `logout:${d.id}`} /> : null}
              <Button small variant="outline" icon="trash-outline" title="Xoá" onPress={() => act(d, 'remove')} loading={busy === `remove:${d.id}`} />
            </Row>
          )}
        </Card>
      ))}
    </Screen>
  );
}
