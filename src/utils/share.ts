import { Linking, Platform } from 'react-native';

/** Mở đường dẫn tải file do backend trả về (PDF / Excel). Web: mở tab mới. Điện thoại: mở bằng trình duyệt hệ thống. */
export async function openDownload(url: string) {
  if (Platform.OS === 'web') {
    window.open(url, '_blank', 'noopener');
    return;
  }
  await Linking.openURL(url);
}
