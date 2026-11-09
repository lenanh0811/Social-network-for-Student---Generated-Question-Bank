import { Redirect } from 'expo-router';

/** Không còn trang chủ: "/" chuyển thẳng tới trang Cá nhân (đích sau khi đăng nhập). */
export default function Index() {
  return <Redirect href="/profile" />;
}
