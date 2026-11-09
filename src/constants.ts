import type { IconName, Role } from "@/types";

// ───────── Thương hiệu ─────────
/** Tên web (tạm: QuizHub) — đổi ở đây là cập nhật logo trên navbar. */
export const BRAND = { first: "Quiz", second: "Hub", initial: "Q" };

// ───────── Môn học (Ngân hàng câu hỏi) ─────────
export const SUBJECTS = ["Công nghệ Web", "Cơ sở dữ liệu", "Mạng máy tính"];

// ───────── Menu 3 gạch ─────────
export interface MenuItem {
  label: string;
  icon: IconName;
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
  { label: "Bảng tin mạng xã hội", icon: "people-outline", href: "/social" },
  { label: "Tin nhắn", icon: "chatbubble-ellipses-outline", href: "/messages" },
  {
    label: "Đóng góp câu hỏi",
    icon: "create-outline",
    href: "/contribute",
    roles: ["student"],
  },
  {
    label: "Duyệt câu hỏi",
    icon: "shield-checkmark-outline",
    href: "/review",
    roles: ["lecturer"],
  },
  {
    label: "Trò chơi dự đoán",
    icon: "game-controller-outline",
    href: "/games",
    roles: ["student"],
  },
  {
    label: "Đề thi",
    icon: "document-text-outline",
    href: "/exams",
    roles: ["lecturer"],
  },
  { label: "Cá nhân", icon: "person-outline", href: "/profile" },
];
