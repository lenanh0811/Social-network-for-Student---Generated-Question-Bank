import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { deleteMe, isMock, updateMe } from '@/modules/auth-user/api/client';
import { AuthError } from '@/modules/auth-user/api/types';
import { checkName, collect } from '@/modules/auth-user/api/validate';
import { Avatar, Notice, PasswordField } from '@/modules/auth-user/components/AuthUi';
import { useAuth } from '@/shared/context/Auth';
import { colors } from '@/shared/theme';
import { Button, Card, Field, H2, Header, Muted, Screen } from '@/shared/ui';

/** PUT /users/me + DELETE /users/me */
export default function EditProfileScreen() {
  const { user, role, setUser } = useAuth();
  const [f, setF] = useState({
    fullName: user.name, studentId: user.studentId ?? '', faculty: user.faculty ?? '',
    className: user.className ?? '', phone: user.phone ?? '', bio: user.bio ?? '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const set = (k: keyof typeof f) => (v: string) => setF((p) => ({ ...p, [k]: v }));

  const save = async () => {
    const errs = collect({ fullName: checkName(f.fullName), bio: f.bio.length > 300 ? 'Giới thiệu tối đa 300 ký tự' : undefined });
    setErrors(errs);
    setFormError('');
    if (Object.keys(errs).length) return;
    setSaving(true);
    try {
      const trim = (v: string) => v.trim() || undefined;
      setUser(await updateMe({
        fullName: f.fullName, studentId: trim(f.studentId), faculty: trim(f.faculty),
        className: trim(f.className), phone: trim(f.phone), bio: trim(f.bio),
      }));
      router.back();
    } catch (e) {
      if (e instanceof AuthError && e.fields) setErrors(e.fields);
      setFormError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen footer={<Button title="Lưu thay đổi" icon="checkmark" onPress={save} loading={saving} />}>
      <Header title="Chỉnh sửa hồ sơ" />
      <Card style={{ alignItems: 'center' }}>
        <Avatar name={f.fullName || user.name} size={80} />
        <Muted>{user.email} · không thể thay đổi email</Muted>
      </Card>
      {formError ? <Notice>{formError}</Notice> : null}
      <Card>
        <Field label="Họ và tên *" value={f.fullName} onChangeText={set('fullName')} error={errors.fullName} />
        {[[role === 'student' ? 'Mã số sinh viên' : 'Mã cán bộ', f.studentId], ['Khoa / Trường', f.faculty], ['Lớp', f.className]].map(([label, value]) =>
          value ? <Muted key={label}>{label}: <Muted style={{ fontWeight: '700' }}>{value}</Muted></Muted> : null)}
        <Muted>Mã số, khoa và lớp do nhà trường quản lý nên không chỉnh sửa tại đây.</Muted>
        <Field label={`Giới thiệu (${f.bio.length}/300)`} value={f.bio} onChangeText={set('bio')} error={errors.bio} multiline placeholder="Đôi dòng về bạn…" />
      </Card>
      {isMock ? <DeleteAccount /> : null}
      <View style={{ height: 40 }} />
    </Screen>
  );
}

/** Vùng nguy hiểm: xoá tài khoản cần nhập lại mật khẩu. */
function DeleteAccount() {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const confirm = async () => {
    if (!password) return setError('Nhập mật khẩu để xác nhận');
    setLoading(true);
    setError('');
    try {
      await deleteMe(password); // xoá phiên => guard đưa về /login
    } catch (e) {
      setError((e as Error).message);
      setLoading(false);
    }
  };

  return (
    <Card style={{ borderColor: colors.dangerSoft }}>
      <H2>Xoá tài khoản</H2>
      <Muted>Toàn bộ hồ sơ, bài viết và câu hỏi đóng góp của bạn sẽ bị xoá vĩnh viễn.</Muted>
      {open ? (
        <>
          <PasswordField label="Mật khẩu hiện tại" value={password} onChangeText={setPassword} error={error} />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}><Button title="Huỷ" variant="outline" onPress={() => { setOpen(false); setPassword(''); setError(''); }} /></View>
            <View style={{ flex: 1 }}><Button title="Xoá vĩnh viễn" variant="danger" icon="trash-outline" onPress={confirm} loading={loading} /></View>
          </View>
        </>
      ) : (
        <Button title="Xoá tài khoản" variant="outline" icon="trash-outline" onPress={() => setOpen(true)} />
      )}
    </Card>
  );
}
