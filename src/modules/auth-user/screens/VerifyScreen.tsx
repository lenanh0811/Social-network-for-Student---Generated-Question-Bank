import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { isMock, verify } from '@/modules/auth-user/api/client';
import { MOCK_VERIFY_CODE } from '@/modules/auth-user/api/mockDb';
import { AuthError } from '@/modules/auth-user/api/types';
import { checkCode, checkEmail } from '@/modules/auth-user/api/validate';
import { AuthShell, CodeInput, Notice, TextLink } from '@/modules/auth-user/components/AuthUi';
import { Button, Field, Muted, Row } from '@/shared/ui';

export default function VerifyScreen() {
  const params = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState(params.email ?? '');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [emailError, setEmailError] = useState<string>();
  const [loading, setLoading] = useState(false);

  const submit = async (value = code) => {
    const eErr = checkEmail(email);
    const cErr = checkCode(value);
    setEmailError(eErr);
    setError(cErr ?? '');
    if (eErr || cErr) return;
    setLoading(true);
    try {
      await verify(email.trim().toLowerCase(), value);
      // Quay về màn đăng nhập đang có trong stack (không chồng thêm màn mới).
      router.dismissTo({ pathname: '/login', params: { email: email.trim().toLowerCase(), verified: '1' } });
    } catch (e) {
      setError(e instanceof AuthError && e.status === 400 ? 'Mã xác thực không đúng hoặc đã hết hạn.' : (e as Error).message);
      setCode('');
    } finally {
      setLoading(false);
    }
  };

  // Nhập đủ 6 số thì tự gửi.
  const onCode = (v: string) => {
    setCode(v);
    if (error) setError('');
    if (v.length === 6 && !loading) submit(v);
  };

  return (
    <AuthShell
      title="Xác thực email"
      subtitle={params.email ? `Nhập mã 6 số chúng tôi vừa gửi tới ${params.email}.` : 'Nhập email và mã 6 số đã được gửi tới hộp thư của bạn.'}
      footer={<Row><Muted style={{ fontSize: 14 }}>Nhầm email?</Muted><TextLink title="Đăng ký lại" onPress={() => router.replace('/register')} /></Row>}
    >
      {params.email ? null : (
        <Field label="Email" value={email} onChangeText={setEmail} error={emailError} keyboardType="email-address" autoCapitalize="none" placeholder="ten.ho@sis.hust.edu.vn" />
      )}
      <CodeInput value={code} onChange={onCode} error={error} />
      {isMock ? <Notice tone="info">Chế độ demo: mã xác thực là {MOCK_VERIFY_CODE}.</Notice> : (
        <Muted style={{ textAlign: 'center' }}>Không thấy email? Hãy kiểm tra thư mục Spam/Quảng cáo.</Muted>
      )}
      <Button title="Xác thực" icon="shield-checkmark-outline" onPress={() => submit()} loading={loading} disabled={code.length < 6} />
      <TextLink title="← Quay lại đăng nhập" onPress={() => router.replace('/login')} />
    </AuthShell>
  );
}
