import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { deleteMe, updateMe } from '@/modules/auth-user/api/client';
import { AuthError, type Gender } from '@/modules/auth-user/api/types';
import { checkDate, checkName, collect } from '@/modules/auth-user/api/validate';
import { Avatar, InfoRow, Notice } from '@/modules/auth-user/components/AuthUi';
import { useAuth } from '@/shared/context/Auth';
import { colors } from '@/shared/theme';
import { Button, Card, Field, H2, Header, Muted, Screen, Segmented } from '@/shared/ui';

/** PUT /users/me (full_name, bio, gender, date_of_birth) + DELETE /users/me */
export default function EditProfileScreen() {
  const { user, role, setUser } = useAuth();
  const [f, setF] = useState({ fullName: user.name, bio: user.bio ?? '', dateOfBirth: user.dateOfBirth ?? '' });
  const [gender, setGender] = useState<Gender | ''>(user.gender ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const set = (k: keyof typeof f) => (v: string) => setF((p) => ({ ...p, [k]: v }));

  const save = async () => {
    const errs = collect({
      fullName: checkName(f.fullName),
      dateOfBirth: checkDate(f.dateOfBirth.trim()),
      bio: f.bio.length > 300 ? 'Giới thiệu tối đa 300 ký tự' : undefined,
    });
    setErrors(errs);
    setFormError('');
    if (Object.keys(errs).length) return;
    setSaving(true);
    try {
      setUser(await updateMe({
        fullName: f.fullName, bio: f.bio.trim(), gender: gender || undefined, dateOfBirth: f.dateOfBirth.trim() || undefined,
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
        <Muted>{user.email}</Muted>
      </Card>
      {formError ? <Notice>{formError}</Notice> : null}
      <Card>
        <Field label="Họ và tên *" value={f.fullName} onChangeText={set('fullName')} error={errors.fullName} />
        <View style={{ gap: 6 }}>
          <Muted style={{ fontWeight: '600', color: colors.text }}>Giới tính</Muted>
          <Segmented value={gender} onChange={setGender} options={[{ value: 'MALE', label: 'Nam' }, { value: 'FEMALE', label: 'Nữ' }]} />
        </View>
        <Field label="Ngày sinh" value={f.dateOfBirth} onChangeText={set('dateOfBirth')} error={errors.dateOfBirth} placeholder="YYYY-MM-DD" maxLength={10} keyboardType="numbers-and-punctuation" />
        <Field label={`Giới thiệu (${f.bio.length}/300)`} value={f.bio} onChangeText={set('bio')} error={errors.bio} multiline placeholder="Đôi dòng về bạn…" />
      </Card>
      <Card>
        <H2>Thông tin do nhà trường quản lý</H2>
        <Muted>Liên hệ phòng đào tạo nếu các thông tin dưới đây chưa đúng.</Muted>
        <InfoRow icon="id-card-outline" label={role === 'lecturer' ? 'Mã cán bộ' : 'MSSV'} value={user.code} />
        <InfoRow icon="business-outline" label="Khoa / Trường" value={user.faculty} />
        {role === 'student' ? <InfoRow icon="school-outline" label="Chuyên ngành" value={user.major} /> : null}
        {role === 'student' ? <InfoRow icon="people-outline" label="Lớp" value={user.className} /> : null}
      </Card>
      <DeleteAccount />
      <View style={{ height: 40 }} />
    </Screen>
  );
}

/** Vùng nguy hiểm: DELETE /users/me (Swagger không yêu cầu mật khẩu => xác nhận 2 bước). */
function DeleteAccount() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const confirm = async () => {
    setLoading(true);
    setError('');
    try {
      await deleteMe(); // xoá phiên => guard đưa về /login
    } catch (e) {
      setError((e as Error).message);
      setLoading(false);
    }
  };

  return (
    <Card style={{ borderColor: colors.dangerSoft }}>
      <H2>Xoá tài khoản</H2>
      <Muted>Hồ sơ của bạn sẽ bị vô hiệu hoá và xoá khỏi hệ thống. Hành động này không thể hoàn tác.</Muted>
      {error ? <Notice>{error}</Notice> : null}
      {open ? (
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}><Button title="Huỷ" variant="outline" onPress={() => setOpen(false)} /></View>
          <View style={{ flex: 1 }}><Button title="Xác nhận xoá" variant="danger" icon="trash-outline" onPress={confirm} loading={loading} /></View>
        </View>
      ) : (
        <Button title="Xoá tài khoản" variant="outline" icon="trash-outline" onPress={() => setOpen(true)} />
      )}
    </Card>
  );
}
