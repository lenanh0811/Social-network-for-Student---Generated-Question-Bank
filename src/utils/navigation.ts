import { router } from 'expo-router';

/** Chuyển tới một đường dẫn (không cần khai báo kiểu route). */
export const go = (path: string) => router.push(path as never);
