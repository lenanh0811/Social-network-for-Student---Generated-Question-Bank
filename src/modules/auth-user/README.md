# Authentication & User Management (TV1)

Nội dung: đăng ký, xác thực email, đăng nhập/đăng xuất, refresh token, hồ sơ cá nhân, đổi mật khẩu, quản lý thiết bị.

**Người phụ trách:** _(điền tên)_

## API của module
Base URL: `EXPO_PUBLIC_API_URL` + `/api/v1`. Envelope `{ code, message, data }`, thành công khi `code` ∈ `1000 | 0000 | SUCCESS`.

| STT | METHOD | Endpoint | Body chính | Hàm trong `api/client.ts` | Màn hình |
|---|---|---|---|---|---|
| 1 | POST | `/auth/register` | `full_name, email, password, role, student_id?` | `register` | Đăng ký `/register` |
| 2 | POST | `/auth/verify` | `email, code` | `verify` | Xác thực `/verify` |
| 3 | POST | `/auth/login` | `email, password, device_id, device_name, platform` → `access_token, refresh_token, expires_in, user` | `login` | Đăng nhập `/login` |
| 4 | POST | `/auth/refresh` | `refresh_token` → `access_token, refresh_token?, expires_in` | `refreshSession` (tự động) | — |
| 5 | POST | `/auth/logout` | `refresh_token` | `logout` | Cá nhân `/profile` |
| 6 | POST | `/auth/change-password` | `current_password, new_password` | `changePassword` | `/account/password` |
| 7 | GET | `/users/me` | — | `getMe` | `/profile` |
| 8 | GET | `/users/{userId}` | — | `getUser` | `/users/[userId]` |
| 9 | PUT | `/users/me` | `full_name, student_id, faculty, class_name, phone, bio, avatar_url` | `updateMe` | `/account/edit` |
| 10 | DELETE | `/users/me` | `password` | `deleteMe` | `/account/edit` |
| 11 | POST | `/devices/register` | `device_id, device_name, platform, push_token?` | `registerDevice` (tự gọi sau đăng nhập / mở app) | Thẻ "Thiết bị này" ở `/profile` |
| 12 | DELETE | `/devices/register` | `device_id` | `unregisterDevice` (tự gọi trước khi đăng xuất) | — |

> Tên trường ở trên là giả định của frontend (snake_case giống Social API). Nếu backend khác, chỉ cần sửa phần ánh xạ trong `api/client.ts` (`toUser`, `toSession`) và body của từng hàm.

## Cách hoạt động
- **Phiên đăng nhập**: lưu ở SecureStore (iOS/Android) hoặc localStorage (web) — `api/storage.ts`, `api/storage.web.ts`.
- **Gắn token**: `client.ts` gọi `configureApiAuth(getAccessToken)` nên mọi module dùng `call()` đều tự có `Authorization: Bearer …`.
- **Refresh token**: tự refresh trước khi access token hết hạn 30 giây, và khi server trả 401 thì refresh rồi thử lại đúng 1 lần. Nhiều request cùng lúc chỉ refresh 1 lần. Refresh thất bại ⇒ xoá phiên ⇒ về `/login`.
- **Bảo vệ route**: `src/app/_layout.tsx` dùng `Stack.Protected`. Chưa đăng nhập ⇒ chỉ vào được nhóm `(auth)`; route riêng tư mới phải thêm vào `PRIVATE_ROUTES`.
- **Thiết bị**: `device_id` sinh 1 lần và lưu lại. Module thông báo có push token thì gọi `setPushToken(token)` để đăng ký lại thiết bị kèm token.
- **`useAuth()`** (`src/shared/context/Auth.tsx`): `status, user, role, signIn, signOut, reload, setUser`.
- **Chế độ demo** (chưa đặt `EXPO_PUBLIC_API_URL`): `api/mockDb.ts` giả lập server (kể cả lỗi 401/403/409). Tài khoản mẫu hiện trên màn đăng nhập, mã xác thực là `123456`.

## Test API
```bash
npm run test:auth
```
- Không cấu hình URL ⇒ chạy trên `tests/auth-mock-server.mjs` (kiểm tra chính bộ test).
- Backend thật: đặt `AUTH_API_URL` (hoặc `EXPO_PUBLIC_API_URL`), thêm `AUTH_TEST_EMAIL`, `AUTH_TEST_PASSWORD` (tài khoản đã xác thực), tuỳ chọn `AUTH_VERIFY_CODE`, `AUTH_EXPIRED_TOKEN`.
- Bảng kết quả: `tests/reports/auth-api-report.md` (36 case: đăng ký, xác thực, đăng nhập đúng/sai, thiếu trường, không token, token giả, token hết hạn, refresh, hồ sơ, đổi mật khẩu, đăng ký/huỷ đăng ký thiết bị, đăng xuất, xoá tài khoản).
