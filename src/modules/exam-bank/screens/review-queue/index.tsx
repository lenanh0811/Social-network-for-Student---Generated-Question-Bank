import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { questionCountOf } from '@/modules/exam-bank/api/types';
import { approveSessions, listPendingSessions, rejectSessions } from '@/modules/exam-bank/api/client';
import NeedsEditList from './needs-edit-list';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Empty } from '@/components/empty';
import { ErrorBox } from '@/components/error-box';
import { fmtDate } from '@/utils/format-date';
import { Field } from '@/components/field';
import { go } from '@/utils/navigation';
import { H1 } from '@/components/heading';
import { Loading } from '@/components/loading';
import { Muted } from '@/components/muted';
import { Row } from '@/components/row';
import { Screen } from '@/components/screen';
import { Segmented } from '@/components/segmented';
import { useLoad } from '@/hooks/use-load';
import { colors } from '@/theme';

/** API 21: hàng đợi duyệt. Duyệt/từ chối hàng loạt: API 23, 24. Chạm thẻ → chi tiết (API 22). */
export default function Review() {
  const { data, loading, error, reload } = useLoad(listPendingSessions);
  const [tab, setTab] = useState<'pending' | 'needs-edit'>('pending');
  const [sel, setSel] = useState<string[]>([]);
  const [reason, setReason] = useState('');
  const [rejecting, setRejecting] = useState(false);
  const [busy, setBusy] = useState(false);
  const toggle = (id: string) => setSel((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try { await fn(); setSel([]); setRejecting(false); setReason(''); await reload(); } finally { setBusy(false); }
  };

  return (
    <View style={{ flex: 1 }}>
      <Screen wide
        onRefresh={reload} refreshing={loading && !!data}
        footer={tab === 'pending' && sel.length ? (
          rejecting ? (
            <>
              <Field label={`Lý do từ chối ${sel.length} phiên`} value={reason} onChangeText={setReason} multiline placeholder="Nêu rõ để sinh viên chỉnh sửa..." />
              <Row><Button title="Huỷ" variant="outline" onPress={() => setRejecting(false)} />
                <Button title="Xác nhận từ chối" variant="danger" loading={busy} disabled={!reason.trim()} onPress={() => run(() => rejectSessions(sel, reason.trim()))} /></Row>
            </>
          ) : (
            <Row style={{ justifyContent: 'space-between' }}>
              <Text style={{ fontWeight: '700' }}>Đã chọn {sel.length}</Text>
              <Row>
                <Button title="Từ chối" icon="close" variant="outline" onPress={() => setRejecting(true)} />
                <Button title="Duyệt" icon="checkmark" variant="success" loading={busy} onPress={() => run(() => approveSessions(sel))} />
              </Row>
            </Row>
          )
        ) : undefined}
      >
        <H1>Duyệt câu hỏi</H1>
        <Segmented value={tab} onChange={setTab} options={[{ value: 'pending', label: 'Phiên chờ duyệt' }, { value: 'needs-edit', label: 'Cần edit' }]} />
        {tab === 'needs-edit' ? <NeedsEditList /> : <>
        <Muted>Chọn nhiều phiên để duyệt/từ chối cùng lúc, hoặc chạm vào phiên để xem từng câu hỏi.</Muted>
        {error ? <ErrorBox message={error} onRetry={reload} /> : null}
        {loading && !data ? <Loading /> : null}
        {data && !data.length ? <Empty icon="checkmark-done-circle-outline" text="Không còn phiên nào chờ duyệt 🎉" /> : null}
        {data?.map((s) => (
          <Card key={s.id} onPress={() => go(`/exam-bank/review/${s.id}`)}>
            <Row style={{ flexWrap: 'nowrap', alignItems: 'flex-start' }}>
              <Pressable onPress={() => toggle(s.id)} hitSlop={10}>
                <Ionicons name={sel.includes(s.id) ? 'checkbox' : 'square-outline'} size={26} color={sel.includes(s.id) ? colors.primary : colors.muted} />
              </Pressable>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={{ fontSize: 16, fontWeight: '700' }}>{s.title}</Text>
                <Muted>{s.authorName} · {s.subject}</Muted>
                <Muted>{questionCountOf(s)} câu hỏi · gửi {fmtDate(s.createdAt)}</Muted>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.muted} />
            </Row>
          </Card>
        ))}
        </>}
      </Screen>
    </View>
  );
}
