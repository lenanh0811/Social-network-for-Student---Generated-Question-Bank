import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { confirmEmailVerification, isMock, requestEmailVerification } from '@/modules/auth-user/api/client';
import { MOCK_VERIFY_CODE } from '@/modules/auth-user/api/mock-db';
import { AuthError } from '@/modules/auth-user/api/types';
import { checkCode } from '@/modules/auth-user/api/validate';
import { CodeInput, Notice, TextLink } from '@/modules/auth-user/components/auth-ui';
import { useAuth } from '@/context/auth';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Header } from '@/components/header';
import { Muted } from '@/components/muted';
import { Row } from '@/components/row';
import { Screen } from '@/components/screen';

/**
 * Xác thực email cho tài khoản đang đăng nhập:
 * POST /auth/email-verification/request (gửi mã) rồi POST /auth/email-verification/confirm ({ verify_code }).
 */
export default function VerifyEmailScreen() {
  const { user, reload } = useAuth();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const busy = useRef(false);

  const send = async () => {
    setSending(true);
    setInfo('');
    setError('');
    try {
      await requestEmailVerification();
      setSent(true);
      setInfo('Đã gửi mã tới email của bạn, hãy kiểm tra hộp thư.');
    } catch (e) {
      if (e instanceof AuthError && e.status === 409) {
        setSent(true); // mã cũ còn hiệu lực => vẫn cho nhập
        setInfo('Mã trước vẫn còn hiệu lực, hãy nhập mã đó hoặc đợi rồi gửi lại.');
      } else setError((e as Error).message);
    } finally {
      setSending(false);
    }
  };

  // Vào màn là gửi mã luôn (nếu chưa xác thực).
  useEffect(() => { if (!user.verified) send(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = async (value = code) => {
    const cErr = checkCode(value);
    setError(cErr ?? '');
    if (cErr || busy.current) return;
    busy.current = true;
    setLoading(true);
    try {
      await confirmEmailVerification(value);
      setDone(true);
      try { await reload(); } catch { /* hồ sơ sẽ tự cập nhật lần tải sau */ }
    } catch (e) {
      setError(e instanceof AuthError && e.status === 400 ? 'Mã xác thực không đúng hoặc đã hết hạn.' : (e as Error).message);
      setCode('');
    } finally {
      busy.current = false;
      setLoading(false);
    }
  };

  const onCode = (v: string) => {
    setCode(v);
    if (error) setError('');
    if (v.length === 6 && !loading) submit(v);
  };

  if (done || user.verified) {
    return (
      <Screen>
        <Header title="Xác thực email" />
        <Notice tone="success" action={<Button small variant="outline" title="Về trang cá nhân" onPress={() => router.back()} />}>
          Email {user.email} đã được xác thực.
        </Notice>
      </Screen>
    );
  }

  return (
    <Screen>
      <Header title="Xác thực email" />
      <Card>
        <Muted>Nhập mã 6 số đã gửi tới {user.email || 'email của bạn'}.</Muted>
        {info ? <Notice tone="info">{info}</Notice> : null}
        <CodeInput value={code} onChange={onCode} error={error} />
        {isMock ? <Notice tone="info">Chế độ demo: mã xác thực là {MOCK_VERIFY_CODE}.</Notice> : <Muted>Không thấy email? Hãy kiểm tra thư mục Spam.</Muted>}
        <Button title="Xác thực" icon="shield-checkmark-outline" onPress={() => submit()} loading={loading} disabled={code.length < 6 || !sent} />
        <Row style={{ justifyContent: 'center' }}>
          <Muted>Chưa nhận được mã?</Muted>
          <TextLink title={sending ? 'Đang gửi...' : 'Gửi lại mã'} onPress={sending ? () => undefined : send} />
        </Row>
      </Card>
    </Screen>
  );
}
