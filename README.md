# Mạng xã hội sinh viên – Ngân hàng câu hỏi (HUST)

Ứng dụng Expo / React Native (chạy cả web). Chạy thử: `npm install` → `npm run dev` (web cổng 3000) hoặc `npm run demo` (dữ liệu mô phỏng, không cần tài khoản).

> **Cả nhóm đọc [QUY_UOC.md](QUY_UOC.md) trước khi code**: cấu trúc thư mục, cách lưu token, gọi API, đặt tên route, thêm mục menu, làm việc với Git.

## Mỗi người một thư mục

| Nhóm API | Thư mục của bạn | Người phụ trách |
|---|---|---|
| Authentication & User | `src/modules/auth-user` | |
| Social Network Core | `src/modules/social-score` | |
| Relationship & Privacy | `src/modules/relationship-privacy` | |
| Messaging & Notification | `src/modules/messaging-notification` | |
| Exam Bank & Crowdsourcing | `src/modules/exam-bank` | |

**Quy tắc:** chỉ sửa trong thư mục module của mình. Thứ dùng chung (nút, thẻ, ô nhập, màu, gọi API) nằm ngoài `modules/`.

## Cấu trúc thư mục

```
src/
├─ app/                 chỉ có route (mỗi file render một màn hình)
├─ modules/<tên>/       phần của MỘT người:  api/  components/  screens/<màn-hình>/index.tsx
├─ components/          giao diện dùng chung (button, card, field…)
├─ api/                 http.ts, backend.ts (lớp gọi API chung)
├─ context/  hooks/  utils/  screens/home/
└─ constants.ts  theme.ts  types.ts
```

Thêm một màn hình mới: (1) viết nó trong `src/modules/<tên>/screens/<màn-hình>/index.tsx`, (2) thêm một file route ngắn trong `src/app/` render màn hình đó. Chi tiết và ví dụ ở [QUY_UOC.md](QUY_UOC.md).

## Gọi backend thật
Tạo file `.env` với `EXPO_PUBLIC_API_URL=https://snsqb.duckdns.org/api/v1`. Không đặt thì app dùng dữ liệu mock.
Web phải chạy ở **cổng 3000** (`npm run dev`) vì backend chỉ cho phép `localhost:3000` và `localhost:5173`.
