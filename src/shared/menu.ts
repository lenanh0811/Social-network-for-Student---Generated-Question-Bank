import type { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import type { Role } from '@/shared/types';

export interface MenuItem {
  label: string;
  icon: ComponentProps<typeof Ionicons>['name'];
  /** Đường dẫn route (khớp tên file trong src/app). */
  href: string;
  /** Chỉ hiện với các vai trò này (bỏ trống = tất cả). */
  roles?: Role[];
}

/**
 * Danh sách mục trong menu 3 gạch. Mỗi module thêm mục của mình vào đây
 * (và tạo file route tương ứng trong src/app/(tabs)/ + khai báo trong (tabs)/_layout.tsx).
 */
export const MENU_ITEMS: MenuItem[] = [
  { label: 'Trang chủ', icon: 'home-outline', href: '/' },
  { label: 'Bảng tin mạng xã hội', icon: 'people-outline', href: '/social' },
  { label: 'Tìm bài viết', icon: 'search-outline', href: '/search' },
  { label: 'Đóng góp câu hỏi', icon: 'create-outline', href: '/contribute', roles: ['student'] },
  { label: 'Duyệt câu hỏi', icon: 'shield-checkmark-outline', href: '/review', roles: ['lecturer'] },
  { label: 'Trò chơi dự đoán', icon: 'game-controller-outline', href: '/games', roles: ['student'] },
  { label: 'Đề thi', icon: 'document-text-outline', href: '/exams', roles: ['lecturer'] },
  { label: 'Cá nhân', icon: 'person-outline', href: '/profile' },
];
