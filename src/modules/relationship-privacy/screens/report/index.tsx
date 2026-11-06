import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AuthError } from '@/modules/auth-user/api/types';
import { Notice } from '@/modules/auth-user/components/auth-ui';
import { report } from '@/modules/relationship-privacy/api/client';
import type { ReportResult, ReportTarget, ViolationType } from '@/modules/relationship-privacy/api/types';
import { colors } from '@/theme';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Field } from '@/components/field';
import { H1 } from '@/components/heading';
import { Header } from '@/components/header';
import { Muted } from '@/components/muted';
import { Screen } from '@/components/screen';

const TYPES: { value: ViolationType; label: string; hint: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'HARASSMENT', label: 'Quấy rối, bắt nạt', hint: 'Lăng mạ, đe doạ, làm phiền hoặc nhắm vào ai đó liên tục.', icon: 'hand-left-outline' },
  { value: 'HATE_STATEMENT', label: 'Ngôn từ thù ghét', hint: 'Xúc phạm, phân biệt vùng miền, giới tính, tôn giáo, dân tộc…', icon: 'megaphone-outline' },
  { value: 'SPAM', label: 'Spam, quảng cáo, lừa đảo', hint: 'Đăng link rác, quảng cáo, mạo danh hoặc lừa đảo.', icon: 'mail-unread-outline' },
  { value: 'OTHER', label: 'Lý do khác', hint: 'Vi phạm tiêu chuẩn cộng đồng khác. Hãy mô tả cụ thể bên dưới.', icon: 'ellipsis-horizontal-circle-outline' },
];
const TARGET: Record<ReportTarget, string> = { USER: 'người dùng', POST: 'bài viết', COMMENT: 'bình luận' };
const MAX = 1000;

/** POST /report — báo cáo người dùng / bài viết / bình luận. Mở bằng /report?targetType=USER&targetId=..&name=.. */
export default function ReportScreen() {
  const params = useLocalSearchParams<{ targetType?: ReportTarget; targetId?: string; name?: string }>();
  const targetType: ReportTarget = params.targetType && params.targetType in TARGET ? params.targetType : 'USER';
  const [type, setType] = useState<ViolationType>();
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<{ type?: string; description?: string }>({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ReportResult>();

  const submit = async () => {
    const e = {
      type: type ? undefined : 'Chọn loại vi phạm',
      description: type === 'OTHER' && !description.trim() ? 'Vui lòng mô tả vi phạm' : description.length > MAX ? `Tối đa ${MAX} ký tự` : undefined,
    };
    setErrors(e);
    setFormError('');
    if (e.type || e.description || !type || !params.targetId) {
      if (!params.targetId) setFormError('Thiếu đối tượng cần báo cáo.');
      return;
    }
    setBusy(true);
    try {
      setResult(await report({ targetType, targetId: params.targetId, violationType: type, description }));
    } catch (err) {
      if (err instanceof AuthError && err.fields?.description) setErrors({ description: err.fields.description });
      else setFormError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (result) {
    return (
      <Screen>
        <Header title="Đã gửi báo cáo" />
        <Card style={{ alignItems: 'center', paddingVertical: 28, gap: 10 }}>
          <Ionicons name="checkmark-circle" size={64} color={colors.success} />
          <H1>Cảm ơn bạn đã báo cáo</H1>
          <Muted style={{ textAlign: 'center' }}>
            Báo cáo #{result.id} {result.status === 'PENDING' ? 'đang chờ quản trị viên xem xét' : 'đã được xử lý'}.
            {'\n'}Danh tính của bạn được giữ kín với người bị báo cáo.
          </Muted>
        </Card>
        <Button title="Xong" onPress={() => router.back()} />
      </Screen>
    );
  }

  return (
    <Screen>
      <Header title="Báo cáo vi phạm" />
      <Muted>
        Bạn đang báo cáo {TARGET[targetType]}{params.name ? <Text style={{ fontWeight: '700', color: colors.text }}> {params.name}</Text> : null}.
        Báo cáo sai sự thật nhiều lần có thể khiến tài khoản của bạn bị hạn chế.
      </Muted>
      {formError ? <Notice>{formError}</Notice> : null}

      <Card style={{ paddingVertical: 4 }}>
        {TYPES.map((t, i) => {
          const on = type === t.value;
          return (
            <Pressable
              key={t.value}
              onPress={() => { setType(t.value); setErrors((p) => ({ ...p, type: undefined })); }}
              style={({ pressed }) => [s.option, i < TYPES.length - 1 && s.divider, pressed && { opacity: 0.6 }]}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
            >
              <Ionicons name={t.icon} size={22} color={on ? colors.primary : colors.muted} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={[s.label, on && { color: colors.primary }]}>{t.label}</Text>
                <Text style={s.hint}>{t.hint}</Text>
              </View>
              <Ionicons name={on ? 'radio-button-on' : 'radio-button-off'} size={22} color={on ? colors.primary : colors.border} />
            </Pressable>
          );
        })}
      </Card>
      {errors.type ? <Text style={{ color: colors.danger, fontSize: 12 }}>{errors.type}</Text> : null}

      <Card>
        <Field
          label={`Mô tả chi tiết${type === 'OTHER' ? ' *' : ' (không bắt buộc)'} · ${description.length}/${MAX}`}
          value={description} onChangeText={setDescription} error={errors.description} multiline maxLength={MAX}
          placeholder="Điều gì đã xảy ra? Ở bài viết / tin nhắn nào?"
        />
      </Card>

      <Button title="Gửi báo cáo" icon="flag" variant="danger" loading={busy} onPress={submit} />
      <View style={{ height: 32 }} />
    </Screen>
  );
}

const s = StyleSheet.create({
  option: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  label: { fontSize: 15, fontWeight: '700', color: colors.text },
  hint: { fontSize: 12, color: colors.muted },
});
