import { Text } from 'react-native';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { colors } from '@/theme';

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <Card style={{ backgroundColor: 'rgba(253,232,232,0.8)' }}>
      <Text style={{ color: colors.danger, fontWeight: '600' }}>{message}</Text>
      {onRetry ? <Button title="Thử lại" variant="outline" small onPress={onRetry} /> : null}
    </Card>
  );
}
