import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import { listReviewableSessions } from '@/modules/exam-bank/api/client';
import { StatusBadge } from '@/modules/exam-bank/components/badges';
import { Card } from '@/components/card';
import { Empty } from '@/components/empty';
import { ErrorBox } from '@/components/error-box';
import { fmtDate } from '@/utils/format-date';
import { go } from '@/utils/navigation';
import { H1 } from '@/components/heading';
import { Loading } from '@/components/loading';
import { Muted } from '@/components/muted';
import { Row } from '@/components/row';
import { Screen } from '@/components/screen';
import { useLoad } from '@/hooks/use-load';
import { colors } from '@/theme';

/** API 21: các phiên đang chờ duyệt thuộc lớp học phần tôi phụ trách. Chạm một phiên để duyệt từng câu hỏi (API 22). */
export default function Review() {
  const { data, loading, error, reload } = useLoad(listReviewableSessions);
  return (
    <View style={{ flex: 1 }}>
      <Screen wide onRefresh={reload} refreshing={loading && !!data}>
        <H1>Duyệt câu hỏi</H1>
        <Muted>Chỉ hiện các phiên của lớp học phần bạn phụ trách. Mở một phiên để duyệt hoặc từ chối từng câu hỏi.</Muted>
        {error ? <ErrorBox message={error} onRetry={reload} /> : null}
        {loading && !data ? <Loading /> : null}
        {data && !data.length ? <Empty icon="checkmark-done-circle-outline" text="Không còn phiên nào chờ duyệt 🎉" /> : null}
        {data?.map((s) => (
          <Card key={s.id} onPress={() => go(`/exam-bank/review/${s.id}`)}>
            <Row style={{ flexWrap: 'nowrap', alignItems: 'flex-start' }}>
              <View style={{ flex: 1, gap: 4 }}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <StatusBadge status={s.status} />
                  <Muted>{fmtDate(s.createdAt)}</Muted>
                </Row>
                <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>{s.title}</Text>
                <Muted>{s.authorName || 'Sinh viên'} · {[s.subject, s.className].filter(Boolean).join(' · ')}</Muted>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.muted} />
            </Row>
          </Card>
        ))}
      </Screen>
    </View>
  );
}
