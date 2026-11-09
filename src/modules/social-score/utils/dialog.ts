import { Alert, Platform } from 'react-native';

/** Thông báo ngắn. `Alert.alert` không hiện trên web nên dùng window.alert ở đó. */
export function notify(title: string, message?: string) {
  if (Platform.OS === 'web') { window.alert(message ? `${title}\n${message}` : title); return; }
  Alert.alert(title, message);
}

/** Hỏi xác nhận trước khi làm việc không hoàn tác được (xóa…). */
export function confirmAction(title: string, message: string, confirmLabel: string, onConfirm: () => void) {
  if (Platform.OS === 'web') { if (window.confirm(`${title}\n${message}`)) onConfirm(); return; }
  Alert.alert(title, message, [{ text: 'Hủy', style: 'cancel' }, { text: confirmLabel, style: 'destructive', onPress: onConfirm }]);
}
