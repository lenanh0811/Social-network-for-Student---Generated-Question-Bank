import { router } from 'expo-router';
import { useState } from 'react';
import { register } from '@/modules/auth-user/api/client';
import { AuthError } from '@/modules/auth-user/api/types';
import { checkEmail, checkPassword, collect } from '@/modules/auth-user/api/validate';
import { AuthShell, Notice, PasswordField, PasswordStrength, TextLink } from '@/modules/auth-user/components/auth-ui';
import type { Role } from '@/types';
import { Button } from '@/components/button';
import { Field } from '@/components/field';
import { Muted } from '@/components/muted';
import { Row } from '@/components/row';
import { Segmented } from '@/components/segmented';

/**
 * POST /auth/admin/register — body theo Swagger: email, password, role, device_id.
 * Họ tên và thông tin khác cập nhật sau khi đăng nhập (PUT /users/me).
 * Lưu ý: server thật coi đây là API admin nên màn này chỉ mở ở chế độ demo (xem canSelfRegister).
 */
export default function RegisterScreen() {
  const [f, setF] = useState({ email: '', password: '', confirm: '' });
  const [role, setRole] = useState<Role>('student');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);
  const set = (k: keyof typeof f) => (v: string) => setF((p) => ({ ...p, [k]: v }));

  const submit = async () => {
    const errs = collect({
      email: checkEmail(f.email),
      password: checkPassword(f.password),
      confirm: f.confirm !== f.password ? 'Mật khẩu nhập lại không khớp' : undefined,
    });
    setErrors(errs);
    setFormError('');
    if (Object.keys(errs).length) return;
    setLoading(true);
    try {
      const { email } = await register({ email: f.email, password: f.password, role });
      router.push({ pathname: '/verify', params: { email } });
    } catch (e) {
      if (e instanceof AuthError && e.fields) setErrors(e.fields);
      setFormError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Tạo tài khoản"
      subtitle="Chỉ mất một phút. Chúng tôi sẽ gửi mã xác thực OTP tới email của bạn."
      footer={<Row><Muted style={{ fontSize: 14 }}>Đã có tài khoản?</Muted><TextLink title="Đăng nhập" onPress={() => router.replace('/login')} /></Row>}
    >
      {formError ? <Notice>{formError}</Notice> : null}
      <Segmented value={role} onChange={setRole} options={[{ value: 'student', label: 'Sinh viên' }, { value: 'lecturer', label: 'Giảng viên' }]} />
      <Field label="Email" value={f.email} onChangeText={set('email')} error={errors.email} placeholder="ten.ho@sis.hust.edu.vn" keyboardType="email-address" autoCapitalize="none" autoComplete="email" textContentType="emailAddress" />
      <PasswordField label="Mật khẩu" value={f.password} onChangeText={set('password')} error={errors.password} placeholder="Tối thiểu 8 ký tự" autoComplete="new-password" textContentType="newPassword" />
      <PasswordStrength value={f.password} />
      <PasswordField label="Nhập lại mật khẩu" value={f.confirm} onChangeText={set('confirm')} error={errors.confirm} placeholder="••••••••" autoComplete="new-password" onSubmitEditing={submit} />
      <Button title="Đăng ký" icon="person-add-outline" onPress={submit} loading={loading} />
      <Muted style={{ textAlign: 'center' }}>Họ tên và thông tin cá nhân bạn sẽ cập nhật sau khi đăng nhập.</Muted>
    </AuthShell>
  );
}
