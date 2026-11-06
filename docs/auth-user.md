# Authentication & User Management (TV1)

Nội dung: đăng nhập/đăng xuất, refresh token, hồ sơ cá nhân, đổi mật khẩu, quản lý thiết bị (+ đăng ký/xác thực OTP ở chế độ demo).

**Người phụ trách:** _(điền tên)_

## API của module
Nguồn: Swagger https://snsqb.duckdns.org/api/v1/swagger-ui/index.html (file spec: `/api/v1/docs/openapi.json`).
Base URL: `EXPO_PUBLIC_API_URL` + `/api/v1`, vd `EXPO_PUBLIC_API_URL=https://snsqb.duckdns.org`.
Envelope `{ code, message, data }`, thành công khi `code = "0000"`.

| STT | METHOD | Endpoint | Body / dữ liệu chính | Hàm trong `api/client.ts` | Màn hình |
|---|---|---|---|---|---|
| 1 | POST | `/auth/login` | `email, password, device_id, platform (WEB/IOS/ANDROID/DESKTOP)`, tuỳ chọn `device_name, os_version, app_version, fid` → `access_token, refresh_token, user_id, role, verified, profile_completed` | `login` | `/login` |
| 2 | POST | `/auth/logout` | — (server thu hồi refresh token + FCM token) | `logout` | `/profile` |
| 3 | POST | `/auth/change-password` | `old_password, new_password` | `changePassword` | `/account/password` |
| 4 | POST | `/auth/refresh` | `refresh_token` → `access_token, refresh_token` | `refreshSession` (tự động) | — |
| 5 | GET | `/users/me` | → `user_id, email, full_name, role, student_lecturer_code, school_faculty, major, class_name, gender, date_of_birth, bio, avatar_url, verified, profile_completed…` | `getMe` | `/profile` |
| 6 | GET | `/users/{userId}` | hồ sơ công khai (ẩn email, ngày sinh) | `getUser` | `/users/[userId]` |
| 7 | PUT | `/users/me` | `full_name, bio, gender (MALE/FEMALE), date_of_birth (YYYY-MM-DD), avatar_url` | `updateMe` | `/account/edit` |
| 8 | DELETE | `/users/me` | — | `deleteMe` | `/account/edit` |
| 9 | GET | `/devices` | → `data.devices[]: device_id, device_name, platform, os_version, last_active_at, is_active, is_current_device` | `listDevices` | `/account/devices` |
| 10 | POST | `/devices/{deviceId}/logout` | — | `logoutDevice` | `/account/devices` |
| 11 | DELETE | `/devices/{deviceId}` | — | `removeDevice` | `/account/devices` |
| 12 | POST | `/devices/fid` · `/devices/fid/unregister` | `fid` | `setPushToken(fid \| undefined)` | — (module thông báo gọi) |
| — | POST | `/auth/admin/register` · `/auth/admin/verify` · `/auth/admin/resend-verify` | `email, password, device_id, role` · `email, verify_code, device_id` · `email` | `register`, `verify`, `resendVerify` | `/register`, `/verify` (chỉ chế độ demo) |

**Mã lỗi server:** `400 · 9990` sai tài khoản/mật khẩu (kể cả mật khẩu cũ) · `400 · 1002` thiếu/sai trường, `data = [{ field, message }]` · `400 · 1003` JSON sai định dạng (vd platform lạ) · `401 · 9998` thiếu/sai/hết hạn token · `403` chưa kích hoạt / bị khoá · `404` không tìm thấy.

### Lưu ý khi đối chiếu Swagger
- **Đăng ký / xác thực OTP là API admin.** Swagger ghi "Các API dành cho admin không cần gọi và không được gọi", và server chặn chúng ngoài Tailscale VPN (HTTP 403). App thật dùng tài khoản nhà trường cấp sẵn ⇒ khi có `EXPO_PUBLIC_API_URL`, màn đăng nhập ẩn link "Đăng ký" (`canSelfRegister = isMock`).
- **Không có `/devices/register`** như slide đặc tả: thiết bị được ghi nhận khi đăng nhập (`device_id`, `platform`…), push token đồng bộ qua `/devices/fid`.
- **Server lệch Swagger:** `POST /auth/logout` và `POST /auth/change-password` khi không gửi token trả `403 · 1009 ACCESS_DENIED` thay vì `401` như tài liệu (TC26, TC37 trong bảng kết quả live). Cần báo nhóm backend.
- **CORS:** server chỉ cho phép origin `http://localhost:3000` và `http://localhost:5173` (cổng mặc định 8081 của Expo bị 403). Chạy bản web bằng `npx expo start --web --port 3000`. Bản iOS/Android không bị ảnh hưởng.
- Khoa, chuyên ngành, lớp, MSSV do nhà trường quản lý ⇒ chỉ hiển thị, không sửa qua `PUT /users/me`.

## Cách hoạt động
- **Phiên đăng nhập**: lưu ở SecureStore (iOS/Android) hoặc localStorage (web) — `api/storage.ts`, `api/storage.web.ts`.
- **Gắn token**: `client.ts` gọi `configureApiAuth(getAccessToken)` nên mọi module dùng `call()` đều tự có `Authorization: Bearer …`.
- **Refresh token**: hạn access token đọc từ `exp` trong JWT; tự refresh trước khi hết hạn 30 giây, và khi server trả 401 thì refresh rồi thử lại đúng 1 lần. Nhiều request cùng lúc chỉ refresh 1 lần. Refresh thất bại ⇒ xoá phiên ⇒ về `/login`.
- **Bảo vệ route**: `src/app/_layout.tsx` dùng `Stack.Protected`. Chưa đăng nhập ⇒ chỉ vào được nhóm `(auth)`; route riêng tư mới phải thêm vào `PRIVATE_ROUTES`.
- **`useAuth()`** (`src/context/auth.tsx`): `status, user, role, signIn, signOut, reload, setUser`.
- **Chế độ demo** (chưa đặt `EXPO_PUBLIC_API_URL`): `api/mockDb.ts` giả lập server với cùng mã lỗi. Tài khoản mẫu hiện trên màn đăng nhập, mã OTP là `123456`.

## Test API
```bash
npm run test:auth
```
- Không cấu hình URL ⇒ chạy trên `tests/auth-mock-server.mjs` (mô phỏng theo Swagger) ⇒ `tests/reports/auth-api-report.md`.
- Backend thật: `AUTH_API_URL=https://snsqb.duckdns.org`, thêm `AUTH_TEST_EMAIL`, `AUTH_TEST_PASSWORD` (tài khoản đã kích hoạt), tuỳ chọn `AUTH_EXPIRED_TOKEN` ⇒ `tests/reports/auth-api-report.live.md`. Case đổi mật khẩu / sửa hồ sơ tự trả lại giá trị cũ; case xoá tài khoản và API admin chỉ chạy trên mock.
- 39 case: đăng ký/OTP (mock), đăng nhập đúng/sai, thiếu trường, platform sai, không token, token giả, token hết hạn, refresh, hồ sơ công khai/404, cập nhật hồ sơ, đổi mật khẩu, thiết bị (danh sách, FID, đăng xuất/xoá thiết bị khác), đăng xuất, xoá tài khoản.
