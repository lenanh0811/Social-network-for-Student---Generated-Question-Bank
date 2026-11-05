# Mạng xã hội sinh viên – Ngân hàng câu hỏi (HUST)

Ứng dụng Expo / React Native (chạy cả web). Chạy thử: `npm install` → `npm start` → bấm `w` để mở web.

## Mỗi người một thư mục

| Nhóm API | Thư mục của bạn | Người phụ trách |
|---|---|---|
| Authentication & User | `src/modules/auth-user` | |
| Social Network Core | `src/modules/social-core` | |
| Relationship & Privacy | `src/modules/relationship-privacy` | |
| Messaging & Notification | `src/modules/messaging-notification` | |
| Exam Bank & Crowdsourcing | `src/modules/exam-bank` (đã làm xong giao diện, dùng làm mẫu) | |

**Quy tắc:** chỉ sửa trong thư mục module của mình. Thứ gì dùng chung (nút, ô nhập, màu, gọi API) nằm trong `src/shared/`.

## Bên trong một module

```
modules/<tên>/
├─ api/         hàm gọi API (+ types, dữ liệu mock)
├─ components/  thành phần giao diện riêng của module
└─ screens/     các màn hình
```

## Thư mục `src/app/` là gì?
Expo Router biến **mỗi file trong `src/app/` thành một đường dẫn (URL)**. File ở đó chỉ có 1 dòng, trỏ tới màn hình thật trong module:

```ts
// src/app/(tabs)/games.tsx  →  đường dẫn /games
export { default } from '@/modules/exam-bank/screens/GamesScreen';
```

Muốn thêm màn hình mới: (1) viết màn hình trong `modules/<tên>/screens/`, (2) thêm 1 file như trên trong `src/app/`.
Màn hình nằm trong menu 3 gạch thì đặt ở `src/app/(tabs)/`, khai báo trong `src/app/(tabs)/_layout.tsx` và thêm 1 dòng vào `src/shared/menu.ts`; màn hình còn lại đặt ở `src/app/<tên-module>/`.

## Thư mục `src/shared/`
`ui/` (Button, Card, Field…), `theme.ts` (màu HUST), `api/http.ts` (gọi backend + token), `context/Auth.tsx`, `hooks.ts`.

## Gọi backend thật
Tạo file `.env` với `EXPO_PUBLIC_API_URL=http://<ip>:<port>/api`. Không đặt thì app dùng dữ liệu mock.
