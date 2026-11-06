import { useLocalSearchParams } from 'expo-router';
import { Text } from 'react-native';
import { getUser } from '@/modules/auth-user/api/client';
import { Avatar, InfoRow } from '@/modules/auth-user/components/auth-ui';
import { RelationshipPanel } from '@/modules/relationship-privacy/components/relationship-panel';
import { useLoad } from '@/hooks/use-load';
import { colors } from '@/theme';
import { Badge } from '@/components/badge';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { ErrorBox } from '@/components/error-box';
import { go } from '@/utils/navigation';
import { H1 } from '@/components/heading';
import { Header } from '@/components/header';
import { Loading } from '@/components/loading';
import { Screen } from '@/components/screen';

/** GET /users/{userId} — hồ sơ công khai của người khác. */
export default function UserProfileScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const { data: u, error, loading, reload } = useLoad(() => getUser(userId), [userId]);

  return (
    <Screen>
      <Header title={u?.name ?? 'Hồ sơ'} />
      {loading && !u ? <Loading /> : null}
      {error ? <ErrorBox message={error} onRetry={reload} /> : null}
      {u ? (
        <>
          <Card style={{ alignItems: 'center', paddingVertical: 28 }}>
            <Avatar name={u.name} size={88} />
            <H1>{u.name}</H1>
            <Badge label={u.role === 'lecturer' ? 'Giảng viên' : 'Sinh viên'} fg={colors.primary} bg={colors.primarySoft} />
            {u.bio ? <Text style={{ color: colors.text, textAlign: 'center' }}>{u.bio}</Text> : null}
          </Card>
          <RelationshipPanel userId={u.id} name={u.name} role={u.role} />
          <Card>
            <InfoRow icon="business-outline" label="Khoa / Trường" value={u.faculty} />
            {u.role === 'student' ? <InfoRow icon="school-outline" label="Chuyên ngành" value={u.major} /> : null}
            {u.role === 'student' ? <InfoRow icon="people-outline" label="Lớp" value={u.className} /> : null}
          </Card>
          <Button title="Xem câu hỏi đã đóng góp" variant="outline" icon="albums-outline" onPress={() => go(`/exam-bank/user/${u.id}`)} />
        </>
      ) : null}
    </Screen>
  );
}
