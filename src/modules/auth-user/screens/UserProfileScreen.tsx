import { useLocalSearchParams } from 'expo-router';
import { Text } from 'react-native';
import { getUser } from '@/modules/auth-user/api/client';
import { Avatar, InfoRow } from '@/modules/auth-user/components/AuthUi';
import { useLoad } from '@/shared/hooks';
import { colors } from '@/shared/theme';
import { Badge, Button, Card, ErrorBox, go, H1, Header, Loading, Screen } from '@/shared/ui';

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
          <Card>
            <InfoRow icon="business-outline" label="Khoa / Trường" value={u.faculty} />
            {u.role === 'student' ? <InfoRow icon="people-outline" label="Lớp" value={u.className} /> : null}
          </Card>
          <Button title="Xem câu hỏi đã đóng góp" variant="outline" icon="albums-outline" onPress={() => go(`/exam-bank/user/${u.id}`)} />
        </>
      ) : null}
    </Screen>
  );
}
