import { Redirect } from 'expo-router';

/** Không còn trang chủ: "/" chuyển thẳng tới trang Bảng tin (đích sau khi đăng nhập). */
export default function Index() {
  return <Redirect href="/social" />;
}
