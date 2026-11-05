import { router } from 'expo-router';
import { useState } from 'react';
import { register } from '@/modules/auth-user/api/client';
import { AuthError } from '@/modules/auth-user/api/types';
import { checkEmail, checkName, checkPassword, collect } from '@/modules/auth-user/api/validate';
import { AuthShell, Notice, PasswordField, PasswordStrength, TextLink } from '@/modules/auth-user/components/AuthUi';
import type { Role } from '@/shared/types';
import { Button, Field, Muted, Row, Segmented } from '@/shared/ui';

export default function RegisterScreen() {
  const [f, setF] = useState({ fullName: '', email: '', studentId: '', password: '', confirm: '' });
  const [role, setRole] = useState<Role>('student');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);
  const set = (k: keyof typeof f) => (v: string) => setF((p) => ({ ...p, [k]: v }));

  const submit = async () => {
    const errs = collect({
      fullName: checkName(f.fullName),
      email: checkEmail(f.email),
      studentId: role === 'student' && f.studentId && !/^\d{8}$/.test(f.studentId) ? 'MSSV gồm 8 chữ số' : undefined,
      password: checkPassword(f.password),
      confirm: f.confirm !== f.password ? 'Mật khẩu nhập lại không khớp' : undefined,
    });
    setErrors(errs);
    setFormError('');
    if (Object.keys(errs).length) return;
    setLoading(true);
    try {
      const { email } = await register({ fullName: f.fullName, email: f.email, password: f.password, role, studentId: role === 'student' ? f.studentId : undefined });
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
      subtitle="Chỉ mất một phút. Chúng tôi sẽ gửi mã xác thực tới email của bạn."
      footer={<Row><Muted style={{ fontSize: 14 }}>Đã có tài khoản?</Muted><TextLink title="Đăng nhập" onPress={() => router.replace('/login')} /></Row>}
    >
      {formError ? <Notice>{formError}</Notice> : null}
      <Segmented value={role} onChange={setRole} options={[{ value: 'student', label: 'Sinh viên' }, { value: 'lecturer', label: 'Giảng viên' }]} />
      <Field label="Họ và tên" value={f.fullName} onChangeText={set('fullName')} error={errors.fullName} placeholder="Nguyễn Văn An" autoComplete="name" textContentType="name" />
      <Field label="Email" value={f.email} onChangeText={set('email')} error={errors.email} placeholder="ten.ho@sis.hust.edu.vn" keyboardType="email-address" autoCapitalize="none" autoComplete="email" textContentType="emailAddress" />
      {role === 'student' ? (
        <Field label="Mã số sinh viên (không bắt buộc)" value={f.studentId} onChangeText={set('studentId')} error={errors.studentId} placeholder="20210001" keyboardType="number-pad" maxLength={8} />
      ) : null}
      <PasswordField label="Mật khẩu" value={f.password} onChangeText={set('password')} error={errors.password} placeholder="Tối thiểu 8 ký tự, có chữ và số" autoComplete="new-password" textContentType="newPassword" />
      <PasswordStrength value={f.password} />
      <PasswordField label="Nhập lại mật khẩu" value={f.confirm} onChangeText={set('confirm')} error={errors.confirm} placeholder="••••••••" autoComplete="new-password" onSubmitEditing={submit} />
      <Button title="Đăng ký" icon="person-add-outline" onPress={submit} loading={loading} />
      <Muted style={{ textAlign: 'center' }}>Bằng việc đăng ký, bạn đồng ý với quy định cộng đồng của QuizHub.</Muted>
    </AuthShell>
  );
}
