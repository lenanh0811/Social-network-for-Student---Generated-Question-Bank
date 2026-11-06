import { router } from 'expo-router';
import { useState } from 'react';
import { changePassword } from '@/modules/auth-user/api/client';
import { AuthError } from '@/modules/auth-user/api/types';
import { checkPassword, collect } from '@/modules/auth-user/api/validate';
import { Notice, PasswordField, PasswordStrength } from '@/modules/auth-user/components/auth-ui';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Header } from '@/components/header';
import { Muted } from '@/components/muted';
import { Screen } from '@/components/screen';

/** POST /auth/change-password */
export default function ChangePasswordScreen() {
  const [f, setF] = useState({ current: '', next: '', confirm: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const set = (k: keyof typeof f) => (v: string) => setF((p) => ({ ...p, [k]: v }));

  const submit = async () => {
    const errs = collect({
      current: f.current ? undefined : 'Vui lòng nhập mật khẩu hiện tại',
      next: checkPassword(f.next) ?? (f.next === f.current ? 'Mật khẩu mới phải khác mật khẩu cũ' : undefined),
      confirm: f.confirm !== f.next ? 'Mật khẩu nhập lại không khớp' : undefined,
    });
    setErrors(errs);
    setFormError('');
    if (Object.keys(errs).length) return;
    setLoading(true);
    try {
      await changePassword(f.current, f.next);
      setDone(true);
      setF({ current: '', next: '', confirm: '' });
    } catch (e) {
      if (e instanceof AuthError && e.fields) setErrors(e.fields);
      setFormError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <Header title="Đổi mật khẩu" />
      {done ? (
        <Notice tone="success" action={<Button small variant="outline" title="Về trang cá nhân" onPress={() => router.back()} />}>
          Đổi mật khẩu thành công. Lần đăng nhập sau hãy dùng mật khẩu mới.
        </Notice>
      ) : null}
      {formError ? <Notice>{formError}</Notice> : null}
      <Card>
        <PasswordField label="Mật khẩu hiện tại" value={f.current} onChangeText={set('current')} error={errors.current} autoComplete="current-password" />
        <PasswordField label="Mật khẩu mới" value={f.next} onChangeText={set('next')} error={errors.next} autoComplete="new-password" textContentType="newPassword" />
        <PasswordStrength value={f.next} />
        <PasswordField label="Nhập lại mật khẩu mới" value={f.confirm} onChangeText={set('confirm')} error={errors.confirm} autoComplete="new-password" onSubmitEditing={submit} />
        <Muted>Mật khẩu tối thiểu 8 ký tự, không chứa khoảng trắng. Nên kết hợp chữ hoa, chữ thường, số và ký tự đặc biệt.</Muted>
        <Button title="Cập nhật mật khẩu" icon="key-outline" onPress={submit} loading={loading} />
      </Card>
    </Screen>
  );
}
