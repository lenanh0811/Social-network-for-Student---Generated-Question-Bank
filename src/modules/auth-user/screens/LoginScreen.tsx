import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { isMock } from '@/modules/auth-user/api/client';
import { DEMO_ACCOUNTS } from '@/modules/auth-user/api/mockDb';
import { AuthError } from '@/modules/auth-user/api/types';
import { checkEmail, collect } from '@/modules/auth-user/api/validate';
import { AuthShell, Notice, PasswordField, TextLink } from '@/modules/auth-user/components/AuthUi';
import { useAuth } from '@/shared/context/Auth';
import { Button, Chip, Field, Muted, Row } from '@/shared/ui';

export default function LoginScreen() {
  const params = useLocalSearchParams<{ email?: string; verified?: string }>();
  const { signIn } = useAuth();
  const [email, setEmail] = useState(params.email ?? '');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<AuthError | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    const errs = collect({ email: checkEmail(email), password: password ? undefined : 'Vui lòng nhập mật khẩu' });
    setErrors(errs);
    setFormError(null);
    if (Object.keys(errs).length) return;
    setLoading(true);
    try {
      await signIn(email, password); // guard ở _layout tự chuyển sang trang chủ
    } catch (e) {
      const err = e instanceof AuthError ? e : new AuthError((e as Error).message, 0);
      setFormError(err);
      if (err.fields) setErrors(err.fields);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Đăng nhập"
      subtitle="Chào mừng bạn quay lại! Đăng nhập để tiếp tục học cùng bạn bè."
      footer={<Muted style={{ fontSize: 13, textAlign: 'center' }}>Dùng tài khoản do nhà trường cấp. Quên mật khẩu hãy liên hệ quản trị viên.</Muted>}
    >
      {params.verified ? <Notice tone="success">Xác thực email thành công. Hãy đăng nhập để bắt đầu.</Notice> : null}
      {formError ? <Notice tone="danger">{formError.message}</Notice> : null}
      <Field
        label="Email" value={email} onChangeText={setEmail} error={errors.email}
        placeholder="ten.ho@sis.hust.edu.vn" keyboardType="email-address" autoCapitalize="none" autoComplete="email" textContentType="emailAddress"
      />
      <PasswordField
        label="Mật khẩu" value={password} onChangeText={setPassword} error={errors.password}
        placeholder="••••••••" autoComplete="current-password" textContentType="password" onSubmitEditing={submit} returnKeyType="go"
      />
      <Button title="Đăng nhập" icon="log-in-outline" onPress={submit} loading={loading} />
      {isMock ? (
        <View style={{ gap: 8, marginTop: 4 }}>
          <Muted>Chế độ demo (chưa nối backend) — chọn tài khoản mẫu:</Muted>
          <Row>
            {DEMO_ACCOUNTS.map((a) => (
              <Chip key={a.email} label={a.label} onPress={() => { setEmail(a.email); setPassword(a.password); setErrors({}); setFormError(null); }} />
            ))}
          </Row>
        </View>
      ) : null}
    </AuthShell>
  );
}
